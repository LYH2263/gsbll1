<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <header class="topbar">
        <h1 class="page-title" style="margin:0">⭐ 重点单词</h1>
        <div style="margin-left:auto">
          <span class="badge badge-warning" v-if="total > 0">共 {{ total }} 个重点</span>
        </div>
      </header>
      <main class="page-container">
        <div v-if="loading" style="display:flex;justify-content:center;padding:60px">
          <div class="loading-spinner"></div>
        </div>
        <template v-else-if="records.length">
          <div class="words-grid">
            <div v-for="rec in records" :key="rec._id" class="starred-word-card card">
              <div class="sw-header">
                <div class="sw-word" @click="speak(rec.wordId?.word)">{{ rec.wordId?.word }}</div>
                <button class="btn btn-ghost btn-icon btn-sm" @click="unstar(rec)" title="取消重点" :id="`unstar-${rec._id}`">⭐</button>
              </div>
              <div class="sw-phonetic">{{ rec.wordId?.phonetic }}</div>
              <div class="sw-translation">{{ rec.wordId?.translation }}</div>
              <div class="sw-example" v-if="rec.wordId?.example">
                <em>{{ rec.wordId.example }}</em>
                <span>{{ rec.wordId.exampleTranslation }}</span>
              </div>
              <div class="sw-footer">
                <span class="badge badge-gray" v-if="rec.bookId?.name">{{ rec.bookId.name }}</span>
                <div class="memory-bar">
                  <div :class="['memory-fill', rec.memoryStatus]" :style="{ width: getMemoryWidth(rec.memoryStatus) }"></div>
                </div>
                <span class="badge" :class="statusBadge[rec.memoryStatus]">{{ statusLabel[rec.memoryStatus] }}</span>
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
          <div class="empty-state-icon">⭐</div>
          <div class="empty-state-title">暂无重点单词</div>
          <div class="empty-state-description">在单词列表中点击☆图标标记重点单词</div>
          <RouterLink to="/wordbooks" class="btn btn-primary" style="margin-top:16px">去标记重点</RouterLink>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import api from '@/utils/api'
import { toast } from '@/utils/toast'

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

const statusLabel = { new: '新词', learning: '学习中', review: '复习中', mastered: '已掌握' }
const statusBadge = { new: 'badge-gray', learning: 'badge-warning', review: 'badge-primary', mastered: 'badge-success' }

function getMemoryWidth(status) {
  return { new: '10%', learning: '40%', review: '65%', mastered: '100%' }[status] || '10%'
}

function speak(word) {
  if (!word) return
  const u = new SpeechSynthesisUtterance(word)
  u.lang = 'en-US'; u.rate = 0.8
  window.speechSynthesis.speak(u)
}

async function fetchStarred() {
  loading.value = true
  try {
    const res = await api.get('/review/starred', { params: { page: page.value, limit } })
    records.value = res.data.records
    total.value = res.data.total
  } finally { loading.value = false }
}

async function unstar(rec) {
  try {
    await api.post(`/review/star/${rec.wordId._id}`, { bookId: rec.bookId?._id })
    records.value = records.value.filter(r => r._id !== rec._id)
    total.value--
    toast.success('已取消重点标记')
  } catch { toast.error('操作失败') }
}

function changePage(p) { page.value = p; fetchStarred() }
onMounted(fetchStarred)
</script>

<style scoped>
.words-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-md);
}

.starred-word-card { display: flex; flex-direction: column; gap: 8px; }
.sw-header { display: flex; align-items: center; justify-content: space-between; }
.sw-word { font-size: 22px; font-weight: 800; color: var(--text-primary); cursor: pointer; transition: color var(--transition-fast); }
.sw-word:hover { color: var(--primary-400); }
.sw-phonetic { font-size: 13px; color: var(--text-accent); font-style: italic; }
.sw-translation { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.sw-example { font-size: 13px; color: var(--text-muted); display: flex; flex-direction: column; gap: 2px; font-style: italic; line-height: 1.5; }
.sw-footer { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.sw-footer .memory-bar { flex: 1; min-width: 60px; }
</style>
