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
const toast = useToast();
const dt = ref();

const roles = ref([]);
const trashedRoles = ref([]);
const roleDialog = ref(false);
const deleteRoleDialog = ref(false);
const deleteRolesDialog = ref(false);
const showRestorationDialog = ref(false);
const permissionsDialog = ref(false);
const role = ref({});
const selectedRoles = ref();
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);

const permissions = ref([]);
const permissionTree = ref([]);
const selectedPermissions = ref({});
const loadingPermissions = ref(false);

onMounted(() => {
    loadRoles();
    loadAllPermissions();
});

const loadRoles = async () => {
    try {
        const response = await apiClient.get('/settings/roles');
        roles.value = response.data.data || [];
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les rôles', life: 3000 });
        console.error('Erreur lors du chargement des rôles:', error);
    }
};

const loadAllPermissions = async () => {
    try {
        const response = await apiClient.get('/settings/permissions');
        permissions.value = response.data.data || [];
        organizePermissionsIntoTree();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les permissions', life: 3000 });
        console.error('Erreur lors du chargement des permissions:', error);
    }
};

const organizePermissionsIntoTree = () => {
    const permissionsByCategory = {};

    permissions.value.forEach((permission) => {
        let category = '';

        if (permission.name.includes('contrat')) {
            category = 'Contrats';
        } else if (permission.name.includes('assureur')) {
            category = 'Assureurs';
        } else if (permission.name.includes('utilisateur')) {
            category = 'Utilisateurs';
        } else if (permission.name.includes('assur')) {
            category = 'Assurés';
        } else if (permission.name.includes('garantie')) {
            category = 'Garanties';
        } else if (permission.name.includes('commission')) {
            category = 'Commissions';
        } else if (permission.name.includes('produit')) {
            category = 'Produits';
        } else if (permission.name.includes('pays')) {
            category = 'Pays';
        } else if (permission.name.includes('paiement')) {
            category = 'Paiements';
        } else if (permission.name.includes('dashboard')) {
            category = 'Tableau de bord';
        } else {
            category = 'Autres';
        }

        if (!permissionsByCategory[category]) {
            permissionsByCategory[category] = [];
        }

        permissionsByCategory[category].push(permission);
    });

    const treeNodes = [];

    for (const category in permissionsByCategory) {
        const categoryNode = {
            key: `category-${category}`,
            label: category,
            data: category,
            selectable: true,
            children: permissionsByCategory[category].map((permission) => ({
                key: permission.id,
                label: permission.name,
                data: permission.id,
                leaf: true
            }))
        };

        treeNodes.push(categoryNode);
    }

    permissionTree.value = treeNodes;
};

const goBack = () => {
    router.back();
};

function openNew() {
    role.value = {};
    submitted.value = false;
    roleDialog.value = true;
}

function hideDialog() {
    roleDialog.value = false;
    submitted.value = false;
}

function hidePermissionsDialog() {
    permissionsDialog.value = false;
}

async function saveRole() {
    submitted.value = true;

    if (role.value.name?.trim() && role.value.code?.trim()) {
        try {
            if (role.value.id) {
                const response = await apiClient.put(`/settings/roles/${role.value.id}`, role.value);
                const updatedRole = response.data.data || response.data;

                const index = findIndexById(role.value.id);
                if (index !== -1) {
                    roles.value[index] = { ...updatedRole };
                    roles.value = [...roles.value];
                }
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Rôle mis à jour', life: 3000 });
            } else {
                const response = await apiClient.post('/settings/roles', role.value);
                const newRole = response.data.data || response.data;

                roles.value = [...roles.value, newRole];
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Rôle créé', life: 3000 });
            }

            roleDialog.value = false;
            role.value = {};
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: 'Erreur',
                detail: error.response?.data?.message || "Une erreur est survenue lors de l'enregistrement",
                life: 3000
            });
            console.error("Erreur lors de l'enregistrement du rôle:", error);
        }
    }
}

function editRole(roleData) {
    role.value = JSON.parse(JSON.stringify(roleData));
    roleDialog.value = true;
}

function confirmDeleteRole(roleData) {
    role.value = roleData;
    deleteRoleDialog.value = true;
}

async function deleteRole() {
    try {
        await apiClient.delete(`/settings/roles/${role.value.id}`);
        roles.value = roles.value.filter((val) => val.id !== role.value.id);
        deleteRoleDialog.value = false;
        role.value = {};
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Rôle supprimé', life: 3000 });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || 'Une erreur est survenue lors de la suppression',
            life: 3000
        });
        console.error('Erreur lors de la suppression du rôle:', error);
    }
}

async function restoreRole(roleId) {
    try {
        await apiClient.patch(`/settings/roles/restore/${roleId}`);
        loadRoles();
        trashedRoles.value = trashedRoles.value.filter((role) => role.id !== roleId);
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Rôle restauré', life: 3000 });

        if (trashedRoles.value.length === 0) {
            showRestorationDialog.value = false;
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || 'Une erreur est survenue lors de la restauration',
            life: 3000
        });
        console.error('Erreur lors de la restauration du rôle:', error);
    }
}

