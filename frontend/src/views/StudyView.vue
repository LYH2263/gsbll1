<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <!-- 学习模式选择 -->
      <template v-if="!studyMode">
        <header class="topbar">
          <button class="btn btn-ghost btn-sm" @click="$router.back()">← 返回</button>
          <h1 class="page-title" style="margin:0">📖 选择学习模式</h1>
        </header>
        <main class="page-container">
          <div class="mode-select-grid" style="max-width:800px; margin:40px auto 0">
            <div
              v-for="mode in modes"
              :key="mode.id"
              :class="['mode-card', `mode-${mode.id}`]"
              @click="startMode(mode.id)"
            >
              <div class="mode-icon">{{ mode.icon }}</div>
              <h3 class="mode-title">{{ mode.title }}</h3>
              <p class="mode-desc">{{ mode.desc }}</p>
              <div class="mode-tags">
                <span v-for="tag in mode.tags" :key="tag" class="chip">{{ tag }}</span>
              </div>
              <button class="btn btn-primary mode-start-btn" :id="`start-mode-${mode.id}`">开始 →</button>
            </div>
          </div>

          <!-- 选择学习内容 -->
          <div class="content-select card" style="max-width:500px; margin:32px auto">
            <div class="card-header"><span class="card-title">⚙️ 学习设置</span></div>
            <div class="form-group">
              <label class="form-label">单词数量</label>
              <select v-model="wordCount" class="form-select" id="word-count-select">
                <option :value="10">10个（快速练习）</option>
                <option :value="20">20个（推荐）</option>
                <option :value="30">30个（加强）</option>
                <option :value="50">50个（全面复习）</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">学习内容</label>
              <select v-model="contentMode" class="form-select" id="content-mode-select">
                <option value="new">学习新单词</option>
                <option value="review">复习旧单词</option>
                <option value="mixed">混合模式</option>
              </select>
            </div>
          </div>
        </main>
      </template>

      <!-- 学习界面 -->
      <template v-else>
        <header class="study-topbar">
          <button class="btn btn-ghost btn-sm" @click="exitStudy">← 退出</button>
          <div class="study-progress-wrap">
            <div class="study-progress-bar">
              <div class="study-progress-fill" :style="{ width: `${progress}%` }"></div>
            </div>
            <span class="study-progress-text">{{ currentIndex + 1 }} / {{ sessionWords.length }}</span>
          </div>
          <div class="study-meta">
            <div class="study-timer">⏱ {{ formatTime(elapsed) }}</div>
            <div class="study-score" v-if="score > 0">🎯 {{ score }}分</div>
          </div>
        </header>

        <main class="study-main">
          <!-- 拼写练习模式 -->
          <div v-if="studyMode === 'spelling'" class="mode-spelling-view">
            <div class="word-prompt">
              <p class="prompt-label">根据中文释义拼写单词：</p>
              <h2 class="prompt-word">{{ currentWord?.translation }}</h2>
              <p class="prompt-phonetic">{{ currentWord?.phonetic }}</p>
              <p class="prompt-example" v-if="currentWord?.example">
                <em>{{ currentWord.example.replace(new RegExp(currentWord.word, 'gi'), '______') }}</em>
              </p>
            </div>
            <div class="spelling-input-wrap">
              <div class="spelling-letters">
                <input
                  v-for="(_, i) in Array(currentWord?.word?.length || 0)"
                  :key="i"
                  :ref="el => letterInputs[i] = el"
                  class="letter-input"
                  maxlength="1"
                  v-model="spellingAnswer[i]"
                  @input="onLetterInput(i, $event)"
                  @keydown.backspace="onBackspace(i)"
                  @keydown.enter="checkSpelling"
                  :class="{ correct: showResult && spellingAnswer[i]?.toLowerCase() === currentWord.word[i]?.toLowerCase(), wrong: showResult && spellingAnswer[i]?.toLowerCase() !== currentWord.word[i]?.toLowerCase() }"
                  :disabled="showResult"
                  autocomplete="off"
                />
              </div>
              <div class="spelling-hint" v-if="hintCount > 0">
                提示已用：{{ hintCount }}次 <span class="hint-penalty">(每次-2分)</span>
              </div>
              <div class="spelling-actions">
                <button class="btn btn-secondary" @click="giveHint" :disabled="showResult || hintUsed >= currentWord?.word?.length">💡 提示</button>
                <button class="btn btn-primary" @click="checkSpelling" :disabled="showResult || spellingAnswer.some(l => !l)" id="check-spelling-btn">✓ 检查</button>
              </div>
            </div>
          </div>

          <!-- 词义匹配模式 -->
          <div v-else-if="studyMode === 'matching'" class="mode-matching-view">
            <div class="word-display-card word-card">
              <div class="word-text">{{ currentWord?.word }}</div>
              <div class="word-phonetic">{{ currentWord?.phonetic }}</div>
              <div class="word-example" v-if="currentWord?.example">{{ currentWord.example }}</div>
            </div>
            <p class="matching-prompt">选择正确的中文释义：</p>
            <div class="matching-options">
              <button
                v-for="(opt, i) in matchingOptions"
                :key="i"
                :class="['matching-btn', { selected: selectedOption === i, correct: showResult && opt.isCorrect, wrong: showResult && selectedOption === i && !opt.isCorrect }]"
                @click="selectOption(i)"
                :disabled="showResult"
                :id="`option-${i}`"
              >
                <span class="option-letter">{{ ['A', 'B', 'C', 'D'][i] }}</span>
                {{ opt.text }}
              </button>
            </div>
          </div>

          <!-- 听力辨词模式 -->
          <div v-else-if="studyMode === 'listening'" class="mode-listening-view">
            <div class="listening-card">
              <div class="listen-btn-wrap">
                <button class="listen-btn" @click="playAudio" id="play-audio-btn">
                  <span class="listen-icon">{{ isPlaying ? '⏸' : '🔊' }}</span>
                  <span>{{ isPlaying ? '播放中...' : '点击播放' }}</span>
                </button>
                <p class="listen-hint">听到单词后，在下方输入拼写</p>
              </div>
              <div class="listen-count">已播放 {{ playCount }} 次</div>
            </div>
            <div class="listening-input-wrap">
              <input
                v-model="listeningAnswer"
                class="form-input listening-input"
                placeholder="输入你听到的单词..."
                @keydown.enter="checkListening"
                :disabled="showResult"
                ref="listeningInput"
                id="listening-answer-input"
              />
              <div v-if="showResult" class="listen-result">
                <template v-if="listeningAnswer.toLowerCase().trim() === currentWord?.word?.toLowerCase()">
                  <span class="result-correct">✅ 正确！</span>
                </template>
                <template v-else>
                  <span class="result-wrong">❌ 正确答案：</span>
                  <span class="result-answer">{{ currentWord?.word }}</span>
                </template>
              </div>
              <button class="btn btn-primary" @click="checkListening" :disabled="showResult || !listeningAnswer" id="check-listening-btn">确认答案</button>
            </div>
          </div>

          <!-- 结果反馈 & 记忆评分 -->
          <div v-if="showResult" class="result-panel">
            <div :class="['result-badge', lastCorrect ? 'correct' : 'wrong']">
              {{ lastCorrect ? '🎉 正确！' : '😢 再努力！' }}
            </div>
            <div class="word-reveal">
              <div class="reveal-word">{{ currentWord?.word }}</div>
              <div class="reveal-phonetic">{{ currentWord?.phonetic }}</div>
              <div class="reveal-translation">{{ currentWord?.translation }}</div>
              <div class="reveal-example" v-if="currentWord?.example">
                <em>{{ currentWord.example }}</em>
                <span>{{ currentWord.exampleTranslation }}</span>
              </div>
            </div>
            <div class="quality-section">
              <p class="quality-label">这个单词你掌握得怎么样？</p>
              <div class="quality-buttons">
                <button class="quality-btn quality-forgot" @click="submitQuality(1)" id="quality-forgot">😰 完全忘了<small>明天再复习</small></button>
                <button class="quality-btn quality-hard" @click="submitQuality(3)" id="quality-hard">😅 有些困难<small>3天后复习</small></button>
                <button class="quality-btn quality-easy" @click="submitQuality(5)" id="quality-easy">😄 完全记住<small>7天后复习</small></button>
              </div>
            </div>
          </div>
        </main>
      </template>

      <!-- 学习完成弹窗 -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="showComplete" class="modal-overlay">
            <div class="modal-box complete-modal">
              <div class="complete-icon">🏆</div>
              <h2 class="complete-title">学习完成！</h2>
              <div class="complete-stats">
                <div class="complete-stat"><span class="cs-val">{{ sessionStats.correct }}</span><span class="cs-label">答对</span></div>
                <div class="complete-stat"><span class="cs-val">{{ sessionStats.wrong }}</span><span class="cs-label">答错</span></div>
                <div class="complete-stat"><span class="cs-val">{{ sessionStats.accuracy }}%</span><span class="cs-label">正确率</span></div>
                <div class="complete-stat"><span class="cs-val">{{ formatTime(elapsed) }}</span><span class="cs-label">用时</span></div>
              </div>
              <div class="complete-points">本次获得 +{{ score }} 积分 🎯</div>
              <div class="modal-footer" style="justify-content:center">
                <button class="btn btn-secondary" @click="$router.back()" id="btn-back-after-study">返回</button>
                <button class="btn btn-primary" @click="restartStudy" id="btn-restart-study">再来一次</button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
