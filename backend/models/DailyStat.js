/**
 * 每日学习统计模型
 */

const mongoose = require('mongoose');

const dailyStatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: String, // YYYY-MM-DD
        required: true
    },
    wordsLearned: { type: Number, default: 0 },
    wordsReviewed: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    studyTime: { type: Number, default: 0 }, // 分钟
    pointsEarned: { type: Number, default: 0 },
    modesUsed: [String],
    goalCompleted: { type: Boolean, default: false }
}, {
    timestamps: true
});

dailyStatSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyStat', dailyStatSchema);
