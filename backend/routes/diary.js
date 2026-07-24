/**
 * 学习日记路由
 * 处理日记提交、按月查询、连续打卡天数
 */

const express = require('express');
const router = express.Router();
const Diary = require('../models/Diary');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const moment = require('moment');

/**
 * POST /api/diary
 * 提交或更新当日日记
 * 同一用户同一自然日仅一篇；首次创建 +17 积分；连续打卡每到 7 的倍数额外 +53
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { content, mood, wordsLearned, date } = req.body;
        const userId = req.user._id;
        const today = date || moment().format('YYYY-MM-DD');

        if (!moment(today, 'YYYY-MM-DD', true).isValid()) {
            return res.status(400).json({ success: false, message: '日期格式无效，应为 YYYY-MM-DD' });
        }

        if (!content || typeof content !== 'string') {
            return res.status(400).json({ success: false, message: '日记内容不能为空' });
        }
        const trimmedContent = content.trim();
        if (trimmedContent.length < 12 || trimmedContent.length > 480) {
            return res.status(400).json({ success: false, message: '日记内容长度需在 12-480 字符之间' });
        }

        if (!['sunny', 'cloudy', 'rainy'].includes(mood)) {
            return res.status(400).json({ success: false, message: '心情值无效，应为 sunny/cloudy/rainy' });
        }

        const wordsCount = Number(wordsLearned) || 0;
        if (wordsCount < 0 || !Number.isInteger(wordsCount)) {
            return res.status(400).json({ success: false, message: '学习单词数需为非负整数' });
        }

        const existing = await Diary.findOne({ userId, date: today });
        let isNew = false;
        let pointsEarned = 0;
        let streakBonus = 0;

        if (existing) {
            existing.content = trimmedContent;
            existing.mood = mood;
            existing.wordsLearned = wordsCount;
            await existing.save();
        } else {
            const serverToday = moment().format('YYYY-MM-DD');
            if (today !== serverToday) {
                return res.status(400).json({ success: false, message: '只能为今天创建日记，过去的日期无法补签' });
            }

            isNew = true;
            const diary = new Diary({
                userId,
                date: today,
                content: trimmedContent,
                mood,
                wordsLearned: wordsCount
            });
            await diary.save();

            pointsEarned = 17;

            const streak = await calculateStreak(userId, today);

            if (streak > 0 && streak % 7 === 0) {
                streakBonus = 53;
            }

            const totalPoints = pointsEarned + streakBonus;
            await User.findByIdAndUpdate(userId, {
                $inc: { 'stats.points': totalPoints }
            });
        }

        const savedDiary = await Diary.findOne({ userId, date: today });

        res.json({
            success: true,
            message: isNew ? '日记已保存' : '日记已更新',
            data: {
                diary: savedDiary,
                isNew,
                pointsEarned: pointsEarned + streakBonus,
                basePoints: pointsEarned,
                streakBonus
            }
        });
    } catch (err) {
        console.error('提交日记错误:', err);
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: '今日日记已存在，请更新而非重复创建' });
        }
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

/**
 * GET /api/diary/month
 * 按月查询日记
 * Query: year=YYYY, month=MM (1-12)
 */
router.get('/month', authenticate, async (req, res) => {
    try {
        const { year, month } = req.query;
        const userId = req.user._id;

        const y = parseInt(year);
        const m = parseInt(month);

        if (!y || !m || m < 1 || m > 12) {
            return res.status(400).json({ success: false, message: '请提供有效的 year 和 month 参数' });
        }

        const startDate = moment({ year: y, month: m - 1, day: 1 }).format('YYYY-MM-DD');
        const endDate = moment({ year: y, month: m - 1, day: 1 }).endOf('month').format('YYYY-MM-DD');

        const diaries = await Diary.find({
            userId,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 });

        res.json({
            success: true,
            data: {
                year: y,
                month: m,
                diaries,
                count: diaries.length
            }
        });
    } catch (err) {
        console.error('查询月日记错误:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

/**
 * GET /api/diary/streak
 * 获取连续打卡天数
 */
router.get('/streak', authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const today = moment().format('YYYY-MM-DD');
        const streak = await calculateStreak(userId, today);

        const todayDiary = await Diary.findOne({ userId, date: today });

        res.json({
            success: true,
            data: {
                streak,
                todayCheckedIn: !!todayDiary,
                todayDiary: todayDiary || null
            }
        });
    } catch (err) {
        console.error('获取连续打卡天数错误:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

/**
 * 计算连续打卡天数
 * 从 today 开始向前数，连续有日记的天数
 */
async function calculateStreak(userId, todayStr) {
    const dates = await Diary.find({ userId }).distinct('date');
    const dateSet = new Set(dates);

    let streak = 0;
    let cursor = moment(todayStr, 'YYYY-MM-DD');

    while (true) {
        const d = cursor.format('YYYY-MM-DD');
        if (dateSet.has(d)) {
            streak++;
            cursor.subtract(1, 'day');
        } else {
            break;
        }

        if (streak > 3650) break;
    }

    return streak;
}

module.exports = router;
