<script setup>
import { apiClient } from '@/service/auth';
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

onMounted(() => {
    loadPermissions();
});

const loadPermissions = async () => {
    try {
        const response = await apiClient.get('/settings/permissions');
        permissions.value = response.data.data || [];
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les permissions', life: 3000 });
        console.error('Erreur lors du chargement des permissions:', error);
    }
};

const goBack = () => {
    router.back();
};

const toast = useToast();
const dt = ref();
const permissions = ref([]);
const trashedPermissions = ref([]);
const permissionDialog = ref(false);
const deletePermissionDialog = ref(false);
const deletePermissionsDialog = ref(false);
const showRestorationDialog = ref(false);
const permission = ref({});
const selectedPermissions = ref();
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);

function openNew() {
    permission.value = {
        guard_name: 'web'
    };
    submitted.value = false;
    permissionDialog.value = true;
}

function hideDialog() {
    permissionDialog.value = false;
    submitted.value = false;
}

async function savePermission() {
    submitted.value = true;

    if (permission.value.name?.trim() && permission.value.code?.trim()) {
        try {
            if (permission.value.id) {
                const response = await apiClient.put(`/settings/permissions/${permission.value.id}`, permission.value);
                const updatedPermission = response.data.data || response.data;

                const index = findIndexById(permission.value.id);
                if (index !== -1) {
                    permissions.value[index] = { ...updatedPermission };
                    permissions.value = [...permissions.value];
                }
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Permission mise à jour', life: 3000 });
            } else {
                const response = await apiClient.post('/settings/permissions', permission.value);
                const newPermission = response.data.data || response.data;

                permissions.value = [...permissions.value, newPermission];
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Permission créée', life: 3000 });
            }

            permissionDialog.value = false;
            permission.value = { guard_name: 'web' };
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: 'Erreur',
                detail: error.response?.data?.message || "Une erreur est survenue lors de l'enregistrement",
                life: 3000
            });
            console.error("Erreur lors de l'enregistrement de la permission:", error);
        }
    }
}

function editPermission(perm) {
    permission.value = JSON.parse(JSON.stringify(perm));
    permissionDialog.value = true;
}

function confirmDeletePermission(perm) {
    permission.value = perm;
    deletePermissionDialog.value = true;
}

async function deletePermission() {
    try {
        await apiClient.delete(`/settings/permissions/${permission.value.id}`);
        permissions.value = permissions.value.filter((val) => val.id !== permission.value.id);
        deletePermissionDialog.value = false;
        permission.value = { guard_name: 'web' };
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Permission supprimée', life: 3000 });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || 'Une erreur est survenue lors de la suppression',
            life: 3000
        });
        console.error('Erreur lors de la suppression de la permission:', error);
    }
}

async function restorePermission(permissionId) {
    try {
        await apiClient.patch(`/settings/permissions/restore/${permissionId}`);
        loadPermissions();
        trashedPermissions.value = trashedPermissions.value.filter((perm) => perm.id !== permissionId);
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Permission restaurée', life: 3000 });

        if (trashedPermissions.value.length === 0) {
            showRestorationDialog.value = false;
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || 'Une erreur est survenue lors de la restauration',
            life: 3000
        });
        console.error('Erreur lors de la restauration de la permission:', error);
    }
}

function findIndexById(id) {
    let index = -1;
    for (let i = 0; i < permissions.value.length; i++) {
        if (permissions.value[i].id === id) {
            index = i;
            break;
        }
    }
    return index;
}

function exportCSV() {
    dt.value.exportCSV();
}

function confirmDeleteSelected() {
    deletePermissionsDialog.value = true;
}

async function deleteSelectedPermissions() {
    try {
        for (const permission of selectedPermissions.value) {
            await apiClient.delete(`/settings/permissions/${permission.id}`);
        }

        permissions.value = permissions.value.filter((val) => !selectedPermissions.value.includes(val));
        deletePermissionsDialog.value = false;
        selectedPermissions.value = null;
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Permissions supprimées', life: 3000 });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Une erreur est survenue lors de la suppression des permissions sélectionnées',
            life: 3000
        });
        console.error('Erreur lors de la suppression des permissions:', error);
    }
}

async function showTrashedPermissions() {
    try {
        const response = await apiClient.get('/settings/permissions/trashed/get');
        trashedPermissions.value = response.data.data || [];
        showRestorationDialog.value = true;
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les permissions supprimées',
            life: 3000
        });
        console.error('Erreur lors du chargement des permissions supprimées:', error);
    }
}
</script>

