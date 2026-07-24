<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <header class="topbar">
        <h1 class="page-title" style="margin:0">📝 学习日记</h1>
        <div style="margin-left:auto; display:flex; gap:10px; align-items:center">
          <div class="streak-display" v-if="streak > 0">
            🔥 连续打卡 <strong>{{ streak }}</strong> 天
          </div>
          <div class="month-nav">
            <button class="btn btn-secondary btn-sm" @click="prevMonth" id="btn-prev-month">◀</button>
            <span class="month-label">{{ currentYear }}年{{ currentMonth }}月</span>
            <button class="btn btn-secondary btn-sm" @click="nextMonth" id="btn-next-month">▶</button>
          </div>
        </div>
      </header>

      <main class="page-container">
        <div class="diary-layout">
          <div class="diary-main">
            <div class="card calendar-card">
              <div class="card-header">
                <span class="card-title">📅 日记日历</span>
                <button class="btn btn-ghost btn-sm" @click="goToToday" id="btn-today">回到今天</button>
              </div>
              <div class="calendar-weekdays">
                <div v-for="d in weekDays" :key="d" class="weekday-cell">{{ d }}</div>
              </div>
              <div class="calendar-grid">
                <div
                  v-for="(cell, idx) in calendarCells"
                  :key="idx"
                  class="calendar-cell"
                  :class="{
                    'other-month': !cell.inMonth,
                    'is-today': cell.isToday,
                    'is-selected': selectedDate === cell.dateStr,
                    'has-diary': cell.diary,
                    'clickable': cell.inMonth
                  }"
                  @click="cell.inMonth && selectDate(cell.dateStr, cell.diary)"
                >
                  <span class="cell-day">{{ cell.day }}</span>
                  <span v-if="cell.diary" class="cell-mood" :title="moodLabels[cell.diary.mood]">
                    {{ moodEmojis[cell.diary.mood] }}
                  </span>
                </div>
              </div>
              <div class="calendar-legend">
                <span class="legend-item"><span class="mood-dot mood-sunny"></span>晴天</span>
                <span class="legend-item"><span class="mood-dot mood-cloudy"></span>多云</span>
                <span class="legend-item"><span class="mood-dot mood-rainy"></span>雨天</span>
              </div>
            </div>

            <div class="card editor-card">
              <div class="card-header">
                <span class="card-title">
                  {{ isPastNoDiary ? '📭 无日记' : (isEditingToday ? '✏️ 今日日记' : `📖 ${selectedDate} 日记`) }}
                </span>
                <span v-if="selectedDiary" class="badge badge-primary">已写 {{ selectedDiary.content.length }}/480</span>
              </div>

              <div v-if="isPastNoDiary" class="no-diary-message">
                <div class="no-diary-icon">📭</div>
                <p>当天没有写日记</p>
                <p class="no-diary-sub">过去的日期无法补签，请坚持每天记录哦！</p>
              </div>

              <template v-else>
              <div v-if="selectedDate === todayStr && !todayCheckedIn" class="points-hint">
                💡 今日首次写日记可获得 <strong>17 积分</strong>，连续打卡每满 7 天额外 <strong>+53 积分</strong>！
              </div>

              <div class="form-group">
                <label class="form-label">今日心情</label>
                <div class="mood-selector">
                  <button
                    v-for="m in moodOptions"
                    :key="m.value"
                    type="button"
                    class="mood-btn"
                    :class="{ active: form.mood === m.value }"
                    @click="form.mood = m.value"
                    :id="`mood-${m.value}`"
                  >
                    <span class="mood-emoji">{{ m.emoji }}</span>
                    <span class="mood-name">{{ m.label }}</span>
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">今日学习单词数</label>
                <input
                  type="number"
                  class="form-input"
                  v-model.number="form.wordsLearned"
                  min="0"
                  placeholder="输入今天学习的单词数量"
                  id="input-words"
                />
              </div>

              <div class="form-group">
                <label class="form-label">日记内容（12-480字）</label>
                <textarea
                  class="form-textarea"
                  v-model="form.content"
                  placeholder="记录今天的学习心得、遇到的有趣单词、学习感受..."
                  rows="6"
                  maxlength="480"
                  id="input-content"
                ></textarea>
                <div class="char-count" :class="{ 'text-warn': form.content.length > 400, 'text-error': form.content.length > 480 }">
                  {{ form.content.length }} / 480
                </div>
              </div>

              <div class="editor-actions">
                <button
                  class="btn btn-primary"
                  @click="submitDiaryEntry"
                  :disabled="submitting || !canSubmit"
                  id="btn-submit-diary"
                >
                  {{ submitting ? '保存中...' : (selectedDiary ? '更新日记' : '提交日记') }}
                </button>
                <span v-if="lastPoints > 0" class="points-earned">
                  🎉 获得 {{ lastPoints }} 积分！
                </span>
              </div>
              </template>
            </div>
          </div>

          <div class="diary-sidebar">
            <div class="card streak-card">
              <div class="card-header"><span class="card-title">🔥 打卡统计</span></div>
              <div class="streak-content">
                <div class="streak-number">{{ streak }}</div>
                <div class="streak-label">连续打卡天数</div>
                <div v-if="streak > 0" class="next-milestone">
                  距离下一个里程碑还需 <strong>{{ 7 - (streak % 7) }}</strong> 天
                  <div class="milestone-progress">
                    <div class="milestone-bar">
                      <div class="milestone-fill" :style="{ width: `${(streak % 7) / 7 * 100}%` }"></div>
                    </div>
                  </div>
                </div>
                <div v-else class="next-milestone">今天开始打卡，连续 7 天获得额外奖励！</div>
              </div>
            </div>

            <div class="card history-card">
              <div class="card-header"><span class="card-title">📚 本月日记</span></div>
              <div class="history-list" v-if="monthDiaries.length > 0">
                <div
                  v-for="d in monthDiaries"
                  :key="d.date"
                  class="history-item"
                  :class="{ selected: selectedDate === d.date }"
                  @click="selectDate(d.date, d)"
                >
                  <span class="history-emoji">{{ moodEmojis[d.mood] }}</span>
                  <div class="history-info">
                    <div class="history-date">{{ formatDateShort(d.date) }}</div>
                    <div class="history-preview">{{ d.content.slice(0, 30) }}{{ d.content.length > 30 ? '...' : '' }}</div>
                  </div>
                  <span class="history-words">{{ d.wordsLearned }}词</span>
                </div>
              </div>
              <div v-else class="empty-history">
                <p>本月还没有日记</p>
                <p class="empty-sub">开始记录你的第一篇学习日记吧！</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import { submitDiary, getMonthDiary, getStreak } from '@/api/diary'
