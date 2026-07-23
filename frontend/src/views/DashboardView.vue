<template>
  <div class="app-layout">
    <Sidebar :review-due="reviewDue" />
    <div class="main-content">
      <header class="topbar">
        <div class="topbar-greeting">
          <h2 class="greeting-text">{{ greeting }}，{{ auth.user?.profile?.nickname || auth.user?.username }}！👋</h2>
          <p class="greeting-sub">{{ todayStr }}，共有 <strong>{{ reviewDue }}</strong> 个单词等待复习</p>
        </div>
        <div class="topbar-actions">
          <div class="streak-badge" v-if="auth.user?.stats?.currentStreak > 0">
            🔥 {{ auth.user.stats.currentStreak }}天连击
          </div>
          <div class="level-badge">
            ⚡ Lv.{{ auth.user?.stats?.level || 1 }}
          </div>
        </div>
      </header>

      <main class="page-container">
        <!-- 快速入口 -->
        <div class="quick-actions">
          <RouterLink
            v-for="action in quickActions"
            :key="action.path"
            :to="action.path"
            class="quick-action-card"
            :style="{ '--action-color': action.color }"
          >
            <div class="quick-action-icon">{{ action.icon }}</div>
            <div class="quick-action-info">
              <div class="quick-action-label">{{ action.label }}</div>
              <div class="quick-action-desc">{{ action.desc }}</div>
            </div>
            <div class="quick-action-arrow">→</div>
          </RouterLink>
        </div>

        <!-- 统计卡片 -->
        <div class="stats-grid" v-if="!loading">
          <div class="stat-card" v-for="stat in overviewStats" :key="stat.label">
            <div class="stat-icon">{{ stat.icon }}</div>
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
        <div v-else class="stats-grid">
          <div class="stat-card skeleton" v-for="n in 6" :key="n"></div>
        </div>

        <div class="dashboard-grid">
          <!-- 今日学习进度 -->
          <div class="card today-card">
            <div class="card-header">
              <span class="card-title">📅 今日学习</span>
              <RouterLink to="/wordbooks" class="btn btn-primary btn-sm">开始学习</RouterLink>
            </div>
            <div class="today-progress">
              <div class="progress-info">
                <span>今日目标：{{ auth.user?.settings?.dailyGoal || 20 }} 个单词</span>
                <span class="progress-count">{{ todayStat.wordsLearned + todayStat.wordsReviewed }} / {{ auth.user?.settings?.dailyGoal || 20 }}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: todayProgress + '%' }"></div>
              </div>
            </div>
            <div class="today-stats">
              <div class="today-stat-item">
                <span class="today-stat-val">{{ todayStat.wordsLearned }}</span>
                <span class="today-stat-label">新学</span>
              </div>
              <div class="today-stat-item">
                <span class="today-stat-val">{{ todayStat.wordsReviewed }}</span>
                <span class="today-stat-label">复习</span>
              </div>
              <div class="today-stat-item">
                <span class="today-stat-val">{{ todayStat.studyTime }}</span>
                <span class="today-stat-label">学习分钟</span>
              </div>
              <div class="today-stat-item">
                <span class="today-stat-val">{{ todayStat.wordsLearned + todayStat.wordsReviewed > 0 ? Math.round(todayStat.correctCount / (todayStat.correctCount + todayStat.wrongCount) * 100) || 0 : 0 }}%</span>
                <span class="today-stat-label">正确率</span>
              </div>
            </div>
          </div>

          <!-- 成就徽章 -->
          <div class="card badges-card">
            <div class="card-header">
              <span class="card-title">🏆 成就徽章</span>
              <RouterLink to="/profile" class="btn btn-ghost btn-sm">查看全部</RouterLink>
            </div>
            <div class="badges-grid" v-if="auth.user?.badges?.length">
              <div
                v-for="badge in auth.user.badges.slice(0, 6)"
                :key="badge.id"
                class="badge-achievement"
                :title="badge.description"
              >
                <div class="badge-achievement-icon">{{ badge.icon }}</div>
                <div class="badge-achievement-name">{{ badge.name }}</div>
              </div>
            </div>
            <div class="empty-state" v-else style="padding: 24px">
              <div style="font-size:40px">🎯</div>
              <div class="empty-state-title" style="font-size:14px">坚持学习解锁徽章</div>
            </div>
          </div>

          <!-- 记忆状态分布 -->
          <div class="card distribution-card">
            <div class="card-header">
              <span class="card-title">📈 记忆状态分布</span>
            </div>
            <div class="distribution-list" v-if="memoryDist.length">
              <div v-for="item in memoryDist" :key="item.status" class="dist-item">
                <div class="dist-label">
                  <span class="dist-dot" :class="item.status"></span>
                  {{ item.label }}
                </div>
                <div class="dist-bar-wrap">
                  <div class="dist-bar">
                    <div
                      class="dist-fill"
                      :class="item.status"
                      :style="{ width: `${maxDist > 0 ? (item.count / maxDist) * 100 : 0}%` }"
                    ></div>
                  </div>
                  <span class="dist-count">{{ item.count }}</span>
                </div>
              </div>
            </div>
            <div class="empty-state" v-else style="padding: 24px">
              <div style="font-size:40px">📊</div>
              <div class="empty-state-title" style="font-size:14px">开始学习后查看分布</div>
            </div>
          </div>

          <!-- 学习时长排行榜 -->
          <div class="card leaderboard-card">
            <div class="card-header">
              <span class="card-title">🥇 积分排行榜</span>
            </div>
            <div class="leaderboard-list" v-if="leaderboard.length">
              <div
                v-for="(user, index) in leaderboard"
                :key="user._id"
                class="leaderboard-item"
                :class="{ 'is-me': user._id === auth.user?._id }"
              >
                <div class="rank-num" :class="['rank-' + (index + 1)]">{{ rankIcon(index) }}</div>
                <div class="rank-avatar">{{ (user.profile?.nickname || user.username)[0].toUpperCase() }}</div>
                <div class="rank-name">{{ user.profile?.nickname || user.username }}</div>
                <div class="rank-points">{{ user.stats?.points || 0 }} 分</div>
              </div>
            </div>
            <div class="empty-state" v-else style="padding: 20px">
              <div class="empty-state-title" style="font-size:14px">暂无排行数据</div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- 移动端底部导航 -->
    <nav class="bottom-nav">
      <div class="bottom-nav-items">
        <RouterLink v-for="item in bottomNavItems" :key="item.path" :to="item.path" class="bottom-nav-item" :class="{ active: currentRoute === item.path }">
          <span class="bottom-nav-item-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Sidebar from '@/components/Sidebar.vue'
