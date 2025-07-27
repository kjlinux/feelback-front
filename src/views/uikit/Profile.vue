<script setup>
import { apiClient } from '@/service/auth';
import { useAuthStore } from '@/store/modules/auth';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';

const toast = useToast();
const authStore = useAuthStore();

const user = ref({
    name: '',
    surname: '',
    username: '',
    email: ''
});

const userId = ref(null);

const passwords = ref({
    current_password: '',
    new_password: '',
    confirm_new_password: ''
});

const changePassword = ref(false);
const errors = ref({});
const passwordStrength = ref(0);
const loading = ref(false);

onMounted(async () => {
    if (!authStore.user) {
        try {
            await authStore.fetchUser();
        } catch (error) {
            showErrorToast('Erreur lors du chargement des données utilisateur');
        }
    }

    if (authStore.user) {
        user.value = {
            name: authStore.user.name || '',
            surname: authStore.user.surname || '',
            username: authStore.user.username || '',
            email: authStore.user.email || ''
        };

        userId.value = authStore.user.id;
    }
});

const strengthColor = computed(() => {
    if (passwordStrength.value < 50) return '#ff4d4d';
    if (passwordStrength.value < 75) return '#ffa64d';
    return '#4CAF50';
});

const strengthText = computed(() => {
    if (passwordStrength.value < 50) return 'Faible';
    if (passwordStrength.value < 75) return 'Moyen';
    return 'Fort';
});

const getInitials = computed(() => {
    if (!user.value.surname || !user.value.name) return '';
    return (user.value.surname.charAt(0) + user.value.name.charAt(0)).toUpperCase();
});

const calculateStrength = () => {
    let strength = 0;
    const password = passwords.value.new_password;

    if (password.length >= 8) strength += 25;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;

    passwordStrength.value = strength;
};

const showSuccessToast = (message) => {
    toast.add({
        severity: 'success',
        summary: 'Succès',
        detail: message,
        life: 5000
    });
};

const showErrorToast = (message) => {
    toast.add({
        severity: 'error',
        summary: 'Erreur',
        detail: message,
        life: 5000
    });
};

const updateProfile = async () => {
    errors.value = {};

    if (!userId.value) {
        showErrorToast('Impossible de mettre à jour le profil: ID utilisateur manquant');
        return;
    }

    if (!user.value.name) errors.value.name = 'Le nom est requis';
    if (!user.value.surname) errors.value.surname = 'Le prénom est requis';
    if (!user.value.username) errors.value.username = "Le nom d'utilisateur est requis";
    if (!user.value.email) {
        errors.value.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.value.email)) {
        errors.value.email = 'Format email invalide';
    }

    if (changePassword.value) {
        if (!passwords.value.current_password) errors.value.current_password = 'Mot de passe actuel requis';
        if (!passwords.value.new_password) {
            errors.value.new_password = 'Nouveau mot de passe requis';
        } else if (passwords.value.new_password.length < 6) {
            errors.value.new_password = '6 caractères minimum';
        }
        if (!passwords.value.confirm_new_password) {
            errors.value.confirm_new_password = 'Confirmation requise';
        } else if (passwords.value.new_password !== passwords.value.confirm_new_password) {
            errors.value.confirm_new_password = 'Les mots de passe ne correspondent pas';
        }
    }

    if (Object.keys(errors.value).length === 0) {
        loading.value = true;

        try {
            const formData = { ...user.value };

            if (changePassword.value) {
                formData.current_password = passwords.value.current_password;
                formData.new_password = passwords.value.new_password;
                formData.confirm_new_password = passwords.value.confirm_new_password;
            }

            const response = await apiClient.post(`auth/users/update-profile/${userId.value}`, formData);

            await authStore.fetchUser();

            if (authStore.user) {
                userId.value = authStore.user.id;
            }

            showSuccessToast('Profil mis à jour avec succès!');

            if (changePassword.value) {
                passwords.value = {
                    current_password: '',
                    new_password: '',
                    confirm_new_password: ''
                };
                changePassword.value = false;
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour du profil:', error);

            if (error.response && error.response.status === 400 && error.response.data.errors) {
                errors.value = error.response.data.errors;
            } else if (error.response && error.response.data.message) {
                showErrorToast(error.response.data.message);
            } else {
                showErrorToast('Une erreur est survenue lors de la mise à jour du profil');
            }
        } finally {
            loading.value = false;
        }
    }
};

const resetForm = async () => {
    try {
        if (authStore.user) {
            user.value = {
                name: authStore.user.name || '',
                surname: authStore.user.surname || '',
                username: authStore.user.username || '',
                email: authStore.user.email || ''
            };

            userId.value = authStore.user.id;
        }

        passwords.value = {
            current_password: '',
            new_password: '',
            confirm_new_password: ''
        };
        changePassword.value = false;
        errors.value = {};

        toast.add({
            severity: 'info',
            summary: 'Information',
            detail: 'Formulaire réinitialisé',
            life: 3000
        });
    } catch (error) {
        showErrorToast('Erreur lors de la réinitialisation du formulaire');
    }
};
</script>

