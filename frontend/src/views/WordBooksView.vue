<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <header class="topbar">
        <h1 class="page-title" style="margin:0">📚 单词书库</h1>
        <div class="topbar-actions" style="margin-left:auto; display:flex; gap:12px">
          <div class="search-box" style="width:260px">
            <input v-model="search" placeholder="搜索单词书..." @input="fetchBooks" id="search-wordbooks" />
          </div>
          <button v-if="auth.isTeacher" class="btn btn-primary" @click="showAddModal = true" id="btn-add-wordbook">
            ＋ 新建单词书
          </button>
        </div>
      </header>

      <main class="page-container">
        <!-- 筛选条 -->
        <div class="filter-bar">
          <select v-model="filterGrade" class="form-select filter-select" @change="fetchBooks" id="filter-grade">
            <option value="">全部年级</option>
            <option v-for="g in grades" :key="g" :value="g">{{ g }}</option>
          </select>
          <select v-model="filterVersion" class="form-select filter-select" @change="fetchBooks" id="filter-version">
            <option value="">全部版本</option>
            <option v-for="v in versions" :key="v" :value="v">{{ v }}</option>
          </select>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-wrap">
          <div class="loading-spinner"></div>
        </div>

        <!-- 单词书网格 -->
        <div v-else-if="books.length" class="books-grid">
          <div
            v-for="book in books"
            :key="book._id"
            class="book-card"
            :style="{ '--book-color': book.coverColor || '#4F46E5' }"
          >
            <div class="book-cover">
              <div class="book-icon">{{ book.coverIcon || '📚' }}</div>
              <div class="book-badge-wrap">
                <span class="badge badge-primary">{{ book.grade }}</span>
                <span class="badge badge-gray">{{ book.semester }}</span>
              </div>
            </div>
            <div class="book-info">
              <h3 class="book-name">{{ book.name }}</h3>
              <p class="book-version">{{ book.version }}</p>
              <p class="book-desc" v-if="book.description">{{ book.description }}</p>
              <div class="book-stats">
                <span>📝 {{ book.totalWords }} 个单词</span>
              </div>
            </div>
            <div class="book-actions">
              <RouterLink :to="`/wordbooks/${book._id}/words`" class="btn btn-ghost btn-sm">查看单词</RouterLink>
              <RouterLink :to="`/study/${book._id}`" class="btn btn-primary btn-sm">开始学习</RouterLink>
              <template v-if="auth.isTeacher">
                <button class="btn btn-ghost btn-icon btn-sm" @click="editBook(book)" title="编辑">✏️</button>
                <button class="btn btn-ghost btn-icon btn-sm" @click="deleteBook(book)" title="删除">🗑️</button>
              </template>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <div class="empty-state-icon">📚</div>
          <div class="empty-state-title">暂无单词书</div>
          <div class="empty-state-description">{{ auth.isTeacher ? '点击右上角创建第一本单词书' : '管理员还未添加单词书，请联系老师' }}</div>
        </div>
      </main>
    </div>

    <!-- 新建/编辑单词书模态框 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showAddModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-box">
            <div class="modal-header">
              <h2 class="modal-title">{{ editingBook ? '编辑单词书' : '新建单词书' }}</h2>
              <button class="modal-close" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveBook">
              <div class="form-group">
                <label class="form-label">教材名称 *</label>
                <input v-model="bookForm.name" class="form-input" placeholder="如：人教版英语" required id="book-name" />
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
                <div class="form-group">
                  <label class="form-label">教材版本 *</label>
                  <input v-model="bookForm.version" class="form-input" placeholder="如：PEP" required id="book-version" />
                </div>
                <div class="form-group">
                  <label class="form-label">年级 *</label>
                  <select v-model="bookForm.grade" class="form-select" required id="book-grade">
                    <option v-for="g in grades" :key="g" :value="g">{{ g }}</option>
                  </select>
                </div>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
                <div class="form-group">
                  <label class="form-label">册次</label>
                  <select v-model="bookForm.semester" class="form-select" id="book-semester">
                    <option>上册</option>
                    <option>下册</option>
                    <option>全册</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">封面图标</label>
                  <div class="emoji-picker">
                    <button
                      v-for="e in emojiOptions"
                      :key="e"
                      type="button"
                      class="emoji-btn"
                      :class="{ selected: bookForm.coverIcon === e }"
                      @click="bookForm.coverIcon = e"
                    >{{ e }}</button>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">描述</label>
                <textarea v-model="bookForm.description" class="form-textarea" placeholder="单词书简介（可选）" rows="2" id="book-description"></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">封面颜色</label>
                <div class="color-picker">
                  <button
                    v-for="c in colorOptions"
                    :key="c"
                    type="button"
                    class="color-btn"
                    :class="{ selected: bookForm.coverColor === c }"
                    :style="{ background: c }"
                    @click="bookForm.coverColor = c"
                  ></button>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeModal">取消</button>
                <button type="submit" class="btn btn-primary" :disabled="saving" id="save-book-btn">
                  {{ saving ? '保存中...' : (editingBook ? '更新' : '创建') }}
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
import { ref, onMounted } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'
import { toast, showConfirm } from '@/utils/toast'

