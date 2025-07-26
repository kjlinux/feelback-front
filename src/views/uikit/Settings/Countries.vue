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
    loadCountries();
});

const loadCountries = async () => {
    try {
        const response = await apiClient.get('/settings/countries');
        countries.value = response.data.data || [];
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les pays', life: 3000 });
        console.error('Erreur lors du chargement des pays:', error);
    }
};

const goBack = () => {
    router.back();
};

const toast = useToast();
const dt = ref();
const countries = ref([]);
const trashedCountries = ref([]);
const countryDialog = ref(false);
const deleteCountryDialog = ref(false);
const deleteCountriesDialog = ref(false);
const showRestorationDialog = ref(false);
const country = ref({});
const selectedCountries = ref();
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);

function openNew() {
    country.value = {};
    submitted.value = false;
    countryDialog.value = true;
}

function hideDialog() {
    countryDialog.value = false;
    submitted.value = false;
}

async function saveCountry() {
    submitted.value = true;

    if (country.value.shortName?.trim() && country.value.longName?.trim() && country.value.iso2?.trim() && country.value.iso3?.trim()) {
        try {
            if (country.value.id) {
                const response = await apiClient.put(`/settings/countries/${country.value.id}`, country.value);

                const updatedCountry = response.data.data || response.data;

                const index = findIndexById(country.value.id);
                if (index !== -1) {
                    countries.value[index] = { ...updatedCountry };

                    countries.value = [...countries.value];
                }
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Pays mis à jour', life: 3000 });
            } else {
                const response = await apiClient.post('/settings/countries', country.value);

                const newCountry = response.data.data || response.data;

                countries.value = [...countries.value, newCountry];
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Pays créé', life: 3000 });
            }

            countryDialog.value = false;
            country.value = {};
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: 'Erreur',
                detail: error.response?.data?.message || "Une erreur est survenue lors de l'enregistrement",
                life: 3000
            });
            console.error("Erreur lors de l'enregistrement du pays:", error);
        }
    }
}

function editCountry(countryData) {
    country.value = JSON.parse(JSON.stringify(countryData));
    countryDialog.value = true;
}

function confirmDeleteCountry(countryData) {
    country.value = countryData;
    deleteCountryDialog.value = true;
}

async function deleteCountry() {
    try {
        await apiClient.delete(`/settings/countries/${country.value.id}`);
        countries.value = countries.value.filter((val) => val.id !== country.value.id);
        deleteCountryDialog.value = false;
        country.value = {};
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Pays supprimé', life: 3000 });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || 'Une erreur est survenue lors de la suppression',
            life: 3000
        });
        console.error('Erreur lors de la suppression du pays:', error);
    }
}

async function restoreCountry(countryId) {
    try {
        await apiClient.patch(`/settings/countries/restore/${countryId}`);

        loadCountries();

        trashedCountries.value = trashedCountries.value.filter((country) => country.id !== countryId);
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Pays restauré', life: 3000 });

        if (trashedCountries.value.length === 0) {
            showRestorationDialog.value = false;
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || 'Une erreur est survenue lors de la restauration',
            life: 3000
        });
        console.error('Erreur lors de la restauration du pays:', error);
    }
}

function findIndexById(id) {
    let index = -1;
    for (let i = 0; i < countries.value.length; i++) {
        if (countries.value[i].id === id) {
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
    deleteCountriesDialog.value = true;
}

async function deleteSelectedCountries() {
    try {
        for (const country of selectedCountries.value) {
            await apiClient.delete(`/settings/countries/${country.id}`);
        }

        countries.value = countries.value.filter((val) => !selectedCountries.value.includes(val));
        deleteCountriesDialog.value = false;
        selectedCountries.value = null;
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Pays supprimés', life: 3000 });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Une erreur est survenue lors de la suppression des pays sélectionnés',
            life: 3000
        });
        console.error('Erreur lors de la suppression des pays:', error);
    }
}

