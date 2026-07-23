/**
 * Toast 通知工具
 * 全局事件总线 - 替代 alert/confirm
 */

import { reactive } from 'vue'

// 全局 Toast 状态
export const toastState = reactive({
    toasts: []
})

let toastId = 0

/**
 * 显示 Toast 通知
 * @param {string} message - 消息内容
 * @param {string} type - 类型: success | error | warning | info
 * @param {number} duration - 显示时长（ms）
 */
export function showToast(message, type = 'info', duration = 3000) {
    const id = ++toastId
    const toast = { id, message, type, leaving: false }
    toastState.toasts.push(toast)

    setTimeout(() => {
        removeToast(id)
    }, duration)

    return id
}

export function removeToast(id) {
    const index = toastState.toasts.findIndex(t => t.id === id)
    if (index !== -1) {
        toastState.toasts[index].leaving = true
        setTimeout(() => {
            const idx = toastState.toasts.findIndex(t => t.id === id)
            if (idx !== -1) toastState.toasts.splice(idx, 1)
        }, 300)
    }
}

export const toast = {
    success: (msg, duration) => showToast(msg, 'success', duration),
    error: (msg, duration) => showToast(msg, 'error', duration || 4000),
    warning: (msg, duration) => showToast(msg, 'warning', duration),
    info: (msg, duration) => showToast(msg, 'info', duration)
}

// ---- 确认对话框 ----
export const confirmState = reactive({
    visible: false,
    title: '',
    message: '',
    confirmText: '确认',
    cancelText: '取消',
    type: 'warning', // warning | danger | info
    resolve: null
})

/**
 * 显示确认对话框（替代 confirm()）
 */
export function showConfirm({ title, message, confirmText = '确认', cancelText = '取消', type = 'warning' }) {
    return new Promise((resolve) => {
        confirmState.visible = true
        confirmState.title = title || '确认操作'
        confirmState.message = message
        confirmState.confirmText = confirmText
        confirmState.cancelText = cancelText
        confirmState.type = type
        confirmState.resolve = resolve
    })
}

export function resolveConfirm(result) {
    confirmState.visible = false
    if (confirmState.resolve) {
        confirmState.resolve(result)
        confirmState.resolve = null
    }
}