import { toast } from '@/utils/toast'

const today = new Date()
const todayStr = formatDate(today)

const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth() + 1)
const calendarCells = ref([])
const monthDiaries = ref([])
const streak = ref(0)
const todayCheckedIn = ref(false)
const selectedDate = ref(todayStr)
const selectedDiary = ref(null)
const submitting = ref(false)
const lastPoints = ref(0)

const isEditingToday = computed(() => selectedDate.value === todayStr)
const canEdit = computed(() => isEditingToday.value || !!selectedDiary.value)
const isPastNoDiary = computed(() => !isEditingToday.value && !selectedDiary.value)

const form = ref({
  content: '',
  mood: 'sunny',
  wordsLearned: 0
})

const weekDays = ['日', '一', '二', '三', '四', '五', '六']
const moodEmojis = { sunny: '☀️', cloudy: '⛅', rainy: '🌧️' }
const moodLabels = { sunny: '晴天', cloudy: '多云', rainy: '雨天' }
const moodOptions = [
  { value: 'sunny', label: '晴天', emoji: '☀️' },
  { value: 'cloudy', label: '多云', emoji: '⛅' },
  { value: 'rainy', label: '雨天', emoji: '🌧️' }
]

const canSubmit = computed(() => {
  return form.value.content.trim().length >= 12 &&
    form.value.content.trim().length <= 480 &&
    form.value.mood &&
    form.value.wordsLearned >= 0
})

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateShort(dateStr) {
  const parts = dateStr.split('-')
  return `${parseInt(parts[1])}月${parseInt(parts[2])}日`
}

