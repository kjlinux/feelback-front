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
    loadGuarantees();
});

const loadGuarantees = async () => {
    try {
        const response = await apiClient.get('/settings/guarantees');
        guarantees.value = response.data.data || [];
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les garanties', life: 3000 });
        console.error('Erreur lors du chargement des garanties:', error);
    }
};

const goBack = () => {
    router.back();
};

const toast = useToast();
const dt = ref();
const guarantees = ref([]);
const trashedGuarantees = ref([]);
const guaranteeDialog = ref(false);
const deleteGuaranteeDialog = ref(false);
const deleteGuaranteesDialog = ref(false);
const showRestorationDialog = ref(false);
const guarantee = ref({});
const selectedGuarantees = ref();
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);

function openNew() {
    guarantee.value = {};
    submitted.value = false;
    guaranteeDialog.value = true;
}

function hideDialog() {
    guaranteeDialog.value = false;
    submitted.value = false;
}

async function saveGuarantee() {
    submitted.value = true;

    if (guarantee.value.name?.trim()) {
        try {
            if (guarantee.value.id) {
                const response = await apiClient.put(`/settings/guarantees/${guarantee.value.id}`, guarantee.value);
                const updatedGuarantee = response.data.data || response.data;

                const index = findIndexById(guarantee.value.id);
                if (index !== -1) {
                    guarantees.value[index] = { ...updatedGuarantee };
                    guarantees.value = [...guarantees.value];
                }
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Garantie mise à jour', life: 3000 });
            } else {
                const response = await apiClient.post('/settings/guarantees', guarantee.value);
                const newGuarantee = response.data.data || response.data;

                guarantees.value = [...guarantees.value, newGuarantee];
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Garantie créée', life: 3000 });
            }

            guaranteeDialog.value = false;
            guarantee.value = {};
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: 'Erreur',
                detail: error.response?.data?.message || "Une erreur est survenue lors de l'enregistrement",
                life: 3000
            });
            console.error("Erreur lors de l'enregistrement de la garantie:", error);
        }
    }
}

function editGuarantee(guar) {
    guarantee.value = JSON.parse(JSON.stringify(guar));
    guaranteeDialog.value = true;
}

function confirmDeleteGuarantee(guar) {
    guarantee.value = guar;
    deleteGuaranteeDialog.value = true;
}

async function deleteGuarantee() {
    try {
        await apiClient.delete(`/settings/guarantees/${guarantee.value.id}`);
        guarantees.value = guarantees.value.filter((val) => val.id !== guarantee.value.id);
        deleteGuaranteeDialog.value = false;
        guarantee.value = {};
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Garantie supprimée', life: 3000 });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || 'Une erreur est survenue lors de la suppression',
            life: 3000
        });
        console.error('Erreur lors de la suppression de la garantie:', error);
    }
}

async function restoreGuarantee(guaranteeId) {
    try {
        await apiClient.patch(`/settings/guarantees/restore/${guaranteeId}`);
        loadGuarantees();
        trashedGuarantees.value = trashedGuarantees.value.filter((guar) => guar.id !== guaranteeId);
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Garantie restaurée', life: 3000 });

        if (trashedGuarantees.value.length === 0) {
            showRestorationDialog.value = false;
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || 'Une erreur est survenue lors de la restauration',
            life: 3000
        });
        console.error('Erreur lors de la restauration de la garantie:', error);
    }
}

function findIndexById(id) {
    let index = -1;
    for (let i = 0; i < guarantees.value.length; i++) {
        if (guarantees.value[i].id === id) {
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
    deleteGuaranteesDialog.value = true;
}

async function deleteSelectedGuarantees() {
    try {
        for (const guarantee of selectedGuarantees.value) {
            await apiClient.delete(`/settings/guarantees/${guarantee.id}`);
        }

        guarantees.value = guarantees.value.filter((val) => !selectedGuarantees.value.includes(val));
        deleteGuaranteesDialog.value = false;
        selectedGuarantees.value = null;
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Garanties supprimées', life: 3000 });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Une erreur est survenue lors de la suppression des garanties sélectionnées',
            life: 3000
        });
        console.error('Erreur lors de la suppression des garanties:', error);
    }
}

