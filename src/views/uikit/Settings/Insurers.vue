<script setup>
import { apiClient } from '@/service/auth';
import { useInsurerStore } from '@/store/insurer';
import { storeToRefs } from 'pinia';
import { useToast } from 'primevue/usetoast';
import { onActivated, onMounted, ref } from 'vue';
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
const insurerStore = useInsurerStore();
const { insurers, trashedInsurers } = storeToRefs(insurerStore);

onMounted(() => {
    insurerStore.fetchInsurers();
});

onActivated(() => {
    loadInsurers();
});

const loadInsurers = async () => {
    try {
        const response = await apiClient.get('/settings/insurers');
        insurers.value = response.data.data || [];
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les assureurs', life: 3000 });
        console.error('Erreur lors du chargement des assureurs:', error);
    }
};

const goBack = () => {
    router.back();
};

const toast = useToast();
const dt = ref();
// const insurers = ref([]);
// const trashedInsurers = ref([]);
const insurerDialog = ref(false);
const deleteInsurerDialog = ref(false);
const deleteInsurersDialog = ref(false);
const showRestorationDialog = ref(false);
const insurer = ref({});
const selectedInsurers = ref();
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);

function openNew() {
    insurer.value = {};
    submitted.value = false;
    insurerDialog.value = true;
}

function hideDialog() {
    insurerDialog.value = false;
    submitted.value = false;
}

async function saveInsurer() {
    submitted.value = true;

    if (insurer.value.name?.trim()) {
        try {
            if (insurer.value.id) {
                await insurerStore.updateInsurer(insurer.value);
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Assureur mis à jour', life: 3000 });
            } else {
                await insurerStore.createInsurer(insurer.value);
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Assureur créé', life: 3000 });
            }

            insurerDialog.value = false;
            insurer.value = {};
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: 'Erreur',
                detail: error.response?.data?.message || "Une erreur est survenue lors de l'enregistrement",
                life: 3000
            });
            console.error("Erreur lors de l'enregistrement de l'assureur:", error);
        }
    }
}

function editInsurer(ins) {
    insurer.value = JSON.parse(JSON.stringify(ins));
    insurerDialog.value = true;
}

function confirmDeleteInsurer(ins) {
    insurer.value = ins;
    deleteInsurerDialog.value = true;
}

async function deleteInsurer() {
    try {
        await insurerStore.deleteInsurer(insurer.value.id);
        insurers.value = insurers.value.filter((val) => val.id !== insurer.value.id);
        deleteInsurerDialog.value = false;
        insurer.value = {};
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Assureur supprimé', life: 3000 });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || 'Une erreur est survenue lors de la suppression',
            life: 3000
        });
        console.error("Erreur lors de la suppression de l'assureur:", error);
    }
}

async function restoreInsurer(insurerId) {
    try {
        await apiClient.patch(`/settings/insurers/restore/${insurerId}`);

        loadInsurers();

        trashedInsurers.value = trashedInsurers.value.filter((ins) => ins.id !== insurerId);
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Assureur restauré', life: 3000 });

        if (trashedInsurers.value.length === 0) {
            showRestorationDialog.value = false;
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || 'Une erreur est survenue lors de la restauration',
            life: 3000
        });
        console.error("Erreur lors de la restauration de l'assureur:", error);
    }
}

function findIndexById(id) {
    let index = -1;
    for (let i = 0; i < insurers.value.length; i++) {
        if (insurers.value[i].id === id) {
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
    deleteInsurersDialog.value = true;
}

async function deleteSelectedInsurers() {
    try {
        for (const insurer of selectedInsurers.value) {
            await apiClient.delete(`/settings/insurers/${insurer.id}`);
        }

        insurers.value = insurers.value.filter((val) => !selectedInsurers.value.includes(val));
        deleteInsurersDialog.value = false;
        selectedInsurers.value = null;
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Assureurs supprimés', life: 3000 });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Une erreur est survenue lors de la suppression des assureurs sélectionnés',
            life: 3000
        });
        console.error('Erreur lors de la suppression des assureurs:', error);
    }
}

