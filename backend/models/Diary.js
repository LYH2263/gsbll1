/**
 * 学习日记数据模型
 * 同一用户同一自然日仅一篇
 */

const mongoose = require('mongoose');

const diarySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/
    },
    content: {
        type: String,
        required: true,
        trim: true,
        minlength: 12,
        maxlength: 480
    },
    mood: {
        type: String,
        required: true,
        enum: ['sunny', 'cloudy', 'rainy']
    },
    wordsLearned: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

diarySchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Diary', diarySchema);