const auth = useAuthStore()
const books = ref([])
const loading = ref(true)
const saving = ref(false)
const search = ref('')
const filterGrade = ref('')
const filterVersion = ref('')
const showAddModal = ref(false)
const editingBook = ref(null)

const grades = ['七年级', '八年级', '九年级', '高一', '高二', '高三', '小学三年级', '小学四年级', '小学五年级', '小学六年级']
const versions = ['人教版(PEP)', '外研版', '冀教版', '苏教版', '沪教版', '牛津版', '北师大版']

const emojiOptions = ['📚', '📖', '📝', '🎓', '🌟', '💡', '🔤', '🌍', '✏️', '🏫']
const colorOptions = ['#4F46E5', '#7C3AED', '#DB2777', '#DC2626', '#EA580C', '#D97706', '#16A34A', '#0891B2', '#0284C7', '#374151']

const bookForm = ref({
  name: '',
  version: 'PEP',
  grade: '七年级',
  semester: '上册',
  description: '',
  coverColor: '#4F46E5',
  coverIcon: '📚'
})

async function fetchBooks() {
  loading.value = true
  try {
    const params = { limit: 50 }
    if (search.value) params.search = search.value
    const res = await api.get('/wordbooks', { params })
    let list = res.data.books
    if (filterGrade.value) list = list.filter(b => b.grade === filterGrade.value)
    if (filterVersion.value) list = list.filter(b => b.version.includes(filterVersion.value.replace(/\(.*\)/, '').trim()))
    books.value = list
  } finally {
    loading.value = false
  }
}

function editBook(book) {
  editingBook.value = book
  bookForm.value = {
    name: book.name,
    version: book.version,
    grade: book.grade,
    semester: book.semester,
    description: book.description || '',
    coverColor: book.coverColor || '#4F46E5',
    coverIcon: book.coverIcon || '📚'
  }
  showAddModal.value = true
}

async function saveBook() {
  saving.value = true
  try {
    if (editingBook.value) {
      await api.put(`/wordbooks/${editingBook.value._id}`, bookForm.value)
      toast.success('单词书更新成功')
    } else {
      await api.post('/wordbooks', bookForm.value)
      toast.success('单词书创建成功')
    }
    closeModal()
    fetchBooks()
  } catch (err) {
    toast.error(err.message || '操作失败')
  } finally {
    saving.value = false
  }
}

async function deleteBook(book) {
  const confirmed = await showConfirm({
    title: '删除单词书',
    message: `确定删除《${book.name}》吗？其中所有单词也将被删除，此操作不可恢复！`,
    confirmText: '删除',
    type: 'danger'
  })
  if (!confirmed) return
  try {
    await api.delete(`/wordbooks/${book._id}`)
    toast.success('删除成功')
    fetchBooks()
  } catch (err) {
    toast.error(err.message || '删除失败')
  }
}

function closeModal() {
  showAddModal.value = false
  editingBook.value = null
  bookForm.value = { name: '', version: 'PEP', grade: '七年级', semester: '上册', description: '', coverColor: '#4F46E5', coverIcon: '📚' }
}

onMounted(fetchBooks)
</script>

<style scoped>
.topbar-actions { display: flex; align-items: center; gap: 12px; }

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: var(--spacing-xl);
}

.filter-select { width: 160px; }

.books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.book-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: all var(--transition-normal);
  display: flex;
  flex-direction: column;
}

.book-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px var(--book-color);
}

.book-cover {
  height: 140px;
  background: linear-gradient(135deg, var(--book-color), color-mix(in srgb, var(--book-color) 60%, #000));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  position: relative;
  overflow: hidden;
}

.book-cover::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.15), transparent 60%);
}

.book-icon { font-size: 52px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3)); }
.book-badge-wrap { display: flex; gap: 6px; }

.book-info { padding: 16px; flex: 1; }
.book-name { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.book-version { font-size: 13px; color: var(--text-muted); margin-bottom: 8px; }
.book-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 8px; }
.book-stats { font-size: 13px; color: var(--text-muted); }

.book-actions {
  padding: 12px 16px;
  display: flex;
  gap: 8px;
  border-top: 1px solid var(--border-subtle);
  flex-wrap: wrap;
}

.emoji-picker { display: flex; flex-wrap: wrap; gap: 6px; }
.emoji-btn {
  width: 36px; height: 36px;
  border: 2px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  cursor: pointer;
  font-size: 18px;
  display: flex; align-items: center; justify-content: center;
  transition: all var(--transition-fast);
}
.emoji-btn.selected { border-color: var(--primary-500); background: var(--primary-900); }
.emoji-btn:hover { border-color: var(--primary-400); }

.color-picker { display: flex; flex-wrap: wrap; gap: 8px; }
.color-btn {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.color-btn.selected { border-color: white; transform: scale(1.2); box-shadow: 0 0 0 2px rgba(255,255,255,0.3); }
.color-btn:hover { transform: scale(1.1); }

.loading-wrap { display: flex; justify-content: center; padding: 80px; }
</style>
