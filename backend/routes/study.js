/**
 * 学习记录路由
 * 处理单词学习会话和进度记录
 */

const express = require('express');
const router = express.Router();
const StudyRecord = require('../models/StudyRecord');
const Word = require('../models/Word');
const User = require('../models/User');
const DailyStat = require('../models/DailyStat');
const { authenticate } = require('../middleware/auth');
const moment = require('moment');

// GET /api/study/session - 获取学习会话（今日待学/复习单词）
router.get('/session', authenticate, async (req, res) => {
    try {
        const { bookId, mode = 'new', limit = 20 } = req.query;
        const userId = req.user._id;
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        let words = [];

        if (mode === 'review') {
            // 获取需要复习的单词
            const records = await StudyRecord.find({
                userId,
                bookId: bookId || { $exists: true },
                nextReviewDate: { $lte: today },
                memoryStatus: { $in: ['learning', 'review'] }
            })
                .populate('wordId')
                .limit(parseInt(limit))
                .sort({ nextReviewDate: 1 });

            words = records.filter(r => r.wordId).map(r => ({
                recordId: r._id,
                ...r.wordId.toObject(),
                memoryStatus: r.memoryStatus,
                repetitions: r.repetitions,
                easeFactor: r.easeFactor
            }));
        } else {
            // 获取新单词（还没学过的）
            const learnedWordIds = await StudyRecord.find({ userId }).distinct('wordId');
            const query = { _id: { $nin: learnedWordIds } };
            if (bookId) query.bookId = bookId;

            words = await Word.find(query).limit(parseInt(limit)).sort({ unit: 1 });
        }

        res.json({ success: true, data: { words, mode, count: words.length } });
    } catch (err) {
        console.error('获取学习会话错误:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// POST /api/study/submit - 提交学习结果
router.post('/submit', authenticate, async (req, res) => {
    try {
        const { wordId, bookId, quality, studyMode, timeSpent, isCorrect } = req.body;
        const userId = req.user._id;

        // quality: 0-5 (SM-2算法质量评分)
        // 0-1: 完全忘记  2: 想起来了但很难  3: 正确但有些困难  4: 正确  5: 完全记住

        let record = await StudyRecord.findOne({ userId, wordId });

        if (!record) {
            record = new StudyRecord({ userId, wordId, bookId });
        }

        // 应用SM-2算法
        record.calculateNextReview(quality);

        // 记录历史
        record.history.push({
            quality,
            studyMode,
            timeSpent: timeSpent || 0,
            isCorrect,
            reviewedAt: new Date()
        });

        await record.save();

        // 更新用户积分
        const points = isCorrect ? 10 : 2;
        await User.findByIdAndUpdate(userId, {
            $inc: {
                'stats.points': points,
                'stats.totalCorrect': isCorrect ? 1 : 0,
                'stats.totalAnswered': 1
            }
        });

        // 更新每日统计
        const today = moment().format('YYYY-MM-DD');
        await DailyStat.findOneAndUpdate(
            { userId, date: today },
            {
                $inc: {
                    wordsLearned: record.repetitions === 1 ? 1 : 0,
                    wordsReviewed: record.repetitions > 1 ? 1 : 0,
                    correctCount: isCorrect ? 1 : 0,
                    wrongCount: isCorrect ? 0 : 1,
                    studyTime: Math.ceil((timeSpent || 0) / 60),
                    pointsEarned: points
                },
                $addToSet: { modesUsed: studyMode }
            },
            { upsert: true, new: true }
        );

        // 检查徽章解锁
        await checkBadges(userId);

        res.json({
            success: true,
            message: '学习记录已保存',
            data: {
                nextReviewDate: record.nextReviewDate,
                memoryStatus: record.memoryStatus,
                interval: record.interval,
                pointsEarned: points
            }
        });
    } catch (err) {
        console.error('提交学习结果错误:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// GET /api/study/today - 今日学习统计
router.get('/today', authenticate, async (req, res) => {
    try {
        const today = moment().format('YYYY-MM-DD');
        const stat = await DailyStat.findOne({ userId: req.user._id, date: today });

        // 今日待复习数量
        const reviewCount = await StudyRecord.countDocuments({
            userId: req.user._id,
            nextReviewDate: { $lte: new Date() },
            memoryStatus: { $in: ['learning', 'review'] }
        });

        res.json({
            success: true,
            data: {
                todayStat: stat || { wordsLearned: 0, wordsReviewed: 0, correctCount: 0, wrongCount: 0, studyTime: 0 },
                reviewDue: reviewCount,
                dailyGoal: req.user.settings.dailyGoal
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 检查徽章解锁
async function checkBadges(userId) {
    try {
        const user = await User.findById(userId);
        const newBadges = [];
        const earnedBadgeIds = user.badges.map(b => b.id);

        const BADGES = [
            { id: 'first_word', name: '初学乍练', description: '学习第一个单词', icon: '🌱', condition: u => u.stats.totalAnswered >= 1 },
            { id: 'ten_words', name: '初露锋芒', description: '学习10个单词', icon: '⭐', condition: u => u.stats.totalAnswered >= 10 },
            { id: 'hundred_words', name: '百词斩', description: '记忆100个单词', icon: '🏆', condition: u => u.stats.totalAnswered >= 100 },
            { id: 'three_day_streak', name: '坚持三天', description: '连续学习3天', icon: '🔥', condition: u => u.stats.currentStreak >= 3 },
            { id: 'week_streak', name: '一周达人', description: '连续学习7天', icon: '💎', condition: u => u.stats.currentStreak >= 7 },
            { id: 'perfect_score', name: '满分达人', description: '正确率达到90%以上', icon: '🎯', condition: u => u.stats.totalAnswered > 10 && (u.stats.totalCorrect / u.stats.totalAnswered) >= 0.9 },
            { id: 'thousand_points', name: '积分达人', description: '积累1000积分', icon: '💰', condition: u => u.stats.points >= 1000 },
        ];

        for (const badge of BADGES) {
            if (!earnedBadgeIds.includes(badge.id) && badge.condition(user)) {
                newBadges.push({ id: badge.id, name: badge.name, description: badge.description, icon: badge.icon, earnedAt: new Date() });
            }
        }

        if (newBadges.length > 0) {
            user.badges.push(...newBadges);
            await user.save();
        }

        return newBadges;
    } catch (err) {
        console.error('检查徽章错误:', err);
    }
}

module.exports = router;
