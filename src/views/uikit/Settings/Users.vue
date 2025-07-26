<script setup>
import { apiClient } from '@/service/auth';
import { useSettings } from '@/service/useSettings';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const FilterMatchMode = {
    STARTS_WITH: 'startsWith',
    CONTAINS: 'contains',
    ENDS_WITH: 'endsWith',
    EQUALS: 'equals',
    NOT_EQUALS: 'notEquals',
    IN: 'in',
    LESS_THAN: 'lt',
    LESS_THAN_OR_EQUAL_TO: 'lte',
    GREATER_THAN: 'gt',
    GREATER_THAN_OR_EQUAL_TO: 'gte',
    BETWEEN: 'between',
    DATE_IS: 'dateIs',
    DATE_IS_NOT: 'dateIsNot',
    DATE_BEFORE: 'dateBefore',
    DATE_AFTER: 'dateAfter'
};

const router = useRouter();
const toast = useToast();
const dt = ref();

const { roles, loading: loadingRoles, fetchRoles } = useSettings();

const users = ref([]);
const blockedUsers = ref([]);
const userDialog = ref(false);
const blockUserDialog = ref(false);
const blockUsersDialog = ref(false);
const showBlockedUsersDialog = ref(false);
const resetPasswordDialog = ref(false);
const updateRoleDialog = ref(false);
const user = ref({});
const selectedUsers = ref();
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);
const filteredRoles = ref([]);
const generatedPassword = ref('');

onMounted(() => {
    loadUsers();
    fetchRoles();
});

const loadUsers = async () => {
    try {
        const response = await apiClient.get('/auth/users');
        users.value = response.data.data || [];
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les utilisateurs', life: 3000 });
        console.error('Erreur lors du chargement des utilisateurs:', error);
    }
};

const goBack = () => {
    router.back();
};

function openNew() {
    user.value = {};
    submitted.value = false;
    userDialog.value = true;
}

function hideDialog() {
    userDialog.value = false;
    submitted.value = false;
}

async function saveUser() {
    submitted.value = true;

    if (user.value.username?.trim() && user.value.email?.trim() && user.value.name?.trim() && user.value.surname?.trim() && user.value.role_id) {
        try {
            if (user.value.id) {
                const response = await apiClient.put(`/auth/users/${user.value.id}`, user.value);
                const updatedUser = response.data.data || response.data;

                const index = findIndexById(user.value.id);
                if (index !== -1) {
                    users.value[index] = { ...updatedUser };
                    users.value = [...users.value];
                }
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateur mis à jour', life: 3000 });
            } else {
                const response = await apiClient.post('/auth/users/register', user.value);
                const newUser = response.data.data || response.data;

                users.value = [...users.value, newUser];
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateur créé', life: 3000 });
            }

            userDialog.value = false;
            user.value = {};
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: 'Erreur',
                detail: error.response?.data?.message || "Une erreur est survenue lors de l'enregistrement",
                life: 3000
            });
            console.error("Erreur lors de l'enregistrement de l'utilisateur:", error);
        }
    }
}

function editUser(userData) {
    user.value = JSON.parse(JSON.stringify(userData));

    if (user.value.role_id && roles.value) {
        const selectedRole = roles.value.find((role) => role.id === user.value.role_id);
        if (selectedRole) {
            user.value.selectedRole = selectedRole;
        }
    }

    userDialog.value = true;
}

function confirmBlockUser(userData) {
    user.value = userData;
    blockUserDialog.value = true;
}

async function blockUser() {
    try {
        await apiClient.delete(`/auth/users/${user.value.id}`);
        users.value = users.value.filter((val) => val.id !== user.value.id);
        blockUserDialog.value = false;
        user.value = {};
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateur bloqué', life: 3000 });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || "Une erreur est survenue lors du blocage de l'utilisateur",
            life: 3000
        });
        console.error("Erreur lors du blocage de l'utilisateur:", error);
    }
}

async function restoreUser(userId) {
    try {
        await apiClient.post(`/auth/users/restore/${userId}`);
        loadUsers();
        blockedUsers.value = blockedUsers.value.filter((user) => user.id !== userId);
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateur restauré', life: 3000 });

        if (blockedUsers.value.length === 0) {
            showBlockedUsersDialog.value = false;
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || "Une erreur est survenue lors de la restauration de l'utilisateur",
            life: 3000
        });
        console.error("Erreur lors de la restauration de l'utilisateur:", error);
    }
}