function findIndexById(id) {
    let index = -1;
    for (let i = 0; i < roles.value.length; i++) {
        if (roles.value[i].id === id) {
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
    deleteRolesDialog.value = true;
}

async function deleteSelectedRoles() {
    try {
        for (const role of selectedRoles.value) {
            await apiClient.delete(`/settings/roles/${role.id}`);
        }

        roles.value = roles.value.filter((val) => !selectedRoles.value.includes(val));
        deleteRolesDialog.value = false;
        selectedRoles.value = null;
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Rôles supprimés', life: 3000 });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Une erreur est survenue lors de la suppression des rôles sélectionnés',
            life: 3000
        });
        console.error('Erreur lors de la suppression des rôles:', error);
    }
}

async function showTrashedRoles() {
    try {
        const response = await apiClient.get('/settings/roles/trashed/get');
        trashedRoles.value = response.data.data || [];
        showRestorationDialog.value = true;
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les rôles supprimés',
            life: 3000
        });
        console.error('Erreur lors du chargement des rôles supprimés:', error);
    }
}

async function openPermissionsDialog(roleData) {
    role.value = JSON.parse(JSON.stringify(roleData));
    loadingPermissions.value = true;
    permissionsDialog.value = true;

    try {
        selectedPermissions.value = {};

        if (role.value.permissions?.length) {
            role.value.permissions.forEach((permission) => {
                selectedPermissions.value[permission.id] = { checked: true };
            });

            permissionTree.value.forEach((category) => {
                const allChildrenSelected = category.children.every((child) => role.value.permissions.some((p) => p.id === child.key));

                if (allChildrenSelected) {
                    selectedPermissions.value[category.key] = { checked: true };
                }
            });
        }

        loadingPermissions.value = false;
    } catch (error) {
        loadingPermissions.value = false;
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Erreur de chargement', life: 3000 });
        console.error('Erreur:', error);
    }
}

async function savePermissions() {
    try {
        const permissionIds = Object.keys(selectedPermissions.value).filter((id) => !id.startsWith('category-') && selectedPermissions.value[id] && selectedPermissions.value[id].checked);

        await apiClient.put(`/settings/roles/${role.value.id}`, {
            name: role.value.name,
            code: role.value.code,
            permissions: permissionIds
        });

        toast.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Permissions mises à jour',
            life: 3000
        });

        loadRoles();

        permissionsDialog.value = false;
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || 'Une erreur est survenue lors de la mise à jour des permissions',
            life: 3000
        });
        console.error('Erreur lors de la mise à jour des permissions:', error);
    }
}

function onNodeSelect(node) {
    if (node.key.startsWith('category-')) {
        if (node.children) {
            node.children.forEach((child) => {
                selectedPermissions.value[child.key] = { checked: true };
            });
        }
    } else {
        permissionTree.value.forEach((category) => {
            if (category.children.some((child) => child.key === node.key)) {
                const allChildrenSelected = category.children.every((child) => selectedPermissions.value[child.key] && selectedPermissions.value[child.key].checked);

                if (allChildrenSelected) {
                    selectedPermissions.value[category.key] = { checked: true };
                }
            }
        });
    }
}

function checkCategorySelectionState() {
    permissionTree.value.forEach((category) => {
        const categoryPermissionIds = category.children.map((child) => child.key);
        const selectedCount = categoryPermissionIds.filter((id) => selectedPermissions.value[id] && selectedPermissions.value[id].checked).length;

        if (selectedCount > 0 && selectedCount < categoryPermissionIds.length) {
        } else if (selectedCount === categoryPermissionIds.length && selectedCount > 0) {
            selectedPermissions.value[category.key] = { checked: true };
        }
    });
}

