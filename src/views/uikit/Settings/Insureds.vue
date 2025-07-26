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

const { countries, loading: loadingCountries, fetchCountries } = useSettings();

const insureds = ref([]);
const trashedInsureds = ref([]);
const insuredDialog = ref(false);
const deleteInsuredDialog = ref(false);
const deleteInsuredsDialog = ref(false);
const showRestorationDialog = ref(false);
const insured = ref({});
const selectedInsureds = ref();
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);
const filteredCountries = ref([]);

onMounted(() => {
    loadInsureds();
    fetchCountries();
});

const loadInsureds = async () => {
    try {
        const response = await apiClient.get('/settings/insureds');
        insureds.value = response.data.data || [];
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les assurés', life: 3000 });
        console.error('Erreur lors du chargement des assurés:', error);
    }
};

const goBack = () => {
    router.back();
};

function openNew() {
    insured.value = {
        birthdate: null
    };
    submitted.value = false;
    insuredDialog.value = true;
}

function hideDialog() {
    insuredDialog.value = false;
    submitted.value = false;
}

async function saveInsured() {
    submitted.value = true;

    if (insured.value.name?.trim() && insured.value.surname?.trim() && insured.value.birthdate && insured.value.phone?.trim() && insured.value.id_countries_origin) {
        try {
            const formattedInsured = { ...insured.value };
            if (formattedInsured.birthdate) {
                const date = new Date(formattedInsured.birthdate);
                formattedInsured.birthdate = date.toISOString().split('T')[0];
            }

            if (formattedInsured.id) {
                const response = await apiClient.put(`/settings/insureds/${formattedInsured.id}`, formattedInsured);
                const updatedInsured = response.data.data || response.data;

                const index = findIndexById(formattedInsured.id);
                if (index !== -1) {
                    insureds.value[index] = { ...updatedInsured };
                    insureds.value = [...insureds.value];
                }
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Assuré mis à jour', life: 3000 });
            } else {
                const response = await apiClient.post('/settings/insureds', formattedInsured);
                const newInsured = response.data.data || response.data;

                insureds.value = [...insureds.value, newInsured];
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Assuré créé', life: 3000 });
            }

            insuredDialog.value = false;
            insured.value = {};
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: 'Erreur',
                detail: error.response?.data?.message || "Une erreur est survenue lors de l'enregistrement",
                life: 3000
            });
            console.error("Erreur lors de l'enregistrement de l'assuré:", error);
        }
    }
}

function editInsured(insuredData) {
    insured.value = JSON.parse(JSON.stringify(insuredData));

    if (insured.value.id_countries_origin && countries.value) {
        const selectedCountry = countries.value.find((country) => country.id === insured.value.id_countries_origin);
        if (selectedCountry) {
            insured.value.selectedCountry = selectedCountry;
        }
    }

    insuredDialog.value = true;
}

function confirmDeleteInsured(insuredData) {
    insured.value = insuredData;
    deleteInsuredDialog.value = true;
}

async function deleteInsured() {
    try {
        await apiClient.delete(`/settings/insureds/${insured.value.id}`);
        insureds.value = insureds.value.filter((val) => val.id !== insured.value.id);
        deleteInsuredDialog.value = false;
        insured.value = {};
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Assuré supprimé', life: 3000 });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || 'Une erreur est survenue lors de la suppression',
            life: 3000
        });
        console.error("Erreur lors de la suppression de l'assuré:", error);
    }
}

async function restoreInsured(insuredId) {
    try {
        await apiClient.patch(`/settings/insureds/restore/${insuredId}`);
        loadInsureds();
        trashedInsureds.value = trashedInsureds.value.filter((insured) => insured.id !== insuredId);
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Assuré restauré', life: 3000 });

        if (trashedInsureds.value.length === 0) {
            showRestorationDialog.value = false;
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || 'Une erreur est survenue lors de la restauration',
            life: 3000
        });
        console.error("Erreur lors de la restauration de l'assuré:", error);
    }
}

