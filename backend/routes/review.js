/**
 * 复习功能路由
 * 错题集、重点标记、强化训练
 */

const express = require('express');
const router = express.Router();
const StudyRecord = require('../models/StudyRecord');
const { authenticate } = require('../middleware/auth');

// GET /api/review/wrong - 获取错题集
router.get('/wrong', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const total = await StudyRecord.countDocuments({ userId: req.user._id, isWrongWord: true });
        const records = await StudyRecord.find({ userId: req.user._id, isWrongWord: true })
            .populate('wordId')
            .populate('bookId', 'name')
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({ success: true, data: { records: records.filter(r => r.wordId), total } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// GET /api/review/starred - 获取重点单词
router.get('/starred', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const total = await StudyRecord.countDocuments({ userId: req.user._id, isStarred: true });
        const records = await StudyRecord.find({ userId: req.user._id, isStarred: true })
            .populate('wordId')
            .populate('bookId', 'name')
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({ success: true, data: { records: records.filter(r => r.wordId), total } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// POST /api/review/star/:wordId - 标记/取消标记重点
router.post('/star/:wordId', authenticate, async (req, res) => {
    try {
        const { bookId } = req.body;
        let record = await StudyRecord.findOne({ userId: req.user._id, wordId: req.params.wordId });

        if (!record) {
            record = new StudyRecord({
                userId: req.user._id,
                wordId: req.params.wordId,
                bookId: bookId
            });
        }

        record.isStarred = !record.isStarred;
        await record.save();

        res.json({ success: true, message: record.isStarred ? '已标记为重点' : '已取消重点标记', data: { isStarred: record.isStarred } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// GET /api/review/status/:wordId - 获取单词的学习状态
router.get('/status/:wordId', authenticate, async (req, res) => {
    try {
        const record = await StudyRecord.findOne({ userId: req.user._id, wordId: req.params.wordId });
        res.json({ success: true, data: { record } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// GET /api/review/due - 获取今日到期复习单词
router.get('/due', authenticate, async (req, res) => {
    try {
        const { bookId } = req.query;
        const query = {
            userId: req.user._id,
            nextReviewDate: { $lte: new Date() },
            memoryStatus: { $in: ['learning', 'review'] }
        };
        if (bookId) query.bookId = bookId;

        const count = await StudyRecord.countDocuments(query);
        const records = await StudyRecord.find(query)
            .populate('wordId')
            .sort({ nextReviewDate: 1 })
            .limit(50);

        res.json({
            success: true,
            data: {
                count,
                words: records.filter(r => r.wordId).map(r => ({
                    recordId: r._id,
                    ...r.wordId.toObject(),
                    memoryStatus: r.memoryStatus,
                    repetitions: r.repetitions
                }))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

module.exports = router;
