/**
 * 学习日记 API 接口
 */

import api from '@/utils/api'

export function submitDiary(data) {
    return api.post('/diary', data)
}

export function getMonthDiary(year, month) {
    return api.get('/diary/month', { params: { year, month } })
}

export function getStreak() {
    return api.get('/diary/streak')
}