function buildCalendar(year, month, diaries) {
  const diaryMap = {}
  diaries.forEach(d => { diaryMap[d.date] = d })

  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startWeekday = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const cells = []

  const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const d = new Date(year, month - 2, day)
    cells.push({
      day,
      dateStr: formatDate(d),
      inMonth: false,
      isToday: false,
      diary: null
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day)
    const ds = formatDate(d)
    cells.push({
      day,
      dateStr: ds,
      inMonth: true,
      isToday: ds === todayStr,
      diary: diaryMap[ds] || null
    })
  }

  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month, i)
    cells.push({
      day: i,
      dateStr: formatDate(d),
      inMonth: false,
      isToday: false,
      diary: null
    })
  }

  return cells
}

async function fetchMonthData() {
  try {
    const res = await getMonthDiary(currentYear.value, currentMonth.value)
    monthDiaries.value = res.data.diaries
    calendarCells.value = buildCalendar(currentYear.value, currentMonth.value, monthDiaries.value)

    if (selectedDate.value) {
      const d = monthDiaries.value.find(x => x.date === selectedDate.value)
      selectedDiary.value = d || null
      if (d) {
        form.value.content = d.content
        form.value.mood = d.mood
        form.value.wordsLearned = d.wordsLearned
      } else if (selectedDate.value === todayStr) {
        form.value.content = ''
        form.value.mood = 'sunny'
        form.value.wordsLearned = 0
      }
    }
  } catch (err) {
    toast.error('加载日历数据失败')
  }
}

async function fetchStreak() {
  try {
    const res = await getStreak()
    streak.value = res.data.streak
    todayCheckedIn.value = res.data.todayCheckedIn
    if (res.data.todayDiary) {
      selectedDiary.value = res.data.todayDiary
      form.value.content = res.data.todayDiary.content
      form.value.mood = res.data.todayDiary.mood
      form.value.wordsLearned = res.data.todayDiary.wordsLearned
    }
  } catch (err) {
    console.error('获取打卡状态失败:', err)
  }
}

function selectDate(dateStr, diary) {
  selectedDate.value = dateStr
  selectedDiary.value = diary || null
  lastPoints.value = 0

  if (diary) {
    form.value.content = diary.content
    form.value.mood = diary.mood
    form.value.wordsLearned = diary.wordsLearned
  } else if (dateStr === todayStr) {
    form.value.content = ''
    form.value.mood = 'sunny'
    form.value.wordsLearned = 0
  } else {
    form.value.content = ''
    form.value.mood = 'sunny'
    form.value.wordsLearned = 0
  }
}

function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

function goToToday() {
  currentYear.value = today.getFullYear()
  currentMonth.value = today.getMonth() + 1
  selectedDate.value = todayStr
}

async function submitDiaryEntry() {
  if (!canSubmit.value) return

  submitting.value = true
  try {
    const res = await submitDiary({
      content: form.value.content.trim(),
      mood: form.value.mood,
      wordsLearned: form.value.wordsLearned,
      date: selectedDate.value
    })

    selectedDiary.value = res.data.diary
    lastPoints.value = res.data.pointsEarned

    await fetchStreak()
    await fetchMonthData()

    if (res.data.isNew) {
      let msg = '日记已保存！'
      if (res.data.streakBonus > 0) {
        msg += ` 获得 ${res.data.basePoints} 基础积分 + ${res.data.streakBonus} 连续打卡奖励！`
      } else if (res.data.pointsEarned > 0) {
        msg += ` 获得 ${res.data.pointsEarned} 积分！`
      }
      toast.success(msg)
    } else {
      toast.success('日记已更新')
    }
  } catch (err) {
    toast.error(err.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

watch([currentYear, currentMonth], () => {
  fetchMonthData()
})

onMounted(() => {
  fetchStreak()
  fetchMonthData()
})
</script>

<style scoped>
.diary-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--spacing-lg);
}

.diary-main {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.diary-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.streak-display {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.15));
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: var(--radius-full);
  padding: 6px 16px;
  font-size: 13px;
  color: var(--warning-400);
}