import api from '@/utils/api'
import { toast } from '@/utils/toast'

const route = useRoute()
const router = useRouter()
const bookId = route.params.bookId

// 状态
const studyMode = ref('')
const wordCount = ref(20)
const contentMode = ref('new')
const sessionWords = ref([])
const currentIndex = ref(0)
const score = ref(0)
const elapsed = ref(0)
const timer = ref(null)
const showResult = ref(false)
const showComplete = ref(false)
const lastCorrect = ref(false)
const startTime = ref(null)
const wordStartTime = ref(null)

// 拼写模式
const spellingAnswer = ref([])
const letterInputs = ref([])
const hintUsed = ref(0)
const hintCount = ref(0)

// 匹配模式
const matchingOptions = ref([])
const selectedOption = ref(-1)
const allWords = ref([])

// 听力模式
const listeningAnswer = ref('')
const listeningInput = ref(null)
const isPlaying = ref(false)
const playCount = ref(0)

// 统计
const sessionStats = ref({ correct: 0, wrong: 0, accuracy: 0 })

const currentWord = computed(() => sessionWords.value[currentIndex.value])
const progress = computed(() => sessionWords.value.length > 0 ? ((currentIndex.value) / sessionWords.value.length) * 100 : 0)

const modes = [
  { id: 'matching', icon: '🎯', title: '词义匹配', desc: '看单词，选择正确的中文释义', tags: ['选择题', '理解', '快速'], color: '#F59E0B' },
  { id: 'spelling', icon: '✏️', title: '拼写练习', desc: '看中文释义，拼写出正确的英文单词', tags: ['输入', '拼写', '记忆'], color: '#818CF8' },
  { id: 'listening', icon: '🎧', title: '听力辨词', desc: '听单词发音，拼写出听到的单词', tags: ['听力', '发音', '综合'], color: '#34D399' },
]

