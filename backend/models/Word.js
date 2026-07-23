/**
 * 单词数据模型
 */

const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
    bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WordBook',
        required: true,
        index: true
    },
    word: {
        type: String,
        required: true,
        trim: true
    },
    phonetic: {
        type: String,
        default: ''
    },
    translation: {
        type: String,
        required: true
    },
    partOfSpeech: {
        type: String,
        default: '' // n./v./adj./adv. 等
    },
    example: {
        type: String,
        default: ''
    },
    exampleTranslation: {
        type: String,
        default: ''
    },
    unit: {
        type: Number,
        required: true,
        default: 1
    },
    difficulty: {
        type: Number,
        min: 1,
        max: 5,
        default: 1
    },
    tags: [String],
    audioUrl: {
        type: String,
        default: ''
    },
    imageUrl: {
        type: String,
        default: ''
    },
    synonyms: [String],
    antonyms: [String]
}, {
    timestamps: true
});

wordSchema.index({ bookId: 1, unit: 1 });
wordSchema.index({ word: 'text' });

module.exports = mongoose.model('Word', wordSchema);
