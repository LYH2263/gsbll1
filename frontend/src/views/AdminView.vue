<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <header class="topbar">
        <h1 class="page-title" style="margin:0">🔧 管理后台</h1>
        <div class="admin-tabs" style="margin-left:auto">
          <button v-for="tab in adminTabs" :key="tab.id" :class="['btn', 'btn-sm', activeTab === tab.id ? 'btn-primary' : 'btn-secondary']" @click="activeTab = tab.id" :id="`admin-tab-${tab.id}`">{{ tab.label }}</button>
        </div>
      </header>

      <main class="page-container">
        <!-- 用户管理 -->
        <div v-if="activeTab === 'users'">
          <div class="admin-toolbar">
            <div class="search-box" style="width:280px">
              <input v-model="userSearch" placeholder="搜索用户..." @input="debounceFetchUsers" id="search-users" />
            </div>
            <select v-model="userRoleFilter" class="form-select" style="width:130px" @change="fetchUsers" id="filter-user-role">
              <option value="">全部角色</option>
              <option value="student">学生</option>
              <option value="teacher">教师</option>
              <option value="admin">管理员</option>
            </select>
            <div class="admin-stats-mini">
              <span class="asm-item">👥 共 {{ totalUsers }} 名用户</span>
            </div>
          </div>

          <div class="card" style="padding:0; overflow:hidden">
            <table class="data-table">
              <thead>
                <tr>
                  <th>用户名</th>
                  <th>邮箱</th>
                  <th>角色</th>
                  <th>学习数据</th>
                  <th>积分</th>
                  <th>状态</th>
                  <th>注册时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in users" :key="u._id">
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="user-avatar" style="width:32px;height:32px;font-size:14px;font-weight:700">{{ (u.profile?.nickname || u.username)[0].toUpperCase() }}</div>
                      <div>
                        <div style="font-weight:600">{{ u.profile?.nickname || u.username }}</div>
                        <div style="font-size:12px;color:var(--text-muted)">{{ u.username }}</div>
                      </div>
                    </div>
                  </td>
                  <td style="font-size:13px;color:var(--text-secondary)">{{ u.email }}</td>
                  <td>
                    <select v-model="u.role" class="form-select" style="width:100px;font-size:13px;padding:4px 8px" @change="updateRole(u)" :id="`role-${u._id}`">
                      <option value="student">学生</option>
                      <option value="teacher">教师</option>
                      <option value="admin">管理员</option>
                    </select>
                  </td>
                  <td>
                    <div style="font-size:12px;color:var(--text-muted)">
                      学习{{ u.stats?.studyDays || 0 }}天 / 
                      掌握{{ u.stats?.masteredWords || 0 }}词
                    </div>
                  </td>
                  <td>
                    <span class="badge badge-primary">{{ u.stats?.points || 0 }}分</span>
                  </td>
                  <td>
                    <span :class="['badge', u.isActive ? 'badge-success' : 'badge-error']">{{ u.isActive ? '正常' : '禁用' }}</span>
                  </td>
                  <td style="font-size:12px;color:var(--text-muted)">{{ new Date(u.createdAt).toLocaleDateString('zh-CN') }}</td>
                  <td>
                    <button
                      :class="['btn btn-sm', u.isActive ? 'btn-danger' : 'btn-success']"
                      @click="toggleUserStatus(u)"
                      :id="`toggle-user-${u._id}`"
                      style="font-size:12px"
                    >{{ u.isActive ? '禁用' : '启用' }}</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pagination" v-if="userTotalPages > 1">
            <button class="pagination-btn" :disabled="userPage <= 1" @click="changeUserPage(userPage-1)">‹</button>
            <button v-for="p in userVisiblePages" :key="p" :class="['pagination-btn',{active:p===userPage}]" @click="changeUserPage(p)">{{ p }}</button>
            <button class="pagination-btn" :disabled="userPage >= userTotalPages" @click="changeUserPage(userPage+1)">›</button>
          </div>
        </div>

        <!-- 系统概览 -->
        <div v-if="activeTab === 'overview'">
          <div class="admin-overview-grid">
            <div class="stat-card" v-for="stat in systemStats" :key="stat.label">
              <div class="stat-icon">{{ stat.icon }}</div>
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>

          <div class="card" style="margin-top:24px">
            <div class="card-header"><span class="card-title">📋 系统使用说明</span></div>
            <div class="admin-guide">
              <div class="guide-item" v-for="item in guideItems" :key="item.title">
                <div class="guide-icon">{{ item.icon }}</div>
                <div>
                  <div class="guide-title">{{ item.title }}</div>
                  <div class="guide-desc">{{ item.desc }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import api from '@/utils/api'
import { toast, showConfirm } from '@/utils/toast'

const activeTab = ref('overview')
const users = ref([])
const totalUsers = ref(0)
const userSearch = ref('')
const userRoleFilter = ref('')
const userPage = ref(1)
const userLimit = 15

const adminTabs = [
  { id: 'overview', label: '📊 系统概览' },
  { id: 'users', label: '👥 用户管理' },
]

const userTotalPages = computed(() => Math.ceil(totalUsers.value / userLimit))
const userVisiblePages = computed(() => {
  const pages = []
  for (let p = Math.max(1, userPage.value - 2); p <= Math.min(userTotalPages.value, userPage.value + 2); p++) pages.push(p)
  return pages
})

const systemStats = ref([
  { icon: '👥', label: '注册用户', value: '—' },
  { icon: '📚', label: '单词书', value: '—' },
  { icon: '📝', label: '单词数量', value: '—' },
  { icon: '📊', label: '学习记录', value: '—' },
])

const guideItems = [
  { icon: '📚', title: '单词书管理', desc: '教师角色可创建、编辑单词书，并添加/导入单词' },
  { icon: '👤', title: '用户管理', desc: '可修改用户角色（学生/教师/管理员），启用/禁用账号' },
  { icon: '🔑', title: '默认账号', desc: '管理员: admin@wordmaster.com / Admin@2024，教师: teacher@wordmaster.com / Teacher@2024' },
  { icon: '📥', title: '批量导入', desc: '在单词列表页支持 Excel/CSV 格式批量导入单词' },
  { icon: '📤', title: '数据导出', desc: '统计页面支持导出学习统计数据，单词列表支持导出单词' },
]

let userSearchTimer = null
function debounceFetchUsers() {
  clearTimeout(userSearchTimer)
  userSearchTimer = setTimeout(fetchUsers, 400)
}

async function fetchUsers() {
  try {
    const res = await api.get('/users', { params: { page: userPage.value, limit: userLimit, search: userSearch.value || undefined, role: userRoleFilter.value || undefined } })
    users.value = res.data.users
    totalUsers.value = res.data.total
    systemStats.value[0].value = res.data.total
  } catch (err) {
    toast.error('加载用户失败')
  }
}

async function toggleUserStatus(user) {
  const action = user.isActive ? '禁用' : '启用'
  const confirmed = await showConfirm({ title: `${action}用户`, message: `确定要${action}用户 "${user.username}" 吗？`, confirmText: action, type: user.isActive ? 'danger' : 'success' })
  if (!confirmed) return
  try {
    await api.put(`/users/${user._id}/status`, { isActive: !user.isActive })
    user.isActive = !user.isActive
    toast.success(`用户已${action}`)
  } catch (err) {
    toast.error(err.message || '操作失败')
  }
}

async function updateRole(user) {
  try {
    await api.put(`/users/${user._id}/role`, { role: user.role })
    toast.success('角色更新成功')
  } catch (err) { toast.error('更新失败') }
}

async function fetchSystemStats() {
  try {
    const [booksRes, wordsRes] = await Promise.all([
      api.get('/wordbooks', { params: { limit: 1 } }),
      api.get('/words', { params: { limit: 1 } })
    ])
    systemStats.value[1].value = booksRes.data.total
    systemStats.value[2].value = wordsRes.data.total
  } catch {}
}

function changeUserPage(p) { userPage.value = p; fetchUsers() }

onMounted(async () => {
  await fetchSystemStats()
  if (activeTab.value === 'users') fetchUsers()
})

import { watch } from 'vue'
watch(activeTab, (tab) => { if (tab === 'users') fetchUsers() })
</script>

<style scoped>
.admin-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: var(--spacing-lg); flex-wrap: wrap; }
.asm-item { font-size: 13px; color: var(--text-muted); }
.admin-stats-mini { display: flex; gap: 16px; margin-left: auto; }
.admin-overview-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacing-md); }
.admin-tabs { display: flex; gap: 6px; }
.admin-guide { display: flex; flex-direction: column; gap: 16px; }
.guide-item { display: flex; gap: 14px; align-items: flex-start; }
.guide-icon { font-size: 24px; flex-shrink: 0; }
.guide-title { font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.guide-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
</style>