<template>
    <div>
        <div class="card">
            <div class="p-3 border-gray-200 dark:border-gray-700">
                <div class="flex sm:flex-row justify-between">
                    <Button icon="pi pi-arrow-left" label="Retour aux paramètres" class="p-button-secondary p-button-sm" @click="goBack" />
                </div>
            </div>
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="Nouvelle" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                    <Button label="Supprimer" icon="pi pi-trash" severity="secondary" @click="confirmDeleteSelected" :disabled="!selectedPermissions || !selectedPermissions.length" />
                    <Button label="Corbeille" icon="pi pi-replay" severity="secondary" @click="showTrashedPermissions" />
                </template>

                <template #end>
                    <Button label="Exporter" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" />
                </template>
            </Toolbar>

            <DataTable
                ref="dt"
                v-model:selection="selectedPermissions"
                :value="permissions"
                dataKey="id"
                :paginator="true"
                :rows="10"
                :filters="filters"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} permissions"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <h4 class="m-0">Gestion des Permissions</h4>
                        <IconField>
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Rechercher..." />
                        </IconField>
                    </div>
                </template>

                <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
                <Column field="name" header="Nom" sortable style="min-width: 16rem"></Column>
                <Column field="code" header="Code" sortable style="min-width: 16rem"></Column>
                <Column field="guard_name" header="Guard" sortable style="min-width: 8rem"></Column>
                <Column field="created_at" header="Date de création" sortable style="min-width: 12rem">
                    <template #body="slotProps">
                        {{ new Date(slotProps.data.created_at).toLocaleDateString() }}
                    </template>
                </Column>
                <Column :exportable="false" style="min-width: 12rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editPermission(slotProps.data)" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeletePermission(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog v-model:visible="permissionDialog" :style="{ width: '550px' }" header="Détails de la Permission" :modal="true">
            <div class="flex flex-col gap-6">
                <div>
                    <label for="name" class="block font-bold mb-3">Nom</label>
                    <InputText id="name" v-model.trim="permission.name" required="true" autofocus :invalid="submitted && !permission.name" fluid />
                    <small v-if="submitted && !permission.name" class="text-red-500">Le nom est obligatoire.</small>
                </div>

                <div>
                    <label for="code" class="block font-bold mb-3">Code</label>
                    <InputText id="code" v-model.trim="permission.code" required="true" :invalid="submitted && !permission.code" fluid />
                    <small v-if="submitted && !permission.code" class="text-red-500">Le code est obligatoire.</small>
                    <small class="text-gray-500">Le code doit être unique et servira d'identifiant.</small>
                </div>

                <div>
                    <label for="guard_name" class="block font-bold mb-3">Nom du garde</label>
                    <Dropdown id="guard_name" v-model="permission.guard_name" :options="['api', 'web']" placeholder="Sélectionnez un guard" :invalid="submitted && !permission.guard_name" fluid />
                    <small v-if="submitted && !permission.guard_name" class="text-red-500">Le guard name est obligatoire.</small>
                </div>
            </div>

            <template #footer>
                <Button label="Annuler" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Enregistrer" icon="pi pi-check" @click="savePermission" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deletePermissionDialog" :style="{ width: '450px' }" header="Confirmer" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="permission"
                    >Êtes-vous sûr de vouloir supprimer <b>{{ permission.name }}</b
                    >?</span
                >
            </div>
            <template #footer>
                <Button label="Non" icon="pi pi-times" text @click="deletePermissionDialog = false" />
                <Button label="Oui" icon="pi pi-check" @click="deletePermission" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deletePermissionsDialog" :style="{ width: '450px' }" header="Confirmer" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span>Êtes-vous sûr de vouloir supprimer les permissions sélectionnées?</span>
            </div>
            <template #footer>
                <Button label="Non" icon="pi pi-times" text @click="deletePermissionsDialog = false" />
                <Button label="Oui" icon="pi pi-check" text @click="deleteSelectedPermissions" />
            </template>
        </Dialog>

        <Dialog v-model:visible="showRestorationDialog" :style="{ width: '550px' }" header="Restaurer des permissions" :modal="true">
            <div class="flex flex-col gap-4">
                <div v-if="trashedPermissions.length === 0" class="text-center p-4">
                    <i class="pi pi-info-circle !text-3xl mb-3 block" />
                    <p>Aucune permission à restaurer</p>
                </div>
                <DataTable v-else :value="trashedPermissions" dataKey="id">
                    <Column field="name" header="Nom"></Column>
                    <Column field="code" header="Code"></Column>
                    <Column field="guard_name" header="Guard"></Column>
                    <Column style="width: 6rem">
                        <template #body="slotProps">
                            <Button icon="pi pi-replay" outlined rounded @click="restorePermission(slotProps.data.id)" />
                        </template>
                    </Column>
                </DataTable>
            </div>
            <template #footer>
                <Button label="Fermer" icon="pi pi-times" text @click="showRestorationDialog = false" />
            </template>
        </Dialog>
    </div>
</template>