async function showTrashedCountries() {
    try {
        const response = await apiClient.get('/settings/countries/trashed/get');
        trashedCountries.value = response.data.data || [];
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
                    <Button label="Supprimer" icon="pi pi-trash" severity="secondary" class="mr-2" @click="confirmDeleteSelected" :disabled="!selectedCountries || !selectedCountries.length" />
                    <Button label="Corbeille" icon="pi pi-replay" severity="secondary" @click="showTrashedCountries" />
                </template>

                <template #end>
                    <Button label="Exporter" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" />
                </template>
            </Toolbar>

            <DataTable
                ref="dt"
                v-model:selection="selectedCountries"
                :value="countries"
                dataKey="id"
                :paginator="true"
                :rows="10"
                :filters="filters"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} pays"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <h4 class="m-0">Gestion des Pays</h4>
                        <IconField>
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Rechercher..." />
                        </IconField>
                    </div>
                </template>

                <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
                <Column field="shortName" header="Nom court" sortable style="min-width: 12rem"></Column>
                <Column field="longName" header="Nom complet" sortable style="min-width: 16rem"></Column>
                <Column field="iso2" header="ISO2" sortable style="min-width: 6rem"></Column>
                <Column field="iso3" header="ISO3" sortable style="min-width: 6rem"></Column>
                <Column field="codeNumber" header="Code Numérique" sortable style="min-width: 10rem"></Column>
                <Column field="indicative" header="Indicatif" sortable style="min-width: 8rem"></Column>
                <Column field="cctld" header="CCTLD" sortable style="min-width: 8rem"></Column>
                <Column :exportable="false" style="min-width: 12rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editCountry(slotProps.data)" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteCountry(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog v-model:visible="countryDialog" :style="{ width: '550px' }" header="Détails du Pays" :modal="true">
            <div class="flex flex-col gap-6">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-6">
                        <label for="shortName" class="block font-bold mb-3">Nom court</label>
                        <InputText id="shortName" v-model.trim="country.shortName" required="true" autofocus :invalid="submitted && !country.shortName" fluid />
                        <small v-if="submitted && !country.shortName" class="text-red-500">Le nom court est obligatoire.</small>
                    </div>
                    <div class="col-span-6">
                        <label for="longName" class="block font-bold mb-3">Nom complet</label>
                        <InputText id="longName" v-model.trim="country.longName" required="true" :invalid="submitted && !country.longName" fluid />
                        <small v-if="submitted && !country.longName" class="text-red-500">Le nom complet est obligatoire.</small>
                    </div>
                </div>

                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-6">
                        <label for="iso2" class="block font-bold mb-3">ISO2</label>
                        <InputText id="iso2" v-model.trim="country.iso2" required="true" :invalid="submitted && !country.iso2" maxlength="2" fluid />
                        <small v-if="submitted && !country.iso2" class="text-red-500">Le code ISO2 est obligatoire.</small>
                    </div>
                    <div class="col-span-6">
                        <label for="iso3" class="block font-bold mb-3">ISO3</label>
                        <InputText id="iso3" v-model.trim="country.iso3" required="true" :invalid="submitted && !country.iso3" maxlength="3" fluid />
                        <small v-if="submitted && !country.iso3" class="text-red-500">Le code ISO3 est obligatoire.</small>
                    </div>
                </div>

                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-6">
                        <label for="codeNumber" class="block font-bold mb-3">Code Numérique</label>
                        <InputText id="codeNumber" v-model.trim="country.codeNumber" required="true" :invalid="submitted && !country.codeNumber" fluid />
                        <small v-if="submitted && !country.codeNumber" class="text-red-500">Le code numérique est obligatoire.</small>
                    </div>
                    <div class="col-span-6">
                        <label for="indicative" class="block font-bold mb-3">Indicatif</label>
                        <InputText id="indicative" v-model.trim="country.indicative" required="true" :invalid="submitted && !country.indicative" fluid />
                        <small v-if="submitted && !country.indicative" class="text-red-500">L'indicatif est obligatoire.</small>
                    </div>
                </div>

                <div>
                    <label for="cctld" class="block font-bold mb-3">CCTLD</label>
                    <InputText id="cctld" v-model.trim="country.cctld" required="true" :invalid="submitted && !country.cctld" fluid />
                    <small v-if="submitted && !country.cctld" class="text-red-500">Le CCTLD est obligatoire.</small>
                </div>
            </div>

            <template #footer>
                <Button label="Annuler" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Enregistrer" icon="pi pi-check" @click="saveCountry" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteCountryDialog" :style="{ width: '450px' }" header="Confirmer" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="country"
                    >Êtes-vous sûr de vouloir supprimer <b>{{ country.longName }}</b
                    >?</span
                >
            </div>
            <template #footer>
                <Button label="Non" icon="pi pi-times" text @click="deleteCountryDialog = false" />
                <Button label="Oui" icon="pi pi-check" @click="deleteCountry" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteCountriesDialog" :style="{ width: '450px' }" header="Confirmer" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span>Êtes-vous sûr de vouloir supprimer les pays sélectionnés?</span>
            </div>
            <template #footer>
                <Button label="Non" icon="pi pi-times" text @click="deleteCountriesDialog = false" />
                <Button label="Oui" icon="pi pi-check" text @click="deleteSelectedCountries" />
            </template>
        </Dialog>

        <Dialog v-model:visible="showRestorationDialog" :style="{ width: '550px' }" header="Restaurer des pays" :modal="true">
            <div class="flex flex-col gap-4">
                <div v-if="trashedCountries.length === 0" class="text-center p-4">
                    <i class="pi pi-info-circle !text-3xl mb-3 block" />
                    <p>Aucun pays à restaurer</p>
                </div>
                <DataTable v-else :value="trashedCountries" dataKey="id">
                    <Column field="shortName" header="Nom court"></Column>
                    <Column field="longName" header="Nom complet"></Column>
                    <Column field="iso2" header="ISO2"></Column>
                    <Column field="iso3" header="ISO3"></Column>
                    <Column style="width: 6rem">
                        <template #body="slotProps">
                            <Button icon="pi pi-replay" outlined rounded @click="restoreCountry(slotProps.data.id)" />
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