<template>
    <div class="card">
        <div class="profile-header flex justify-center">
            <div class="avatar-container">
                <div class="avatar">{{ getInitials }}</div>
            </div>
            <h1 class="text-white">Votre profil</h1>
        </div>

        <Toast position="top-right" />

        <form @submit.prevent="updateProfile" class="profile-form">
            <div class="form-section">
                <h2>Informations personnelles</h2>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="name" class="font-medium text-color">Nom</label>
                        <InputText id="name" v-model="user.name" type="text" :class="{ 'p-invalid': errors.name }" class="w-full" />
                        <small v-if="errors.name" class="p-error">{{ errors.name }}</small>
                    </div>

                    <div class="form-group">
                        <label for="surname" class="font-medium text-color">Prénom</label>
                        <InputText id="surname" v-model="user.surname" type="text" :class="{ 'p-invalid': errors.surname }" class="w-full" />
                        <small v-if="errors.surname" class="p-error">{{ errors.surname }}</small>
                    </div>

                    <div class="form-group">
                        <label for="username" class="font-medium text-color">Nom d'utilisateur</label>
                        <InputText id="username" v-model="user.username" type="text" :class="{ 'p-invalid': errors.username }" class="w-full" />
                        <small v-if="errors.username" class="p-error">{{ errors.username }}</small>
                    </div>

                    <div class="form-group">
                        <label for="email" class="font-medium text-color">Email</label>
                        <InputText id="email" v-model="user.email" type="email" :class="{ 'p-invalid': errors.email }" class="w-full" />
                        <small v-if="errors.email" class="p-error">{{ errors.email }}</small>
                    </div>
                </div>
            </div>

            <div class="divider">
                <span class="divider-text">Sécurité</span>
            </div>

            <div class="form-section">
                <div class="checkbox-container">
                    <Checkbox v-model="changePassword" inputId="changePassword" :binary="true" />
                    <label for="changePassword" class="checkbox-label">Changer le mot de passe</label>
                </div>

                <div v-if="changePassword" class="password-section">
                    <div class="mb-3">
                        <label for="current_password" class="font-medium text-color">Mot de passe actuel</label>
                        <Password id="current_password" v-model="passwords.current_password" :feedback="false" fluid toggleMask :class="{ 'p-invalid': errors.current_password }" class="w-full" />
                        <small v-if="errors.current_password" class="p-error">{{ errors.current_password }}</small>
                    </div>

                    <div class="mb-3">
                        <label for="new_password" class="font-medium text-color">Nouveau mot de passe</label>
                        <Password id="new_password" v-model="passwords.new_password" :feedback="false" toggleMask :class="{ 'p-invalid': errors.new_password }" fluid class="w-full" @input="calculateStrength" />
                        <div v-if="passwords.new_password" class="password-strength mt-2">
                            <div class="strength-bar">
                                <div class="strength-indicator" :style="{ width: passwordStrength + '%', backgroundColor: strengthColor }"></div>
                            </div>
                            <span class="strength-text">{{ strengthText }}</span>
                        </div>
                        <small v-if="errors.new_password" class="p-error">{{ errors.new_password }}</small>
                    </div>

                    <div class="mb-3">
                        <label for="confirm_new_password" class="font-medium text-color">Confirmer le nouveau mot de passe</label>
                        <Password id="confirm_new_password" v-model="passwords.confirm_new_password" :feedback="false" fluid toggleMask :class="{ 'p-invalid': errors.confirm_new_password }" class="w-full" />
                        <small v-if="errors.confirm_new_password" class="p-error">{{ errors.confirm_new_password }}</small>
                    </div>
                </div>
            </div>

            <div class="button-container">
                <Button label="Annuler" severity="secondary" @click="resetForm" type="button" class="p-button-outlined" :disabled="loading" />
                <Button label="Enregistrer" severity="primary" type="submit" :loading="loading" />
            </div>
        </form>
    </div>
</template>

<style scoped>
.profile-header {
    background: linear-gradient(to right, #0ea5e9, #0369a1);
    color: white;
    padding: 2rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    border-radius: 12px 12px 12px 12px;
}

.avatar {
    width: 60px;
    height: 60px;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: bold;
    color: white;
    border: 3px solid rgba(255, 255, 255, 0.5);
}

.profile-form {
    padding: 2rem;
}

.form-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.divider {
    position: relative;
    height: 1px;
    background-color: #e2e8f0;
    margin: 2rem 0;
}

.divider-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: white;
    padding: 0 1rem;
    color: #0ea5e9;
    font-weight: 500;
}

.password-section {
    background-color: #e0f2fe;
    padding: 1.5rem;
    border-radius: 6px;
    margin-top: 1rem;
}

.password-strength {
    margin-top: 0.5rem;
}

.strength-bar {
    height: 6px;
    background-color: #e2e8f0;
    border-radius: 3px;
    overflow: hidden;
}

.strength-indicator {
    height: 100%;
    transition: all 0.3s ease;
}

.strength-text {
    font-size: 0.75rem;
    color: #64748b;
    text-align: right;
    display: block;
    margin-top: 0.25rem;
}

.button-container {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
}

.checkbox-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.checkbox-label {
    font-weight: 500;
    color: #0ea5e9;
}
</style>
