/**
 * 学习日记路由
 * 提交/更新当日日记、按月查询、连续打卡天数统计
 * 业务规则：
 *   - 同一用户同一自然日仅一篇日记
 *   - content 长度 12–480
 *   - 当日首次创建奖励 17 积分，同日更新不重复发奖
 *   - 首次创建后计算连续打卡天数，每到 7 的倍数额外 +53
 */

const express = require('express');
const router = express.Router();
const StudyDiary = require('../models/StudyDiary');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const moment = require('moment');

const CREATE_REWARD = 17;      // 当日首次创建奖励
const STREAK_BONUS = 53;       // 连续打卡到 7 的倍数额外奖励
const STREAK_MILESTONE = 7;    // 连续打卡里程碑
const MOODS = ['sunny', 'cloudy', 'rainy'];

/**
 * 计算截止到指定日期（含当日）的连续打卡天数
 * 从 endDate 往前逐日回溯，直到某日没有日记为止
 */
async function calcStreak(userId, endDate) {
    const dates = await StudyDiary.find({ userId }).distinct('date');
    const dateSet = new Set(dates);
    let streak = 0;
    let cursor = moment(endDate, 'YYYY-MM-DD');
    while (dateSet.has(cursor.format('YYYY-MM-DD'))) {
        streak += 1;
        cursor.subtract(1, 'day');
    }
    return streak;
}

// POST /api/diary - 提交或更新当日日记
router.post('/', authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const { content, mood, wordsLearned } = req.body;

        // 校验内容长度
        const text = typeof content === 'string' ? content.trim() : '';
        if (text.length < 12 || text.length > 480) {
            return res.status(400).json({ success: false, message: '日记内容长度需在 12–480 字之间' });
        }

        // 校验心情
        const finalMood = MOODS.includes(mood) ? mood : 'sunny';
        const words = Math.max(0, parseInt(wordsLearned) || 0);
        const today = moment().format('YYYY-MM-DD');

        let diary = await StudyDiary.findOne({ userId, date: today });

        let pointsAwarded = 0;
        let streakBonus = 0;
        let isNew = false;

        if (diary) {
            // 同日更新，不重复发奖
            diary.content = text;
            diary.mood = finalMood;
            diary.wordsLearned = words;
            await diary.save();
        } else {
            // 当日首次创建
            isNew = true;
            diary = new StudyDiary({
                userId,
                date: today,
                content: text,
                mood: finalMood,
                wordsLearned: words
            });

            pointsAwarded = CREATE_REWARD;

            // 计算连续打卡天数（含今日），每到 7 的倍数额外 +53
            const streak = await calcStreak(userId, today);
            if (streak > 0 && streak % STREAK_MILESTONE === 0) {
                streakBonus = STREAK_BONUS;
            }

            const totalPoints = pointsAwarded + streakBonus;
            diary.pointsEarned = totalPoints;
            await diary.save();

            if (totalPoints > 0) {
                await User.findByIdAndUpdate(userId, {
                    $inc: { 'stats.points': totalPoints }
                });
            }
        }

        const streak = await calcStreak(userId, today);

        res.json({
            success: true,
            message: isNew ? '日记已保存' : '日记已更新',
            data: {
                diary,
                isNew,
                pointsEarned: pointsAwarded + streakBonus,
                createReward: pointsAwarded,
                streakBonus,
                streak
            }
        });
    } catch (err) {
        // 唯一索引冲突（并发重复提交）
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: '今日日记已存在，请刷新后重试' });
        }
        console.error('提交学习日记错误:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// GET /api/diary/month - 按月查询日记（含月历标记）
router.get('/month', authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        // month 形如 YYYY-MM，缺省为当前月
        const month = /^\d{4}-\d{2}$/.test(req.query.month || '')
            ? req.query.month
            : moment().format('YYYY-MM');

        const start = moment(month, 'YYYY-MM').startOf('month').format('YYYY-MM-DD');
        const end = moment(month, 'YYYY-MM').endOf('month').format('YYYY-MM-DD');

        const diaries = await StudyDiary.find({
            userId,
            date: { $gte: start, $lte: end }
        }).sort({ date: 1 });

        res.json({
            success: true,
            data: {
                month,
                diaries
            }
        });
    } catch (err) {
        console.error('查询学习日记错误:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// GET /api/diary/streak - 连续打卡天数
router.get('/streak', authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const today = moment().format('YYYY-MM-DD');
        const streak = await calcStreak(userId, today);
        const totalDays = await StudyDiary.countDocuments({ userId });

        res.json({
            success: true,
            data: {
                streak,
                totalDays,
                nextMilestone: (Math.floor(streak / STREAK_MILESTONE) + 1) * STREAK_MILESTONE
            }
        });
    } catch (err) {
        console.error('查询打卡天数错误:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

module.exports = router;