async function startMode(mode) {
  studyMode.value = mode
  await loadWords()
  startTimer()
  if (mode === 'matching') generateMatchingOptions()
  if (mode === 'spelling') initSpelling()
  if (mode === 'listening') {
    nextTick(() => playAudio())
  }
}

async function loadWords() {
  try {
    let words = []
    if (contentMode.value === 'new') {
      const res = await api.get('/study/session', { params: { bookId, mode: 'new', limit: wordCount.value } })
      words = res.data.words
    } else if (contentMode.value === 'review') {
      const res = await api.get('/study/session', { params: { bookId, mode: 'review', limit: wordCount.value } })
      words = res.data.words
    } else {
      const [newRes, revRes] = await Promise.all([
        api.get('/study/session', { params: { bookId, mode: 'new', limit: Math.floor(wordCount.value / 2) } }),
        api.get('/study/session', { params: { bookId, mode: 'review', limit: Math.floor(wordCount.value / 2) } })
      ])
      words = [...newRes.data.words, ...revRes.data.words].sort(() => Math.random() - 0.5)
    }

    if (words.length === 0) {
      toast.warning('没有可学习的单词，请先在单词书中添加单词')
      studyMode.value = ''
      return
    }

    // 获取所有单词用于匹配模式的干扰项
    const allRes = await api.get('/words', { params: { bookId, limit: 100 } })
    allWords.value = allRes.data.words
    
    sessionWords.value = words
    currentIndex.value = 0
    wordStartTime.value = Date.now()
  } catch (err) {
    toast.error('加载单词失败')
    studyMode.value = ''
  }
}

