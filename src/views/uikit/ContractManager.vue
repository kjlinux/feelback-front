<script setup>
import { apiClient } from '@/service/auth';
import { useToast } from 'primevue/usetoast';
import { computed, onBeforeMount, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const contracts = ref([]);
const expandedRows = ref({});
const loading = ref(true);
const filters = ref(null);
const router = useRouter();
const toast = useToast();
const deleteContractDialog = ref(false);
const contractToDelete = ref(null);

const statusOptions = reactive(['Actif', 'À renouveler', 'Expiré']);

const periodicityOptions = reactive([
    { label: 'Mensuel', value: 'monthly' },
    { label: 'Trimestriel', value: 'quarterly' },
    { label: 'Semestriel', value: 'biannual' },
    { label: 'Annuel', value: 'annual' }
]);

const coverageOptions = reactive(['80', '90', '100']);

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

const FilterOperator = {
    AND: 'and',
    OR: 'or'
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR').format(date);
};

const formatCurrency = (value) => {
    if (value === null || value === undefined) return '';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
};

const translatePeriodicity = (periodicity) => {
    const translations = {
        monthly: 'Mensuel',
        quarterly: 'Trimestriel',
        biannual: 'Semestriel',
        annual: 'Annuel'
    };
    return translations[periodicity] || periodicity;
};

const getContractStatus = (contract) => {
    const today = new Date();
    const dueDate = new Date(contract.dueDate);

    if (dueDate < today) {
        return 'Expiré';
    } else {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        if (dueDate <= thirtyDaysFromNow) {
            return 'À renouveler';
        } else {
            return 'Actif';
        }
    }
};

const getContractStatusSeverity = (status) => {
    switch (status) {
        case 'Expiré':
            return 'danger';
        case 'À renouveler':
            return 'warning';
        case 'Actif':
            return 'success';
        default:
            return 'info';
    }
};

const expandAll = () => {
    const expandedRowsMap = {};
    contracts.value.forEach((contract) => {
        expandedRowsMap[contract.id] = true;
    });
    expandedRows.value = expandedRowsMap;
};

const collapseAll = () => {
    expandedRows.value = {};
};

const viewContractDetails = (contract) => {
    console.log('Voir les détails du contrat:', contract);
};

const initFilters = () => {
    filters.value = {
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        contractNumber: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        'insured.name': { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        'insured.surname': { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        effectDate: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.DATE_IS }] },
        dueDate: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.DATE_IS }] },
        periodicity: { value: null, matchMode: FilterMatchMode.EQUALS },
        coveragePercentage: { value: null, matchMode: FilterMatchMode.EQUALS },
        ttcPremium: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
        'product.name': { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        'country_expat.shortName': { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        status: { value: null, matchMode: FilterMatchMode.EQUALS }
    };
};

const clearFilter = () => {
    initFilters();
};

onBeforeMount(() => {
    loadContracts();
    initFilters();
});

const loadContracts = async () => {
    loading.value = true;
    try {
        const response = await apiClient.get('/app/contracts');

        if (response.data.status === 'success' && response.data.data) {
            contracts.value = response.data.data.map((contract) => {
                return {
                    ...contract,
                    status: getContractStatus(contract)
                };
            });
        } else {
            console.error('Erreur lors du chargement des contrats:', response.data.message || 'Aucune donnée retournée');
        }
    } catch (error) {
        console.error('Erreur lors du chargement des contrats:', error);
    } finally {
        loading.value = false;
    }
};

const calculateStatusTotal = (status) => {
    let total = 0;
    if (contracts.value) {
        for (let contract of contracts.value) {
            if (contract.status === status) {
                total++;
            }
        }
    }
    return total;
};

const totalContracts = computed(() => contracts.value.length);
const totalActive = computed(() => calculateStatusTotal('Actif'));
const totalToRenew = computed(() => calculateStatusTotal('À renouveler'));
const totalExpired = computed(() => calculateStatusTotal('Expiré'));

const formatGuarantees = (guarantees) => {
    if (!guarantees || guarantees.length === 0) return 'Aucune garantie';
    return guarantees.map((g) => g.name).join(', ');
};

const downloadDocument = (filePath) => {
    window.open(`/api/download/${encodeURIComponent(filePath)}`, '_blank');
};

