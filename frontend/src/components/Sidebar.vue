<template>
  <aside class="sidebar" :class="{ collapsed: collapsed }">
    <!-- Logo -->
    <RouterLink to="/dashboard" class="sidebar-logo">
      <div class="sidebar-logo-icon">📖</div>
      <span class="sidebar-logo-text">WordMaster</span>
    </RouterLink>

    <!-- 导航菜单 -->
    <nav class="sidebar-nav">
      <div class="sidebar-section-title">学习</div>
      <RouterLink
        v-for="item in mainNav"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-text">{{ item.label }}</span>
        <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
      </RouterLink>

      <div class="sidebar-section-title">管理</div>
      <RouterLink
        v-for="item in manageNav"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
        v-show="item.show !== false"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-text">{{ item.label }}</span>
      </RouterLink>

      <template v-if="auth.isAdmin">
        <div class="sidebar-section-title">管理员</div>
        <RouterLink to="/admin" class="nav-item" :class="{ active: isActive('/admin') }">
          <span class="nav-icon">🔧</span>
          <span class="nav-text">管理后台</span>
        </RouterLink>
      </template>
    </nav>

    <!-- 用户信息 -->
    <div class="sidebar-user">
      <RouterLink to="/profile" class="user-avatar">
        {{ auth.userInitial }}
      </RouterLink>
      <div class="user-info">
        <div class="user-name">{{ auth.user?.profile?.nickname || auth.user?.username }}</div>
        <div class="user-role">{{ roleLabels[auth.user?.role] }}</div>
      </div>
      <button class="btn btn-ghost btn-icon btn-sm" @click="handleLogout" title="退出登录">🚪</button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { showConfirm } from '@/utils/toast'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

defineProps({
  collapsed: { type: Boolean, default: false },
  reviewDue: { type: Number, default: 0 }
})

const roleLabels = { student: '学生', teacher: '教师', admin: '管理员' }

const mainNav = computed(() => [
  { path: '/dashboard', icon: '🏠', label: '学习总览' },
  { path: '/wordbooks', icon: '📚', label: '单词书库' },
  { path: '/review', icon: '🔄', label: '今日复习' },
  { path: '/wrong-words', icon: '❌', label: '错题集' },
  { path: '/starred', icon: '⭐', label: '重点单词' },
  { path: '/stats', icon: '📊', label: '学习统计' },
])

const manageNav = computed(() => [
  { path: '/profile', icon: '👤', label: '个人资料' },
])

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}

async function handleLogout() {
  const confirmed = await showConfirm({
    title: '退出登录',
    message: '确定要退出登录吗？',
    confirmText: '退出',
    cancelText: '取消',
    type: 'warning'
  })
  if (confirmed) {
    auth.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.user-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.sidebar-logo { text-decoration: none; }
</style>
