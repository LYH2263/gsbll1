<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="confirmState.visible" class="modal-overlay" @click.self="resolveConfirm(false)">
        <div class="modal-box confirm-box" role="dialog" aria-modal="true">
          <div :class="['confirm-icon', confirmState.type]">
            {{ icons[confirmState.type] }}
          </div>
          <h3 class="confirm-title">{{ confirmState.title }}</h3>
          <p class="confirm-message">{{ confirmState.message }}</p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" @click="resolveConfirm(false)">
              {{ confirmState.cancelText }}
            </button>
            <button
              :class="['btn', confirmState.type === 'danger' ? 'btn-danger' : 'btn-primary']"
              @click="resolveConfirm(true)"
            >
              {{ confirmState.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { confirmState, resolveConfirm } from '@/utils/toast'

const icons = {
  warning: '⚠️',
  danger: '🗑️',
  info: 'ℹ️',
  success: '✅'
}
</script>

<style scoped>
.confirm-box {
  max-width: 400px;
  text-align: center;
}

.confirm-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.confirm-message {
  font-size: 15px;
  color: var(--text-secondary);
  margin-bottom: 24px;
  line-height: 1.6;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.confirm-actions .btn { min-width: 100px; }
</style>
