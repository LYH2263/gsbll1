<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <header class="topbar">
        <h1 class="page-title" style="margin:0">📊 学习统计</h1>
        <div style="margin-left:auto; display:flex; gap:10px">
          <div class="btn-group">
            <button v-for="p in periods" :key="p.value" :class="['btn', 'btn-sm', period === p.value ? 'btn-primary' : 'btn-secondary']" @click="period = p.value" :id="`period-${p.value}`">{{ p.label }}</button>
          </div>
          <button class="btn btn-secondary btn-sm" @click="exportStats" id="btn-export-stats">📤 导出</button>
        </div>
      </header>

      <main class="page-container">
        <!-- 核心指标 -->
        <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
          <div class="stat-card" v-for="stat in coreStats" :key="stat.label">
            <div class="stat-icon">{{ stat.icon }}</div>
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
            <div v-if="stat.sub" class="stat-sub">{{ stat.sub }}</div>
          </div>
        </div>

        <div class="stats-charts-grid">
          <!-- 每日学习量柱状图 -->
          <div class="card chart-card">
            <div class="card-header"><span class="card-title">📅 每日学习量</span></div>
            <div class="chart-wrap">
              <div class="bar-chart">
                <div
                  v-for="day in chartData"
                  :key="day.date"
                  class="bar-group"
                >
                  <div class="bars">
                    <div
                      class="bar bar-learn"
                      :style="{ height: `${maxBarHeight > 0 ? (day.wordsLearned / maxBarHeight) * 100 : 0}%` }"
                      :title="`新学: ${day.wordsLearned}`"
                    ></div>
                    <div
                      class="bar bar-review"
                      :style="{ height: `${maxBarHeight > 0 ? (day.wordsReviewed / maxBarHeight) * 100 : 0}%` }"
                      :title="`复习: ${day.wordsReviewed}`"
                    ></div>
                  </div>
                  <div class="bar-label">{{ day.weekday }}</div>
                </div>
              </div>
              <div class="chart-legend">
                <div class="legend-item"><div class="legend-dot legend-learn"></div>新学</div>
                <div class="legend-item"><div class="legend-dot legend-review"></div>复习</div>
              </div>
            </div>
          </div>

          <!-- 记忆状态分布 -->
          <div class="card chart-card">
            <div class="card-header"><span class="card-title">🧠 记忆状态分布</span></div>
            <div class="pie-chart-wrap">
              <div class="donut-chart" :style="getDonutStyle()"></div>
              <div class="pie-legend">
                <div v-for="item in memoryDist" :key="item.status" class="pie-legend-item">
                  <div class="pie-dot" :class="'mem-' + item.status"></div>
                  <span class="pie-label">{{ item.label }}</span>
                  <span class="pie-count">{{ item.count }}</span>
                  <span class="pie-pct">{{ totalDist > 0 ? Math.round(item.count / totalDist * 100) : 0 }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 学习时长热力图 -->
          <div class="card chart-card full-width">
            <div class="card-header"><span class="card-title">🔥 学习热力图（近30天）</span></div>
            <div class="heatmap-wrap">
              <div v-for="day in monthlyData" :key="day.date" class="heatmap-cell" :class="getHeatLevel(day)" :title="`${day.date}: 学习${day.wordsLearned + day.wordsReviewed}个单词`"></div>
            </div>
            <div class="heatmap-legend">
              <span>少</span>
              <div class="heatmap-cell h0"></div>
              <div class="heatmap-cell h1"></div>
              <div class="heatmap-cell h2"></div>
              <div class="heatmap-cell h3"></div>
              <div class="heatmap-cell h4"></div>
              <span>多</span>
            </div>
          </div>

          <!-- 正确率趋势 -->
          <div class="card chart-card">
            <div class="card-header"><span class="card-title">🎯 正确率趋势</span></div>
            <div class="accuracy-list">
              <div v-for="day in chartData" :key="day.date" class="accuracy-row">
                <span class="acc-date">周{{ day.weekday }}</span>
                <div class="acc-bar-wrap">
                  <div class="acc-bar">
                    <div class="acc-fill" :style="{ width: `${day.correctCount + day.wrongCount > 0 ? Math.round(day.correctCount / (day.correctCount + day.wrongCount) * 100) : 0}%` }"></div>
                  </div>
                </div>
                <span class="acc-val">{{ day.correctCount + day.wrongCount > 0 ? Math.round(day.correctCount / (day.correctCount + day.wrongCount) * 100) : '-' }}%</span>
              </div>
            </div>
          </div>

          <!-- 学习详情数据表 -->
          <div class="card chart-card">
            <div class="card-header"><span class="card-title">📋 详细数据</span></div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>新学</th>
                  <th>复习</th>
                  <th>时长(分)</th>
                  <th>积分</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="day in chartData" :key="day.date">
                  <td>{{ day.date }}</td>
                  <td><span class="badge badge-primary">{{ day.wordsLearned }}</span></td>
                  <td><span class="badge badge-success">{{ day.wordsReviewed }}</span></td>
                  <td>{{ day.studyTime }}</td>
                  <td>{{ day.points }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'
import { toast } from '@/utils/toast'

const auth = useAuthStore()
const period = ref('weekly')
const chartData = ref([])
const monthlyData = ref([])
const memoryDist = ref([])
const overview = ref({})

const periods = [
  { value: 'weekly', label: '本周' },
  { value: 'monthly', label: '本月' },
]

const coreStats = computed(() => [
  { icon: '📝', label: '已学单词', value: overview.value.totalWords || 0 },
  { icon: '✅', label: '已掌握', value: overview.value.masteredWords || 0, sub: `掌握率 ${overview.value.masteryRate || 0}%` },
  { icon: '🎯', label: '整体正确率', value: `${overview.value.accuracy || 0}%` },
  { icon: '🔥', label: '最长连击', value: `${auth.user?.stats?.maxStreak || 0}天` },
])

const maxBarHeight = computed(() => {
  return Math.max(...chartData.value.map(d => Math.max(d.wordsLearned, d.wordsReviewed)), 1)
})

const totalDist = computed(() => memoryDist.value.reduce((s, d) => s + d.count, 0))

function getDonutStyle() {
  if (!totalDist.value) return { background: 'conic-gradient(var(--gray-700) 0% 100%)' }
  
  const colors = { new: '#64748B', learning: '#F59E0B', review: '#6366F1', mastered: '#22C55E' }
  let angle = 0
  const segments = memoryDist.value.map(d => {
    const pct = (d.count / totalDist.value) * 100
    const color = colors[d.status] || '#64748B'
    return { color, pct }
  })
  
  let gradient = 'conic-gradient('
  segments.forEach((seg, i) => {
    gradient += `${seg.color} ${angle}% ${angle + seg.pct}%`
    if (i < segments.length - 1) gradient += ', '
    angle += seg.pct
  })
  gradient += ')'
  
  return { background: gradient }
}

function getHeatLevel(day) {
  const total = day.wordsLearned + day.wordsReviewed
  if (total === 0) return 'h0'
  if (total < 5) return 'h1'
  if (total < 15) return 'h2'
  if (total < 30) return 'h3'
  return 'h4'
}

async function fetchData() {
  try {
    const [overviewRes, weeklyRes, monthlyRes, distRes] = await Promise.all([
      api.get('/stats/overview'),
      api.get('/stats/weekly'),
      api.get('/stats/monthly'),
      api.get('/stats/memory-distribution')
    ])
    overview.value = overviewRes.data
    chartData.value = weeklyRes.data.weeklyData
    monthlyData.value = monthlyRes.data.monthlyData
    memoryDist.value = distRes.data.distribution
  } catch (err) {
    toast.error('数据加载失败')
  }
}

async function exportStats() {
  try {
    const link = document.createElement('a')
    link.href = '/api/stats/export'
    link.download = '学习统计.xlsx'
    link.click()
    toast.success('开始下载统计数据...')
  } catch (err) {
    toast.error('导出失败')
  }
}

onMounted(fetchData)
</script>

<style scoped>
.btn-group { display: flex; gap: 4px; }

.stats-charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-lg);
}

