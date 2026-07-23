/**
 * 学习统计路由
 * 提供数据可视化所需的统计数据
 */

const express = require('express');
const router = express.Router();
const StudyRecord = require('../models/StudyRecord');
const DailyStat = require('../models/DailyStat');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const moment = require('moment');

// GET /api/stats/overview - 学习总览
router.get('/overview', authenticate, async (req, res) => {
    try {
        const userId = req.user._id;

        const [totalRecords, masteredRecords, wrongRecords, starredRecords] = await Promise.all([
            StudyRecord.countDocuments({ userId }),
            StudyRecord.countDocuments({ userId, memoryStatus: 'mastered' }),
            StudyRecord.countDocuments({ userId, isWrongWord: true }),
            StudyRecord.countDocuments({ userId, isStarred: true })
        ]);

        const dueReview = await StudyRecord.countDocuments({
            userId,
            nextReviewDate: { $lte: new Date() },
            memoryStatus: { $in: ['learning', 'review'] }
        });

        res.json({
            success: true,
            data: {
                totalWords: totalRecords,
                masteredWords: masteredRecords,
                wrongWords: wrongRecords,
                starredWords: starredRecords,
                dueReview,
                masteryRate: totalRecords > 0 ? Math.round((masteredRecords / totalRecords) * 100) : 0,
                accuracy: req.user.stats.totalAnswered > 0
                    ? Math.round((req.user.stats.totalCorrect / req.user.stats.totalAnswered) * 100)
                    : 0,
                currentStreak: req.user.stats.currentStreak,
                maxStreak: req.user.stats.maxStreak,
                points: req.user.stats.points,
                level: req.user.stats.level,
                studyDays: req.user.stats.studyDays,
                badges: req.user.badges
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// GET /api/stats/weekly - 周学习数据（7天）
router.get('/weekly', authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const days = [];

        for (let i = 6; i >= 0; i--) {
            days.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
        }

        const stats = await DailyStat.find({
            userId,
            date: { $in: days }
        });

        const statsMap = {};
        stats.forEach(s => { statsMap[s.date] = s; });

        const weeklyData = days.map(date => ({
            date,
            dayLabel: moment(date).format('MM/DD'),
            weekday: ['日', '一', '二', '三', '四', '五', '六'][moment(date).day()],
            wordsLearned: statsMap[date]?.wordsLearned || 0,
            wordsReviewed: statsMap[date]?.wordsReviewed || 0,
            studyTime: statsMap[date]?.studyTime || 0,
            correctCount: statsMap[date]?.correctCount || 0,
            wrongCount: statsMap[date]?.wrongCount || 0,
            points: statsMap[date]?.pointsEarned || 0
        }));

        res.json({ success: true, data: { weeklyData } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// GET /api/stats/monthly - 月学习数据（30天）
router.get('/monthly', authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const days = [];
        for (let i = 29; i >= 0; i--) {
            days.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
        }

        const stats = await DailyStat.find({ userId, date: { $in: days } });
        const statsMap = {};
        stats.forEach(s => { statsMap[s.date] = s; });

        const monthlyData = days.map(date => ({
            date,
            wordsLearned: statsMap[date]?.wordsLearned || 0,
            wordsReviewed: statsMap[date]?.wordsReviewed || 0,
            studyTime: statsMap[date]?.studyTime || 0,
            hasActivity: !!statsMap[date]
        }));

        res.json({ success: true, data: { monthlyData } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// GET /api/stats/memory-distribution - 记忆状态分布
router.get('/memory-distribution', authenticate, async (req, res) => {
    try {
        const distribution = await StudyRecord.aggregate([
            { $match: { userId: req.user._id } },
            { $group: { _id: '$memoryStatus', count: { $sum: 1 } } }
        ]);

        const statusLabels = { new: '新词', learning: '学习中', review: '复习中', mastered: '已掌握' };
        const result = distribution.map(d => ({
            status: d._id,
            label: statusLabels[d._id] || d._id,
            count: d.count
        }));

        res.json({ success: true, data: { distribution: result } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// GET /api/stats/leaderboard - 排行榜（管理员/教师）
router.get('/leaderboard', authenticate, async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const users = await User.find({ isActive: true, role: 'student' })
            .select('username profile.nickname stats.points stats.level stats.currentStreak stats.masteredWords')
            .sort({ 'stats.points': -1 })
            .limit(parseInt(limit));

        res.json({ success: true, data: { leaderboard: users } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// GET /api/stats/export - 导出统计数据
router.get('/export', authenticate, async (req, res) => {
    try {
        const XLSX = require('xlsx');
        const userId = req.user._id;

        // 近30天数据
        const days = [];
        for (let i = 29; i >= 0; i--) days.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
        const stats = await DailyStat.find({ userId, date: { $in: days } });
        const statsMap = {};
        stats.forEach(s => { statsMap[s.date] = s; });

        const data = days.map(date => ({
            '日期': date,
            '新学单词': statsMap[date]?.wordsLearned || 0,
            '复习单词': statsMap[date]?.wordsReviewed || 0,
            '学习时长(分钟)': statsMap[date]?.studyTime || 0,
            '答题正确': statsMap[date]?.correctCount || 0,
            '答题错误': statsMap[date]?.wrongCount || 0,
            '获得积分': statsMap[date]?.pointsEarned || 0
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '学习统计');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=study_stats.xlsx');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ success: false, message: '导出失败' });
    }
});

module.exports = router;
