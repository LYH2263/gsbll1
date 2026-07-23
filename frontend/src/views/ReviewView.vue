<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <header class="topbar">
        <h1 class="page-title" style="margin:0">🔄 今日复习</h1>
        <div style="margin-left:auto; display:flex; align-items:center; gap:12px">
          <span class="badge badge-error" v-if="dueCount > 0">{{ dueCount }} 个待复习</span>
        </div>
      </header>
      <main class="page-container">
        <template v-if="!started">
          <div class="review-intro">
            <div class="review-hero">
              <div class="review-hero-icon">🔄</div>
              <h2>今日复习计划</h2>
              <p>基于艾宾浩斯遗忘曲线，以下单词需要今日复习</p>
              <div class="review-count-badge" v-if="dueCount > 0">{{ dueCount }} 个单词</div>
              <div class="review-count-badge empty" v-else>今日无需复习 🎉</div>
            </div>
            <button v-if="dueCount > 0" class="btn btn-primary btn-lg" @click="startReview" id="start-review-btn">
              开始复习 →
            </button>
            <RouterLink v-else to="/wordbooks" class="btn btn-primary btn-lg">去学习新单词</RouterLink>
          </div>
        </template>

        <!-- 复习界面（词义匹配） -->
        <template v-else>
          <div class="review-main">
            <div class="review-progress-bar">
              <div class="review-progress-fill" :style="{ width: `${progress}%` }"></div>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:20px; font-size:14px; color:var(--text-muted)">
              <span>{{ currentIndex + 1 }} / {{ reviewWords.length }}</span>
              <span>⏱ {{ formatTime(elapsed) }}</span>
              <span>🎯 {{ score }}分</span>
            </div>

            <div class="word-display-card word-card" style="margin-bottom:24px; min-height:200px">
              <div class="word-text">{{ currentWord?.word }}</div>
              <div class="word-phonetic">{{ currentWord?.phonetic }}</div>
              <button class="btn btn-ghost btn-sm" @click="speak(currentWord?.word)" style="margin-top:8px">🔊 朗读</button>
            </div>

            <p style="text-align:center; color:var(--text-secondary); margin-bottom:16px">选择正确的中文释义：</p>
            <div class="matching-options" v-if="!showResult">
              <button
                v-for="(opt, i) in options"
                :key="i"
                class="matching-btn"
                :class="{ correct: showResult && opt.isCorrect, wrong: showResult && selectedIdx === i && !opt.isCorrect }"
                @click="selectAnswer(i)"
                :id="`review-opt-${i}`"
              >
                <span class="option-letter">{{ ['A','B','C','D'][i] }}</span>
                {{ opt.text }}
              </button>
            </div>

            <div v-if="showResult" class="result-panel">
              <div :class="['result-badge', lastCorrect ? 'correct' : 'wrong']">
                {{ lastCorrect ? '✅ 正确！' : '❌ 错误' }}
              </div>
              <div class="word-reveal" style="text-align:center; margin:16px 0">
                <div style="font-size:28px; font-weight:800">{{ currentWord?.word }}</div>
                <div style="font-size:16px; color:var(--text-accent)">{{ currentWord?.phonetic }}</div>
                <div style="font-size:18px; color:var(--text-primary); font-weight:600; margin-top:8px">{{ currentWord?.translation }}</div>
              </div>
              <div class="quality-section">
                <p class="quality-label">记忆质量评分：</p>
                <div class="quality-buttons">
                  <button class="quality-btn quality-forgot" @click="nextWord(1)" id="rev-q-forgot">😰 完全忘了</button>
                  <button class="quality-btn quality-hard" @click="nextWord(3)" id="rev-q-hard">😅 模糊记得</button>
                  <button class="quality-btn quality-easy" @click="nextWord(5)" id="rev-q-easy">😄 完全记住</button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import api from '@/utils/api'
import { toast } from '@/utils/toast'

const started = ref(false)
const reviewWords = ref([])
const allWords = ref([])
const currentIndex = ref(0)
const dueCount = ref(0)
const showResult = ref(false)
const lastCorrect = ref(false)
const selectedIdx = ref(-1)
const options = ref([])
const score = ref(0)
const elapsed = ref(0)
const timer = ref(null)
const wordStartTime = ref(null)

const currentWord = computed(() => reviewWords.value[currentIndex.value])
const progress = computed(() => reviewWords.value.length > 0 ? (currentIndex.value / reviewWords.value.length) * 100 : 0)

