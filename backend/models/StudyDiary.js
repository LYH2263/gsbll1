/**
 * 学习日记模型
 * 记录用户每日学习心情与内容，同一用户同一自然日仅一篇
 */

const mongoose = require('mongoose');

const studyDiarySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: String, // YYYY-MM-DD
        required: true
    },
    content: {
        type: String,
        required: true,
        minlength: 12,
        maxlength: 480,
        trim: true
    },
    mood: {
        type: String,
        enum: ['sunny', 'cloudy', 'rainy'],
        default: 'sunny'
    },
    wordsLearned: {
        type: Number,
        default: 0,
        min: 0
    },
    pointsEarned: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// 同一用户同一自然日仅一篇
studyDiarySchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('StudyDiary', studyDiarySchema);