function onNodeUnselect(node) {
    if (node.key.startsWith('category-')) {
        if (node.children) {
            node.children.forEach((child) => {
                selectedPermissions.value[child.key] = { checked: false };
            });
        }
    } else {
        permissionTree.value.forEach((category) => {
            if (category.children.some((child) => child.key === node.key)) {
                selectedPermissions.value[category.key] = { checked: false };
            }
        });
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
                    <Button label="Nouveau" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                    <Button label="Supprimer" icon="pi pi-trash" severity="secondary" class="mr-2" @click="confirmDeleteSelected" :disabled="!selectedRoles || !selectedRoles.length" />
                    <Button label="Corbeille" icon="pi pi-replay" severity="secondary" @click="showTrashedRoles" />
                </template>

                <template #end>
                    <Button label="Exporter" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" />
                </template>
            </Toolbar>

            <DataTable
                ref="dt"
                v-model:selection="selectedRoles"
                :value="roles"
                dataKey="id"
                :paginator="true"
                :rows="10"
                :filters="filters"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} rôles"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <h4 class="m-0">Gestion des Rôles</h4>
                        <IconField>
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Rechercher..." />
                        </IconField>
                    </div>
                </template>

                <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
                <Column field="name" header="Nom" sortable style="min-width: 14rem"></Column>
                <Column field="code" header="Code" sortable style="min-width: 10rem"></Column>
                <Column field="permissions" header="Permissions" style="min-width: 16rem">
                    <template #body="slotProps">
                        <Chip v-for="(permission, index) in slotProps.data.permissions.slice(0, 3)" :key="index" :label="permission.name" class="mr-1 mb-1" />
                        <Chip v-if="slotProps.data.permissions.length > 3" :label="`+${slotProps.data.permissions.length - 3}`" class="mr-1 mb-1" />
                        <div v-if="slotProps.data.permissions.length === 0" class="text-gray-500">Aucune permission</div>
                    </template>
                </Column>
                <Column :exportable="false" style="min-width: 18rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editRole(slotProps.data)" />
                        <Button icon="pi pi-shield" outlined rounded class="mr-2" severity="info" @click="openPermissionsDialog(slotProps.data)" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteRole(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Role Dialog -->
        <Dialog v-model:visible="roleDialog" :style="{ width: '550px' }" header="Détails du Rôle" :modal="true">
            <div class="flex flex-col gap-6">
                <div>
                    <label for="name" class="block font-bold mb-3">Nom du rôle</label>
                    <InputText id="name" v-model.trim="role.name" required="true" autofocus :invalid="submitted && !role.name" fluid />
                    <small v-if="submitted && !role.name" class="text-red-500">Le nom du rôle est obligatoire.</small>
                </div>

                <div>
                    <label for="code" class="block font-bold mb-3">Code du rôle</label>
                    <InputText id="code" v-model.trim="role.code" required="true" :invalid="submitted && !role.code" fluid />
                    <small v-if="submitted && !role.code" class="text-red-500">Le code du rôle est obligatoire.</small>
                    <small class="text-gray-500">Le code doit être unique et servira d'identifiant.</small>
                </div>
            </div>

            <template #footer>
                <Button label="Annuler" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Enregistrer" icon="pi pi-check" @click="saveRole" />
            </template>
        </Dialog>

        <!-- Permissions Dialog -->
        <Dialog v-model:visible="permissionsDialog" :style="{ width: '750px' }" header="Gérer les Permissions" :modal="true">
            <div class="flex flex-col gap-4">
                <div v-if="loadingPermissions" class="flex justify-center p-4">
                    <ProgressSpinner />
                </div>
                <div v-else>
                    <h5 class="mb-3">Permissions pour le rôle: {{ role.name }}</h5>
                    <Tree
                        :value="permissionTree"
                        selectionMode="checkbox"
                        v-model:selectionKeys="selectedPermissions"
                        class="w-full mb-3"
                        :filter="true"
                        filterMode="lenient"
                        filterPlaceholder="Rechercher des permissions..."
                        @node-select="onNodeSelect"
                        @node-unselect="onNodeUnselect"
                    />
                </div>
            </div>

            <template #footer>
                <Button label="Annuler" icon="pi pi-times" text @click="hidePermissionsDialog" />
                <Button label="Enregistrer" icon="pi pi-check" @click="savePermissions" />
            </template>
        </Dialog>

        <!-- Delete Role Dialog -->
        <Dialog v-model:visible="deleteRoleDialog" :style="{ width: '450px' }" header="Confirmer" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="role">
                    Êtes-vous sûr de vouloir supprimer <b>{{ role.name }}</b
                    >?
                </span>
            </div>
            <template #footer>
                <Button label="Non" icon="pi pi-times" text @click="deleteRoleDialog = false" />
                <Button label="Oui" icon="pi pi-check" @click="deleteRole" />
            </template>
        </Dialog>

        <!-- Delete Selected Roles Dialog -->
        <Dialog v-model:visible="deleteRolesDialog" :style="{ width: '450px' }" header="Confirmer" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span>Êtes-vous sûr de vouloir supprimer les rôles sélectionnés?</span>
            </div>
            <template #footer>
                <Button label="Non" icon="pi pi-times" text @click="deleteRolesDialog = false" />
                <Button label="Oui" icon="pi pi-check" text @click="deleteSelectedRoles" />
            </template>
        </Dialog>

        <!-- Restore Roles Dialog -->
        <Dialog v-model:visible="showRestorationDialog" :style="{ width: '550px' }" header="Restaurer des rôles" :modal="true">
            <div class="flex flex-col gap-4">
                <div v-if="trashedRoles.length === 0" class="text-center p-4">
                    <i class="pi pi-info-circle !text-3xl mb-3 block" />
                    <p>Aucun rôle à restaurer</p>
                </div>
                <DataTable v-else :value="trashedRoles" dataKey="id">
                    <Column field="name" header="Nom"></Column>
                    <Column field="code" header="Code"></Column>
                    <Column style="width: 6rem">
                        <template #body="slotProps">
                            <Button icon="pi pi-replay" outlined rounded @click="restoreRole(slotProps.data.id)" />
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