function formatTime(s) {
  return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`
}

function speak(word) {
  if (!word) return
  const u = new SpeechSynthesisUtterance(word)
  u.lang = 'en-US'; u.rate = 0.8
  window.speechSynthesis.speak(u)
}

async function fetchDueCount() {
  try {
    const res = await api.get('/review/due')
    dueCount.value = res.data.count
    reviewWords.value = res.data.words
  } catch {}
}

async function startReview() {
  if (!reviewWords.value.length) {
    const res = await api.get('/review/due')
    reviewWords.value = res.data.words
  }
  const allRes = await api.get('/words', { params: { limit: 100 } })
  allWords.value = allRes.data.words
  started.value = true
  timer.value = setInterval(() => elapsed.value++, 1000)
  wordStartTime.value = Date.now()
  generateOptions()
}

function generateOptions() {
  const current = currentWord.value
  if (!current) return
  const others = allWords.value.filter(w => w._id !== current._id).sort(() => Math.random() - 0.5).slice(0, 3)
  options.value = [...others.map(w => ({ text: w.translation, isCorrect: false })), { text: current.translation, isCorrect: true }].sort(() => Math.random() - 0.5)
  selectedIdx.value = -1
}

function selectAnswer(i) {
  if (showResult.value) return
  selectedIdx.value = i
  lastCorrect.value = options.value[i].isCorrect
  const timeSpent = (Date.now() - wordStartTime.value) / 1000
  score.value += lastCorrect.value ? 10 : 2
  showResult.value = true

  api.post('/study/submit', {
    wordId: currentWord.value._id,
    bookId: currentWord.value.bookId,
    quality: lastCorrect.value ? 5 : 1,
    studyMode: 'review',
    timeSpent: Math.round(timeSpent),
    isCorrect: lastCorrect.value
  }).catch(() => {})
}

async function nextWord(quality) {
  await api.post('/study/submit', {
    wordId: currentWord.value._id,
    bookId: currentWord.value.bookId,
    quality,
    studyMode: 'review',
    timeSpent: 0,
    isCorrect: quality >= 3
  }).catch(() => {})

  showResult.value = false
  if (currentIndex.value >= reviewWords.value.length - 1) {
    clearInterval(timer.value)
    toast.success(`复习完成！共复习 ${reviewWords.value.length} 个单词，获得 ${score.value} 积分 🎉`)
    started.value = false
    dueCount.value = 0
    return
  }
  currentIndex.value++
  wordStartTime.value = Date.now()
  generateOptions()
}

import { onMounted } from 'vue'
onMounted(fetchDueCount)
onUnmounted(() => clearInterval(timer.value))
</script>

<style scoped>
.review-intro {
  max-width: 500px;
  margin: 60px auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.review-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.review-hero-icon { font-size: 72px; }
.review-hero h2 { font-size: 28px; font-weight: 800; }
.review-hero p { color: var(--text-muted); }

.review-count-badge {
  padding: 10px 24px;
  border-radius: var(--radius-full);
  font-size: 20px;
  font-weight: 800;
  background: rgba(239,68,68,0.15);
  color: var(--error-400);
  border: 1px solid rgba(239,68,68,0.3);
}
.review-count-badge.empty {
  background: rgba(34,197,94,0.15);
  color: var(--success-400);
  border-color: rgba(34,197,94,0.3);
}

.review-main { max-width: 600px; margin: 0 auto; }

.review-progress-bar {
  height: 8px;
  background: var(--bg-elevated);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: 12px;
}

.review-progress-fill {
  height: 100%;
  background: var(--gradient-primary);
  border-radius: var(--radius-full);
  transition: width 0.4s ease;
}

.matching-options { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.matching-btn {
  display: flex; align-items: flex-start; gap: 12px; padding: 16px;
  border-radius: var(--radius-lg); background: var(--bg-elevated);
  border: 2px solid var(--border-default); color: var(--text-primary);
  font-size: 15px; cursor: pointer; transition: all var(--transition-normal);
  text-align: left; line-height: 1.5;
}
.matching-btn:hover { border-color: var(--primary-400); background: rgba(99,102,241,0.08); }
.matching-btn.correct { border-color: var(--success-500); background: rgba(34,197,94,0.15); color: var(--success-400); }
.matching-btn.wrong { border-color: var(--error-500); background: rgba(239,68,68,0.15); color: var(--error-400); }

.option-letter { min-width: 28px; height: 28px; border-radius: 50%; background: var(--bg-surface); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
</style>
