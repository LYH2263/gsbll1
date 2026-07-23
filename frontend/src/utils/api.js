/**
 * Axios HTTP 请求工具
 * 统一管理 API 请求和错误处理
 */

import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
})

// 请求拦截器：添加 JWT Token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('wm_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
}, (error) => Promise.reject(error))

// 响应拦截器：处理错误
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('wm_token')
            localStorage.removeItem('wm_user')
            window.location.href = '/login'
        }
        return Promise.reject(error.response?.data || { message: '网络错误，请稍后重试' })
    }
)

export default api