function findIndexById(id) {
    let index = -1;
    for (let i = 0; i < insureds.value.length; i++) {
        if (insureds.value[i].id === id) {
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
    deleteInsuredsDialog.value = true;
}

async function deleteSelectedInsureds() {
    try {
        for (const insured of selectedInsureds.value) {
            await apiClient.delete(`/settings/insureds/${insured.id}`);
        }

        insureds.value = insureds.value.filter((val) => !selectedInsureds.value.includes(val));
        deleteInsuredsDialog.value = false;
        selectedInsureds.value = null;
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Assurés supprimés', life: 3000 });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Une erreur est survenue lors de la suppression des assurés sélectionnés',
            life: 3000
        });
        console.error('Erreur lors de la suppression des assurés:', error);
    }
}

async function showTrashedInsureds() {
    try {
        const response = await apiClient.get('/settings/insureds/trashed/get');
        trashedInsureds.value = response.data.data || [];
        showRestorationDialog.value = true;
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les assurés supprimés',
            life: 3000
        });
        console.error('Erreur lors du chargement des assurés supprimés:', error);
    }
}

function searchCountriesByName(event) {
    setTimeout(() => {
        if (!event.query.trim().length) {
            filteredCountries.value = [...countries.value];
        } else {
            filteredCountries.value = countries.value.filter((country) => {
                return country.name.toLowerCase().includes(event.query.toLowerCase());
            });
        }
    }, 250);
}

function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR');
}

