/**
 * 用户认证 Pinia Store
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'
import { toast } from '@/utils/toast'

export const useAuthStore = defineStore('auth', () => {
    const user = ref(JSON.parse(localStorage.getItem('wm_user') || 'null'))
    const token = ref(localStorage.getItem('wm_token') || '')
    const loading = ref(false)

    const isLoggedIn = computed(() => !!token.value && !!user.value)
    const isAdmin = computed(() => user.value?.role === 'admin')
    const isTeacher = computed(() => ['teacher', 'admin'].includes(user.value?.role))
    const isStudent = computed(() => user.value?.role === 'student')
    const userInitial = computed(() => (user.value?.profile?.nickname || user.value?.username || 'U')[0].toUpperCase())

    async function login(email, password) {
        loading.value = true
        try {
            const res = await api.post('/auth/login', { email, password })
            token.value = res.data.token
            user.value = res.data.user
            localStorage.setItem('wm_token', res.data.token)
            localStorage.setItem('wm_user', JSON.stringify(res.data.user))
            toast.success(`欢迎回来，${res.data.user.profile?.nickname || res.data.user.username}！`)
            return true
        } catch (err) {
            toast.error(err.message || '登录失败')
            return false
        } finally {
            loading.value = false
        }
    }

    async function register(data) {
        loading.value = true
        try {
            const res = await api.post('/auth/register', data)
            token.value = res.data.token
            user.value = res.data.user
            localStorage.setItem('wm_token', res.data.token)
            localStorage.setItem('wm_user', JSON.stringify(res.data.user))
            toast.success('注册成功，欢迎使用 WordMaster！')
            return true
        } catch (err) {
            toast.error(err.message || '注册失败')
            return false
        } finally {
            loading.value = false
        }
    }

    async function refreshUser() {
        try {
            const res = await api.get('/auth/me')
            user.value = res.data.user
            localStorage.setItem('wm_user', JSON.stringify(res.data.user))
        } catch (err) {
            console.error('刷新用户信息失败:', err)
        }
    }

    async function updateProfile(data) {
        try {
            const res = await api.put('/users/profile', data)
            user.value = res.data.user
            localStorage.setItem('wm_user', JSON.stringify(res.data.user))
            toast.success('资料更新成功')
            return true
        } catch (err) {
            toast.error(err.message || '更新失败')
            return false
        }
    }

    function logout() {
        token.value = ''
        user.value = null
        localStorage.removeItem('wm_token')
        localStorage.removeItem('wm_user')
    }

    return {
        user, token, loading,
        isLoggedIn, isAdmin, isTeacher, isStudent, userInitial,
        login, register, logout, refreshUser, updateProfile
    }
})
