/**
 * 单词书路由
 */

const express = require('express');
const router = express.Router();
const WordBook = require('../models/WordBook');
const Word = require('../models/Word');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/wordbooks - 获取单词书列表
router.get('/', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const query = { isPublic: true };
        if (search) query.name = { $regex: search, $options: 'i' };

        const total = await WordBook.countDocuments(query);
        const books = await WordBook.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('createdBy', 'username profile.nickname');

        res.json({ success: true, data: { books, total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// POST /api/wordbooks - 创建单词书
router.post('/', authenticate, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { name, version, grade, semester, description, coverColor, coverIcon } = req.body;

        const book = new WordBook({
            name, version, grade, semester, description,
            coverColor: coverColor || '#4F46E5',
            coverIcon: coverIcon || '📚',
            createdBy: req.user._id
        });

        await book.save();
        res.status(201).json({ success: true, message: '单词书创建成功', data: { book } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// GET /api/wordbooks/:id - 获取单词书详情
router.get('/:id', authenticate, async (req, res) => {
    try {
        const book = await WordBook.findById(req.params.id)
            .populate('createdBy', 'username profile.nickname');
        if (!book) return res.status(404).json({ success: false, message: '单词书不存在' });

        // 查询单元信息
        const unitAgg = await Word.aggregate([
            { $match: { bookId: book._id } },
            { $group: { _id: '$unit', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        res.json({ success: true, data: { book, units: unitAgg } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// PUT /api/wordbooks/:id - 更新单词书
router.put('/:id', authenticate, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const book = await WordBook.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );
        if (!book) return res.status(404).json({ success: false, message: '单词书不存在' });
        res.json({ success: true, message: '更新成功', data: { book } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// DELETE /api/wordbooks/:id - 删除单词书
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        await WordBook.findByIdAndDelete(req.params.id);
        await Word.deleteMany({ bookId: req.params.id });
        res.json({ success: true, message: '删除成功' });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

module.exports = router;
