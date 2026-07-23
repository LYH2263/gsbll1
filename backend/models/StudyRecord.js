/**
 * 学习记录数据模型
 * 基于艾宾浩斯遗忘曲线的记忆算法
 */

const mongoose = require('mongoose');

const studyRecordSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    wordId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Word',
        required: true
    },
    bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WordBook',
        required: true
    },
    // 艾宾浩斯算法相关字段（SM-2算法）
    easeFactor: {
        type: Number,
        default: 2.5 // 难度因子，最小1.3
    },
    interval: {
        type: Number,
        default: 0 // 复习间隔（天）
    },
    repetitions: {
        type: Number,
        default: 0 // 成功复习次数
    },
    nextReviewDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    lastReviewDate: {
        type: Date,
        default: null
    },
    // 记忆状态
    memoryStatus: {
        type: String,
        enum: ['new', 'learning', 'review', 'mastered'],
        default: 'new'
    },
    // 记忆质量分 0-5
    lastQuality: {
        type: Number,
        default: 0
    },
    // 正确/错误次数统计
    correctCount: {
        type: Number,
        default: 0
    },
    wrongCount: {
        type: Number,
        default: 0
    },
    // 是否标记为重点
    isStarred: {
        type: Boolean,
        default: false
    },
    // 错题标记
    isWrongWord: {
        type: Boolean,
        default: false
    },
    // 学习历史记录
    history: [{
        quality: Number,        // 0-5 记忆质量
        studyMode: String,      // 学习模式
        timeSpent: Number,      // 本次用时（秒）
        isCorrect: Boolean,
        reviewedAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

studyRecordSchema.index({ userId: 1, wordId: 1 }, { unique: true });
studyRecordSchema.index({ userId: 1, nextReviewDate: 1 });
studyRecordSchema.index({ userId: 1, isStarred: 1 });
studyRecordSchema.index({ userId: 1, isWrongWord: 1 });

/**
 * SM-2 艾宾浩斯算法计算下次复习时间
 * @param {number} quality - 记忆质量 0-5
 */
studyRecordSchema.methods.calculateNextReview = function (quality) {
    // quality: 0-5
    // 0-2: 回答错误，重置
    // 3-5: 回答正确，按算法增加间隔

    if (quality < 3) {
        // 答错，重置复习间隔
        this.repetitions = 0;
        this.interval = 1;
    } else {
        if (this.repetitions === 0) {
            this.interval = 1;
        } else if (this.repetitions === 1) {
            this.interval = 6;
        } else {
            this.interval = Math.round(this.interval * this.easeFactor);
        }
        this.repetitions += 1;

        // 更新难度因子
        this.easeFactor = Math.max(1.3,
            this.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        );
    }

    // 设置下次复习时间
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + this.interval);
    this.nextReviewDate = nextDate;
    this.lastReviewDate = new Date();
    this.lastQuality = quality;

    // 更新正确/错误计数
    if (quality >= 3) {
        this.correctCount += 1;
        this.isWrongWord = false;
    } else {
        this.wrongCount += 1;
        this.isWrongWord = true;
    }

    // 更新记忆状态
    if (this.repetitions === 0) {
        this.memoryStatus = 'learning';
    } else if (this.repetitions < 3) {
        this.memoryStatus = 'learning';
    } else if (this.interval >= 21) {
        this.memoryStatus = 'mastered';
    } else {
        this.memoryStatus = 'review';
    }

    return this;
};

module.exports = mongoose.model('StudyRecord', studyRecordSchema);
