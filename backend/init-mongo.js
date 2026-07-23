/**
 * MongoDB 初始化脚本
 * 创建初始数据：管理员账号、示例单词库
 */

db = db.getSiblingDB('wordmaster');

// 创建集合索引
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.words.createIndex({ bookId: 1, unit: 1 });
db.studyrecords.createIndex({ userId: 1, wordId: 1 });
db.studyrecords.createIndex({ userId: 1, nextReviewDate: 1 });

// 插入初始管理员账号（密码: Admin@2024）
db.users.insertOne({
    username: 'admin',
    email: 'admin@wordmaster.com',
    password: '$2a$10$mRB09yILcx8k4msurFsKa.J7nN6TzTP8yOfHGPQsv.04yMQu4NXU.',
    role: 'admin',
    profile: {
        nickname: '系统管理员',
        avatar: '',
        grade: '',
        school: '示范学校'
    },
    stats: {
        totalWords: 0,
        masteredWords: 0,
        studyDays: 0,
        totalStudyTime: 0,
        currentStreak: 0,
        maxStreak: 0,
        points: 0,
        level: 1
    },
    badges: [],
    settings: {
        dailyGoal: 20,
        reviewReminder: true,
        soundEnabled: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
});

// 插入初始教师账号（密码: Teacher@2024）
db.users.insertOne({
    username: 'teacher',
    email: 'teacher@wordmaster.com',
    password: '$2a$10$599C6mhnbBSZ7AlubM7sieKSi/PWBHRKenGspB5119e3OYk0RLhTG',
    role: 'teacher',
    profile: {
        nickname: '示范教师',
        avatar: '',
        grade: '',
        school: '示范学校'
    },
    stats: {
        totalWords: 0,
        masteredWords: 0,
        studyDays: 0,
        totalStudyTime: 0,
        currentStreak: 0,
        maxStreak: 0,
        points: 0,
        level: 1
    },
    badges: [],
    settings: {
        dailyGoal: 20,
        reviewReminder: true,
        soundEnabled: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
});

// 插入示例单词书
var bookId = new ObjectId();
db.wordbooks.insertOne({
    _id: bookId,
    name: '人教版英语',
    version: 'PEP',
    grade: '七年级',
    semester: '上册',
    description: '人教版七年级英语上册单词',
    coverColor: '#4F46E5',
    createdBy: 'admin',
    isPublic: true,
    totalWords: 0,
    createdAt: new Date(),
    updatedAt: new Date()
});

// 插入示例单词
var words = [
    { word: 'hello', phonetic: '/həˈloʊ/', translation: '你好，喂', example: 'Hello! How are you?', exampleTranslation: '你好！你怎么样？', unit: 1, difficulty: 1 },
    { word: 'world', phonetic: '/wɜːrld/', translation: '世界', example: 'Hello, world!', exampleTranslation: '你好，世界！', unit: 1, difficulty: 1 },
    { word: 'school', phonetic: '/skuːl/', translation: '学校', example: 'I go to school every day.', exampleTranslation: '我每天上学。', unit: 1, difficulty: 1 },
    { word: 'student', phonetic: '/ˈstuːdənt/', translation: '学生', example: 'She is a good student.', exampleTranslation: '她是一个好学生。', unit: 1, difficulty: 1 },
    { word: 'teacher', phonetic: '/ˈtiːtʃər/', translation: '老师', example: 'My teacher is very kind.', exampleTranslation: '我的老师很友善。', unit: 1, difficulty: 1 },
    { word: 'family', phonetic: '/ˈfæməli/', translation: '家庭', example: 'I love my family.', exampleTranslation: '我爱我的家庭。', unit: 2, difficulty: 1 },
    { word: 'friend', phonetic: '/frend/', translation: '朋友', example: 'She is my best friend.', exampleTranslation: '她是我最好的朋友。', unit: 2, difficulty: 1 },
    { word: 'happy', phonetic: '/ˈhæpi/', translation: '快乐的，幸福的', example: 'I am very happy today.', exampleTranslation: '我今天很开心。', unit: 2, difficulty: 1 },
    { word: 'beautiful', phonetic: '/ˈbjuːtɪfl/', translation: '美丽的', example: 'The flower is beautiful.', exampleTranslation: '这朵花很美丽。', unit: 2, difficulty: 2 },
    { word: 'computer', phonetic: '/kəmˈpjuːtər/', translation: '电脑，计算机', example: 'I use a computer every day.', exampleTranslation: '我每天使用电脑。', unit: 3, difficulty: 1 },
    { word: 'internet', phonetic: '/ˈɪntərnet/', translation: '互联网', example: 'The internet is very useful.', exampleTranslation: '互联网非常有用。', unit: 3, difficulty: 2 },
    { word: 'science', phonetic: '/ˈsaɪəns/', translation: '科学', example: 'I like science class.', exampleTranslation: '我喜欢科学课。', unit: 3, difficulty: 2 },
    { word: 'music', phonetic: '/ˈmjuːzɪk/', translation: '音乐', example: 'I enjoy listening to music.', exampleTranslation: '我喜欢听音乐。', unit: 4, difficulty: 1 },
    { word: 'sport', phonetic: '/spɔːrt/', translation: '运动，体育', example: 'Swimming is a good sport.', exampleTranslation: '游泳是一项好运动。', unit: 4, difficulty: 1 },
    { word: 'nature', phonetic: '/ˈneɪtʃər/', translation: '自然，大自然', example: 'I love nature very much.', exampleTranslation: '我非常热爱大自然。', unit: 4, difficulty: 2 },
    { word: 'environment', phonetic: '/ɪnˈvaɪrənmənt/', translation: '环境', example: 'We should protect the environment.', exampleTranslation: '我们应该保护环境。', unit: 5, difficulty: 3 },
    { word: 'culture', phonetic: '/ˈkʌltʃər/', translation: '文化', example: 'China has a rich culture.', exampleTranslation: '中国有丰富的文化。', unit: 5, difficulty: 2 },
    { word: 'language', phonetic: '/ˈlæŋɡwɪdʒ/', translation: '语言', example: 'English is an important language.', exampleTranslation: '英语是一门重要的语言。', unit: 5, difficulty: 2 },
    { word: 'adventure', phonetic: '/ədˈventʃər/', translation: '冒险，冒险经历', example: 'Life is an adventure.', exampleTranslation: '生活是一场冒险。', unit: 6, difficulty: 3 },
    { word: 'discover', phonetic: '/dɪˈskʌvər/', translation: '发现，探索', example: 'Columbus discovered America.', exampleTranslation: '哥伦布发现了美洲。', unit: 6, difficulty: 2 }
];

words.forEach(function (w) {
    db.words.insertOne({
        bookId: bookId,
        word: w.word,
        phonetic: w.phonetic,
        translation: w.translation,
        example: w.example,
        exampleTranslation: w.exampleTranslation,
        unit: w.unit,
        difficulty: w.difficulty,
        tags: [],
        audioUrl: '',
        imageUrl: '',
        createdAt: new Date(),
        updatedAt: new Date()
    });
});

// 更新单词书单词数量
db.wordbooks.updateOne({ _id: bookId }, { $set: { totalWords: words.length } });

print('初始化完成！');