function findCountryName(id) {
    if (!countries.value) return 'Chargement...';
    const country = countries.value.find((c) => c.id === id);
    return country ? country.name : 'Non défini';
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
                    <Button label="Supprimer" icon="pi pi-trash" severity="secondary" class="mr-2" @click="confirmDeleteSelected" :disabled="!selectedInsureds || !selectedInsureds.length" />
                    <Button label="Corbeille" icon="pi pi-replay" severity="secondary" @click="showTrashedInsureds" />
                </template>

                <template #end>
                    <Button label="Exporter" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" />
                </template>
            </Toolbar>

            <DataTable
                ref="dt"
                v-model:selection="selectedInsureds"
                :value="insureds"
                dataKey="id"
                :paginator="true"
                :rows="10"
                :filters="filters"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} assurés"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <h4 class="m-0">Gestion des Assurés</h4>
                        <IconField>
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Rechercher..." />
                        </IconField>
                    </div>
                </template>

                <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
                <Column field="name" header="Nom" sortable style="min-width: 12rem"></Column>
                <Column field="surname" header="Prénom" sortable style="min-width: 12rem"></Column>
                <Column field="birthdate" header="Date de naissance" sortable style="min-width: 12rem">
                    <template #body="slotProps">
                        {{ formatDate(slotProps.data.birthdate) }}
                    </template>
                </Column>
                <Column field="phone" header="Téléphone" sortable style="min-width: 12rem"></Column>
                <Column field="email" header="Email" sortable style="min-width: 16rem"></Column>
                <Column field="id_countries_origin" header="Pays d'origine" sortable style="min-width: 14rem">
                    <template #body="slotProps">
                        {{ findCountryName(slotProps.data.id_countries_origin) }}
                    </template>
                </Column>
                <Column :exportable="false" style="min-width: 12rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editInsured(slotProps.data)" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteInsured(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog v-model:visible="insuredDialog" :style="{ width: '550px' }" header="Détails de l'Assuré" :modal="true">
            <div class="flex flex-col gap-6">
                <div>
                    <label for="name" class="block font-bold mb-3">Nom</label>
                    <InputText id="name" v-model.trim="insured.name" required="true" autofocus :invalid="submitted && !insured.name" fluid />
                    <small v-if="submitted && !insured.name" class="text-red-500">Le nom est obligatoire.</small>
                </div>

                <div>
                    <label for="surname" class="block font-bold mb-3">Prénom</label>
                    <InputText id="surname" v-model.trim="insured.surname" required="true" :invalid="submitted && !insured.surname" fluid />
                    <small v-if="submitted && !insured.surname" class="text-red-500">Le prénom est obligatoire.</small>
                </div>

                <div>
                    <label for="birthdate" class="block font-bold mb-3">Date de naissance</label>
                    <Calendar id="birthdate" v-model="insured.birthdate" required="true" :invalid="submitted && !insured.birthdate" dateFormat="dd/mm/yy" :showIcon="true" fluid />
                    <small v-if="submitted && !insured.birthdate" class="text-red-500">La date de naissance est obligatoire.</small>
                </div>

                <div>
                    <label for="phone" class="block font-bold mb-3">Téléphone</label>
                    <InputText id="phone" v-model.trim="insured.phone" required="true" :invalid="submitted && !insured.phone" fluid />
                    <small v-if="submitted && !insured.phone" class="text-red-500">Le téléphone est obligatoire.</small>
                </div>

                <div>
                    <label for="email" class="block font-bold mb-3">Email</label>
                    <InputText id="email" v-model.trim="insured.email" type="email" fluid />
                </div>

                <div>
                    <label for="country" class="block font-bold mb-3">Pays d'origine</label>
                    <AutoComplete
                        id="country"
                        v-model="insured.selectedCountry"
                        :suggestions="filteredCountries"
                        optionLabel="name"
                        dropdown
                        @complete="searchCountriesByName"
                        placeholder="Rechercher un pays"
                        @item-select="(e) => (insured.id_countries_origin = e.value.id)"
                        :invalid="submitted && !insured.id_countries_origin"
                        fluid
                    />
                    <small v-if="submitted && !insured.id_countries_origin" class="text-red-500">Le pays d'origine est obligatoire.</small>
                </div>
            </div>

            <template #footer>
                <Button label="Annuler" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Enregistrer" icon="pi pi-check" @click="saveInsured" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteInsuredDialog" :style="{ width: '450px' }" header="Confirmer" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="insured">
                    Êtes-vous sûr de vouloir supprimer <b>{{ insured.name }} {{ insured.surname }}</b
                    >?
                </span>
            </div>
            <template #footer>
                <Button label="Non" icon="pi pi-times" text @click="deleteInsuredDialog = false" />
                <Button label="Oui" icon="pi pi-check" @click="deleteInsured" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteInsuredsDialog" :style="{ width: '450px' }" header="Confirmer" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span>Êtes-vous sûr de vouloir supprimer les assurés sélectionnés?</span>
            </div>
            <template #footer>
                <Button label="Non" icon="pi pi-times" text @click="deleteInsuredsDialog = false" />
                <Button label="Oui" icon="pi pi-check" text @click="deleteSelectedInsureds" />
            </template>
        </Dialog>

        <Dialog v-model:visible="showRestorationDialog" :style="{ width: '550px' }" header="Restaurer des assurés" :modal="true">
            <div class="flex flex-col gap-4">
                <div v-if="trashedInsureds.length === 0" class="text-center p-4">
                    <i class="pi pi-info-circle !text-3xl mb-3 block" />
                    <p>Aucun assuré à restaurer</p>
                </div>
                <DataTable v-else :value="trashedInsureds" dataKey="id">
                    <Column field="name" header="Nom"></Column>
                    <Column field="surname" header="Prénom"></Column>
                    <Column field="birthdate" header="Date de naissance">
                        <template #body="slotProps">
                            {{ formatDate(slotProps.data.birthdate) }}
                        </template>
                    </Column>
                    <Column field="phone" header="Téléphone"></Column>
                    <Column field="id_countries_origin" header="Pays d'origine">
                        <template #body="slotProps">
                            {{ findCountryName(slotProps.data.id_countries_origin) }}
                        </template>
                    </Column>
                    <Column style="width: 6rem">
                        <template #body="slotProps">
                            <Button icon="pi pi-replay" outlined rounded @click="restoreInsured(slotProps.data.id)" />
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
