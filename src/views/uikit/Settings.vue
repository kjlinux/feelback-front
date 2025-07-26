<script setup>
import { ref } from 'vue';

const cards = ref([
    {
        id: 0,
        title: 'Utilisateurs',
        icon: 'pi pi-users',
        route: '/uikit/settings/users'
    },
    {
        id: 1,
        title: 'Assureurs',
        icon: 'pi pi-briefcase',
        route: '/uikit/settings/insurers'
    },
    {
        id: 2,
        title: 'Produits',
        icon: 'pi pi-tags',
        route: '/uikit/settings/products'
    },
    {
        id: 3,
        title: 'Pays',
        icon: 'pi pi-globe',
        route: '/uikit/settings/countries'
    },
    {
        id: 4,
        title: 'Garanties',
        icon: 'pi pi-shield',
        route: '/uikit/settings/guarantees'
    },
    {
        id: 5,
        title: 'Assurés',
        icon: 'pi pi-id-card',
        route: '/uikit/settings/insureds'
    },
    {
        id: 6,
        title: 'Rôles',
        icon: 'pi pi-lock',
        route: '/uikit/settings/roles'
    },
    {
        id: 7,
        title: 'Permissions',
        icon: 'pi pi-key',
        route: '/uikit/settings/permissions'
    }
]);
</script>

<template>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
        <router-link v-for="card in cards" :key="card.id" :to="card.route" class="card-link">
            <div
                class="card-container bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-[#2596be] border-2 border-transparent flex flex-col items-center justify-center aspect-square cursor-pointer"
            >
                <div class="flex items-center justify-center w-32 h-32 rounded-full bg-[#2596be]/10 mb-4">
                    <i :class="card.icon" class="text-[#2596be]" style="font-size: 3rem"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-800 text-center">{{ card.title }}</h3>
            </div>
        </router-link>
    </div>
</template>

<style scoped>
.card-container {
    position: relative;
    overflow: hidden;
}

.card-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background-color: transparent;
    transition: background-color 0.3s ease;
}

.card-container:hover::before {
    background-color: #2596be;
}

.card-link {
    text-decoration: none;
    color: inherit;
    display: block;
}

@keyframes pulse {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.05);
    }
    100% {
        transform: scale(1);
    }
}

.card-container:hover i {
    animation: pulse 1s infinite;
}
</style>