async function showTrashedInsurers() {
    try {
        await insurerStore.fetchTrashedInsurers();
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
                    <Button label="Supprimer" icon="pi pi-trash" severity="secondary" @click="confirmDeleteSelected" :disabled="!selectedInsurers || !selectedInsurers.length" />
                    <Button label="Corbeille" icon="pi pi-replay" severity="secondary" @click="showTrashedInsurers" />
                </template>

                <template #end>
                    <Button label="Exporter" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" />
                </template>
            </Toolbar>

            <DataTable
                ref="dt"
                v-if="!insurerStore.loading"
                v-model:selection="selectedInsurers"
                :value="insurerStore.insurers"
                dataKey="id"
                :paginator="true"
                :rows="10"
                :filters="filters"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} assureurs"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <h4 class="m-0">Gestion des Assureurs</h4>
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
                <Column field="acronym" header="Acronyme" sortable style="min-width: 8rem"></Column>
                <Column field="email" header="Email" sortable style="min-width: 16rem"></Column>
                <Column field="phone1" header="Téléphone 1" sortable style="min-width: 12rem"></Column>
                <Column field="phone2" header="Téléphone 2" sortable style="min-width: 12rem"></Column>
                <Column field="address" header="Adresse" sortable style="min-width: 20rem"></Column>
                <Column field="intermediateCode" header="Code Intermédiaire" sortable style="min-width: 12rem"></Column>
                <Column :exportable="false" style="min-width: 12rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editInsurer(slotProps.data)" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteInsurer(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog v-model:visible="insurerDialog" :style="{ width: '550px' }" header="Détails de l'Assureur" :modal="true">
            <div class="flex flex-col gap-6">
                <div>
                    <label for="name" class="block font-bold mb-3">Nom</label>
                    <InputText id="name" v-model.trim="insurer.name" required="true" autofocus :invalid="submitted && !insurer.name" fluid />
                    <small v-if="submitted && !insurer.name" class="text-red-500">Le nom est obligatoire.</small>
                </div>

                <div>
                    <label for="acronym" class="block font-bold mb-3">Acronyme</label>
                    <InputText id="acronym" v-model.trim="insurer.acronym" required="true" :invalid="submitted && !insurer.acronym" fluid />
                    <small v-if="submitted && !insurer.acronym" class="text-red-500">L'acronyme est obligatoire.</small>
                </div>

                <div>
                    <label for="email" class="block font-bold mb-3">Email</label>
                    <InputText id="email" v-model.trim="insurer.email" required="true" type="email" :invalid="submitted && !insurer.email" fluid />
                    <small v-if="submitted && !insurer.email" class="text-red-500">L'email est obligatoire.</small>
                </div>

                <div>
                    <label for="address" class="block font-bold mb-3">Adresse</label>
                    <Textarea id="address" v-model="insurer.address" required="true" rows="2" cols="20" :invalid="submitted && !insurer.address" fluid />
                    <small v-if="submitted && !insurer.address" class="text-red-500">L'adresse est obligatoire.</small>
                </div>

                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-6">
                        <label for="phone1" class="block font-bold mb-3">Téléphone 1</label>
                        <InputText id="phone1" v-model="insurer.phone1" required="true" :invalid="submitted && !insurer.phone1" fluid />
                        <small v-if="submitted && !insurer.phone1" class="text-red-500">Le téléphone 1 est obligatoire.</small>
                    </div>
                    <div class="col-span-6">
                        <label for="phone2" class="block font-bold mb-3">Téléphone 2</label>
                        <InputText id="phone2" v-model="insurer.phone2" fluid />
                    </div>
                </div>

                <div>
                    <label for="intermediateCode" class="block font-bold mb-3">Code Intermédiaire</label>
                    <InputText id="intermediateCode" v-model="insurer.intermediateCode" required="true" :invalid="submitted && !insurer.intermediateCode" fluid />
                    <small v-if="submitted && !insurer.intermediateCode" class="text-red-500">Le code intermédiaire est obligatoire.</small>
                </div>
            </div>

            <template #footer>
                <Button label="Annuler" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Enregistrer" icon="pi pi-check" @click="saveInsurer" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteInsurerDialog" :style="{ width: '450px' }" header="Confirmer" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="insurer"
                    >Êtes-vous sûr de vouloir supprimer <b>{{ insurer.name }}</b
                    >?</span
                >
            </div>
            <template #footer>
                <Button label="Non" icon="pi pi-times" text @click="deleteInsurerDialog = false" />
                <Button label="Oui" icon="pi pi-check" @click="deleteInsurer" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteInsurersDialog" :style="{ width: '450px' }" header="Confirmer" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span>Êtes-vous sûr de vouloir supprimer les assureurs sélectionnés?</span>
            </div>
            <template #footer>
                <Button label="Non" icon="pi pi-times" text @click="deleteInsurersDialog = false" />
                <Button label="Oui" icon="pi pi-check" text @click="deleteSelectedInsurers" />
            </template>
        </Dialog>

        <Dialog v-model:visible="showRestorationDialog" :style="{ width: '550px' }" header="Restaurer des assureurs" :modal="true">
            <div class="flex flex-col gap-4">
                <div v-if="trashedInsurers.length === 0" class="text-center p-4">
                    <i class="pi pi-info-circle !text-3xl mb-3 block" />
                    <p>Aucun assureur à restaurer</p>
                </div>
                <DataTable v-else :value="trashedInsurers" dataKey="id">
                    <Column field="name" header="Nom"></Column>
                    <Column field="acronym" header="Acronyme"></Column>
                    <Column field="email" header="Email"></Column>
                    <Column style="width: 6rem">
                        <template #body="slotProps">
                            <Button icon="pi pi-replay" outlined rounded @click="restoreInsurer(slotProps.data.id)" />
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
