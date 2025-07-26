<script setup>
import { useAuthStore } from '@/store/modules/auth';
import { computed } from 'vue';

const props = defineProps({
    permission: {
        type: [String, Array],
        required: false
    },
    role: {
        type: [String, Array],
        required: false
    },
    all: {
        type: Boolean,
        default: false
    }
});

const authStore = useAuthStore();

const hasAccess = computed(() => {
    if (!props.permission && !props.role) return true;

    if (props.permission) {
        if (Array.isArray(props.permission)) {
            if (props.all) {
                return authStore.hasAllPermissions(props.permission);
            }

            return authStore.hasAnyPermission(props.permission);
        }

        return authStore.hasPermission(props.permission);
    }

    if (props.role) {
        if (Array.isArray(props.role)) {
            if (props.all) {
                return props.role.every((r) => authStore.hasRole(r));
            }

            return authStore.hasAnyRole(props.role);
        }

        return authStore.hasRole(props.role);
    }

    return false;
});
</script>

<template>
    <slot v-if="hasAccess"></slot>
</template>
