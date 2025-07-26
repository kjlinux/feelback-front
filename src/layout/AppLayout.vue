<script setup>
import { useLayout } from '@/layout/composables/layout';
import { useAuthStore } from '@/store/modules/auth';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppFooter from './AppFooter.vue';
import AppSidebar from './AppSidebar.vue';
import AppTopbar from './AppTopbar.vue';

const { layoutConfig, layoutState, isSidebarActive } = useLayout();
const outsideClickListener = ref(null);

const router = useRouter();
const authStore = useAuthStore();
const tokenRefreshInterval = ref(null);

onMounted(() => {
    if (authStore.isAuthenticated && !authStore.user) {
        authStore.fetchUser();
    } else if (!authStore.isAuthenticated) {
        router.push('/auth/login');
    }

    tokenRefreshInterval.value = setInterval(
        () => {
            if (authStore.isAuthenticated) {
                authStore.refreshToken().catch(() => {
                    handleLogout();
                });
            }
        },
        100000 * 60 * 1000
    );
});

onBeforeUnmount(() => {
    if (tokenRefreshInterval.value) {
        clearInterval(tokenRefreshInterval.value);
    }
});

const handleLogout = async () => {
    try {
        await authStore.logout();
        router.push('/auth/login');
    } catch (error) {
        console.error('Erreur de déconnexion:', error);
        router.push('/auth/login');
    }
};

watch(isSidebarActive, (newVal) => {
    if (newVal) {
        bindOutsideClickListener();
    } else {
        unbindOutsideClickListener();
    }
});

const containerClass = computed(() => {
    return {
        'layout-overlay': layoutConfig.menuMode === 'overlay',
        'layout-static': layoutConfig.menuMode === 'static',
        'layout-static-inactive': layoutState.staticMenuDesktopInactive && layoutConfig.menuMode === 'static',
        'layout-overlay-active': layoutState.overlayMenuActive,
        'layout-mobile-active': layoutState.staticMenuMobileActive
    };
});

function bindOutsideClickListener() {
    if (!outsideClickListener.value) {
        outsideClickListener.value = (event) => {
            if (isOutsideClicked(event)) {
                layoutState.overlayMenuActive = false;
                layoutState.staticMenuMobileActive = false;
                layoutState.menuHoverActive = false;
            }
        };
        document.addEventListener('click', outsideClickListener.value);
    }
}

function unbindOutsideClickListener() {
    if (outsideClickListener.value) {
        document.removeEventListener('click', outsideClickListener);
        outsideClickListener.value = null;
    }
}

function isOutsideClicked(event) {
    const sidebarEl = document.querySelector('.layout-sidebar');
    const topbarEl = document.querySelector('.layout-menu-button');
    return !(sidebarEl.isSameNode(event.target) || sidebarEl.contains(event.target) || topbarEl.isSameNode(event.target) || topbarEl.contains(event.target));
}
</script>

<template>
    <div class="layout-wrapper" :class="containerClass">
        <app-topbar @logout="handleLogout"></app-topbar>
        <app-sidebar></app-sidebar>
        <div class="layout-main-container">
            <div class="layout-main">
                <router-view></router-view>
            </div>
            <app-footer></app-footer>
        </div>
        <div class="layout-mask animate-fadein"></div>
    </div>
    <Toast />
</template>
