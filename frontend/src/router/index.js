/**
 * Vue Router 路由配置
 */

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 懒加载视图
const LoginView = () => import('@/views/LoginView.vue')
const RegisterView = () => import('@/views/RegisterView.vue')
const DashboardView = () => import('@/views/DashboardView.vue')
const WordBooksView = () => import('@/views/WordBooksView.vue')
const WordListView = () => import('@/views/WordListView.vue')
const StudyView = () => import('@/views/StudyView.vue')
const ReviewView = () => import('@/views/ReviewView.vue')
const WrongWordsView = () => import('@/views/WrongWordsView.vue')
const StarredWordsView = () => import('@/views/StarredWordsView.vue')
const StatsView = () => import('@/views/StatsView.vue')
const DiaryView = () => import('@/views/DiaryView.vue')
const ProfileView = () => import('@/views/ProfileView.vue')
const AdminView = () => import('@/views/AdminView.vue')

const routes = [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', component: LoginView, meta: { guest: true } },
    { path: '/register', component: RegisterView, meta: { guest: true } },
    {
        path: '/dashboard',
        component: DashboardView,
        meta: { requiresAuth: true, title: '学习总览' }
    },
    {
        path: '/wordbooks',
        component: WordBooksView,
        meta: { requiresAuth: true, title: '单词书库' }
    },
    {
        path: '/wordbooks/:id/words',
        component: WordListView,
        meta: { requiresAuth: true, title: '单词列表' }
    },
    {
        path: '/study/:bookId',
        component: StudyView,
        meta: { requiresAuth: true, title: '单词学习' }
    },
    {
        path: '/review',
        component: ReviewView,
        meta: { requiresAuth: true, title: '今日复习' }
    },
    {
        path: '/wrong-words',
        component: WrongWordsView,
        meta: { requiresAuth: true, title: '错题集' }
    },
    {
        path: '/starred',
        component: StarredWordsView,
        meta: { requiresAuth: true, title: '重点单词' }
    },
    {
        path: '/stats',
        component: StatsView,
        meta: { requiresAuth: true, title: '学习统计' }
    },
    {
        path: '/diary',
        component: DiaryView,
        meta: { requiresAuth: true, title: '学习日记' }
    },
    {
        path: '/profile',
        component: ProfileView,
        meta: { requiresAuth: true, title: '个人资料' }
    },
    {
        path: '/admin',
        component: AdminView,
        meta: { requiresAuth: true, requiresAdmin: true, title: '管理后台' }
    },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior: () => ({ top: 0 })
})

// 路由守卫
router.beforeEach((to, from, next) => {
    const auth = useAuthStore()

    if (to.meta.requiresAuth && !auth.isLoggedIn) {
        return next('/login')
    }
    if (to.meta.guest && auth.isLoggedIn) {
        return next('/dashboard')
    }
    if (to.meta.requiresAdmin && !auth.isAdmin) {
        return next('/dashboard')
    }

    document.title = to.meta.title ? `${to.meta.title} - WordMaster` : 'WordMaster'
    next()
})

export default router
