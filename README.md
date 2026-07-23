# WordMaster - 智能单词记忆平台

> 基于艾宾浩斯遗忘曲线的学生单词记忆系统，端口号 **3014**

## 🚀 快速启动

```bash
cd label-3014
docker compose up -d --build
```

访问地址：**http://localhost:3014**

## 📋 默认账号

| 账号类型 | 邮箱 | 密码 |
|---------|------|------|
| 管理员 | admin@wordmaster.com | Admin@2024 |
| 教师 | teacher@wordmaster.com | Teacher@2024 |
| 学生 | 注册新账号 | 自定义 |

## 🏗️ 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vue 3 + Vite + Pinia + Vue Router |
| 后端 | Node.js + Express |
| 数据库 | MongoDB |
| 部署 | Docker + Nginx |
| 端口 | 3014 (前端) / 5000 (API) |

## ✨ 功能特性

### 1. 单词库管理
- 按教材版本、年级、单元层级分类
- 添加、编辑、删除单词
- Excel 批量导入/导出
- 单词朗读（TTS）

### 2. 科学记忆算法
- 基于 **SM-2 艾宾浩斯遗忘曲线**算法
- 根据记忆质量动态调整复习间隔
- 记忆状态：新词 → 学习中 → 复习中 → 已掌握

### 3. 三种学习模式
- 🎯 **词义匹配**：看单词选释义
- ✏️ **拼写练习**：看中文拼英文
- 🎧 **听力辨词**：听发音拼单词

每种模式包含计时、评分、记忆质量反馈

### 4. 数据可视化
- 每日学习量柱状图
- 记忆状态分布饼图
- 30天学习热力图
- 正确率趋势图
- 数据导出（Excel）

### 5. 错题与重点
- 自动记录错题
- 手动标记重点单词
- 错题集专项查看
- 重点单词强化

### 6. 激励机制
- 积分系统（答对+10分，答错+2分）
- 7种成就徽章
- 连续学习天数
- 等级升级系统
- 积分排行榜

### 7. 多角色权限
- **学生**：学习、复习、查看统计
- **教师**：管理单词书和单词
- **管理员**：用户管理、角色分配

## 📁 项目结构

```
label-3014/
├── docker-compose.yml
├── frontend/
│   ├── src/
│   │   ├── views/        # 页面视图
│   │   ├── components/   # 公共组件
│   │   ├── stores/       # Pinia状态管理
│   │   ├── router/       # Vue Router配置
│   │   ├── utils/        # 工具函数
│   │   └── styles/       # 全局CSS
│   ├── Dockerfile
│   └── nginx.conf
└── backend/
    ├── models/           # Mongoose数据模型
    ├── routes/           # Express路由
    ├── middleware/       # 中间件（JWT等）
    ├── init-mongo.js     # 数据库初始化
    ├── server.js         # 服务器入口
    └── Dockerfile
```

## 📱 响应式设计

- 桌面端（≥1200px）：侧边栏导航
- 平板端（768px-1200px）：适配布局
- 移动端（≤768px）：底部导航栏

## 🔧 常用命令

```bash
# 启动
docker compose up -d --build

# 停止
docker compose down

# 查看日志
docker compose logs -f backend
docker compose logs -f frontend

# 重启服务
docker compose restart backend
```