function confirmResetPassword(userData) {
    user.value = userData;
    resetPasswordDialog.value = true;
}

async function resetPassword() {
    try {
        const response = await apiClient.post(`/auth/users/reset-password/${user.value.id}`);
        generatedPassword.value = response.data.password || 'Mot de passe réinitialisé';
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Mot de passe réinitialisé', life: 3000 });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || 'Une erreur est survenue lors de la réinitialisation du mot de passe',
            life: 3000
        });
        console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    }
}

function openUpdateRoleDialog(userData) {
    user.value = JSON.parse(JSON.stringify(userData));

    if (user.value.role_id && roles.value) {
        const selectedRole = roles.value.find((role) => role.id === user.value.role_id);
        if (selectedRole) {
            user.value.selectedRole = selectedRole;
        }
    }

    updateRoleDialog.value = true;
}

async function updateRole() {
    if (user.value.role_id) {
        try {
            await apiClient.post(`/auth/users/update-role/${user.value.id}`, { role_id: user.value.role_id });

            const index = findIndexById(user.value.id);
            if (index !== -1) {
                users.value[index].role_id = user.value.role_id;
                users.value = [...users.value];
            }

            updateRoleDialog.value = false;
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Rôle mis à jour', life: 3000 });
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: 'Erreur',
                detail: error.response?.data?.message || 'Une erreur est survenue lors de la mise à jour du rôle',
                life: 3000
            });
            console.error('Erreur lors de la mise à jour du rôle:', error);
        }
    }
}

function findIndexById(id) {
    let index = -1;
    for (let i = 0; i < users.value.length; i++) {
        if (users.value[i].id === id) {
            index = i;
            break;
        }
    }
    return index;
}

function exportCSV() {
    dt.value.exportCSV();
}

function confirmBlockSelected() {
    blockUsersDialog.value = true;
}

async function blockSelectedUsers() {
    try {
        for (const user of selectedUsers.value) {
            await apiClient.delete(`/auth/users/${user.id}`);
        }

        users.value = users.value.filter((val) => !selectedUsers.value.includes(val));
        blockUsersDialog.value = false;
        selectedUsers.value = null;
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateurs bloqués', life: 3000 });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Une erreur est survenue lors du blocage des utilisateurs sélectionnés',
            life: 3000
        });
        console.error('Erreur lors du blocage des utilisateurs:', error);
    }
}

async function showBlockedUsers() {
    try {
        const response = await apiClient.get('/auth/users/trashed');
        blockedUsers.value = response.data.data || [];
        showBlockedUsersDialog.value = true;
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les utilisateurs bloqués',
            life: 3000
        });
        console.error('Erreur lors du chargement des utilisateurs bloqués:', error);
    }
}

function searchRolesByName(event) {
    setTimeout(() => {
        if (!event.query.trim().length) {
            filteredRoles.value = [...roles.value];
        } else {
            filteredRoles.value = roles.value.filter((role) => {
                return role.name.toLowerCase().includes(event.query.toLowerCase());
            });
        }
    }, 250);
}

function findRoleName(id) {
    if (!roles.value) return 'Chargement...';
    const role = roles.value.find((role) => role.id === id);
    return role ? role.name : 'Non défini';
}

function getFullName(user) {
    return `${user.name} ${user.surname}`;
}
</script>

