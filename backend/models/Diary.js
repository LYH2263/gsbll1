/**
 * 学习日记数据模型
 * 每个用户每个自然日仅一篇
 */

const mongoose = require('mongoose');

const diarySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    date: {
        type: String, // YYYY-MM-DD（用户本地自然日）
        required: true,
        index: true
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
        enum: ['sunny', 'cloudy', 'rainy'],
        required: true
    },
    wordsLearned: {
        type: Number,
        default: 0,
        min: 0
    },
    // 创建当日是否已发放首写奖励（用于并发兜底，避免重复发奖）
    awarded: {
        type: Boolean,
        default: false
    },
    // 创建时记录的连续打卡天数（用于里程碑奖励判定）
    streakSnapshot: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// 同一用户同一自然日唯一
diarySchema.index({ userId: 1, date: 1 }, { unique: true });
diarySchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Diary', diarySchema);