const showAllContractInfo = (contract) => {
    if (contract && contract.id) {
        router.push({ name: 'contract-details', params: { id: contract.id } });
    } else {
        console.error('ID du contrat non disponible');

        toast.add({ severity: 'error', summary: 'Erreur', detail: "Impossible d'afficher les détails du contrat", life: 3000 });
    }
};

const editContract = (contract) => {
    if (contract && contract.id) {
        router.push({ name: 'contract-update', params: { id: contract.id } });
    } else {
        console.error('ID du contrat non disponible');

        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger le contrat', life: 3000 });
    }
};

const confirmDeleteContract = (contract) => {
    contractToDelete.value = contract;
    deleteContractDialog.value = true;
};

const deleteContract = async () => {
    try {
        loading.value = true;
        const response = await apiClient.delete(`/app/contracts/${contractToDelete.value.id}`);

        if (response.data.status === 'success') {
            contracts.value = contracts.value.filter((c) => c.id !== contractToDelete.value.id);

            deleteContractDialog.value = false;

            toast.add({
                severity: 'success',
                summary: 'Contrat supprimé',
                detail: `Le contrat ${contractToDelete.value.contractNumber} a été supprimé avec succès`,
                life: 3000
            });
        } else {
            throw new Error(response.data.message || 'Erreur lors de la suppression du contrat');
        }
    } catch (error) {
        console.error('Erreur lors de la suppression du contrat:', error);
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.message || 'Impossible de supprimer le contrat',
            life: 3000
        });
    } finally {
        loading.value = false;
        contractToDelete.value = null;
    }
};

const downloadSubmittedContract = (contract) => {
    if (contract && contract.media && contract.media.file) {
        const filePath = contract.media.file;
        const fileName = filePath.replace('contracts/media/', '');

        apiClient({
            url: `/app/contracts/download/${fileName}`,
            method: 'GET',
            responseType: 'blob'
        })
            .then((response) => {
                const fileURL = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));

                window.open(fileURL, '_blank');

                setTimeout(() => {
                    window.URL.revokeObjectURL(fileURL);
                }, 10000);
            })
            .catch((error) => {
                toast.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: "Erreur lors de l'affichage du fichier",
                    life: 3000
                });
                console.error("Erreur d'affichage:", error);
            });
    } else {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Aucun document disponible pour ce contrat',
            life: 3000
        });
    }
};
</script>

