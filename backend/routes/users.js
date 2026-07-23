/**
 * 用户管理路由
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/users/profile - 获取个人资料
router.get('/profile', authenticate, async (req, res) => {
    try {
        res.json({ success: true, data: { user: req.user } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// PUT /api/users/profile - 更新个人资料
router.put('/profile', authenticate, async (req, res) => {
    try {
        const { nickname, school, grade, bio, settings } = req.body;
        const updates = {};
        if (nickname) updates['profile.nickname'] = nickname;
        if (school !== undefined) updates['profile.school'] = school;
        if (grade !== undefined) updates['profile.grade'] = grade;
        if (bio !== undefined) updates['profile.bio'] = bio;
        if (settings) {
            if (settings.dailyGoal) updates['settings.dailyGoal'] = settings.dailyGoal;
            if (settings.soundEnabled !== undefined) updates['settings.soundEnabled'] = settings.soundEnabled;
            if (settings.reviewReminder !== undefined) updates['settings.reviewReminder'] = settings.reviewReminder;
        }

        const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true }).select('-password');
        res.json({ success: true, message: '资料更新成功', data: { user } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// GET /api/users - 获取用户列表（管理员）
router.get('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { page = 1, limit = 20, role, search } = req.query;
        const query = {};
        if (role) query.role = role;
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { 'profile.nickname': { $regex: search, $options: 'i' } }
            ];
        }

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({ success: true, data: { users, total } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// PUT /api/users/:id/status - 启用/禁用用户（管理员）
router.put('/:id/status', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { isActive } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
        res.json({ success: true, message: isActive ? '用户已启用' : '用户已禁用', data: { user } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// PUT /api/users/:id/role - 修改用户角色（管理员）
router.put('/:id/role', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { role } = req.body;
        if (!['student', 'teacher', 'admin'].includes(role)) {
            return res.status(400).json({ success: false, message: '无效的角色' });
        }
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
        res.json({ success: true, message: '角色更新成功', data: { user } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

module.exports = router;