.chart-card { padding: var(--spacing-lg); }
.full-width { grid-column: 1 / -1; }
.chart-wrap { display: flex; flex-direction: column; gap: var(--spacing-md); }

/* 柱状图 */
.bar-chart {
  display: flex;
  gap: 8px;
  height: 160px;
  align-items: flex-end;
  padding: 0 8px;
}

.bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  height: 100%;
}

.bars {
  flex: 1;
  width: 100%;
  display: flex;
  gap: 3px;
  align-items: flex-end;
}

.bar {
  flex: 1;
  border-radius: 4px 4px 0 0;
  transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  min-height: 2px;
}

.bar-learn { background: var(--primary-500); }
.bar-review { background: var(--teal-500); }
.bar-label { font-size: 11px; color: var(--text-muted); }

.chart-legend { display: flex; gap: 16px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); }
.legend-dot { width: 10px; height: 10px; border-radius: 2px; }
.legend-learn { background: var(--primary-500); }
.legend-review { background: var(--teal-500); }

/* 饼图 */
.pie-chart-wrap { display: flex; align-items: center; gap: var(--spacing-xl); justify-content: center; }
.donut-chart {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
}
.donut-chart::after {
  content: '';
  position: absolute;
  inset: 30px;
  background: var(--bg-surface);
  border-radius: 50%;
}

.pie-legend { display: flex; flex-direction: column; gap: 10px; }
.pie-legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.pie-dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
.mem-new { background: var(--gray-400); }
.mem-learning { background: var(--warning-500); }
.mem-review { background: var(--primary-500); }
.mem-mastered { background: var(--success-500); }
.pie-label { flex: 1; color: var(--text-secondary); }
.pie-count { font-weight: 700; color: var(--text-primary); min-width: 30px; }
.pie-pct { color: var(--text-muted); min-width: 36px; text-align: right; }

/* 热力图 */
.heatmap-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 12px;
}

.heatmap-cell {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  transition: transform var(--transition-fast);
  cursor: default;
}
.heatmap-cell:hover { transform: scale(1.3); }
.h0 { background: var(--bg-elevated); }
.h1 { background: rgba(99,102,241,0.2); }
.h2 { background: rgba(99,102,241,0.4); }
.h3 { background: rgba(99,102,241,0.65); }
.h4 { background: var(--primary-500); }

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

/* 正确率 */
.accuracy-list { display: flex; flex-direction: column; gap: 10px; }
.accuracy-row { display: flex; align-items: center; gap: 12px; }
.acc-date { font-size: 12px; color: var(--text-muted); width: 28px; }
.acc-bar-wrap { flex: 1; }
.acc-bar { height: 8px; background: var(--bg-elevated); border-radius: 4px; overflow: hidden; }
.acc-fill { height: 100%; background: var(--gradient-primary); border-radius: 4px; transition: width 0.6s ease; }
.acc-val { font-size: 13px; font-weight: 600; color: var(--primary-400); min-width: 36px; text-align: right; }

.stat-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

@media (max-width: 1000px) {
  .stats-charts-grid { grid-template-columns: 1fr; }
  .full-width { grid-column: 1; }
}
</style>
