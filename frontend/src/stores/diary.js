/**
 * 学习日记 Pinia Store
 * 负责日记的请求与状态管理（与视图逻辑分离）
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'
import { toast } from '@/utils/toast'
import { useAuthStore } from '@/stores/auth'

export const useDiaryStore = defineStore('diary', () => {
    const diaries = ref([])      // 当前月份的日记列表
    const month = ref('')        // 当前查询月份 YYYY-MM
    const streak = ref(0)        // 连续打卡天数
    const totalDays = ref(0)     // 累计打卡天数
    const nextMilestone = ref(7) // 下一个里程碑
    const loading = ref(false)
    const saving = ref(false)

    // 按月加载日记
    async function fetchMonth(targetMonth) {
        loading.value = true
        try {
            const res = await api.get('/diary/month', {
                params: targetMonth ? { month: targetMonth } : {}
            })
            month.value = res.data.month
            diaries.value = res.data.diaries
            return true
        } catch (err) {
            toast.error(err.message || '日记加载失败')
            return false
        } finally {
            loading.value = false
        }
    }

    // 加载连续打卡天数
    async function fetchStreak() {
        try {
            const res = await api.get('/diary/streak')
            streak.value = res.data.streak
            totalDays.value = res.data.totalDays
            nextMilestone.value = res.data.nextMilestone
            return true
        } catch (err) {
            return false
        }
    }

    // 提交或更新当日日记
    async function submitDiary(payload) {
        saving.value = true
        try {
            const res = await api.post('/diary', payload)
            const { isNew, pointsEarned, createReward, streakBonus } = res.data

            if (pointsEarned > 0) {
                let msg = isNew ? `日记已保存，获得 ${createReward} 积分` : '日记已更新'
                if (streakBonus > 0) msg += `，连续打卡奖励 +${streakBonus}`
                toast.success(msg)
                // 积分变动后刷新用户信息
                await useAuthStore().refreshUser()
            } else {
                toast.success(isNew ? '日记已保存' : '日记已更新')
            }

            // 刷新展示
            await Promise.all([fetchMonth(month.value), fetchStreak()])
            return res.data
        } catch (err) {
            toast.error(err.message || '保存失败')
            return null
        } finally {
            saving.value = false
        }
    }

    return {
        diaries, month, streak, totalDays, nextMilestone, loading, saving,
        fetchMonth, fetchStreak, submitDiary
    }
})
