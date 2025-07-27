<script setup>
import { ref } from 'vue';

import AppMenuItem from './AppMenuItem.vue';

const model = ref([
    {
        label: 'Menu',
        items: [
            { label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/' },
            { label: 'Tendances Temporelles', icon: 'pi pi-fw pi-calendar-clock', to: '/uikit/temporal-trends' },
            { label: 'Performance par Dispositif', icon: 'pi pi-fw pi-sliders-h', to: '/uikit/device-performance' },
            { label: "Patterns Horaires d'Utilisation", icon: 'pi pi-fw pi-clock', to: '/uikit/hourly-patterns' },
            { label: 'Distribution des Sentiments', icon: 'pi pi-fw pi-chart-bar', to: '/uikit/sentiment-distribution' },
            { label: 'Paramètres', icon: 'pi pi-fw pi-cog', to: '/uikit/settings' }
        ]
    }
]);
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped></style>
