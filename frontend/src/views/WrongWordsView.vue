<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <header class="topbar">
        <h1 class="page-title" style="margin:0">❌ 错题集</h1>
        <div style="margin-left:auto; display:flex; gap:10px">
          <span class="badge badge-error" v-if="total > 0">共 {{ total }} 个错题</span>
          <button v-if="total > 0" class="btn btn-primary btn-sm" @click="startWrongReview" id="btn-start-wrong-review">💪 错题专练</button>
        </div>
      </header>
      <main class="page-container">
        <div v-if="loading" style="display:flex;justify-content:center;padding:60px">
          <div class="loading-spinner"></div>
        </div>
        <template v-else-if="records.length">
          <div class="words-grid">
            <div v-for="rec in records" :key="rec._id" class="wrong-word-card card">
              <div class="wrong-word-header">
                <div class="wrong-word-en" @click="speak(rec.wordId.word)">
                  {{ rec.wordId?.word }}
                  <span class="phonetic-small">{{ rec.wordId?.phonetic }}</span>
                </div>
                <button class="btn btn-ghost btn-icon btn-sm" @click="speak(rec.wordId?.word)" title="朗读">🔊</button>
              </div>
              <div class="wrong-word-translation">{{ rec.wordId?.translation }}</div>
              <div class="wrong-word-example" v-if="rec.wordId?.example">
                <em>{{ rec.wordId.example }}</em>
              </div>
              <div class="wrong-word-stats">
                <span class="badge badge-error">错误 {{ rec.wrongCount }} 次</span>
                <span class="badge badge-success">正确 {{ rec.correctCount }} 次</span>
                <span class="badge badge-gray">{{ rec.bookId?.name }}</span>
              </div>
              <div class="wrong-word-actions">
                <button class="btn btn-ghost btn-sm" @click="toggleStar(rec)" :id="`star-wrong-${rec._id}`">
                  {{ rec.isStarred ? '⭐ 已重点' : '☆ 标记重点' }}
                </button>
              </div>
            </div>
          </div>
          <div class="pagination" v-if="totalPages > 1">
            <button class="pagination-btn" :disabled="page <= 1" @click="changePage(page-1)">‹</button>
            <button v-for="p in visiblePages" :key="p" :class="['pagination-btn', {active:p===page}]" @click="changePage(p)">{{ p }}</button>
            <button class="pagination-btn" :disabled="page >= totalPages" @click="changePage(page+1)">›</button>
          </div>
        </template>
        <div v-else class="empty-state">
          <div class="empty-state-icon">🎉</div>
          <div class="empty-state-title">暂无错题</div>
          <div class="empty-state-description">继续保持，错题会在答题有误时自动记录</div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
import api from '@/utils/api'
import { toast } from '@/utils/toast'

const router = useRouter()
const records = ref([])
const total = ref(0)
const loading = ref(true)
const page = ref(1)
const limit = 12

const totalPages = computed(() => Math.ceil(total.value / limit))
const visiblePages = computed(() => {
  const pages = []
  for (let p = Math.max(1, page.value - 2); p <= Math.min(totalPages.value, page.value + 2); p++) pages.push(p)
  return pages
})

async function fetchWrongWords() {
  loading.value = true
  try {
    const res = await api.get('/review/wrong', { params: { page: page.value, limit } })
    records.value = res.data.records
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

async function toggleStar(rec) {
  try {
    const res = await api.post(`/review/star/${rec.wordId._id}`, { bookId: rec.bookId._id })
    rec.isStarred = res.data.isStarred
    toast.success(res.data.isStarred ? '已标记为重点单词 ⭐' : '已取消重点标记')
  } catch { toast.error('操作失败') }
}

function speak(word) {
  if (!word) return
  const u = new SpeechSynthesisUtterance(word)
  u.lang = 'en-US'; u.rate = 0.8
  window.speechSynthesis.speak(u)
}

function startWrongReview() {
  toast.info('请前往单词书选择错题专项复习模式')
  router.push('/wordbooks')
}

function changePage(p) { page.value = p; fetchWrongWords() }

onMounted(fetchWrongWords)
</script>

<style scoped>
.words-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-md);
}

.wrong-word-card { display: flex; flex-direction: column; gap: 10px; }
.wrong-word-header { display: flex; align-items: center; justify-content: space-between; }
.wrong-word-en { font-size: 22px; font-weight: 800; color: var(--text-primary); cursor: pointer; }
.wrong-word-en:hover { color: var(--primary-400); }
.phonetic-small { font-size: 13px; color: var(--text-accent); font-style: italic; margin-left: 8px; font-weight: 400; }
.wrong-word-translation { font-size: 15px; color: var(--text-secondary); font-weight: 500; }
.wrong-word-example { font-size: 13px; color: var(--text-muted); font-style: italic; line-height: 1.5; }
.wrong-word-stats { display: flex; gap: 6px; flex-wrap: wrap; }
.wrong-word-actions { margin-top: 4px; display: flex; gap: 8px; }
</style>
