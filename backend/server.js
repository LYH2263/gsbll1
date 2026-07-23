/**
 * WordMaster 后端服务入口
 * 学生单词记忆系统 API 服务器
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// 路由模块
const authRoutes = require('./routes/auth');
const wordRoutes = require('./routes/words');
const wordBookRoutes = require('./routes/wordbooks');
const studyRoutes = require('./routes/study');
const statsRoutes = require('./routes/stats');
const userRoutes = require('./routes/users');
const reviewRoutes = require('./routes/review');

const app = express();
const PORT = process.env.PORT || 5014;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wordmaster';

// 信任 Nginx 反向代理（必须在限流中间件之前设置）
app.set('trust proxy', 1);

// 安全中间件
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// 请求日志
app.use(morgan('combined'));

// CORS 配置
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 限流
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: '请求过于频繁，请稍后再试' }
});
app.use('/api/', limiter);

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/words', wordRoutes);
app.use('/api/wordbooks', wordBookRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/review', reviewRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'WordMaster API 服务运行正常',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({ success: false, message: '接口不存在' });
});

// 全局错误处理
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || '服务器内部错误',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 连接数据库并启动服务器
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ MongoDB 连接成功');
    app.listen(PORT, () => {
        console.log(`🚀 WordMaster API 服务启动在端口 ${PORT}`);
    });
}).catch((err) => {
    console.error('❌ MongoDB 连接失败:', err);
    process.exit(1);
});

module.exports = app;
