<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <header class="topbar">
        <h1 class="page-title" style="margin:0">📔 学习日记</h1>
        <div class="topbar-actions">
          <button class="btn btn-ghost btn-sm" @click="goToday" title="回到今天">📍 今天</button>
        </div>
      </header>

      <main class="page-container">
        <!-- 顶部连续打卡卡片 -->
        <div class="streak-banner">
          <div class="streak-flame">🔥</div>
          <div class="streak-info">
            <div class="streak-num">
              已连续打卡 <span class="streak-value">{{ diaryStore.streak }}</span> 天
            </div>
            <div class="streak-sub" v-if="diaryStore.streak > 0">
              距离下一个里程碑还差
              <b>{{ diaryStore.daysToNextMilestone }}</b> 天 → 达成
              <b>{{ diaryStore.nextMilestone }}</b> 天额外 <b>+53</b> 积分
            </div>
            <div class="streak-sub" v-else>
              写下今天的日记，开启连续打卡，首写 +17 积分
            </div>
          </div>
          <div class="streak-reward">
            <div class="reward-line">首写 <b>+17</b></div>
            <div class="reward-line">每 7 天 <b>+53</b></div>
          </div>
        </div>

        <div class="diary-grid">
          <!-- 月历 -->
          <section class="card calendar-card">
            <div class="card-header calendar-header">
              <button class="btn btn-ghost btn-icon btn-sm" @click="prevMonth" id="prev-month">‹</button>
              <span class="card-title">{{ viewYear }} 年 {{ viewMonth }} 月</span>
              <button class="btn btn-ghost btn-icon btn-sm" @click="nextMonth" id="next-month">›</button>
            </div>

            <div class="weekday-row">
              <div v-for="w in weekdays" :key="w" class="weekday-cell">{{ w }}</div>
            </div>

            <div class="calendar-grid">
              <div
                v-for="(cell, i) in calendarCells"
                :key="i"
                class="cal-cell"
                :class="{
                  'is-empty': !cell.day,
                  'is-today': cell.isToday,
                  'is-selected': cell.dateStr === selectedDate,
                  'is-future': cell.isFuture,
                  'has-diary': !!cell.diary
                }"
                @click="cell.day && !cell.isFuture && selectDate(cell.dateStr)"
              >
                <template v-if="cell.day">
                  <span class="cal-day">{{ cell.day }}</span>
                  <span v-if="cell.diary" class="cal-mood" :class="'mood-' + cell.diary.mood">
                    {{ moodIcon(cell.diary.mood) }}
                  </span>
                </template>
              </div>
            </div>

            <div class="calendar-legend">
              <span><i class="dot mood-sunny"></i>晴朗</span>
              <span><i class="dot mood-cloudy"></i>多云</span>
              <span><i class="dot mood-rainy"></i>下雨</span>
            </div>
          </section>

          <!-- 右侧：编辑 / 详情 -->
          <section class="card editor-card">
            <div v-if="isTodaySelected" class="editor-wrap">
              <div class="card-header">
                <span class="card-title">
                  {{ hasTodayDiary ? '✏️ 更新今日日记' : '✍️ 记录今天' }}
                </span>
                <span class="today-label">{{ todayStr }}</span>
              </div>

              <form @submit.prevent="handleSubmit">
                <div class="form-group">
                  <label class="form-label">今日心情</label>
                  <div class="mood-picker">
                    <button
                      v-for="m in moods"
                      :key="m.value"
                      type="button"
                      class="mood-btn"
                      :class="{ active: form.mood === m.value }"
                      @click="form.mood = m.value"
                    >
                      <span class="mood-emoji">{{ m.icon }}</span>
                      <span class="mood-name">{{ m.label }}</span>
                    </button>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">今日新学单词数</label>
                  <input
                    v-model.number="form.wordsLearned"
                    type="number"
                    min="0"
                    max="9999"
                    class="form-input"
                    placeholder="例如 20"
                    id="diary-words"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">
                    日记内容
                    <span class="counter" :class="counterClass">{{ form.content.length }} / {{ CONTENT_MAX }}</span>
                  </label>
                  <textarea
                    v-model="form.content"
                    class="form-textarea diary-textarea"
                    rows="8"
                    :maxlength="CONTENT_MAX"
                    placeholder="今天学了哪些单词？有什么收获或困惑？（12–480 字）"
                    id="diary-content"
                  ></textarea>
                  <div v-if="contentError" class="form-hint form-hint-error">{{ contentError }}</div>
                </div>

                <div class="reward-hint" v-if="!hasTodayDiary">
                  🎁 今日首次提交可获得 <b>+17</b> 积分
                  <span v-if="willHitMilestone">，并触发连续打卡里程碑 <b>+53</b>！</span>
                </div>
                <div class="reward-hint" v-else>
                  ℹ️ 今日已提交，再次保存将更新内容，不会重复发放积分。
                </div>

                <button
                  type="submit"
                  class="btn btn-primary"
                  :disabled="!canSubmit || diaryStore.submitting"
                  id="submit-diary"
                >
                  {{ diaryStore.submitting ? '保存中...' : (hasTodayDiary ? '保存更新' : '提交日记') }}
                </button>
              </form>
            </div>

            <div v-else class="detail-wrap">
              <div class="card-header">
                <span class="card-title">📖 {{ selectedDate }} 日记</span>
              </div>
              <template v-if="selectedDiary">
                <div class="detail-mood">
                  <span class="mood-emoji-lg" :class="'mood-' + selectedDiary.mood">
                    {{ moodIcon(selectedDiary.mood) }}
                  </span>
                  <span class="detail-mood-label">{{ moodLabel(selectedDiary.mood) }}</span>
                </div>
                <div class="detail-words">📚 今日新学单词：<b>{{ selectedDiary.wordsLearned }}</b> 个</div>
                <div class="detail-content">{{ selectedDiary.content }}</div>
                <div class="detail-meta">
                  创建：{{ formatTime(selectedDiary.createdAt) }}
                  <span v-if="selectedDiary.updatedAt !== selectedDiary.createdAt">
                    ｜ 更新：{{ formatTime(selectedDiary.updatedAt) }}
                  </span>
                </div>
              </template>
              <div v-else class="empty-state" style="padding:40px 0">
                <div class="empty-state-icon">🗒️</div>
                <div class="empty-state-title">这一天还没有日记</div>
                <div class="empty-state-description">选择其它日期，或回到今天记录一笔。</div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import { useDiaryStore } from '@/stores/diary'
