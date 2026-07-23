<template>
  <div class="auth-page">
    <!-- 背景粒子效果 -->
    <div class="auth-bg">
      <div v-for="n in 20" :key="n" class="bg-particle" :style="particleStyle(n)"></div>
    </div>

    <div class="auth-container">
      <div class="auth-left">
        <div class="auth-brand">
          <div class="brand-icon">📖</div>
          <h1 class="brand-name">WordMaster</h1>
          <p class="brand-tagline">智能单词记忆平台</p>
        </div>
        <div class="auth-features">
          <div v-for="f in features" :key="f.title" class="feature-item">
            <div class="feature-icon">{{ f.icon }}</div>
            <div>
              <div class="feature-title">{{ f.title }}</div>
              <div class="feature-desc">{{ f.desc }}</div>
            </div>
          </div>
        </div>
        <div class="auth-stats-row">
          <div class="auth-stat" v-for="s in heroStats" :key="s.label">
            <div class="auth-stat-value">{{ s.value }}</div>
            <div class="auth-stat-label">{{ s.label }}</div>
          </div>
        </div>
      </div>

      <div class="auth-right">
        <div class="auth-card">
          <div class="auth-tabs">
            <button
              class="auth-tab"
              :class="{ active: tab === 'login' }"
              @click="tab = 'login'"
            >登录</button>
            <button
              class="auth-tab"
              :class="{ active: tab === 'register' }"
              @click="tab = 'register'"
            >注册</button>
          </div>

          <!-- 登录表单 -->
          <Transition name="fade" mode="out-in">
            <form v-if="tab === 'login'" @submit.prevent="handleLogin" class="auth-form" key="login">
              <div class="form-group">
                <label class="form-label">邮箱</label>
                <input
                  v-model="loginForm.email"
                  type="email"
                  class="form-input"
                  placeholder="请输入邮箱地址"
                  required
                  autocomplete="email"
                  id="login-email"
                />
              </div>
              <div class="form-group">
                <label class="form-label">密码</label>
                <div class="input-password">
                  <input
                    v-model="loginForm.password"
                    :type="showPwd ? 'text' : 'password'"
                    class="form-input"
                    placeholder="请输入密码"
                    required
                    autocomplete="current-password"
                    id="login-password"
                  />
                  <button type="button" class="pwd-toggle" @click="showPwd = !showPwd">
                    {{ showPwd ? '🙈' : '👁️' }}
                  </button>
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-lg auth-submit" :disabled="auth.loading" id="login-submit-btn">
                <span v-if="auth.loading" class="loading-spinner-sm"></span>
                <span>{{ auth.loading ? '登录中...' : '立即登录' }}</span>
              </button>

              <div class="demo-accounts">
                <div class="demo-accounts-title">默认账号 · 点击一键填充</div>
                <button
                  v-for="account in demoAccounts"
                  :key="account.email"
                  type="button"
                  class="demo-account-btn"
                  :class="{ active: loginForm.email === account.email }"
                  @click="fillAccount(account)"
                  :id="`demo-account-${account.role}`"
                >
                  <span class="demo-account-role">{{ account.label }}</span>
                  <span class="demo-account-email">{{ account.email }}</span>
                  <span class="demo-account-hint">点击填充</span>
                </button>
              </div>
            </form>

            <!-- 注册表单 -->
            <form v-else @submit.prevent="handleRegister" class="auth-form" key="register">
              <div class="form-group">
                <label class="form-label">用户名</label>
                <input v-model="regForm.username" type="text" class="form-input" placeholder="3-20个字符" required minlength="3" maxlength="20" id="reg-username" />
              </div>
              <div class="form-group">
                <label class="form-label">邮箱</label>
                <input v-model="regForm.email" type="email" class="form-input" placeholder="请输入邮箱" required id="reg-email" />
              </div>
              <div class="form-group">
                <label class="form-label">昵称</label>
                <input v-model="regForm.nickname" type="text" class="form-input" placeholder="显示名称（可选）" id="reg-nickname" />
              </div>
              <div class="form-group">
                <label class="form-label">角色</label>
                <select v-model="regForm.role" class="form-select" id="reg-role">
                  <option value="student">学生</option>
                  <option value="teacher">教师</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">密码</label>
                <div class="input-password">
                  <input v-model="regForm.password" :type="showPwd ? 'text' : 'password'" class="form-input" placeholder="至少6位密码" required minlength="6" id="reg-password" />
                  <button type="button" class="pwd-toggle" @click="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁️' }}</button>
                </div>
              </div>
              <button type="submit" class="btn btn-primary btn-lg auth-submit" :disabled="auth.loading" id="register-submit-btn">
                <span v-if="auth.loading" class="loading-spinner-sm"></span>
                <span>{{ auth.loading ? '注册中...' : '创建账号' }}</span>
              </button>
            </form>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const tab = ref('login')
const showPwd = ref(false)

const loginForm = ref({ email: '', password: '' })
const regForm = ref({ username: '', email: '', nickname: '', password: '', role: 'student' })

