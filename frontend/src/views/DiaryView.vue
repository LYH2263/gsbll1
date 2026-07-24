<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <header class="topbar">
        <h1 class="page-title" style="margin:0">📔 学习日记</h1>
        <div style="margin-left:auto; display:flex; gap:10px; align-items:center">
          <div class="streak-chip" title="连续打卡天数">
            🔥 连续 <strong>{{ store.streak }}</strong> 天
          </div>
          <div class="streak-chip" title="累计打卡天数">
            📅 累计 <strong>{{ store.totalDays }}</strong> 天
          </div>
        </div>
      </header>

      <main class="page-container diary-layout">
        <!-- 左侧：月历 -->
        <div class="card calendar-card">
          <div class="card-header">
            <button class="btn btn-ghost btn-icon btn-sm" @click="changeMonth(-1)" id="btn-prev-month">‹</button>
            <span class="card-title">{{ monthTitle }}</span>
            <button class="btn btn-ghost btn-icon btn-sm" @click="changeMonth(1)" id="btn-next-month" :disabled="isCurrentMonth">›</button>
          </div>

          <div class="calendar-weekdays">
            <span v-for="w in weekdays" :key="w">{{ w }}</span>
          </div>
          <div class="calendar-grid">
            <div v-for="(cell, idx) in calendarCells" :key="idx"
                 class="cal-cell"
                 :class="{
                   empty: !cell,
                   marked: cell && !!diaryMap[cell.date],
                   today: cell && cell.date === todayStr,
                   selected: cell && cell.date === selectedDate
                 }"
                 @click="cell && selectDate(cell.date)">
              <template v-if="cell">
                <span class="cal-day">{{ cell.day }}</span>
                <span v-if="diaryMap[cell.date]" class="cal-mood">{{ moodIcon(diaryMap[cell.date].mood) }}</span>
              </template>
            </div>
          </div>

          <div class="calendar-legend">
            <span v-for="m in moods" :key="m.value">{{ m.icon }} {{ m.label }}</span>
          </div>
        </div>

        <!-- 右侧：编辑 / 详情 -->
        <div class="card editor-card">
          <!-- 今日编辑 -->
          <template v-if="selectedDate === todayStr">
            <div class="card-header"><span class="card-title">✍️ 今日日记（{{ selectedDate }}）</span></div>

            <div class="mood-picker">
              <button v-for="m in moods" :key="m.value"
                      class="mood-btn" :class="{ active: form.mood === m.value }"
                      :id="`mood-${m.value}`"
                      @click="form.mood = m.value">
                <span class="mood-emoji">{{ m.icon }}</span>
                <span>{{ m.label }}</span>
              </button>
            </div>

            <label class="field-label">今日学习单词数</label>
            <input v-model.number="form.wordsLearned" type="number" min="0" class="form-input" id="input-words-learned" />

            <label class="field-label">日记内容（12–480 字）</label>
            <textarea v-model="form.content" class="form-textarea diary-textarea" id="input-diary-content"
                      placeholder="记录今天的学习收获与心情..."></textarea>
            <div class="char-count" :class="{ invalid: !contentValid }">
              {{ contentLength }} / 480
            </div>

            <button class="btn btn-primary" :disabled="!contentValid || store.saving"
                    id="btn-submit-diary" @click="handleSubmit">
              {{ store.saving ? '保存中...' : (existingToday ? '更新日记' : '提交日记（+17 积分）') }}
            </button>
          </template>

          <!-- 历史详情 -->
          <template v-else>
            <div class="card-header"><span class="card-title">📖 日记详情（{{ selectedDate }}）</span></div>
            <template v-if="selectedDiary">
              <div class="detail-mood">{{ moodIcon(selectedDiary.mood) }} {{ moodLabel(selectedDiary.mood) }}</div>
              <div class="detail-meta">📝 学习单词 {{ selectedDiary.wordsLearned }} 个 · 获得 {{ selectedDiary.pointsEarned }} 积分</div>
              <p class="detail-content">{{ selectedDiary.content }}</p>
            </template>
            <div v-else class="empty-detail">这一天还没有写日记 🍃</div>
          </template>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import { useDiaryStore } from '@/stores/diary'

const store = useDiaryStore()

const moods = [
  { value: 'sunny', icon: '☀️', label: '晴' },
  { value: 'cloudy', icon: '⛅', label: '多云' },
  { value: 'rainy', icon: '🌧️', label: '雨' }
]
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

// 使用本地时区的日期字符串
function localDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const todayStr = localDate()
const viewMonth = ref(todayStr.slice(0, 7)) // YYYY-MM
const selectedDate = ref(todayStr)

