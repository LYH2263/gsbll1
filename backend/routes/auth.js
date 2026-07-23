/**
 * 用户认证路由
 * 注册、登录、获取当前用户信息
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, generateToken } = require('../middleware/auth');

// POST /api/auth/register - 用户注册
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role, school, grade, nickname } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: '用户名、邮箱和密码不能为空' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: existingUser.email === email ? '该邮箱已被注册' : '该用户名已被占用'
            });
        }

        // 只允许注册学生和教师，管理员需要手动创建
        const allowedRoles = ['student', 'teacher'];
        const userRole = allowedRoles.includes(role) ? role : 'student';

        const user = new User({
            username,
            email,
            password,
            role: userRole,
            profile: { nickname: nickname || username, school: school || '', grade: grade || '' }
        });

        await user.save();

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: '注册成功',
            data: { user: user.toJSON(), token }
        });
    } catch (err) {
        console.error('注册错误:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// POST /api/auth/login - 用户登录
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: '请输入邮箱和密码' });
        }

        const user = await User.findOne({ email });
        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, message: '邮箱或密码错误' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: '邮箱或密码错误' });
        }

        // 更新最后活跃时间
        const today = new Date().toISOString().split('T')[0];
        const lastActive = user.lastActiveDate ? user.lastActiveDate.toISOString().split('T')[0] : null;

        if (lastActive !== today) {
            user.lastActiveDate = new Date();
            if (lastActive === new Date(Date.now() - 86400000).toISOString().split('T')[0]) {
                user.stats.currentStreak = (user.stats.currentStreak || 0) + 1;
                user.stats.maxStreak = Math.max(user.stats.maxStreak || 0, user.stats.currentStreak);
            } else if (lastActive !== today) {
                user.stats.currentStreak = 1;
            }
            user.stats.studyDays = (user.stats.studyDays || 0) + 1;
            await user.save();
        }

        const token = generateToken(user._id);

        res.json({
            success: true,
            message: '登录成功',
            data: { user: user.toJSON(), token }
        });
    } catch (err) {
        console.error('登录错误:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// GET /api/auth/me - 获取当前用户信息
router.get('/me', authenticate, async (req, res) => {
    try {
        res.json({ success: true, data: { user: req.user } });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// PUT /api/auth/password - 修改密码
router.put('/password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id);
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: '当前密码错误' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: '密码修改成功' });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

module.exports = router;
