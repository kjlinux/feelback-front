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
                    path: '/uikit/registration',
                    name: 'registration',
                    component: () => import('@/views/uikit/Registration.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/contract-manager',
                    name: 'contract-manager',
                    component: () => import('@/views/uikit/ContractManager.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/contracts/:id',
                    name: 'contract-details',
                    component: () => import('@/views/uikit/ContractDetails.vue'),
                    props: true,
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/contracts/update/:id',
                    name: 'contract-update',
                    component: () => import('@/views/uikit/ContractUpdate.vue'),
                    props: true,
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/contract-commission',
                    name: 'contract-commission',
                    component: () => import('@/views/uikit/ContractCommission.vue'),
                    props: true,
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/contract-payment',
                    name: 'contract-payment',
                    component: () => import('@/views/uikit/ContractPayment.vue'),
                    props: true,
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/settings',
                    name: 'settings',
                    component: () => import('@/views/uikit/Settings.vue'),
                    props: true,
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/settings/insurers',
                    name: 'insurers-settings',
                    component: () => import('@/views/uikit/Settings/Insurers.vue'),
                    props: true,
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/settings/guarantees',
                    name: 'guarantees-settings',
                    component: () => import('@/views/uikit/Settings/Guarantees.vue'),
                    props: true,
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/settings/countries',
                    name: 'countries-settings',
                    component: () => import('@/views/uikit/Settings/Countries.vue'),
                    props: true,
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/settings/products',
                    name: 'products-settings',
                    component: () => import('@/views/uikit/Settings/Products.vue'),
                    props: true,
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/settings/insureds',
                    name: 'insureds-settings',
                    component: () => import('@/views/uikit/Settings/Insureds.vue'),
                    props: true,
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/settings/users',
                    name: 'users-settings',
                    component: () => import('@/views/uikit/Settings/Users.vue'),
                    props: true,
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/settings/roles',
                    name: 'roles-settings',
                    component: () => import('@/views/uikit/Settings/Roles.vue'),
                    props: true,
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/settings/permissions',
                    name: 'permissions-settings',
                    component: () => import('@/views/uikit/Settings/Permissions.vue'),
                    props: true,
                    meta: { requiresAuth: true }
                },
                {
                    path: '/auth/profile',
                    name: 'profile',
                    component: () => import('@/views/uikit/Profile.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/formlayout',
                    name: 'formlayout',
                    component: () => import('@/views/uikit/FormLayout.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/input',
                    name: 'input',
                    component: () => import('@/views/uikit/InputDoc.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/button',
                    name: 'button',
                    component: () => import('@/views/uikit/ButtonDoc.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/table',
                    name: 'table',
                    component: () => import('@/views/uikit/TableDoc.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/list',
                    name: 'list',
                    component: () => import('@/views/uikit/ListDoc.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/tree',
                    name: 'tree',
                    component: () => import('@/views/uikit/TreeDoc.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/panel',
                    name: 'panel',
                    component: () => import('@/views/uikit/PanelsDoc.vue'),
                    meta: { requiresAuth: true }
                },

                {
                    path: '/uikit/overlay',
                    name: 'overlay',
                    component: () => import('@/views/uikit/OverlayDoc.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/media',
                    name: 'media',
                    component: () => import('@/views/uikit/MediaDoc.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/message',
                    name: 'message',
                    component: () => import('@/views/uikit/MessagesDoc.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/file',
                    name: 'file',
                    component: () => import('@/views/uikit/FileDoc.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/menu',
                    name: 'menu',
                    component: () => import('@/views/uikit/MenuDoc.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/charts',
                    name: 'charts',
                    component: () => import('@/views/uikit/ChartDoc.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/misc',
                    name: 'misc',
                    component: () => import('@/views/uikit/MiscDoc.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/timeline',
                    name: 'timeline',
                    component: () => import('@/views/uikit/TimelineDoc.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/pages/empty',
                    name: 'empty',
                    component: () => import('@/views/pages/Empty.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/pages/crud',
                    name: 'crud',
                    component: () => import('@/views/pages/Crud.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/documentation',
                    name: 'documentation',
                    component: () => import('@/views/pages/Documentation.vue'),
                    meta: { requiresAuth: true }
                }
            ]
        },
        {
            path: '/landing',
            name: 'landing',
            component: () => import('@/views/pages/Landing.vue'),
            meta: { requiresAuth: false }
        },
        {
            path: '/pages/notfound',
            name: 'notfound',
            component: () => import('@/views/pages/NotFound.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/auth/login',
            name: 'login',
            component: () => import('@/views/pages/auth/Login.vue'),
            meta: { requiresAuth: false }
        },
        {
            path: '/auth/access',
            name: 'accessDenied',
            component: () => import('@/views/pages/auth/Access.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/auth/error',
            name: 'error',
            component: () => import('@/views/pages/auth/Error.vue'),
            meta: { requiresAuth: true }
        }
    ]
});

export default router;
