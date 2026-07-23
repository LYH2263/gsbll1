<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite" aria-label="通知区域">
      <TransitionGroup name="toast-list" tag="div" class="toast-list">
        <div
          v-for="toast in toastState.toasts"
          :key="toast.id"
          :class="['toast', `toast-${toast.type}`, { leaving: toast.leaving }]"
          role="alert"
        >
          <span class="toast-icon">{{ icons[toast.type] }}</span>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" @click="removeToast(toast.id)" aria-label="关闭通知">✕</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { toastState, removeToast } from '@/utils/toast'

const icons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
}
</script>

<style scoped>
.toast-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast-list-enter-active { animation: toastEnter 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.toast-list-leave-active { animation: toastLeave 0.3s ease forwards; }
.toast-list-move { transition: transform 0.3s ease; }

@keyframes toastEnter {
  from { opacity: 0; transform: translateX(100px) scale(0.9); }
  to { opacity: 1; transform: translateX(0) scale(1); }
}

@keyframes toastLeave {
  from { opacity: 1; transform: translateX(0) scale(1); }
  to { opacity: 0; transform: translateX(100px) scale(0.9); }
}
</style>
