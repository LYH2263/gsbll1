/**
 * 学习日记 Pinia Store
 * 负责请求封装与日记相关状态集中管理
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'
import { toast } from '@/utils/toast'

export const useDiaryStore = defineStore('diary', () => {
    const diaries = ref([])
    const markedDates = ref([])
    const moodMap = ref({})
    const wordsMap = ref({})
    const currentMonth = ref({ year: null, month: null })

    const streak = ref(0)
    const todayDiary = ref(null)
    const nextMilestone = ref(7)
    const daysToNextMilestone = ref(7)

    const loadingMonth = ref(false)
    const loadingStreak = ref(false)
    const submitting = ref(false)

    function diaryForDate(dateStr) {
        return diaries.value.find(d => d.date === dateStr) || null
    }

    async function loadMonth(year, month) {
        loadingMonth.value = true
        try {
            const res = await api.get('/diaries/month', { params: { year, month } })
            diaries.value = res.data.diaries
            markedDates.value = res.data.markedDates
            moodMap.value = res.data.moodMap
            wordsMap.value = res.data.wordsMap
            currentMonth.value = { year: res.data.year, month: res.data.month }
            // 仅当查看月包含今天时，才用月度列表同步今天的日记
            const today = new Date()
            const todayStr = formatDate(today)
            if (res.data.year === today.getFullYear() && res.data.month === today.getMonth() + 1) {
                todayDiary.value = diaryForDate(todayStr)
            }
        } catch (err) {
            toast.error(err.message || '加载月度日记失败')
            throw err
        } finally {
            loadingMonth.value = false
        }
    }

    async function loadStreak() {
        loadingStreak.value = true
        try {
            const res = await api.get('/diaries/streak')
            streak.value = res.data.streak
            todayDiary.value = res.data.todayDiary
            nextMilestone.value = res.data.nextMilestone
            daysToNextMilestone.value = res.data.daysToNextMilestone
        } catch (err) {
            toast.error(err.message || '加载连续打卡失败')
        } finally {
            loadingStreak.value = false
        }
    }

    /**
     * 提交/更新当日日记
     * @param {{content:string, mood:string, wordsLearned:number}} payload
     * @returns {Promise<{pointsEarned:number, milestoneBonus:number, isNew:boolean, streak:number}|null>}
     */
    async function submitDiary(payload) {
        submitting.value = true
        try {
            const res = await api.post('/diaries', payload)
            const data = res.data
            todayDiary.value = data.diary
            streak.value = data.streak
            if (data.isNew) {
                toast.success(res.message || `+${data.pointsEarned} 积分`)
                // 仅当当前查看月包含该日期时，更新本地列表
                if (isSameViewMonth(data.diary.date)) {
                    const idx = diaries.value.findIndex(d => d.date === data.diary.date)
                    if (idx >= 0) diaries.value[idx] = data.diary
                    else diaries.value.push(data.diary)
                    if (!markedDates.value.includes(data.diary.date)) {
                        markedDates.value.push(data.diary.date)
                    }
                    moodMap.value[data.diary.date] = data.diary.mood
                    wordsMap.value[data.diary.date] = data.diary.wordsLearned
                }
            } else {
                toast.success('日记已更新')
                if (isSameViewMonth(data.diary.date)) {
                    const idx = diaries.value.findIndex(d => d.date === data.diary.date)
                    if (idx >= 0) diaries.value[idx] = data.diary
                    moodMap.value[data.diary.date] = data.diary.mood
                    wordsMap.value[data.diary.date] = data.diary.wordsLearned
                }
            }
            return data
        } catch (err) {
            toast.error(err.message || '提交日记失败')
            return null
        } finally {
            submitting.value = false
        }
    }

    function isSameViewMonth(dateStr) {
        if (!dateStr || !currentMonth.value.year || !currentMonth.value.month) return false
        const [y, m] = dateStr.split('-')
        return Number(y) === currentMonth.value.year && Number(m) === currentMonth.value.month
    }

    return {
        diaries, markedDates, moodMap, wordsMap, currentMonth,
        streak, todayDiary, nextMilestone, daysToNextMilestone,
        loadingMonth, loadingStreak, submitting,
        diaryForDate, loadMonth, loadStreak, submitDiary
    }
})

function formatDate(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}