import api from '@/utils/api'

const auth = useAuthStore()
const route = useRoute()
const loading = ref(true)
const reviewDue = ref(0)
const todayStat = ref({ wordsLearned: 0, wordsReviewed: 0, correctCount: 0, wrongCount: 0, studyTime: 0 })
const overviewData = ref({})
const memoryDist = ref([])
const leaderboard = ref([])

const currentRoute = computed(() => route.path)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const todayStr = computed(() => {
  return new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
})

const todayProgress = computed(() => {
  const goal = auth.user?.settings?.dailyGoal || 20
  const done = todayStat.value.wordsLearned + todayStat.value.wordsReviewed
  return Math.min(100, Math.round((done / goal) * 100))
})

const overviewStats = computed(() => [
  { icon: '📝', label: '已学单词', value: overviewData.value.totalWords || 0 },
  { icon: '✅', label: '已掌握', value: overviewData.value.masteredWords || 0 },
  { icon: '🔄', label: '待复习', value: reviewDue.value },
  { icon: '❌', label: '错题数', value: overviewData.value.wrongWords || 0 },
  { icon: '🔥', label: '连续天数', value: (auth.user?.stats?.currentStreak || 0) + '天' },
  { icon: '💰', label: '总积分', value: auth.user?.stats?.points || 0 },
])

const maxDist = computed(() => Math.max(...memoryDist.value.map(d => d.count), 1))

const quickActions = [
  { icon: '📖', label: '新词学习', desc: '从单词书学习新词', path: '/wordbooks', color: '#818CF8' },
  { icon: '🔄', label: '今日复习', desc: `${reviewDue.value} 个待复习`, path: '/review', color: '#34D399' },
  { icon: '❌', label: '错题强化', desc: '专项错题练习', path: '/wrong-words', color: '#F87171' },
  { icon: '⭐', label: '重点单词', desc: '标记重点单词', path: '/starred', color: '#FBBF24' },
]

const bottomNavItems = [
  { icon: '🏠', label: '首页', path: '/dashboard' },
  { icon: '📚', label: '单词库', path: '/wordbooks' },
  { icon: '🔄', label: '复习', path: '/review' },
  { icon: '📊', label: '统计', path: '/stats' },
  { icon: '👤', label: '我的', path: '/profile' },
]

