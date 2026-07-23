/**
 * 单词书数据模型
 * 按教材版本、年级、单元进行层级分类
 */

const mongoose = require('mongoose');

const wordBookSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    version: {
        type: String,
        required: true,
        trim: true
    },
    grade: {
        type: String,
        required: true
    },
    semester: {
        type: String,
        default: '上册'
    },
    description: {
        type: String,
        default: ''
    },
    coverColor: {
        type: String,
        default: '#4F46E5'
    },
    coverIcon: {
        type: String,
        default: '📚'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    totalWords: {
        type: Number,
        default: 0
    },
    units: [{
        number: Number,
        title: String
    }],
    subscribers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('WordBook', wordBookSchema);
