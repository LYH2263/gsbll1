<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <header class="topbar">
        <h1 class="page-title" style="margin:0">👤 个人资料</h1>
      </header>
      <main class="page-container">
        <div class="profile-layout">
          <!-- 左侧：用户信息卡片 -->
          <div class="profile-left">
            <div class="card profile-card">
              <div class="profile-avatar-wrap">
                <div class="profile-avatar">{{ auth.userInitial }}</div>
                <div class="profile-avatar-ring"></div>
              </div>
              <h2 class="profile-name">{{ auth.user?.profile?.nickname || auth.user?.username }}</h2>
              <p class="profile-email">{{ auth.user?.email }}</p>
              <div class="profile-role-badge">
                <span class="badge" :class="roleBadge">{{ roleLabel }}</span>
              </div>
              <div class="profile-quick-stats">
                <div class="pqs-item">
                  <div class="pqs-val">{{ auth.user?.stats?.studyDays || 0 }}</div>
                  <div class="pqs-label">学习天数</div>
                </div>
                <div class="pqs-item">
                  <div class="pqs-val">{{ auth.user?.stats?.currentStreak || 0 }}</div>
                  <div class="pqs-label">连续天数</div>
                </div>
                <div class="pqs-item">
                  <div class="pqs-val">{{ auth.user?.stats?.points || 0 }}</div>
                  <div class="pqs-label">总积分</div>
                </div>
              </div>
              <div class="level-info">
                <div class="level-header">
                  <span class="level-badge">⚡ Lv.{{ auth.user?.stats?.level || 1 }}</span>
                  <span style="font-size:12px; color:var(--text-muted)">{{ levelProgress }}% → Lv.{{ (auth.user?.stats?.level || 1) + 1 }}</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: levelProgress + '%' }"></div>
                </div>
              </div>
            </div>

            <!-- 成就徽章 -->
            <div class="card">
              <div class="card-header"><span class="card-title">🏆 成就徽章</span></div>
              <div class="badges-gallery">
                <div
                  v-for="badge in allBadges"
                  :key="badge.id"
                  :class="['badge-achievement', { locked: !earnedBadgeIds.has(badge.id) }]"
                  :title="badge.description"
                >
                  <div class="badge-achievement-icon">{{ badge.icon }}</div>
                  <div class="badge-achievement-name">{{ badge.name }}</div>
                  <div class="badge-achievement-desc">{{ badge.description }}</div>
                  <div v-if="earnedBadgeIds.has(badge.id)" class="badge-earned-date">
                    {{ formatDate(auth.user.badges.find(b => b.id === badge.id)?.earnedAt) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：编辑资料 -->
          <div class="profile-right">
            <div class="card">
              <div class="card-header"><span class="card-title">✏️ 编辑资料</span></div>
              <form @submit.prevent="saveProfile">
                <div class="form-group">
                  <label class="form-label">昵称</label>
                  <input v-model="form.nickname" class="form-input" placeholder="显示名称" id="profile-nickname" />
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
                  <div class="form-group">
                    <label class="form-label">学校</label>
                    <input v-model="form.school" class="form-input" placeholder="就读学校" id="profile-school" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">年级</label>
                    <select v-model="form.grade" class="form-select" id="profile-grade">
                      <option value="">未设置</option>
                      <option v-for="g in grades" :key="g" :value="g">{{ g }}</option>
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">个人简介</label>
                  <textarea v-model="form.bio" class="form-textarea" rows="3" placeholder="介绍一下自己..." id="profile-bio"></textarea>
                </div>
                <div class="form-group">
                  <label class="form-label">每日学习目标</label>
                  <div class="goal-selector">
                    <button v-for="g in goalOptions" :key="g" type="button" :class="['goal-btn', { active: form.dailyGoal === g }]" @click="form.dailyGoal = g">{{ g }}个</button>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary" :disabled="saving" id="save-profile-btn">
                  {{ saving ? '保存中...' : '保存修改' }}
                </button>
              </form>
            </div>

            <!-- 修改密码 -->
            <div class="card" style="margin-top: var(--spacing-lg)">
              <div class="card-header"><span class="card-title">🔐 修改密码</span></div>
              <form @submit.prevent="changePassword">
                <div class="form-group">
                  <label class="form-label">当前密码</label>
                  <input v-model="pwdForm.current" type="password" class="form-input" id="current-password" />
                </div>
                <div class="form-group">
                  <label class="form-label">新密码</label>
                  <input v-model="pwdForm.new" type="password" class="form-input" minlength="6" id="new-password" />
                </div>
                <div class="form-group">
                  <label class="form-label">确认新密码</label>
                  <input v-model="pwdForm.confirm" type="password" class="form-input" id="confirm-password" />
                </div>
                <button type="submit" class="btn btn-secondary" :disabled="changingPwd" id="change-pwd-btn">
                  {{ changingPwd ? '修改中...' : '修改密码' }}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'
import { toast } from '@/utils/toast'

const auth = useAuthStore()
const saving = ref(false)
const changingPwd = ref(false)

const form = ref({
  nickname: auth.user?.profile?.nickname || '',
  school: auth.user?.profile?.school || '',
  grade: auth.user?.profile?.grade || '',
  bio: auth.user?.profile?.bio || '',
  dailyGoal: auth.user?.settings?.dailyGoal || 20
})

const pwdForm = ref({ current: '', new: '', confirm: '' })

const grades = ['小学三年级', '小学四年级', '小学五年级', '小学六年级', '初一', '初二', '初三', '高一', '高二', '高三']
const goalOptions = [10, 15, 20, 30, 50]

const roleLabel = computed(() => ({ student: '学生', teacher: '教师', admin: '管理员' })[auth.user?.role] || '用户')
const roleBadge = computed(() => ({ student: 'badge-primary', teacher: 'badge-success', admin: 'badge-error' })[auth.user?.role] || 'badge-gray')

const levelProgress = computed(() => {
  const points = auth.user?.stats?.points || 0
  const level = auth.user?.stats?.level || 1
  const needed = level * 200
  const prev = (level - 1) * 200
  return Math.min(100, Math.round(((points - prev) / (needed - prev)) * 100))
})

const earnedBadgeIds = computed(() => new Set(auth.user?.badges?.map(b => b.id) || []))

const allBadges = [
  { id: 'first_word', name: '初学乍练', description: '学习第一个单词', icon: '🌱' },
  { id: 'ten_words', name: '初露锋芒', description: '学习10个单词', icon: '⭐' },
  { id: 'hundred_words', name: '百词斩', description: '记忆100个单词', icon: '🏆' },
  { id: 'three_day_streak', name: '坚持三天', description: '连续学习3天', icon: '🔥' },
  { id: 'week_streak', name: '一周达人', description: '连续学习7天', icon: '💎' },
  { id: 'perfect_score', name: '满分达人', description: '正确率达到90%', icon: '🎯' },
  { id: 'thousand_points', name: '积分达人', description: '积累1000积分', icon: '💰' },
]

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

async function saveProfile() {
  saving.value = true
  try {
    await auth.updateProfile({
      nickname: form.value.nickname,
      school: form.value.school,
      grade: form.value.grade,
      bio: form.value.bio,
      settings: { dailyGoal: form.value.dailyGoal }
    })
  } finally {
    saving.value = false
  }
}

async function changePassword() {
  if (pwdForm.value.new !== pwdForm.value.confirm) {
    toast.error('两次输入的密码不一致')
    return
  }
  changingPwd.value = true
  try {
    await api.put('/auth/password', { currentPassword: pwdForm.value.current, newPassword: pwdForm.value.new })
    toast.success('密码修改成功')
    pwdForm.value = { current: '', new: '', confirm: '' }
  } catch (err) {
    toast.error(err.message || '密码修改失败')
  } finally {
    changingPwd.value = false
  }
}
</script>

<style scoped>
.profile-layout {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: var(--spacing-xl);
}

.profile-card {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.profile-avatar-wrap { position: relative; margin-bottom: 4px; }
.profile-avatar {
  width: 96px; height: 96px; border-radius: 50%;
  background: var(--gradient-primary);
  display: flex; align-items: center; justify-content: center;
  font-size: 40px; font-weight: 800; color: white;
  position: relative; z-index: 1;
  box-shadow: var(--shadow-glow);
}
.profile-avatar-ring {
  position: absolute; inset: -4px; border-radius: 50%;
  background: var(--gradient-primary); z-index: 0; opacity: 0.3;
}
.profile-name { font-size: 22px; font-weight: 800; color: var(--text-primary); }
.profile-email { font-size: 13px; color: var(--text-muted); }

.profile-quick-stats {
  display: flex; gap: 20px; width: 100%;
  padding: 16px; background: var(--bg-elevated);
  border-radius: var(--radius-md);
}
.pqs-item { flex: 1; text-align: center; }
.pqs-val { font-size: 22px; font-weight: 800; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.pqs-label { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

.level-info { width: 100%; }
.level-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }

.badges-gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.badge-earned-date { font-size: 10px; color: var(--text-muted); }

.goal-selector { display: flex; gap: 8px; flex-wrap: wrap; }
.goal-btn {
  padding: 8px 16px;
  border: 2px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: 600;
  transition: all var(--transition-fast);
}
.goal-btn.active { border-color: var(--primary-500); background: var(--primary-900); color: var(--primary-300); }
.goal-btn:hover { border-color: var(--primary-400); }

@media (max-width: 1000px) {
  .profile-layout { grid-template-columns: 1fr; }
}
</style>
