/**
 * 单词管理路由
 * 支持CRUD、批量导入导出
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Word = require('../models/Word');
const WordBook = require('../models/WordBook');
const { authenticate, authorize } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/words - 获取单词列表
router.get('/', authenticate, async (req, res) => {
    try {
        const { bookId, unit, page = 1, limit = 50, search, difficulty } = req.query;
        const query = {};

        if (bookId) query.bookId = bookId;
        if (unit) query.unit = parseInt(unit);
        if (difficulty) query.difficulty = parseInt(difficulty);
        if (search) {
            query.$or = [
                { word: { $regex: search, $options: 'i' } },
                { translation: { $regex: search, $options: 'i' } }
            ];
        }

        const total = await Word.countDocuments(query);
        const words = await Word.find(query)
            .sort({ unit: 1, createdAt: 1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({ success: true, data: { words, total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// POST /api/words - 添加单词
router.post('/', authenticate, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const word = new Word(req.body);
        await word.save();

        // 更新单词书计数
        await WordBook.findByIdAndUpdate(word.bookId, { $inc: { totalWords: 1 } });

        res.status(201).json({ success: true, message: '单词添加成功', data: { word } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// PUT /api/words/:id - 更新单词
router.put('/:id', authenticate, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const word = await Word.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!word) return res.status(404).json({ success: false, message: '单词不存在' });
        res.json({ success: true, message: '更新成功', data: { word } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// DELETE /api/words/:id - 删除单词
router.delete('/:id', authenticate, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const word = await Word.findByIdAndDelete(req.params.id);
        if (!word) return res.status(404).json({ success: false, message: '单词不存在' });
        await WordBook.findByIdAndUpdate(word.bookId, { $inc: { totalWords: -1 } });
        res.json({ success: true, message: '删除成功' });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// POST /api/words/import - 批量导入（Excel/CSV）
router.post('/import', authenticate, authorize('teacher', 'admin'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: '请上传文件' });
        const { bookId } = req.body;
        if (!bookId) return res.status(400).json({ success: false, message: '请指定单词书' });

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        const words = rows.map(row => ({
            bookId,
            word: row['单词'] || row['word'] || '',
            phonetic: row['音标'] || row['phonetic'] || '',
            translation: row['释义'] || row['translation'] || '',
            example: row['例句'] || row['example'] || '',
            exampleTranslation: row['例句翻译'] || row['exampleTranslation'] || '',
            unit: parseInt(row['单元'] || row['unit'] || 1),
            difficulty: parseInt(row['难度'] || row['difficulty'] || 1)
        })).filter(w => w.word && w.translation);

        if (words.length === 0) {
            return res.status(400).json({ success: false, message: '文件中没有有效单词数据' });
        }

        await Word.insertMany(words);
        await WordBook.findByIdAndUpdate(bookId, { $inc: { totalWords: words.length } });

        res.json({ success: true, message: `成功导入 ${words.length} 个单词`, data: { count: words.length } });
    } catch (err) {
        console.error('导入错误:', err);
        res.status(500).json({ success: false, message: '导入失败' });
    }
});

// GET /api/words/export/:bookId - 导出单词
router.get('/export/:bookId', authenticate, async (req, res) => {
    try {
        const words = await Word.find({ bookId: req.params.bookId }).sort({ unit: 1 });

        const data = words.map(w => ({
            '单元': w.unit,
            '单词': w.word,
            '音标': w.phonetic,
            '释义': w.translation,
            '例句': w.example,
            '例句翻译': w.exampleTranslation,
            '难度': w.difficulty
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '单词列表');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=words_${req.params.bookId}.xlsx`);
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ success: false, message: '导出失败' });
    }
});

module.exports = router;