// 拼写模式
function initSpelling() {
  if (!currentWord.value) return
  spellingAnswer.value = new Array(currentWord.value.word.length).fill('')
  hintUsed.value = 0
  nextTick(() => {
    if (letterInputs.value[0]) letterInputs.value[0].focus()
  })
}

function onLetterInput(i, e) {
  const val = e.target.value.replace(/[^a-zA-Z]/g, '') || ''
  spellingAnswer.value[i] = val
  if (val && i < currentWord.value.word.length - 1) {
    nextTick(() => {
      if (letterInputs.value[i + 1]) letterInputs.value[i + 1].focus()
    })
  }
}

function onBackspace(i) {
  if (!spellingAnswer.value[i] && i > 0) {
    spellingAnswer.value[i - 1] = ''
    nextTick(() => {
      if (letterInputs.value[i - 1]) letterInputs.value[i - 1].focus()
    })
  }
}

function giveHint() {
  const word = currentWord.value.word
  for (let i = 0; i < word.length; i++) {
    if (!spellingAnswer.value[i]) {
      spellingAnswer.value[i] = word[i]
      hintUsed.value++
      hintCount.value++
      score.value = Math.max(0, score.value - 2)
      nextTick(() => {
        const nextEmpty = spellingAnswer.value.findIndex((l, j) => j > i && !l)
        if (nextEmpty !== -1 && letterInputs.value[nextEmpty]) letterInputs.value[nextEmpty].focus()
      })
      return
    }
  }
}

function checkSpelling() {
  const answer = spellingAnswer.value.join('').toLowerCase()
  const correct = currentWord.value.word.toLowerCase()
  lastCorrect.value = answer === correct
  const timeSpent = (Date.now() - wordStartTime.value) / 1000
  submitResult(lastCorrect.value ? 5 : 1, timeSpent)
}