function rankIcon(index) {
  return ['🥇', '🥈', '🥉'][index] || `${index + 1}`
}

async function fetchData() {
  loading.value = true
  try {
    const [overviewRes, todayRes, distRes, lbRes] = await Promise.all([
      api.get('/stats/overview'),
      api.get('/study/today'),
      api.get('/stats/memory-distribution'),
      api.get('/stats/leaderboard?limit=5')
    ])
    overviewData.value = overviewRes.data
    todayStat.value = todayRes.data.todayStat
    reviewDue.value = todayRes.data.reviewDue
    memoryDist.value = distRes.data.distribution
    leaderboard.value = lbRes.data.leaderboard
  } catch (err) {
    console.error('获取数据失败:', err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.topbar-greeting { flex: 1; }
.greeting-text { font-size: 22px; font-weight: 700; color: var(--text-primary); }
.greeting-sub { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
.greeting-sub strong { color: var(--primary-400); }
.topbar-actions { display: flex; gap: 12px; align-items: center; }

.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.quick-action-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  text-decoration: none;
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.quick-action-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(var(--action-color), 0.05), transparent);
  opacity: 0;
  transition: opacity var(--transition-normal);
}

.quick-action-card:hover::before { opacity: 1; }
.quick-action-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--action-color); }

.quick-action-icon { font-size: 28px; }
.quick-action-label { font-weight: 700; font-size: 14px; color: var(--text-primary); }
.quick-action-desc { font-size: 12px; color: var(--text-muted); }
.quick-action-arrow { margin-left: auto; color: var(--text-muted); font-size: 18px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.skeleton {
  background: linear-gradient(90deg, var(--bg-elevated) 25%, rgba(99,102,241,0.05) 50%, var(--bg-elevated) 75%);
  background-size: 400% 100%;
  animation: skeleton-wave 1.5s infinite;
  height: 100px;
  border-radius: var(--radius-lg);
}

@keyframes skeleton-wave {
  from { background-position: 100%; }
  to { background-position: 0%; }
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
}

.today-progress { margin-bottom: var(--spacing-md); }
.progress-info { display: flex; justify-content: space-between; font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; }
.progress-count { font-weight: 700; color: var(--primary-400); }

.today-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.today-stat-item { text-align: center; padding: 12px; background: var(--bg-elevated); border-radius: var(--radius-md); }
.today-stat-val { display: block; font-size: 22px; font-weight: 800; color: var(--primary-400); }
.today-stat-label { font-size: 12px; color: var(--text-muted); }

.badges-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}

.distribution-list { display: flex; flex-direction: column; gap: 12px; }
.dist-item { display: flex; flex-direction: column; gap: 6px; }
.dist-label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); font-weight: 500; }
.dist-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dist-dot.new { background: var(--gray-400); }
.dist-dot.learning { background: var(--warning-500); }
.dist-dot.review { background: var(--primary-500); }
.dist-dot.mastered { background: var(--success-500); }
.dist-bar-wrap { display: flex; align-items: center; gap: 8px; }
.dist-bar { flex: 1; height: 8px; background: var(--bg-elevated); border-radius: 4px; overflow: hidden; }
.dist-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
.dist-fill.new { background: var(--gray-400); }
.dist-fill.learning { background: var(--warning-500); }
.dist-fill.review { background: var(--primary-500); }
.dist-fill.mastered { background: var(--success-500); }
.dist-count { font-size: 13px; font-weight: 600; color: var(--text-primary); min-width: 30px; text-align: right; }

.leaderboard-list { display: flex; flex-direction: column; gap: 8px; }
.leaderboard-item { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: var(--radius-md); transition: background var(--transition-fast); }
.leaderboard-item:hover { background: var(--bg-elevated); }
.leaderboard-item.is-me { background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); }
.rank-num { width: 28px; text-align: center; font-size: 18px; font-weight: 700; }
.rank-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: white; }
.rank-name { flex: 1; font-size: 14px; color: var(--text-primary); font-weight: 500; }
.rank-points { font-size: 13px; font-weight: 700; color: var(--primary-400); }

@media (max-width: 1200px) {
  .quick-actions { grid-template-columns: repeat(2, 1fr); }
  .stats-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
  .quick-actions { grid-template-columns: 1fr 1fr; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .dashboard-grid { grid-template-columns: 1fr; }
  .badges-grid { grid-template-columns: repeat(4, 1fr); }
}
</style>