.streak-display strong {
  color: var(--warning-500);
  font-size: 16px;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.month-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 90px;
  text-align: center;
}

/* Calendar */
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.weekday-cell {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  padding: 8px 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  cursor: default;
  position: relative;
  transition: all var(--transition-fast);
  padding: 4px;
}

.calendar-cell.clickable {
  cursor: pointer;
}

.calendar-cell.clickable:hover {
  background: var(--bg-elevated);
}

.calendar-cell.other-month {
  opacity: 0.3;
}

.calendar-cell.is-today {
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid var(--primary-500);
}

.calendar-cell.is-selected {
  background: var(--primary-600);
  color: white;
}

.calendar-cell.is-selected .cell-day {
  color: white;
  font-weight: 700;
}

.calendar-cell.has-diary {
  background: rgba(99, 102, 241, 0.08);
}

.calendar-cell.is-today.has-diary {
  background: rgba(99, 102, 241, 0.25);
}

.cell-day {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.calendar-cell.is-today .cell-day {
  color: var(--primary-400);
  font-weight: 700;
}

.cell-mood {
  font-size: 12px;
  line-height: 1;
}

.calendar-legend {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.mood-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.mood-sunny { background: #F59E0B; }
.mood-cloudy { background: #64748B; }
.mood-rainy { background: #3B82F6; }

/* Editor */
.no-diary-message {
  text-align: center;
  padding: var(--spacing-2xl) var(--spacing-lg);
  color: var(--text-muted);
}

.no-diary-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-md);
}

.no-diary-message p {
  font-size: 15px;
  color: var(--text-secondary);
}

.no-diary-sub {
  font-size: 13px !important;
  margin-top: 4px;
}

.points-hint {
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-size: 13px;
  color: var(--primary-300);
  margin-bottom: var(--spacing-md);
}

.points-hint strong {
  color: var(--warning-400);
}

.mood-selector {
  display: flex;
  gap: 8px;
}

.mood-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px;
  background: var(--bg-elevated);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-secondary);
}

.mood-btn:hover {
  background: var(--bg-surface);
}

.mood-btn.active {
  border-color: var(--primary-500);
  background: rgba(99, 102, 241, 0.1);
  color: var(--text-primary);
}

.mood-emoji {
  font-size: 24px;
}

.mood-name {
  font-size: 12px;
  font-weight: 600;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.text-warn { color: var(--warning-400); }
.text-error { color: var(--error-400); }

.editor-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: var(--spacing-md);
}

.points-earned {
  font-size: 14px;
  color: var(--success-400);
  font-weight: 600;
  animation: popIn 0.4s ease;
}

@keyframes popIn {
  0% { transform: scale(0.5); opacity: 0; }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

/* Streak card */
.streak-content {
  text-align: center;
  padding: var(--spacing-md) 0;
}

.streak-number {
  font-size: 56px;
  font-weight: 800;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.streak-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.next-milestone {
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-muted);
}

.next-milestone strong {
  color: var(--warning-400);
}

.milestone-progress {
  margin-top: 8px;
}

.milestone-bar {
  height: 6px;
  background: var(--bg-elevated);
  border-radius: 3px;
  overflow: hidden;
}

.milestone-fill {
  height: 100%;
  background: var(--gradient-primary);
  border-radius: 3px;
  transition: width 0.5s ease;
}

/* History */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.history-item:hover {
  background: var(--bg-elevated);
}

.history-item.selected {
  background: rgba(99, 102, 241, 0.1);
  border-color: var(--primary-600);
}

.history-emoji {
  font-size: 20px;
  flex-shrink: 0;
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-date {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.history-preview {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-words {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-elevated);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  white-space: nowrap;
}

.empty-history {
  text-align: center;
  padding: var(--spacing-xl) 0;
  color: var(--text-muted);
}

.empty-history p {
  font-size: 14px;
}

.empty-sub {
  font-size: 12px !important;
  margin-top: 4px;
}

@media (max-width: 1000px) {
  .diary-layout {
    grid-template-columns: 1fr;
  }
}
</style>