// 匹配模式
function generateMatchingOptions() {
  if (!currentWord.value) return
  const correct = { text: currentWord.value.translation, isCorrect: true }
  const others = allWords.value
    .filter(w => w._id !== currentWord.value._id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(w => ({ text: w.translation, isCorrect: false }))
  
  matchingOptions.value = [...others, correct].sort(() => Math.random() - 0.5)
  selectedOption.value = -1
}

function selectOption(i) {
  if (showResult.value) return
  selectedOption.value = i
  lastCorrect.value = matchingOptions.value[i].isCorrect
  const timeSpent = (Date.now() - wordStartTime.value) / 1000
  submitResult(lastCorrect.value ? 5 : 1, timeSpent)
}

// 听力模式
function playAudio() {
  if (!currentWord.value) return
  isPlaying.value = true
  playCount.value++
  const utterance = new SpeechSynthesisUtterance(currentWord.value.word)
  utterance.lang = 'en-US'
  utterance.rate = 0.75
  utterance.onend = () => { isPlaying.value = false }
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
  nextTick(() => {
    if (listeningInput.value) listeningInput.value.focus()
  })
}

function checkListening() {
  if (!listeningAnswer.value) return
  lastCorrect.value = listeningAnswer.value.toLowerCase().trim() === currentWord.value.word.toLowerCase()
  const timeSpent = (Date.now() - wordStartTime.value) / 1000
  submitResult(lastCorrect.value ? 5 : 1, timeSpent)
}

// 统一结果提交
function submitResult(quality, timeSpent) {
  showResult.value = true
  const points = quality >= 3 ? 10 : 2
  score.value += points
  if (quality >= 3) sessionStats.value.correct++
  else sessionStats.value.wrong++

  // 后台保存学习记录
  api.post('/study/submit', {
    wordId: currentWord.value._id,
    bookId,
    quality,
    studyMode: studyMode.value,
    timeSpent: Math.round(timeSpent),
    isCorrect: quality >= 3
  }).catch(() => {})
}

async function submitQuality(quality) {
  // 使用用户选择的记忆质量（覆盖自动质量）
  showResult.value = false
  wordStartTime.value = Date.now()

  if (currentIndex.value >= sessionWords.value.length - 1) {
    finishSession()
    return
  }

  currentIndex.value++

  // 为下一个单词初始化
  await nextTick()
  if (studyMode.value === 'matching') generateMatchingOptions()
  if (studyMode.value === 'spelling') {
    spellingAnswer.value = new Array(currentWord.value.word.length).fill('')
    hintUsed.value = 0
    nextTick(() => {
      if (letterInputs.value[0]) letterInputs.value[0].focus()
    })
  }
  if (studyMode.value === 'listening') {
    listeningAnswer.value = ''
    playCount.value = 0
    nextTick(() => playAudio())
  }
}

function finishSession() {
  const total = sessionStats.value.correct + sessionStats.value.wrong
  sessionStats.value.accuracy = total > 0 ? Math.round((sessionStats.value.correct / total) * 100) : 0
  clearInterval(timer.value)
  showComplete.value = true
}

function startTimer() {
  startTime.value = Date.now()
  timer.value = setInterval(() => { elapsed.value++ }, 1000)
}

function formatTime(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

async function exitStudy() {
  studyMode.value = ''
  clearInterval(timer.value)
  elapsed.value = 0
  score.value = 0
  showResult.value = false
  sessionWords.value = []
  sessionStats.value = { correct: 0, wrong: 0, accuracy: 0 }
}

function restartStudy() {
  showComplete.value = false
  exitStudy()
}

onUnmounted(() => { clearInterval(timer.value) })
</script>

<style scoped>
.study-topbar {
  height: 60px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-xl);
  gap: var(--spacing-lg);
  position: sticky;
  top: 0;
  z-index: 40;
}

.study-progress-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.study-progress-bar {
  flex: 1;
  height: 10px;
  background: var(--bg-elevated);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.study-progress-fill {
  height: 100%;
  background: var(--gradient-primary);
  border-radius: var(--radius-full);
  transition: width 0.4s ease;
}

.study-progress-text { white-space: nowrap; font-size: 13px; color: var(--text-secondary); font-weight: 600; }
.study-meta { display: flex; gap: 16px; align-items: center; }
.study-timer { font-size: 14px; color: var(--text-muted); font-weight: 600; }
.study-score { font-size: 14px; color: var(--primary-400); font-weight: 700; }

.study-main {
  padding: var(--spacing-xl);
  max-width: 680px;
  margin: 0 auto;
}

/* 模式选择 */
.mode-select-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-xl);
}

.mode-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  cursor: pointer;
  transition: all var(--transition-normal);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
}

.mode-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary-500);
}

.mode-icon { font-size: 52px; }
.mode-title { font-size: 20px; font-weight: 800; color: var(--text-primary); }
.mode-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.5; }
.mode-tags { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.mode-start-btn { margin-top: 8px; width: 100%; justify-content: center; }

/* 拼写模式 */
.word-prompt {
  text-align: center;
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-xl);
  background: var(--gradient-card);
  border: 1px solid rgba(99,102,241,0.2);
  border-radius: var(--radius-xl);
}

.prompt-label { font-size: 13px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; }
.prompt-word { font-size: 32px; font-weight: 800; color: var(--text-primary); margin: 12px 0; }
.prompt-phonetic { font-size: 16px; color: var(--text-accent); font-style: italic; }
.prompt-example { font-size: 14px; color: var(--text-muted); margin-top: 12px; font-style: italic; }

.spelling-input-wrap { display: flex; flex-direction: column; align-items: center; gap: 20px; }
.spelling-letters { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }

