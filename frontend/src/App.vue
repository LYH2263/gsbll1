<template>
  <div id="app-root">
    <!-- Toast 通知容器 -->
    <ToastContainer />
    <!-- 全局确认对话框 -->
    <ConfirmDialog />
    <!-- 路由视图 -->
    <RouterView />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ToastContainer from '@/components/ToastContainer.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const auth = useAuthStore()

onMounted(async () => {
  if (auth.isLoggedIn) {
    await auth.refreshUser()
  }
})
</script>

<style>
#app-root {
  min-height: 100vh;
}
</style>