async function showTrashedGuarantees() {
    try {
        const response = await apiClient.get('/settings/guarantees/trashed/get');
        trashedGuarantees.value = response.data.data || [];
        showRestorationDialog.value = true;
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les pays supprimés',
            life: 3000
        });
        console.error('Erreur lors du chargement des pays supprimés:', error);
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
                    <Button label="Supprimer" icon="pi pi-trash" severity="secondary" @click="confirmDeleteSelected" :disabled="!selectedGuarantees || !selectedGuarantees.length" />
                    <Button label="Corbeille" icon="pi pi-replay" severity="secondary" @click="showTrashedGuarantees" />
                </template>

                <template #end>
                    <Button label="Exporter" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" />
                </template>
            </Toolbar>

            <DataTable
                ref="dt"
                v-model:selection="selectedGuarantees"
                :value="guarantees"
                dataKey="id"
                :paginator="true"
                :rows="10"
                :filters="filters"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} garanties"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <h4 class="m-0">Gestion des Garanties</h4>
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
                <Column field="description" header="Description" sortable style="min-width: 20rem"></Column>
                <Column :exportable="false" style="min-width: 12rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editGuarantee(slotProps.data)" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteGuarantee(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog v-model:visible="guaranteeDialog" :style="{ width: '550px' }" header="Détails de la Garantie" :modal="true">
            <div class="flex flex-col gap-6">
                <div>
                    <label for="name" class="block font-bold mb-3">Nom</label>
                    <InputText id="name" v-model.trim="guarantee.name" required="true" autofocus :invalid="submitted && !guarantee.name" fluid />
                    <small v-if="submitted && !guarantee.name" class="text-red-500">Le nom est obligatoire.</small>
                </div>

                <div>
                    <label for="description" class="block font-bold mb-3">Description</label>
                    <Textarea id="description" v-model="guarantee.description" rows="3" cols="20" fluid />
                </div>
            </div>

            <template #footer>
                <Button label="Annuler" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Enregistrer" icon="pi pi-check" @click="saveGuarantee" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteGuaranteeDialog" :style="{ width: '450px' }" header="Confirmer" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="guarantee"
                    >Êtes-vous sûr de vouloir supprimer <b>{{ guarantee.name }}</b
                    >?</span
                >
            </div>
            <template #footer>
                <Button label="Non" icon="pi pi-times" text @click="deleteGuaranteeDialog = false" />
                <Button label="Oui" icon="pi pi-check" @click="deleteGuarantee" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteGuaranteesDialog" :style="{ width: '450px' }" header="Confirmer" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span>Êtes-vous sûr de vouloir supprimer les garanties sélectionnées?</span>
            </div>
            <template #footer>
                <Button label="Non" icon="pi pi-times" text @click="deleteGuaranteesDialog = false" />
                <Button label="Oui" icon="pi pi-check" text @click="deleteSelectedGuarantees" />
            </template>
        </Dialog>

        <Dialog v-model:visible="showRestorationDialog" :style="{ width: '550px' }" header="Restaurer des garanties" :modal="true">
            <div class="flex flex-col gap-4">
                <div v-if="trashedGuarantees.length === 0" class="text-center p-4">
                    <i class="pi pi-info-circle !text-3xl mb-3 block" />
                    <p>Aucune garantie à restaurer</p>
                </div>
                <DataTable v-else :value="trashedGuarantees" dataKey="id">
                    <Column field="name" header="Nom"></Column>
                    <Column field="description" header="Description"></Column>
                    <Column style="width: 6rem">
                        <template #body="slotProps">
                            <Button icon="pi pi-replay" outlined rounded @click="restoreGuarantee(slotProps.data.id)" />
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