<template>
    <div class="card p-fluid">
        <!-- Résumé des stats -->
        <div class="grid grid-cols-12 gap-6 p-4">
            <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                <div class="card mb-0 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div class="p-4">
                        <div class="flex justify-between mb-4">
                            <div>
                                <span class="block text-muted-color font-medium mb-4">Total Contrats</span>
                                <div class="text-surface-900 dark:text-surface-0 font-medium text-2xl">{{ totalContracts }}</div>
                            </div>
                            <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-full p-2" style="width: 3rem; height: 3rem">
                                <i class="pi pi-file text-blue-500 !text-xl"></i>
                            </div>
                        </div>
                        <div class="border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
                            <span class="text-primary font-medium">Nouveaux contrats </span>
                            <span class="text-muted-color">depuis la dernière visite</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                <div class="card mb-0 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div class="p-4">
                        <div class="flex justify-between mb-4">
                            <div>
                                <span class="block text-muted-color font-medium mb-4">Contrats Actifs</span>
                                <div class="text-surface-900 dark:text-surface-0 font-medium text-2xl">{{ totalActive }}</div>
                            </div>
                            <div class="flex items-center justify-center bg-green-100 dark:bg-green-400/10 rounded-full p-2" style="width: 3rem; height: 3rem">
                                <i class="pi pi-check-circle text-green-500 !text-xl"></i>
                            </div>
                        </div>
                        <div class="border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
                            <span class="text-primary font-medium">En cours </span>
                            <span class="text-muted-color">actuellement actifs</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                <div class="card mb-0 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div class="p-4">
                        <div class="flex justify-between mb-4">
                            <div>
                                <span class="block text-muted-color font-medium mb-4">À Renouveler</span>
                                <div class="text-surface-900 dark:text-surface-0 font-medium text-2xl">{{ totalToRenew }}</div>
                            </div>
                            <div class="flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-full p-2" style="width: 3rem; height: 3rem">
                                <i class="pi pi-clock text-orange-500 !text-xl"></i>
                            </div>
                        </div>
                        <div class="border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
                            <span class="text-primary font-medium">Renouvellements </span>
                            <span class="text-muted-color">prochains à renouveler</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                <div class="card mb-0 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div class="p-4">
                        <div class="flex justify-between mb-4">
                            <div>
                                <span class="block text-muted-color font-medium mb-4">Expirés</span>
                                <div class="text-surface-900 dark:text-surface-0 font-medium text-2xl">{{ totalExpired }}</div>
                            </div>
                            <div class="flex items-center justify-center bg-red-100 dark:bg-red-400/10 rounded-full p-2" style="width: 3rem; height: 3rem">
                                <i class="pi pi-times-circle text-red-500 !text-xl"></i>
                            </div>
                        </div>
                        <div class="border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
                            <span class="text-primary font-medium">Contrats expirés </span>
                            <span class="text-muted-color">non renouvelés</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <DataTable
            :value="contracts"
            v-model:expandedRows="expandedRows"
            v-model:filters="filters"
            filterDisplay="menu"
            :loading="loading"
            dataKey="id"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[5, 10, 25, 50]"
            :globalFilterFields="['contractNumber', 'insured.name', 'insured.surname', 'product.name', 'country_expat.shortName', 'ttcPremium', 'periodicity']"
            tableStyle="min-width: 60rem"
            showGridlines
        >
            <template #header>
                <div class="flex flex-wrap justify-between gap-2">
                    <h2>Liste des contrats</h2>
                    <div class="flex gap-2">
                        <Button type="button" icon="pi pi-filter-slash" label="Réinitialiser filtres" outlined @click="clearFilter()" />
                        <Button text icon="pi pi-plus" label="Développer tout" @click="expandAll" />
                        <Button text icon="pi pi-minus" label="Réduire tout" @click="collapseAll" />
                    </div>
                </div>
                <div class="flex justify-between mt-4">
                    <span></span>
                    <!-- Élément vide pour maintenir l'alignement -->
                    <IconField>
                        <InputIcon>
                            <i class="pi pi-search" />
                        </InputIcon>
                        <InputText v-model="filters['global'].value" placeholder="Recherche globale" />
                    </IconField>
                </div>
            </template>

            <template #empty> Aucun contrat trouvé. </template>
            <template #loading> Chargement des contrats en cours. Veuillez patienter. </template>

            <Column expander style="width: 3rem" />

            <Column field="contractNumber" header="N° de contrat" sortable>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" placeholder="Rechercher par n°" />
                </template>
            </Column>

            <Column field="effectDate" header="Date d'effet" sortable>
                <template #body="slotProps">
                    {{ formatDate(slotProps.data.effectDate) }}
                </template>
                <template #filter="{ filterModel }">
                    <DatePicker v-model="filterModel.value" dateFormat="dd/mm/yy" placeholder="jj/mm/aaaa" />
                </template>
            </Column>

            <Column field="dueDate" header="Date d'échéance" sortable>
                <template #body="slotProps">
                    {{ formatDate(slotProps.data.dueDate) }}
                </template>
                <template #filter="{ filterModel }">
                    <DatePicker v-model="filterModel.value" dateFormat="dd/mm/yy" placeholder="jj/mm/aaaa" />
                </template>
            </Column>

            <Column field="periodicity" header="Périodicité" sortable>
                <template #body="slotProps">
                    {{ translatePeriodicity(slotProps.data.periodicity) }}
                </template>
                <template #filter="{ filterModel }">
                    <Select v-model="filterModel.value" :options="periodicityOptions" optionValue="value" optionLabel="label" placeholder="Sélectionner" showClear />
                </template>
            </Column>

            <Column field="coveragePercentage" header="Couverture" sortable>
                <template #body="slotProps"> {{ slotProps.data.coveragePercentage }}% </template>
                <template #filter="{ filterModel }">
                    <Select v-model="filterModel.value" :options="coverageOptions" placeholder="Sélectionner" showClear>
                        <template #option="slotProps"> {{ slotProps.option }}% </template>
                    </Select>
                </template>
            </Column>

            <Column field="ttcPremium" header="Prime TTC" sortable>
                <template #body="slotProps">
                    {{ formatCurrency(slotProps.data.ttcPremium) }}
                </template>
                <template #filter="{ filterModel }">
                    <InputNumber v-model="filterModel.value" mode="currency" currency="EUR" locale="fr-FR" />
                </template>
            </Column>

            <Column field="insured.name" header="Nom assuré" sortable>
                <template #body="slotProps"> {{ slotProps.data.insured.name }} </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" placeholder="Rechercher nom" />
                </template>
            </Column>

            <Column field="insured.surname" header="Prénom assuré" sortable>
                <template #body="slotProps"> {{ slotProps.data.insured.surname }} </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" placeholder="Rechercher prénom" />
                </template>
            </Column>

            <Column field="product.name" header="Produit" sortable>
                <template #body="slotProps">
                    {{ slotProps.data.product.name }}
                </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" placeholder="Rechercher produit" />
                </template>
            </Column>

            <Column field="country_expat.shortName" header="Pays d'expatriation" sortable>
                <template #body="slotProps"> {{ slotProps.data.country_expat.shortName }} - {{ slotProps.data.country_expat.longName }} </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" placeholder="Rechercher pays" />
                </template>
            </Column>

            <Column field="status" header="Statut" :filterMenuStyle="{ width: '14rem' }">
                <template #body="slotProps">
                    <Tag :value="slotProps.data.status" :severity="getContractStatusSeverity(slotProps.data.status)" />
                </template>
                <template #filter="{ filterModel }">
                    <Select v-model="filterModel.value" :options="statusOptions" placeholder="Sélectionner" showClear>
                        <template #option="slotProps">
                            <Tag :value="slotProps.option" :severity="getContractStatusSeverity(slotProps.option)" />
                        </template>
                    </Select>
                </template>
            </Column>

            <Column headerStyle="min-width:12rem">
                <template #header>
                    <div class="text-center">Actions</div>
                </template>
                <template #body="slotProps">
                    <div class="flex justify-center gap-2">
                        <Button icon="pi pi-pencil" class="p-button-rounded p-button-success p-button-sm hover:scale-110 transition-all duration-300" title="Modifier" @click="editContract(slotProps.data)" />
                        <Button icon="pi pi-list" class="p-button-rounded p-button-secondary p-button-sm hover:scale-110 transition-all duration-300" title="Toutes les informations" @click="showAllContractInfo(slotProps.data)" />
                        <Button icon="pi pi-trash" class="p-button-rounded p-button-danger p-button-sm hover:scale-110 transition-all duration-300" title="Supprimer" @click="confirmDeleteContract(slotProps.data)" />
                        <Button icon="pi pi-download" class="p-button-rounded p-button-info p-button-sm hover:scale-110 transition-all duration-300" title="Télécharger" @click="downloadSubmittedContract(slotProps.data)" />
                    </div>
                </template>
            </Column>

            <template #expansion="slotProps">
                <div class="p-5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <!-- En-tête de l'expansion -->
                    <div class="flex items-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                        <i class="pi pi-file-edit text-primary-500 mr-3" style="font-size: 1.5rem"></i>
                        <h4 class="text-xl font-bold text-gray-800 dark:text-white m-0">Détails du contrat {{ slotProps.data.contractNumber }}</h4>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Informations de l'assuré -->
                        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                            <div class="bg-gray-100 dark:bg-gray-700 px-4 py-3 flex items-center">
                                <i class="pi pi-user text-blue-500 mr-2"></i>
                                <h5 class="m-0 font-semibold">Informations de l'assuré</h5>
                            </div>
                            <div class="p-4 space-y-3">
                                <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                    <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Nom:</span>
                                    <span>{{ slotProps.data.insured.name }} {{ slotProps.data.insured.surname }}</span>
                                </div>
                                <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                    <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Date de naissance:</span>
                                    <span>{{ formatDate(slotProps.data.insured.birthdate) }}</span>
                                </div>
                                <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                    <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Téléphone:</span>
                                    <span>{{ slotProps.data.insured.phone }}</span>
                                </div>
                                <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                    <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Email:</span>
                                    <span>{{ slotProps.data.insured.email }}</span>
                                </div>
                                <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                    <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Pays d'origine:</span>
                                    <span>{{ slotProps.data.insured.country_origin.longName }}</span>
                                </div>
                                <div v-if="slotProps.data.insured.subscribers" class="flex flex-col sm:flex-row sm:items-center py-1">
                                    <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Souscripteur:</span>
                                    <span>{{ slotProps.data.insured.subscribers.name }} {{ slotProps.data.insured.subscribers.surname }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Détails financiers et garanties -->
                        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                            <div class="bg-gray-100 dark:bg-gray-700 px-4 py-3 flex items-center">
                                <i class="pi pi-wallet text-green-500 mr-2"></i>
                                <h5 class="m-0 font-semibold">Détails financiers et garanties</h5>
                            </div>
                            <div class="p-4">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                    <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                        <span class="font-medium text-gray-700 dark:text-gray-300 block mb-1">Prime nette:</span>
                                        <span class="text-lg">{{ formatCurrency(slotProps.data.netPremium) }}</span>
                                    </div>
                                    <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                        <span class="font-medium text-gray-700 dark:text-gray-300 block mb-1">Prime TTC:</span>
                                        <span class="text-lg">{{ formatCurrency(slotProps.data.ttcPremium) }}</span>
                                    </div>
                                    <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                        <span class="font-medium text-gray-700 dark:text-gray-300 block mb-1">Périodicité:</span>
                                        <span>{{ translatePeriodicity(slotProps.data.periodicity) }}</span>
                                    </div>
                                    <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                        <span class="font-medium text-gray-700 dark:text-gray-300 block mb-1">Couverture:</span>
                                        <span>{{ slotProps.data.coveragePercentage }}%</span>
                                    </div>
                                </div>

                                <div class="mt-4">
                                    <div class="font-medium text-gray-800 dark:text-white mb-3 flex items-center">
                                        <i class="pi pi-shield text-blue-500 mr-2"></i>
                                        Garanties
                                    </div>
                                    <div class="space-y-3">
                                        <div v-for="guarantee in slotProps.data.guarantees" :key="guarantee.id" class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border-l-3 border-blue-500">
                                            <div class="font-medium">{{ guarantee.name }}</div>
                                            <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">{{ guarantee.description }}</div>
                                        </div>
                                        <div v-if="!slotProps.data.guarantees || slotProps.data.guarantees.length === 0" class="text-center p-3 text-gray-500 italic">Aucune garantie spécifiée</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Bénéficiaires -->
                    <div class="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                        <div class="bg-gray-100 dark:bg-gray-700 px-4 py-3 flex items-center">
                            <i class="pi pi-users text-orange-500 mr-2"></i>
                            <h5 class="m-0 font-semibold">Bénéficiaires</h5>
                        </div>
                        <div class="p-4">
                            <DataTable
                                :value="slotProps.data.insured.beneficiaries"
                                v-if="slotProps.data.insured.beneficiaries && slotProps.data.insured.beneficiaries.length > 0"
                                class="p-datatable-sm"
                                stripedRows
                                responsiveLayout="scroll"
                                :rowHover="true"
                            >
                                <Column field="name" header="Prénom"></Column>
                                <Column field="surname" header="Nom"></Column>
                                <Column field="birthdate" header="Date de naissance">
                                    <template #body="beneficiary">
                                        {{ formatDate(beneficiary.data.birthdate) }}
                                    </template>
                                </Column>
                                <Column field="phone" header="Téléphone"></Column>
                                <Column field="email" header="Email"></Column>
                            </DataTable>
                            <div v-else class="flex flex-col items-center justify-center p-6 text-gray-500">
                                <i class="pi pi-users mb-2" style="font-size: 1.5rem"></i>
                                <span>Aucun bénéficiaire</span>
                            </div>
                        </div>
                    </div>

                    <!-- Document contractuel -->
                    <!-- <div class="mt-6" v-if="slotProps.data.media">
                        <div class="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            <i class="pi pi-file-pdf text-red-500 mr-3" style="font-size: 2rem"></i>
                            <div class="flex-grow">
                                <div class="font-medium text-gray-800 dark:text-white mb-1">Document contractuel</div>
                                <div class="text-sm text-gray-600 dark:text-gray-400">Contrat {{ slotProps.data.contractNumber }}</div>
                            </div>
                            <Button class="p-button-rounded p-button-primary" icon="pi pi-download" @click="downloadDocument(slotProps.data.media.file)" tooltip="Télécharger le document" tooltipPosition="top" />
                        </div>
                    </div> -->
                </div>
            </template>
        </DataTable>
    </div>
    <!-- Boîte de dialogue de confirmation pour la suppression -->
    <Dialog v-model:visible="deleteContractDialog" modal :closable="false" :style="{ width: '450px', borderRadius: '8px' }" class="delete-confirmation-dialog">
        <template #header>
            <div class="flex items-center">
                <i class="pi pi-exclamation-triangle text-yellow-500 mr-2"></i>
                <span class="text-xl font-semibold">Confirmation de suppression</span>
            </div>
        </template>

        <div class="flex flex-col items-center p-4 pt-2">
            <div class="bg-red-50 dark:bg-red-900/20 rounded-full p-5 mb-4">
                <i class="pi pi-trash text-red-500" style="font-size: 2.5rem"></i>
            </div>

            <h3 class="text-xl font-bold text-gray-800 dark:text-white mb-3">Confirmer la suppression</h3>

            <p v-if="contractToDelete" class="text-center text-gray-600 dark:text-gray-300 mb-2">
                Êtes-vous sûr de vouloir supprimer le contrat
                <span class="font-semibold text-gray-900 dark:text-white">
                    {{ contractToDelete.contractNumber }}
                </span>
                ?
            </p>

            <div class="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded text-sm text-yellow-800 dark:text-yellow-200">
                <i class="pi pi-info-circle mr-2"></i>
                Cette action est irréversible et supprimera définitivement toutes les données associées à ce contrat.
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button label="Annuler" icon="pi pi-times" class="p-button-text" @click="deleteContractDialog = false" />
                <Button label="Supprimer" icon="pi pi-trash" class="p-button-danger p-button-raised" @click="deleteContract" />
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
.border-l-3 {
    border-left-width: 3px;
}

/* Styles pour le DataTable */
:deep(.p-datatable .p-datatable-thead > tr > th) {
    background-color: #f8fafc;
    color: #475569;
    font-weight: 600;
    padding: 0.75rem 1rem;
}

:deep(.p-datatable .p-datatable-tbody > tr) {
    transition: background-color 0.2s;
}

:deep(.p-datatable .p-datatable-tbody > tr:nth-child(even)) {
    background-color: #f8fafc;
}

:deep(.p-datatable.p-datatable-hoverable-rows .p-datatable-tbody > tr:not(.p-highlight):hover) {
    background-color: #e2e8f0;
}

.dark :deep(.p-datatable .p-datatable-thead > tr > th) {
    background-color: #334155;
    color: #e2e8f0;
}

.dark :deep(.p-datatable .p-datatable-tbody > tr:nth-child(even)) {
    background-color: #1e293b;
}

.dark :deep(.p-datatable.p-datatable-hoverable-rows .p-datatable-tbody > tr:not(.p-highlight):hover) {
    background-color: #334155;
}

:deep(.p-dialog-header) {
    border-bottom: 1px solid #e2e8f0;
    padding: 1rem 1.5rem;
}

:deep(.p-dialog-content) {
    padding: 0;
}

:deep(.p-dialog-footer) {
    padding: 1rem 1.5rem;
    background-color: #f8fafc;
}

:deep(.p-dialog) {
    border-radius: 8px;
    overflow: hidden;
    box-shadow:
        0 10px 25px -5px rgba(0, 0, 0, 0.1),
        0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Support du mode sombre */
.dark :deep(.p-dialog-header) {
    background-color: #1e293b;
    border-bottom: 1px solid #334155;
}

.dark :deep(.p-dialog-content) {
    background-color: #1e293b;
}

.dark :deep(.p-dialog-footer) {
    background-color: #0f172a;
}

/* Animation pour l'icône */
@keyframes pulse {
    0%,
    100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.05);
    }
}

.pi-trash {
    animation: pulse 2s infinite;
}
</style>