const form = reactive({ content: '', mood: 'sunny', wordsLearned: 0 })

// 日记按日期建立索引
const diaryMap = computed(() => {
  const map = {}
  store.diaries.forEach(d => { map[d.date] = d })
  return map
})

const existingToday = computed(() => !!diaryMap.value[todayStr])
const selectedDiary = computed(() => diaryMap.value[selectedDate.value] || null)

const contentLength = computed(() => form.content.trim().length)
const contentValid = computed(() => contentLength.value >= 12 && contentLength.value <= 480)

const isCurrentMonth = computed(() => viewMonth.value >= todayStr.slice(0, 7))

const monthTitle = computed(() => {
  const [y, m] = viewMonth.value.split('-')
  return `${y} 年 ${parseInt(m)} 月`
})

// 生成月历单元格（前置空白对齐星期）
const calendarCells = computed(() => {
  const [y, m] = viewMonth.value.split('-').map(Number)
  const firstDay = new Date(y, m - 1, 1).getDay()
  const daysInMonth = new Date(y, m, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: `${viewMonth.value}-${String(d).padStart(2, '0')}` })
  }
  return cells
})

function moodIcon(mood) {
  return moods.find(m => m.value === mood)?.icon || '📝'
}
function moodLabel(mood) {
  return moods.find(m => m.value === mood)?.label || ''
}

function changeMonth(delta) {
  const [y, m] = viewMonth.value.split('-').map(Number)
  const next = new Date(y, m - 1 + delta, 1)
  const nextMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
  if (nextMonth > todayStr.slice(0, 7)) return // 不允许查看未来月份
  viewMonth.value = nextMonth
}

function selectDate(date) {
  if (date > todayStr) return // 不允许选择未来日期
  selectedDate.value = date
}

// 载入今日已有日记到表单
function syncForm() {
  const today = diaryMap.value[todayStr]
  if (today) {
    form.content = today.content
    form.mood = today.mood
    form.wordsLearned = today.wordsLearned
  }
}

async function handleSubmit() {
  if (!contentValid.value) return
  const res = await store.submitDiary({
    content: form.content.trim(),
    mood: form.mood,
    wordsLearned: form.wordsLearned
  })
  if (res) syncForm()
}

// 月份切换时重新加载
watch(viewMonth, async (m) => {
  await store.fetchMonth(m)
  syncForm()
})

onMounted(async () => {
  await Promise.all([store.fetchMonth(viewMonth.value), store.fetchStreak()])
  syncForm()
})
</script>

<style scoped>
.diary-layout {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: var(--spacing-lg);
  align-items: start;
}

.streak-chip {
  background: var(--bg-elevated);
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text-secondary);
}
.streak-chip strong { color: var(--primary-400); }

.calendar-card, .editor-card { padding: var(--spacing-lg); }
.card-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: var(--spacing-md); }

.calendar-weekdays,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.calendar-weekdays {
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}

.cal-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}
.cal-cell.empty { background: transparent; cursor: default; }
.cal-cell:not(.empty):hover { transform: translateY(-2px); }
.cal-cell.marked { background: rgba(99,102,241,0.18); }
.cal-cell.today { outline: 2px solid var(--primary-500); }
.cal-cell.selected { background: var(--primary-500); color: #fff; }
.cal-day { font-size: 13px; font-weight: 600; }
.cal-mood { font-size: 14px; line-height: 1; }

.calendar-legend {
  display: flex;
  gap: 16px;
  margin-top: var(--spacing-md);
  font-size: 12px;
  color: var(--text-muted);
}

.mood-picker { display: flex; gap: 10px; margin-bottom: var(--spacing-md); }
.mood-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}
.mood-btn.active { border-color: var(--primary-500); background: rgba(99,102,241,0.15); color: var(--text-primary); }
.mood-emoji { font-size: 22px; }

.field-label { display: block; font-size: 13px; color: var(--text-secondary); margin: var(--spacing-sm) 0 4px; }
.diary-textarea { min-height: 160px; resize: vertical; }
.char-count { text-align: right; font-size: 12px; color: var(--text-muted); margin: 4px 0 var(--spacing-md); }
.char-count.invalid { color: var(--error-500); }

.detail-mood { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
.detail-meta { font-size: 13px; color: var(--text-muted); margin-bottom: var(--spacing-md); }
.detail-content { line-height: 1.8; color: var(--text-secondary); white-space: pre-wrap; }
.empty-detail { text-align: center; color: var(--text-muted); padding: var(--spacing-xl) 0; }

@media (max-width: 1000px) {
  .diary-layout { grid-template-columns: 1fr; }
}
</style>
