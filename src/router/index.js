import AppLayout from '@/layout/AppLayout.vue';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: AppLayout,
            children: [
                {
                    path: '/',
                    name: 'dashboard',
                    component: () => import('@/views/Dashboard.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/temporal-trends',
                    name: 'temporal-trends',
                    component: () => import('@/views/uikit/TemporalTrends.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/device-performance',
                    name: 'device-performance',
                    component: () => import('@/views/uikit/DevicePerformance.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/hourly-patterns',
                    name: 'hourly-patterns',
                    component: () => import('@/views/uikit/HourlyPatterns.vue'),
                    props: true,
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/sentiment-distribution',
                    name: 'sentiment-distribution',
                    component: () => import('@/views/uikit/SentimentDistribution.vue'),
                    props: true,
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/test-manager',
                    name: 'test-manager',
                    component: () => import('@/views/uikit/TestManager.vue'),
                    props: true,
                    meta: { requiresAuth: true }
                },
                {
                    path: '/auth/profile',
                    name: 'profile',
                    component: () => import('@/views/uikit/Profile.vue'),
                    meta: { requiresAuth: true }
                },
            ]
        },
        {
            path: '/auth/login',
            name: 'login',
            component: () => import('@/views/pages/auth/Login.vue'),
            meta: { requiresAuth: false }
        },
    ]
});

export default router;