const features = [
  { icon: '🧠', title: '艾宾浩斯算法', desc: '科学复习计划，最优记忆效果' },
  { icon: '🎯', title: '多样学习模式', desc: '拼写、听力、词义匹配三种模式' },
  { icon: '📊', title: '数据可视化', desc: '学习进度实时追踪与分析' },
  { icon: '🏆', title: '成就激励系统', desc: '积分徽章体系，提升学习积极性' }
]

const heroStats = [
  { value: '1000+', label: '词汇量' },
  { value: '95%', label: '记忆效率' },
  { value: '7天', label: '见效周期' }
]

const demoAccounts = [
  { role: 'admin', label: '管理员', email: 'admin@wordmaster.com', password: 'Admin@2024' },
  { role: 'teacher', label: '教师', email: 'teacher@wordmaster.com', password: 'Teacher@2024' }
]

function fillAccount(account) {
  loginForm.value.email = account.email
  loginForm.value.password = account.password
}

function particleStyle(n) {
  return {
    left: `${(n * 37) % 100}%`,
    animationDuration: `${8 + (n % 8)}s`,
    animationDelay: `${(n * 0.7) % 5}s`,
    width: `${2 + (n % 4)}px`,
    height: `${2 + (n % 4)}px`,
    opacity: 0.3 + (n % 5) * 0.1
  }
}


async function handleLogin() {
  const success = await auth.login(loginForm.value.email, loginForm.value.password)
  if (success) router.push('/dashboard')
}

async function handleRegister() {
  const success = await auth.register({
    username: regForm.value.username,
    email: regForm.value.email,
    password: regForm.value.password,
    nickname: regForm.value.nickname,
    role: regForm.value.role
  })
  if (success) router.push('/dashboard')
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: stretch;
  position: relative;
  overflow: hidden;
  background: var(--gradient-hero);
}

.auth-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.bg-particle {
  position: absolute;
  background: rgba(99, 102, 241, 0.4);
  border-radius: 50%;
  bottom: -10px;
  animation: floatUp linear infinite;
}

@keyframes floatUp {
  from { transform: translateY(0); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 0.5; }
  to { transform: translateY(-110vh) translateX(30px); opacity: 0; }
}

.auth-container {
  display: flex;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  z-index: 1;
}

.auth-left {
  flex: 1;
  padding: 60px 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 40px;
}

.auth-brand {
  text-align: left;
}

.brand-icon {
  font-size: 56px;
  margin-bottom: 12px;
  filter: drop-shadow(0 0 20px rgba(99,102,241,0.6));
}

.brand-name {
  font-size: 48px;
  font-weight: 900;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
  line-height: 1;
}

.brand-tagline {
  font-size: 20px;
  color: var(--text-secondary);
  margin-top: 8px;
}

.auth-features {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.feature-icon {
  font-size: 28px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: var(--gradient-card);
  border: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.feature-title {
  font-weight: 700;
  color: var(--text-primary);
  font-size: 16px;
}

.feature-desc {
  color: var(--text-muted);
  font-size: 14px;
  margin-top: 2px;
}

.auth-stats-row {
  display: flex;
  gap: 32px;
}

.auth-stat-value {
  font-size: 28px;
  font-weight: 800;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.auth-stat-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}

.auth-right {
  width: 440px;
  padding: 40px 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-card {
  width: 100%;
  background: rgba(30, 41, 59, 0.9);
  backdrop-filter: blur(30px);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  padding: 36px;
  box-shadow: var(--shadow-lg);
}

.auth-tabs {
  display: flex;
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
  padding: 4px;
  margin-bottom: 28px;
  gap: 4px;
}

.auth-tab {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.auth-tab.active {
  background: var(--primary-600);
  color: white;
  box-shadow: 0 2px 8px rgba(99,102,241,0.4);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.input-password {
  position: relative;
}

.input-password .form-input { padding-right: 44px; }

.pwd-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
}


.auth-submit {
  width: 100%;
  justify-content: center;
  margin-top: 8px;
}

.demo-accounts {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-subtle);
}

.demo-accounts-title {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 10px;
  text-align: center;
}

.demo-account-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 8px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
}

.demo-account-btn:last-child {
  margin-bottom: 0;
}

.demo-account-btn:hover {
  border-color: var(--primary-500);
  background: rgba(99, 102, 241, 0.08);
  color: var(--text-primary);
}

.demo-account-btn.active {
  border-color: var(--primary-500);
  background: rgba(99, 102, 241, 0.15);
}

.demo-account-role {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: rgba(99, 102, 241, 0.2);
  color: var(--primary-400);
  font-weight: 600;
  font-size: 12px;
}

.demo-account-email {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-account-hint {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-muted);
}

.loading-spinner-sm {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@media (max-width: 768px) {
  .auth-container { flex-direction: column; }
  .auth-left { display: none; }
  .auth-right { width: 100%; padding: 24px 16px; }
  .auth-card { padding: 24px; }
}
</style>
