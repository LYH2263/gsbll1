/**
 * 用户数据模型
 * 支持学生、教师、管理员三种角色
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['student', 'teacher', 'admin'],
        default: 'student'
    },
    profile: {
        nickname: { type: String, default: '' },
        avatar: { type: String, default: '' },
        grade: { type: String, default: '' },
        school: { type: String, default: '' },
        bio: { type: String, default: '' }
    },
    stats: {
        totalWords: { type: Number, default: 0 },
        masteredWords: { type: Number, default: 0 },
        studyDays: { type: Number, default: 0 },
        totalStudyTime: { type: Number, default: 0 }, // 分钟
        currentStreak: { type: Number, default: 0 },
        maxStreak: { type: Number, default: 0 },
        points: { type: Number, default: 0 },
        level: { type: Number, default: 1 },
        totalCorrect: { type: Number, default: 0 },
        totalAnswered: { type: Number, default: 0 }
    },
    badges: [{
        id: String,
        name: String,
        description: String,
        icon: String,
        earnedAt: Date
    }],
    settings: {
        dailyGoal: { type: Number, default: 20 },
        reviewReminder: { type: Boolean, default: true },
        soundEnabled: { type: Boolean, default: true },
        theme: { type: String, default: 'light' }
    },
    lastActiveDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

// 密码加密中间件
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// 验证密码
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// 序列化时移除密码
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
