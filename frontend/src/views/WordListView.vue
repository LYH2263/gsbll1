<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <header class="topbar">
        <button class="btn btn-ghost btn-sm" @click="$router.back()">← 返回</button>
        <div style="flex:1">
          <h1 class="page-title" style="margin:0; font-size:20px">{{ book?.name }}</h1>
          <p style="font-size:13px; color:var(--text-muted)">{{ book?.grade }} · {{ book?.semester }} · 共 {{ total }} 个单词</p>
        </div>
        <div style="display:flex; gap:10px">
          <div class="search-box" style="width:220px">
            <input v-model="search" placeholder="搜索单词..." id="search-words" @input="debounceFetch" />
          </div>
          <select v-model="filterUnit" class="form-select" style="width:120px" @change="fetchWords" id="filter-unit">
            <option value="">全部单元</option>
            <option v-for="u in units" :key="u" :value="u">Unit {{ u }}</option>
          </select>
          <template v-if="auth.isTeacher">
            <label class="btn btn-secondary btn-sm" style="cursor:pointer" for="import-file">📥 导入</label>
            <input id="import-file" type="file" accept=".xlsx,.csv" style="display:none" @change="importWords" />
            <button class="btn btn-secondary btn-sm" @click="exportWords" id="btn-export-words">📤 导出</button>
            <button class="btn btn-primary btn-sm" @click="showAddWordModal = true" id="btn-add-word">＋ 添加单词</button>
          </template>
          <RouterLink :to="`/study/${bookId}`" class="btn btn-success btn-sm">▶ 开始学习</RouterLink>
        </div>
      </header>

      <main class="page-container">
        <div v-if="loading" style="display:flex; justify-content:center; padding:80px">
          <div class="loading-spinner"></div>
        </div>

        <template v-else>
          <div class="words-table-wrap card" style="padding:0; overflow:hidden">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:60px">单元</th>
                  <th>单词</th>
                  <th>音标</th>
                  <th>释义</th>
                  <th>例句</th>
                  <th style="width:80px">难度</th>
                  <th v-if="auth.isTeacher" style="width:120px">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="word in words" :key="word._id" class="word-row">
                  <td><span class="badge badge-primary">Unit {{ word.unit }}</span></td>
                  <td>
                    <div class="word-cell">
                      <span class="word-en">{{ word.word }}</span>
                      <button class="btn-speak" @click="speak(word.word)" title="朗读">🔊</button>
                      <button class="btn-star" :class="{ starred: starredIds.has(word._id) }" @click="toggleStar(word)" :title="starredIds.has(word._id) ? '取消重点' : '标记重点'">
                        {{ starredIds.has(word._id) ? '⭐' : '☆' }}
                      </button>
                    </div>
                  </td>
                  <td><span class="phonetic">{{ word.phonetic }}</span></td>
                  <td><span class="translation">{{ word.translation }}</span></td>
                  <td>
                    <div class="example-wrap">
                      <div class="example-en">{{ word.example }}</div>
                      <div class="example-zh">{{ word.exampleTranslation }}</div>
                    </div>
                  </td>
                  <td>
                    <div class="difficulty-dots">
                      <span v-for="n in 5" :key="n" class="diff-dot" :class="{ active: n <= word.difficulty }"></span>
                    </div>
                  </td>
                  <td v-if="auth.isTeacher">
                    <div style="display:flex; gap:4px">
                      <button class="btn btn-ghost btn-icon btn-sm" @click="editWord(word)" title="编辑">✏️</button>
                      <button class="btn btn-ghost btn-icon btn-sm" @click="deleteWord(word)" title="删除">🗑️</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div v-if="words.length === 0" class="empty-state">
              <div class="empty-state-icon">📝</div>
              <div class="empty-state-title">本单元暂无单词</div>
              <div class="empty-state-description" v-if="auth.isTeacher">点击"添加单词"或"导入"添加单词</div>
            </div>
          </div>

          <!-- 分页 -->
          <div class="pagination" v-if="totalPages > 1">
            <button class="pagination-btn" :disabled="page <= 1" @click="changePage(page - 1)">‹</button>
            <button
              v-for="p in visiblePages"
              :key="p"
              :class="['pagination-btn', { active: p === page }]"
              @click="changePage(p)"
            >{{ p }}</button>
            <button class="pagination-btn" :disabled="page >= totalPages" @click="changePage(page + 1)">›</button>
          </div>
        </template>
      </main>
    </div>

    <!-- 添加/编辑单词模态框 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showAddWordModal" class="modal-overlay" @click.self="closeWordModal">
          <div class="modal-box" style="max-width:620px">
            <div class="modal-header">
              <h2 class="modal-title">{{ editingWord ? '编辑单词' : '添加单词' }}</h2>
              <button class="modal-close" @click="closeWordModal">✕</button>
            </div>
            <form @submit.prevent="saveWord">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
                <div class="form-group">
                  <label class="form-label">单词 *</label>
                  <input v-model="wordForm.word" class="form-input" placeholder="英文单词" required id="word-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">音标</label>
                  <input v-model="wordForm.phonetic" class="form-input" placeholder="/fəˈnet.ɪk/" id="phonetic-input" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">中文释义 *</label>
                <input v-model="wordForm.translation" class="form-input" placeholder="中文意思" required id="translation-input" />
              </div>
              <div class="form-group">
                <label class="form-label">例句</label>
                <input v-model="wordForm.example" class="form-input" placeholder="英文例句" id="example-input" />
              </div>
              <div class="form-group">
                <label class="form-label">例句翻译</label>
                <input v-model="wordForm.exampleTranslation" class="form-input" placeholder="例句中文翻译" id="example-zh-input" />
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
                <div class="form-group">
                  <label class="form-label">单元 *</label>
                  <input v-model.number="wordForm.unit" type="number" min="1" max="20" class="form-input" required id="unit-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">难度（1-5）</label>
                  <div class="difficulty-selector">
                    <button
                      v-for="n in 5"
                      :key="n"
                      type="button"
                      :class="['diff-select-btn', { active: n <= wordForm.difficulty }]"
                      @click="wordForm.difficulty = n"
                    >{{ n }}</button>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeWordModal">取消</button>
                <button type="submit" class="btn btn-primary" :disabled="saving" id="save-word-btn">
                  {{ saving ? '保存中...' : (editingWord ? '更新' : '添加') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'
import { toast, showConfirm } from '@/utils/toast'

const auth = useAuthStore()
const route = useRoute()
const bookId = route.params.id

const book = ref(null)
const words = ref([])
const total = ref(0)
const loading = ref(true)
const saving = ref(false)
const search = ref('')
const filterUnit = ref('')
const page = ref(1)
const limit = 30
const units = ref([])
const starredIds = ref(new Set())
const showAddWordModal = ref(false)
const editingWord = ref(null)

const totalPages = computed(() => Math.ceil(total.value / limit))
const visiblePages = computed(() => {
  const pages = []
  for (let p = Math.max(1, page.value - 2); p <= Math.min(totalPages.value, page.value + 2); p++) {
    pages.push(p)
  }
  return pages
})

let fetchTimer = null
function debounceFetch() {
  clearTimeout(fetchTimer)
  fetchTimer = setTimeout(fetchWords, 400)
}

const wordForm = ref({ word: '', phonetic: '', translation: '', example: '', exampleTranslation: '', unit: 1, difficulty: 1 })

async function fetchBook() {
  try {
    const res = await api.get(`/wordbooks/${bookId}`)
    book.value = res.data.book
    units.value = res.data.units.map(u => u._id)
  } catch (err) {
    toast.error('单词书不存在')
  }
}

async function fetchWords() {
  loading.value = true
  try {
    const params = { bookId, page: page.value, limit }
    if (search.value) params.search = search.value
    if (filterUnit.value) params.unit = filterUnit.value
    const res = await api.get('/words', { params })
    words.value = res.data.words
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

function editWord(word) {
  editingWord.value = word
  wordForm.value = {
    word: word.word,
    phonetic: word.phonetic,
    translation: word.translation,
    example: word.example,
    exampleTranslation: word.exampleTranslation,
    unit: word.unit,
    difficulty: word.difficulty
  }
  showAddWordModal.value = true
}

async function saveWord() {
  saving.value = true
  try {
    if (editingWord.value) {
      await api.put(`/words/${editingWord.value._id}`, wordForm.value)
      toast.success('单词更新成功')
    } else {
      await api.post('/words', { ...wordForm.value, bookId })
      toast.success('单词添加成功')
    }
    closeWordModal()
    fetchWords()
  } catch (err) {
    toast.error(err.message || '操作失败')
  } finally {
    saving.value = false
  }
}

async function deleteWord(word) {
  const confirmed = await showConfirm({
    title: '删除单词',
    message: `确定删除单词 "${word.word}" 吗？`,
    confirmText: '删除',
    type: 'danger'
  })
  if (!confirmed) return
  try {
    await api.delete(`/words/${word._id}`)
    toast.success('删除成功')
    fetchWords()
  } catch (err) {
    toast.error(err.message || '删除失败')
  }
}

async function toggleStar(word) {
  try {
    const res = await api.post(`/review/star/${word._id}`, { bookId })
    if (res.data.isStarred) {
      starredIds.value.add(word._id)
      toast.success('已标记为重点单词 ⭐')
    } else {
      starredIds.value.delete(word._id)
      toast.info('已取消重点标记')
    }
  } catch (err) {
    toast.error('操作失败')
  }
}

function speak(word) {
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = 'en-US'
  utterance.rate = 0.8
  window.speechSynthesis.speak(utterance)
}

async function importWords(e) {
  const file = e.target.files[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  formData.append('bookId', bookId)
  try {
    const res = await api.post('/words/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    toast.success(res.message)
    fetchWords()
    fetchBook()
  } catch (err) {
    toast.error(err.message || '导入失败')
  }
  e.target.value = ''
}

async function exportWords() {
  try {
    const link = document.createElement('a')
    link.href = `/api/words/export/${bookId}`
    link.download = `${book.value?.name || 'words'}.xlsx`
    link.click()
    toast.success('开始下载...')
  } catch (err) {
    toast.error('导出失败')
  }
}

function closeWordModal() {
  showAddWordModal.value = false
  editingWord.value = null
  wordForm.value = { word: '', phonetic: '', translation: '', example: '', exampleTranslation: '', unit: 1, difficulty: 1 }
}

function changePage(p) {
  page.value = p
  fetchWords()
}

onMounted(async () => {
  await fetchBook()
  await fetchWords()
})
</script>

<style scoped>
.words-table-wrap { overflow-x: auto; }

.word-row:hover { background: rgba(99,102,241,0.04); }

.word-cell { display: flex; align-items: center; gap: 8px; }
.word-en { font-weight: 700; font-size: 15px; color: var(--text-primary); }
.btn-speak, .btn-star {
  background: none; border: none; cursor: pointer; font-size: 14px; opacity: 0.5; transition: opacity var(--transition-fast);
  padding: 2px;
}
.btn-speak:hover, .btn-star:hover { opacity: 1; }
.btn-star.starred { opacity: 1; }

.phonetic { font-size: 13px; color: var(--text-accent); font-style: italic; }
.translation { font-size: 14px; color: var(--text-primary); font-weight: 500; }

.example-wrap { max-width: 260px; }
.example-en { font-size: 13px; color: var(--text-secondary); font-style: italic; }
.example-zh { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

.difficulty-dots { display: flex; gap: 3px; align-items: center; }
.diff-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--gray-700); }
.diff-dot.active { background: var(--warning-500); }

.difficulty-selector { display: flex; gap: 6px; margin-top: 4px; }
.diff-select-btn {
  width: 36px; height: 36px;
  border: 2px solid var(--border-default);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: 600;
  transition: all var(--transition-fast);
}
.diff-select-btn.active { background: var(--warning-500); border-color: var(--warning-400); color: white; }
</style>
