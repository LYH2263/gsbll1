/**
 * 学习日记路由
 * - POST /api/diaries            提交或更新当日日记（登录鉴权）
 * - GET  /api/diaries/month      按月查询日记
 * - GET  /api/diaries/streak     当前连续打卡天数
 */

const express = require('express');
const router = express.Router();
const moment = require('moment');
const Diary = require('../models/Diary');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const FIRST_WRITE_POINTS = 17;
const STREAK_MILESTONE_BONUS = 53;
const STREAK_MILESTONE_STEP = 7;
const CONTENT_MIN = 12;
const CONTENT_MAX = 480;
const VALID_MOODS = ['sunny', 'cloudy', 'rainy'];

/**
 * 计算以 anchorDate（YYYY-MM-DD）为结尾的连续打卡天数。
 * anchorDate 当天必须有日记，否则返回 0。
 * 向前逐天回推，遇到缺失即停止。
 */
async function computeStreakEndingAt(userId, anchorDate) {
    if (!anchorDate) return 0;
    const anchorMoment = moment(anchorDate, 'YYYY-MM-DD', true);
    if (!anchorMoment.isValid()) return 0;

    const hasAnchor = await Diary.exists({ userId, date: anchorDate });
    if (!hasAnchor) return 0;

    // 拉取从 anchor 向前最多 400 天的日期集合
    const startMoment = anchorMoment.clone().subtract(400, 'days');
    const diaries = await Diary.find({
        userId,
        date: { $gte: startMoment.format('YYYY-MM-DD'), $lte: anchorDate }
    }).select('date -_id').lean();

    const dateSet = new Set(diaries.map(d => d.date));
    let streak = 0;
    const cursor = anchorMoment.clone();
    while (dateSet.has(cursor.format('YYYY-MM-DD'))) {
        streak++;
        cursor.subtract(1, 'days');
    }
    return streak;
}

// POST /api/diaries - 提交或更新当日日记
router.post('/', authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const { content, mood, wordsLearned } = req.body || {};
        const today = moment().format('YYYY-MM-DD');

        // 参数校验
        if (typeof content !== 'string') {
            return res.status(400).json({ success: false, message: '日记内容不能为空' });
        }
        const trimmed = content.trim();
        if (trimmed.length < CONTENT_MIN || trimmed.length > CONTENT_MAX) {
            return res.status(400).json({
                success: false,
                message: `日记内容长度需在 ${CONTENT_MIN}-${CONTENT_MAX} 字之间`
            });
        }
        if (!VALID_MOODS.includes(mood)) {
            return res.status(400).json({ success: false, message: '心情值无效' });
        }
        const words = Number.isInteger(wordsLearned) ? wordsLearned : parseInt(wordsLearned, 10);
        if (Number.isNaN(words) || words < 0) {
            return res.status(400).json({ success: false, message: '今日所学单词数无效' });
        }

        const existing = await Diary.findOne({ userId, date: today });

        if (existing) {
            // 当日已存在：更新内容，不重复发放积分
            existing.content = trimmed;
            existing.mood = mood;
            existing.wordsLearned = words;
            await existing.save();

            const currentStreak = await computeStreakEndingAt(userId, today);
            return res.json({
                success: true,
                message: '日记已更新',
                data: {
                    diary: existing,
                    isNew: false,
                    pointsEarned: 0,
                    milestoneBonus: 0,
                    streak: currentStreak
                }
            });
        }

        // 首次创建当日日记：计算连续打卡与积分
        const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
        const prevStreak = await computeStreakEndingAt(userId, yesterday);
        const newStreak = prevStreak + 1;

        let pointsEarned = FIRST_WRITE_POINTS;
        let milestoneBonus = 0;
        if (newStreak % STREAK_MILESTONE_STEP === 0) {
            milestoneBonus = STREAK_MILESTONE_BONUS;
            pointsEarned += milestoneBonus;
        }

        const diary = new Diary({
            userId,
            date: today,
            content: trimmed,
            mood,
            wordsLearned: words,
            awarded: true,
            streakSnapshot: newStreak
        });
        await diary.save();

        // 发放积分（日记连续打卡天数由 /streak 接口独立计算，不写入用户总连击指标）
        await User.findByIdAndUpdate(userId, {
            $inc: { 'stats.points': pointsEarned }
        });

        let message;
        if (milestoneBonus > 0) {
            message = `今日首写 +${FIRST_WRITE_POINTS}，连续${newStreak}天里程碑额外 +${milestoneBonus}！`;
        } else {
            message = `今日首写奖励 +${FIRST_WRITE_POINTS}`;
        }

        return res.status(201).json({
            success: true,
            message,
            data: {
                diary,
                isNew: true,
                pointsEarned,
                firstWritePoints: FIRST_WRITE_POINTS,
                milestoneBonus,
                streak: newStreak
            }
        });
    } catch (err) {
        // 并发兜底：唯一索引冲突
        if (err && err.code === 11000) {
            return res.status(409).json({
                success: false,
                message: '今日日记已存在，请直接更新'
            });
        }
        console.error('提交日记错误:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// GET /api/diaries/month?year=YYYY&month=MM
router.get('/month', authenticate, async (req, res) => {
    try {
        const now = moment();
        const year = parseInt(req.query.year, 10) || now.year();
        const month = parseInt(req.query.month, 10) || (now.month() + 1);
        if (month < 1 || month > 12) {
            return res.status(400).json({ success: false, message: '月份无效' });
        }

        const mm = String(month).padStart(2, '0');
        const prefix = `${year}-${mm}`;
        const startStr = `${prefix}-01`;
        const endStr = moment(startStr).endOf('month').format('YYYY-MM-DD');

        const diaries = await Diary.find({
            userId: req.user._id,
            date: { $gte: startStr, $lte: endStr }
        }).sort({ date: 1 }).lean();

        const markedDates = diaries.map(d => d.date);
        const moodMap = {};
        const wordsMap = {};
        diaries.forEach(d => {
            moodMap[d.date] = d.mood;
            wordsMap[d.date] = d.wordsLearned;
        });

        res.json({
            success: true,
            data: {
                year,
                month,
                diaries,
                markedDates,
                moodMap,
                wordsMap
            }
        });
    } catch (err) {
        console.error('按月查询日记错误:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// GET /api/diaries/streak - 当前连续打卡天数
router.get('/streak', authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const today = moment().format('YYYY-MM-DD');
        const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');

        let anchor = null;
        if (await Diary.exists({ userId, date: today })) {
            anchor = today;
        } else if (await Diary.exists({ userId, date: yesterday })) {
            anchor = yesterday;
        }

        const streak = anchor ? await computeStreakEndingAt(userId, anchor) : 0;
        const todayDiary = await Diary.findOne({ userId, date: today }).lean();
        const nextMilestone = streak > 0
            ? (Math.ceil(streak / STREAK_MILESTONE_STEP) * STREAK_MILESTONE_STEP)
            : STREAK_MILESTONE_STEP;

        res.json({
            success: true,
            data: {
                streak,
                anchor,
                todayDiary: todayDiary || null,
                nextMilestone,
                daysToNextMilestone: nextMilestone - streak
            }
        });
    } catch (err) {
        console.error('查询连续打卡错误:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

module.exports = router;