import { useAuthStore } from '@/stores/auth'

const diaryStore = useDiaryStore()
const auth = useAuthStore()

const CONTENT_MIN = 12
const CONTENT_MAX = 480

const moods = [
  { value: 'sunny', label: '晴朗', icon: '😊' },
  { value: 'cloudy', label: '多云', icon: '😐' },
  { value: 'rainy', label: '下雨', icon: '😔' }
]
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const today = new Date()
const todayStr = formatDate(today)
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth() + 1)
const selectedDate = ref(todayStr)

const form = ref({
  content: '',
  mood: 'sunny',
  wordsLearned: 0
})

const hasTodayDiary = computed(() => !!diaryStore.todayDiary)
const isTodaySelected = computed(() => selectedDate.value === todayStr)
const selectedDiary = computed(() => diaryStore.diaryForDate(selectedDate.value))

const willHitMilestone = computed(() => {
  if (hasTodayDiary.value) return false
  const next = diaryStore.streak + 1
  return next > 0 && next % 7 === 0
})

const contentError = computed(() => {
  const len = form.value.content.trim().length
  if (len === 0) return ''
  if (len < CONTENT_MIN) return `还需 ${CONTENT_MIN - len} 字（至少 ${CONTENT_MIN} 字）`
  if (len > CONTENT_MAX) return `超出 ${len - CONTENT_MAX} 字（最多 ${CONTENT_MAX} 字）`
  return ''
})

const counterClass = computed(() => {
  const len = form.value.content.length
  if (len > CONTENT_MAX) return 'over'
  if (len < CONTENT_MIN) return 'under'
  return 'ok'
})

const canSubmit = computed(() => {
  const len = form.value.content.trim().length
  return len >= CONTENT_MIN && len <= CONTENT_MAX && !!form.value.mood
})

