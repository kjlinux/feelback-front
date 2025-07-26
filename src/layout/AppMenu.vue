<script setup>
import { ref } from 'vue';

import AppMenuItem from './AppMenuItem.vue';

const model = ref([
    {
        label: 'Menu',
        items: [
            { label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/' },
            { label: 'Enregistrement', icon: 'pi pi-fw pi-save', to: '/uikit/registration' },
            { label: 'Gérer les contrats', icon: 'pi pi-fw pi-file-edit', to: '/uikit/contract-manager' },
            { label: 'Commissions', icon: 'pi pi-fw pi-chart-line', to: '/uikit/contract-commission' },
            { label: 'Paiements', icon: 'pi pi-fw pi-credit-card', to: '/uikit/contract-payment' },
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