<template>
    <div>
        <div class="card">
            <div class="p-3 border-gray-200 dark:border-gray-700">
                <div class="flex sm:flex-row justify-between">
                    <Button icon="pi pi-arrow-left" label="Retour" class="p-button-secondary p-button-sm" @click="goBack" />
                </div>
            </div>
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="Nouveau" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                    <Button label="Bloquer" icon="pi pi-ban" severity="secondary" class="mr-2" @click="confirmBlockSelected" :disabled="!selectedUsers || !selectedUsers.length" />
                    <Button label="Utilisateurs bloqués" icon="pi pi-users" severity="secondary" @click="showBlockedUsers" />
                </template>

                <template #end>
                    <Button label="Exporter" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" />
                </template>
            </Toolbar>

            <DataTable
                ref="dt"
                v-model:selection="selectedUsers"
                :value="users"
                dataKey="id"
                :paginator="true"
                :rows="10"
                :filters="filters"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} utilisateurs"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <h4 class="m-0">Gestion des Utilisateurs</h4>
                        <IconField>
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Rechercher..." />
                        </IconField>
                    </div>
                </template>

                <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
                <Column field="username" header="Nom d'utilisateur" sortable style="min-width: 10rem"></Column>
                <Column field="email" header="Email" sortable style="min-width: 14rem"></Column>
                <Column field="name" header="Nom complet" sortable style="min-width: 12rem">
                    <template #body="slotProps">
                        {{ getFullName(slotProps.data) }}
                    </template>
                </Column>
                <Column field="role_id" header="Rôle" sortable style="min-width: 10rem">
                    <template #body="slotProps">
                        {{ findRoleName(slotProps.data.role_id) }}
                    </template>
                </Column>
                <Column :exportable="false" style="min-width: 16rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editUser(slotProps.data)" />
                        <Button icon="pi pi-ban" outlined rounded severity="danger" class="mr-2" @click="confirmBlockUser(slotProps.data)" />
                        <Button icon="pi pi-key" outlined rounded class="mr-2" @click="confirmResetPassword(slotProps.data)" tooltip="Réinitialiser le mot de passe" />
                        <Button icon="pi pi-user-edit" outlined rounded @click="openUpdateRoleDialog(slotProps.data)" tooltip="Modifier le rôle" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog v-model:visible="userDialog" :style="{ width: '550px' }" header="Détails de l'Utilisateur" :modal="true">
            <div class="flex flex-col gap-4">
                <div>
                    <label for="username" class="block font-bold mb-2">Nom d'utilisateur</label>
                    <InputText id="username" v-model.trim="user.username" required="true" autofocus :invalid="submitted && !user.username" fluid />
                    <small v-if="submitted && !user.username" class="text-red-500">Le nom d'utilisateur est obligatoire.</small>
                </div>

                <div>
                    <label for="email" class="block font-bold mb-2">Email</label>
                    <InputText id="email" v-model.trim="user.email" required="true" :invalid="submitted && !user.email" fluid />
                    <small v-if="submitted && !user.email" class="text-red-500">L'email est obligatoire.</small>
                </div>

                <div>
                    <label for="name" class="block font-bold mb-2">Nom</label>
                    <InputText id="name" v-model.trim="user.name" required="true" :invalid="submitted && !user.name" fluid />
                    <small v-if="submitted && !user.name" class="text-red-500">Le nom est obligatoire.</small>
                </div>

                <div>
                    <label for="surname" class="block font-bold mb-2">Prénom</label>
                    <InputText id="surname" v-model.trim="user.surname" required="true" :invalid="submitted && !user.surname" fluid />
                    <small v-if="submitted && !user.surname" class="text-red-500">Le prénom est obligatoire.</small>
                </div>

                <div>
                    <label for="password" class="block font-bold mb-2">Mot de passe</label>
                    <InputText id="password" v-model="user.password" type="password" fluid />
                    <small class="text-gray-500">Laissez vide pour générer un mot de passe aléatoire ou conserver l'actuel.</small>
                </div>

                <div>
                    <label for="role" class="block font-bold mb-2">Rôle</label>
                    <AutoComplete
                        id="role"
                        v-model="user.selectedRole"
                        :suggestions="filteredRoles"
                        optionLabel="name"
                        dropdown
                        @complete="searchRolesByName"
                        placeholder="Rechercher un rôle"
                        @item-select="(e) => (user.role_id = e.value.id)"
                        :invalid="submitted && !user.role_id"
                        fluid
                    />
                    <small v-if="submitted && !user.role_id" class="text-red-500">Le rôle est obligatoire.</small>
                </div>
            </div>

            <template #footer>
                <Button label="Annuler" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Enregistrer" icon="pi pi-check" @click="saveUser" />
            </template>
        </Dialog>

        <Dialog v-model:visible="blockUserDialog" :style="{ width: '450px' }" header="Confirmer" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="user">
                    Êtes-vous sûr de vouloir bloquer <b>{{ user.username }}</b
                    >?
                </span>
            </div>
            <template #footer>
                <Button label="Non" icon="pi pi-times" text @click="blockUserDialog = false" />
                <Button label="Oui" icon="pi pi-check" @click="blockUser" />
            </template>
        </Dialog>

        <Dialog v-model:visible="blockUsersDialog" :style="{ width: '450px' }" header="Confirmer" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span>Êtes-vous sûr de vouloir bloquer les utilisateurs sélectionnés?</span>
            </div>
            <template #footer>
                <Button label="Non" icon="pi pi-times" text @click="blockUsersDialog = false" />
                <Button label="Oui" icon="pi pi-check" text @click="blockSelectedUsers" />
            </template>
        </Dialog>

        <Dialog v-model:visible="showBlockedUsersDialog" :style="{ width: '550px' }" header="Utilisateurs bloqués" :modal="true">
            <div class="flex flex-col gap-4">
                <div v-if="blockedUsers.length === 0" class="text-center p-4">
                    <i class="pi pi-info-circle !text-3xl mb-3 block" />
                    <p>Aucun utilisateur bloqué</p>
                </div>
                <DataTable v-else :value="blockedUsers" dataKey="id">
                    <Column field="username" header="Nom d'utilisateur"></Column>
                    <Column field="email" header="Email"></Column>
                    <Column field="name" header="Nom complet">
                        <template #body="slotProps">
                            {{ getFullName(slotProps.data) }}
                        </template>
                    </Column>
                    <Column field="role_id" header="Rôle">
                        <template #body="slotProps">
                            {{ findRoleName(slotProps.data.role_id) }}
                        </template>
                    </Column>
                    <Column style="width: 6rem">
                        <template #body="slotProps">
                            <Button icon="pi pi-replay" outlined rounded @click="restoreUser(slotProps.data.id)" />
                        </template>
                    </Column>
                </DataTable>
            </div>
            <template #footer>
                <Button label="Fermer" icon="pi pi-times" text @click="showBlockedUsersDialog = false" />
            </template>
        </Dialog>

        <Dialog v-model:visible="resetPasswordDialog" :style="{ width: '450px' }" header="Réinitialisation du mot de passe" :modal="true">
            <div class="flex flex-col gap-4">
                <div v-if="!generatedPassword" class="flex items-center gap-4">
                    <i class="pi pi-key !text-3xl" />
                    <span v-if="user">
                        Êtes-vous sûr de vouloir réinitialiser le mot de passe de <b>{{ user.username }}</b
                        >?
                    </span>
                </div>
                <div v-else class="flex flex-col items-center gap-4">
                    <i class="pi pi-check-circle !text-3xl text-green-500" />
                    <p>Le mot de passe a été réinitialisé.</p>
                    <div v-if="generatedPassword !== 'Mot de passe réinitialisé'" class="p-3 bg-gray-100 rounded w-full text-center">
                        <p class="font-bold">Nouveau mot de passe</p>
                        <p class="mt-2">{{ generatedPassword }}</p>
                    </div>
                    <p class="text-sm text-gray-600">Un email a été envoyé à l'utilisateur avec ses nouvelles informations de connexion.</p>
                </div>
            </div>
            <template #footer>
                <Button v-if="!generatedPassword" label="Annuler" icon="pi pi-times" text @click="resetPasswordDialog = false" />
                <Button v-if="!generatedPassword" label="Réinitialiser" icon="pi pi-check" @click="resetPassword" />
                <Button
                    v-else
                    label="Fermer"
                    icon="pi pi-times"
                    text
                    @click="
                        resetPasswordDialog = false;
                        generatedPassword = '';
                    "
                />
            </template>
        </Dialog>

        <Dialog v-model:visible="updateRoleDialog" :style="{ width: '450px' }" header="Modifier le rôle" :modal="true">
            <div class="flex flex-col gap-4">
                <div>
                    <label for="updateRole" class="block font-bold mb-2">Rôle</label>
                    <AutoComplete
                        id="updateRole"
                        v-model="user.selectedRole"
                        :suggestions="filteredRoles"
                        optionLabel="name"
                        dropdown
                        @complete="searchRolesByName"
                        placeholder="Rechercher un rôle"
                        @item-select="(e) => (user.role_id = e.value.id)"
                        fluid
                    />
                </div>
            </div>
            <template #footer>
                <Button label="Annuler" icon="pi pi-times" text @click="updateRoleDialog = false" />
                <Button label="Mettre à jour" icon="pi pi-check" @click="updateRole" />
            </template>
        </Dialog>
    </div>
</template>