.letter-input {
  width: 48px;
  height: 60px;
  text-align: center;
  font-size: 24px;
  font-weight: 700;
  text-transform: uppercase;
  background: var(--bg-elevated);
  border: 2px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.letter-input:focus { border-color: var(--primary-500); background: var(--bg-surface); box-shadow: 0 0 0 3px rgba(99,102,241,0.2); }
.letter-input.correct { border-color: var(--success-500); background: rgba(34,197,94,0.1); color: var(--success-400); }
.letter-input.wrong { border-color: var(--error-500); background: rgba(239,68,68,0.1); color: var(--error-400); }

.spelling-hint { font-size: 13px; color: var(--text-muted); }
.hint-penalty { color: var(--error-400); font-size: 12px; }
.spelling-actions { display: flex; gap: 12px; }

/* 匹配模式 */
.mode-matching-view { display: flex; flex-direction: column; gap: var(--spacing-xl); }
.matching-prompt { font-size: 16px; color: var(--text-secondary); text-align: center; }
.matching-options { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.matching-btn {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 2px solid var(--border-default);
  color: var(--text-primary);
  font-size: 15px;
  cursor: pointer;
  transition: all var(--transition-normal);
  text-align: left;
  line-height: 1.5;
}

.matching-btn:hover { border-color: var(--primary-400); background: rgba(99,102,241,0.08); }
.matching-btn.selected { border-color: var(--primary-500); background: rgba(99,102,241,0.15); }
.matching-btn.correct { border-color: var(--success-500); background: rgba(34,197,94,0.15); color: var(--success-400); }
.matching-btn.wrong { border-color: var(--error-500); background: rgba(239,68,68,0.15); color: var(--error-400); }

.option-letter {
  min-width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}

/* 听力模式 */
.mode-listening-view { display: flex; flex-direction: column; align-items: center; gap: var(--spacing-xl); }
.listening-card { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.listen-btn-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; }

.listen-btn {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: var(--gradient-primary);
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: var(--shadow-glow), var(--shadow-lg);
  transition: all var(--transition-normal);
  color: white;
  font-size: 14px;
  font-weight: 600;
}

.listen-btn:hover { transform: scale(1.05); box-shadow: 0 0 40px rgba(99,102,241,0.5), var(--shadow-lg); }
.listen-icon { font-size: 52px; }
.listen-hint { font-size: 13px; color: var(--text-muted); }
.listen-count { font-size: 13px; color: var(--text-muted); }
.listening-input-wrap { width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 12px; }
.listening-input { font-size: 18px; text-align: center; padding: 14px; }
.listen-result { text-align: center; font-size: 15px; }
.result-correct { color: var(--success-400); font-weight: 700; }
.result-wrong { color: var(--error-400); }
.result-answer { font-weight: 700; color: var(--primary-400); font-size: 20px; }

/* 结果面板 */
.result-panel {
  margin-top: var(--spacing-xl);
  padding: var(--spacing-xl);
  background: var(--gradient-card);
  border: 1px solid rgba(99,102,241,0.2);
  border-radius: var(--radius-xl);
}

.result-badge {
  text-align: center;
  font-size: 24px;
  font-weight: 800;
  margin-bottom: var(--spacing-lg);
  padding: 12px;
  border-radius: var(--radius-md);
}

.result-badge.correct { background: rgba(34,197,94,0.15); color: var(--success-400); }
.result-badge.wrong { background: rgba(239,68,68,0.15); color: var(--error-400); }

.word-reveal { text-align: center; margin-bottom: var(--spacing-lg); }
.reveal-word { font-size: 40px; font-weight: 800; color: var(--text-primary); }
.reveal-phonetic { font-size: 18px; color: var(--text-accent); font-style: italic; margin: 6px 0; }
.reveal-translation { font-size: 22px; color: var(--text-secondary); font-weight: 500; }
.reveal-example { margin-top: 12px; font-size: 14px; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px; }

.quality-section { margin-top: var(--spacing-lg); }
.quality-label { text-align: center; font-size: 15px; color: var(--text-secondary); margin-bottom: 12px; }

/* 完成弹窗 */
.complete-modal { text-align: center; max-width: 400px; }
.complete-icon { font-size: 64px; margin-bottom: 16px; }
.complete-title { font-size: 28px; font-weight: 800; color: var(--text-primary); margin-bottom: 24px; }
.complete-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.complete-stat { display: flex; flex-direction: column; gap: 4px; padding: 16px 8px; background: var(--bg-elevated); border-radius: var(--radius-md); }
.cs-val { font-size: 24px; font-weight: 800; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.cs-label { font-size: 12px; color: var(--text-muted); }
.complete-points { font-size: 16px; color: var(--warning-400); font-weight: 700; margin-bottom: 8px; }

@media (max-width: 768px) {
  .mode-select-grid { grid-template-columns: 1fr; }
  .matching-options { grid-template-columns: 1fr; }
  .letter-input { width: 38px; height: 50px; font-size: 20px; }
  .complete-stats { grid-template-columns: repeat(2, 1fr); }
  .study-main { padding: var(--spacing-md); }
}
</style>
