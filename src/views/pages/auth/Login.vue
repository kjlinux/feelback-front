<script setup>
import FloatingConfigurator from '@/components/FloatingConfigurator.vue';
import { useAuthStore } from '@/store/modules/auth';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const email = ref('');
const password = ref('');
const checked = ref(false);
const loading = ref(false);

onMounted(() => {
    if (authStore.isAuthenticated) {
        router.push('/');
    }
});

const handleLogin = async () => {
    if (!email.value || !password.value) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: "L'email et le mot de passe sont obligatoires",
            life: 3000
        });
        return;
    }

    loading.value = true;

    try {
        await authStore.login(email.value, password.value, checked.value);

        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Login successful',
            life: 3000
        });

        router.push('/');
    } catch (error) {
        const errorMessage = error.response?.data?.message || 'An error occurred during login';

        toast.add({
            severity: 'error',
            summary: 'Login Failed',
            detail: errorMessage,
            life: 5000
        });
    } finally {
        loading.value = false;
    }
};

const forgotPassword = () => {
    router.push('/forgot-password');
};
</script>

<template>
    <FloatingConfigurator />
    <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
        <div class="flex flex-col items-center justify-center">
            <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
                    <div class="text-center mb-8 flex flex-col items-center justify-center">
                        <img src="/logo-company.jpg" alt="logo" class="w-[200px] sm:w-[250px] md:w-auto mb-4 px-4 md:px-0" />

                        <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Bienvenue sur AssurExpat!</div>

                        <span class="text-muted-color font-medium">Connectez-vous pour continuer</span>
                    </div>

                    <div>
                        <label for="email1" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Identifiant</label>
                        <InputText id="email1" type="text" placeholder="Email ou Nom d'utilisateur" class="w-full md:w-[30rem] mb-8" v-model="email" />

                        <label for="password1" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Mot de passe</label>
                        <Password id="password1" v-model="password" placeholder="Mot de passe" :toggleMask="true" class="mb-4" fluid :feedback="false"></Password>

                        <div class="flex items-center justify-between mt-2 mb-8 gap-8">
                            <div class="flex items-center">
                                <Checkbox v-model="checked" id="rememberme1" binary class="mr-2"></Checkbox>
                                <label for="rememberme1">Se souvenir de moi</label>
                            </div>
                            <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary" @click="forgotPassword">Mot de passe oublié ?</span>
                        </div>
                        <Button label="Me connecter" class="w-full" @click="handleLogin" :loading="loading"></Button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.pi-eye {
    transform: scale(1.6);
    margin-right: 1rem;
}

.pi-eye-slash {
    transform: scale(1.6);
    margin-right: 1rem;
}
</style>