const calendarCells = computed(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const firstDay = new Date(y, m - 1, 1).getDay()
  const daysInMonth = new Date(y, m, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push({ day: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const cellDate = new Date(y, m - 1, d)
    cells.push({
      day: d,
      dateStr,
      isToday: dateStr === todayStr,
      isFuture: cellDate > today,
      diary: diaryStore.diaryForDate(dateStr)
    })
  }
  while (cells.length % 7 !== 0) cells.push({ day: null })
  return cells
})

function moodIcon(mood) {
  return moods.find(m => m.value === mood)?.icon || '📝'
}
function moodLabel(mood) {
  return moods.find(m => m.value === mood)?.label || ''
}

function prevMonth() {
  if (viewMonth.value === 1) { viewMonth.value = 12; viewYear.value-- }
  else viewMonth.value--
}
function nextMonth() {
  if (viewMonth.value === 12) { viewMonth.value = 1; viewYear.value++ }
  else viewMonth.value++
}
function goToday() {
  viewYear.value = today.getFullYear()
  viewMonth.value = today.getMonth() + 1
  selectedDate.value = todayStr
}
function selectDate(dateStr) {
  selectedDate.value = dateStr
}

function fillFormFromToday() {
  const d = diaryStore.todayDiary
  form.value = {
    content: d?.content || '',
    mood: d?.mood || 'sunny',
    wordsLearned: typeof d?.wordsLearned === 'number' ? d.wordsLearned : 0
  }
}

async function refreshMonth() {
  await diaryStore.loadMonth(viewYear.value, viewMonth.value)
}

async function handleSubmit() {
  const payload = {
    content: form.value.content.trim(),
    mood: form.value.mood,
    wordsLearned: Number(form.value.wordsLearned) || 0
  }
  const result = await diaryStore.submitDiary(payload)
  if (result) {
    // 提交后刷新月度数据与连续打卡，展示最新状态
    await Promise.all([refreshMonth(), diaryStore.loadStreak(), auth.refreshUser()])
    fillFormFromToday()
  }
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDate(d) {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(d)
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

watch([viewYear, viewMonth], () => {
  refreshMonth()
})

watch(() => diaryStore.todayDiary, () => {
  if (isTodaySelected.value) fillFormFromToday()
}, { immediate: false })

onMounted(async () => {
  fillFormFromToday()
  await Promise.all([refreshMonth(), diaryStore.loadStreak()])
  fillFormFromToday()
})
</script>

<style scoped>
.topbar-actions { margin-left: auto; display: flex; gap: 8px; }

.streak-banner {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg) var(--spacing-xl);
  background: var(--gradient-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-lg);
}
.streak-flame { font-size: 40px; line-height: 1; filter: drop-shadow(0 0 12px rgba(245,158,11,0.5)); }
.streak-info { flex: 1; }
.streak-num { font-size: 18px; font-weight: 700; }
.streak-value {
  font-size: 26px;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin: 0 4px;
}
.streak-sub { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
.streak-reward {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  padding-left: var(--spacing-lg);
  border-left: 1px solid var(--border-default);
}
.reward-line b { color: var(--warning-400); }

.diary-grid {
  display: grid;
  grid-template-columns: minmax(320px, 1.1fr) minmax(320px, 1fr);
  gap: var(--spacing-lg);
}

.calendar-card { padding: var(--spacing-lg); }
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}
.calendar-header .card-title { font-size: 16px; }

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 6px;
}
.weekday-cell {
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 600;
  padding: 6px 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.cal-cell {
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
  border: 1px solid transparent;
}
.cal-cell:not(.is-empty):hover { background: var(--bg-surface); transform: translateY(-1px); }
.cal-cell.is-empty { background: transparent; cursor: default; }
.cal-cell.is-future { opacity: 0.4; cursor: not-allowed; }
.cal-cell.is-today {
  border-color: var(--primary-400);
  box-shadow: 0 0 0 2px rgba(99,102,241,0.25);
}
.cal-cell.is-selected {
  background: var(--primary-600);
  color: white;
}
.cal-cell.is-selected .cal-day { color: white; }
.cal-day { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.cal-cell.is-selected.has-diary .cal-day { color: white; }
.cal-mood { font-size: 14px; line-height: 1; }

.calendar-legend {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
  font-size: 12px;
  color: var(--text-muted);
  justify-content: center;
}
.calendar-legend .dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
}
.dot.mood-sunny { background: var(--warning-500); }
.dot.mood-cloudy { background: var(--gray-400); }
.dot.mood-rainy { background: var(--teal-500); }

.mood-sunny { color: var(--warning-500); }
.mood-cloudy { color: var(--gray-400); }
.mood-rainy { color: var(--teal-500); }

.editor-card { padding: var(--spacing-lg); }
.today-label { font-size: 12px; color: var(--text-muted); margin-left: auto; }

.mood-picker {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
}
.mood-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--spacing-md);
  background: var(--bg-elevated);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.mood-btn:hover { background: var(--bg-surface); }
.mood-btn.active {
  border-color: var(--primary-500);
  background: rgba(99,102,241,0.15);
  color: var(--text-primary);
}
.mood-emoji { font-size: 26px; }
.mood-name { font-size: 12px; }

.diary-textarea { resize: vertical; min-height: 140px; line-height: 1.6; }
.counter { float: right; font-size: 12px; color: var(--text-muted); font-weight: 400; }
.counter.ok { color: var(--success-400); }
.counter.over { color: var(--error-400); }
.form-hint { font-size: 12px; margin-top: 4px; color: var(--text-muted); }
.form-hint-error { color: var(--error-400); }

.reward-hint {
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.25);
  color: var(--warning-400);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  margin: var(--spacing-md) 0;
}
.reward-hint b { color: var(--warning-500); }

.detail-wrap { display: flex; flex-direction: column; gap: var(--spacing-md); }
.detail-mood {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
}
.mood-emoji-lg { font-size: 34px; }
.detail-mood-label { font-size: 16px; font-weight: 600; }
.detail-words { font-size: 14px; color: var(--text-secondary); }
.detail-content {
  background: var(--bg-elevated);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-primary);
}
.detail-meta { font-size: 12px; color: var(--text-muted); }

@media (max-width: 960px) {
  .diary-grid { grid-template-columns: 1fr; }
}
</style>
