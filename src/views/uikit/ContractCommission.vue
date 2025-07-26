<script setup>
import { apiClient } from '@/service/auth';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { onBeforeMount, onMounted, ref, watch } from 'vue';

const contracts = ref([]);
const loading = ref(true);
const expandedRows = ref({});
const filters = ref(null);
const toast = useToast();
const confirm = useConfirm();
const selectedContracts = ref([]);
const selectAll = ref(false);
const deleteMultipleDialog = ref(false);
const contractsToDelete = ref([]);

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

watch(selectedContracts, (newVal) => {
    selectAll.value = newVal.length === contracts.value.length;
});

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
        'product.insurer.name': { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        commissionStatus: { value: null, matchMode: FilterMatchMode.EQUALS }
    };
};

const commissionStatusOptions = ref(['Payée', 'Non payée', 'En attente']);

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR').format(date);
};

const formatCurrency = (value) => {
    if (value === undefined || value === null) return '';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
};

const getCommissionStatus = (contract) => {
    if (!contract.commissions || contract.commissions.length === 0) {
        return 'Non payée';
    }

    const hasPayment = contract.commissions.some((comm) => comm.paymentDate !== null);

    if (hasPayment) {
        return 'Payée';
    } else {
        return 'En attente';
    }
};

const getCommissionStatusSeverity = (status) => {
    switch (status) {
        case 'Payée':
            return 'success';
        case 'En attente':
            return 'warning';
        case 'Non payée':
            return 'danger';
        default:
            return null;
    }
};

const hasCommission = (contract) => {
    return contract.commissions && contract.commissions.length > 0;
};

const getPayedCommission = (contract) => {
    if (!contract.commissions || contract.commissions.length === 0) {
        return null;
    }

    const payedCommission = contract.commissions.find((comm) => comm.paymentDate !== null);
    return payedCommission ? payedCommission.payedCommission : null;
};

const getCommissionPaymentDate = (contract) => {
    if (!contract.commissions || contract.commissions.length === 0) {
        return null;
    }

    const payedCommission = contract.commissions.find((comm) => comm.paymentDate !== null);
    return payedCommission ? payedCommission.paymentDate : null;
};

const getCommissionPremium = (contract) => {
    if (!contract.commissions || contract.commissions.length === 0) {
        return null;
    }

    return contract.commissions[0].commissionPremium;
};

const refreshData = async () => {
    try {
        loading.value = true;
        const response = await apiClient.get('app/contracts/commissions/get');
        if (response.data) {
            contracts.value = response.data.data;
        }
    } catch (error) {
        console.error('Erreur lors du rafraîchissement des données:', error);
    } finally {
        loading.value = false;
    }
};

const addCommission = (contract) => {
    dialog.value = {
        visible: true,
        isEditing: false,
        contract: contract,
        form: {
            commissionPremium: null,
            payedCommission: null,
            paymentDate: null
        },
        calculatedValues: {
            commissionToReceive: calculateCommissionToReceive(contract),
            adjustedCommission: null,
            balance: null
        }
    };

    updateCalculatedValues();
};

const calculateCommissionToReceive = (contract) => {
    if (!contract || !contract.netPremium || !contract.product || !contract.product.commissionRate) {
        return 0;
    }
    return contract.netPremium * (contract.product.commissionRate / 100);
};

const calculateAdjustedCommission = () => {
    if (!dialog.value.form.commissionPremium || !dialog.value.contract.product.commissionRate) {
        return 0;
    }
    return dialog.value.form.commissionPremium * (dialog.value.contract.product.commissionRate / 100);
};

const updateCalculatedValues = () => {
    dialog.value.calculatedValues.adjustedCommission = calculateAdjustedCommission();
    dialog.value.calculatedValues.balance = dialog.value.calculatedValues.commissionToReceive - dialog.value.form.payedCommission;
};

const dialog = ref({
    visible: false,
    isEditing: false,
    contract: null,
    form: {
        commissionPremium: null,
        payedCommission: null,
        paymentDate: null
    },
    calculatedValues: {
        commissionToReceive: 0,
        adjustedCommission: 0,
        balance: 0
    }
});

const submitCommissionForm = async () => {
    try {
        const formatDate = (date) => {
            if (!date) return null;

            if (typeof date === 'string') return date;

            const d = new Date(date);
            return d instanceof Date && !isNaN(d) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null;
        };

        if (!dialog.value.form.commissionPremium) {
            toast.add({ severity: 'error', summary: 'Erreur', detail: 'La prime de commissionnement est requise', life: 3000 });
            return;
        }

        const commissionData = {
            commissionPremium: dialog.value.form.commissionPremium,
            payedCommission: dialog.value.form.payedCommission,
            paymentDate: formatDate(dialog.value.form.paymentDate),
            id_contracts: dialog.value.contract.id
        };

        let response;
        const isEditing = dialog.value.isEditing;

        if (isEditing) {
            response = await apiClient.put(`app/commissions/${dialog.value.commissionId}`, commissionData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.status >= 200 && response.status < 300 && response.data?.status === 'success') {
                toast.add({
                    severity: 'success',
                    summary: 'Succès',
                    detail: response.data?.message || 'Commission mise à jour avec succès',
                    life: 3000
                });
                dialog.value.visible = false;

                await refreshData();
            } else {
                toast.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: response.data?.message || 'Erreur lors de la mise à jour de la commission',
                    life: 3000
                });
            }
        } else {
            response = await apiClient.post('app/commissions', commissionData);

            if (response.status >= 200 && response.status < 300 && response.data?.status === 'success') {
                toast.add({
                    severity: 'success',
                    summary: 'Succès',
                    detail: response.data?.message || 'Commission ajoutée avec succès',
                    life: 3000
                });
                dialog.value.visible = false;

                await refreshData();
            } else {
                toast.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: response.data?.message || "Erreur lors de l'ajout de la commission",
                    life: 3000
                });
            }
        }
    } catch (error) {
        console.error(`Erreur lors de ${dialog.value.isEditing ? 'la mise à jour' : "l'ajout"} de la commission:`, error);

        const errorMessage = error.response?.data?.message || error.response?.statusText || error.message || `Erreur lors de ${dialog.value.isEditing ? 'la mise à jour' : "l'ajout"} de la commission`;

        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: errorMessage,
            life: 3000
        });
    }
};

const cancelDialog = () => {
    dialog.value.visible = false;
};

const editCommission = (contract) => {
    if (!contract.commissions || contract.commissions.length === 0) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Aucune commission à éditer', life: 3000 });
        return;
    }

    const commission = contract.commissions[0];

    dialog.value = {
        visible: true,
        contract: contract,
        isEditing: true,
        commissionId: commission.id,
        form: {
            commissionPremium: commission.commissionPremium,
            payedCommission: commission.payedCommission,
            paymentDate: commission.paymentDate ? new Date(commission.paymentDate) : null
        },
        calculatedValues: {
            commissionToReceive: calculateCommissionToReceive(contract),
            adjustedCommission: null,
            balance: null
        }
    };

    updateCalculatedValues();
};

const deleteCommission = async (contract) => {
    try {
        if (!contract.commissions || contract.commissions.length === 0) {
            toast.add({
                severity: 'error',
                summary: 'Erreur',
                detail: 'Aucune commission à supprimer',
                life: 3000
            });
            return;
        }

        const commissionId = contract.commissions[0].id;

        const response = await apiClient.delete(`app/commissions/${commissionId}`);

        if (response.status >= 200 && response.status < 300 && response.data?.status === 'success') {
            toast.add({
                severity: 'success',
                summary: 'Succès',
                detail: response.data?.message || 'Commission supprimée avec succès',
                life: 3000
            });

            await refreshData();
        } else {
            toast.add({
                severity: 'error',
                summary: 'Erreur',
                detail: response.data?.message || 'Erreur lors de la suppression de la commission',
                life: 3000
            });
        }
    } catch (error) {
        console.error('Erreur lors de la suppression de la commission:', error);

        const errorMessage = error.response?.data?.message || error.response?.statusText || error.message || 'Erreur lors de la suppression de la commission';

        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: errorMessage,
            life: 3000
        });
    }
};

const deleteCommissionDialog = ref(false);
const commissionToDelete = ref(null);

const confirmDeleteCommission = (contract) => {
    commissionToDelete.value = contract;
    deleteCommissionDialog.value = true;
};

const confirmDeleteCommissionAction = () => {
    if (commissionToDelete.value) {
        deleteCommission(commissionToDelete.value);
        deleteCommissionDialog.value = false;
    }
};

const clearFilter = () => {
    initFilters();
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

onBeforeMount(() => {
    initFilters();
});

onMounted(async () => {
    try {
        loading.value = true;

        const response = await apiClient.get('app/contracts/commissions/get');

        if (response.data) {
            contracts.value = response.data.data;
        } else {
            console.error("Réponse de l'API sans données");
            contracts.value = [];
        }
    } catch (error) {
        console.error('Erreur lors du chargement des contrats et commissions:', error);
        contracts.value = [];
    } finally {
        loading.value = false;
    }
});

const multiAddDialog = ref({
    visible: false,
    currentIndex: 0,
    selectedContracts: [],
    commissions: []
});

const openAddCommissionsDialog = () => {
    const selected = selectedContracts.value;
    const validContracts = selected.filter((contract) => !hasCommission(contract));

    if (validContracts.length === 0) {
        toast.add({
            severity: 'warn',
            summary: 'Aucun contrat valide',
            detail: 'Les contrats sélectionnés ont déjà des commissions ou aucun sélectionné',
            life: 5000
        });
        return;
    }

    if (validContracts.length < selected.length) {
        toast.add({
            severity: 'warn',
            summary: 'Certains contrats ignorés',
            detail: `${selected.length - validContracts.length} contrat(s) avec commission existante ignorés`,
            life: 5000
        });
    }

    multiAddDialog.value = {
        visible: true,
        currentIndex: 0,
        selectedContracts: validContracts,
        commissions: validContracts.map(() => ({
            commissionPremium: null,
            payedCommission: null,
            paymentDate: null
        }))
    };
};

const cancelMultiAdd = () => {
    multiAddDialog.value.visible = false;
};

const previousContract = () => {
    if (multiAddDialog.value.currentIndex > 0) {
        multiAddDialog.value.currentIndex--;
    }
};

const nextContract = () => {
    if (multiAddDialog.value.currentIndex < multiAddDialog.value.selectedContracts.length - 1) {
        multiAddDialog.value.currentIndex++;
    }
};

const isCurrentFormValid = () => {
    const current = multiAddDialog.value.commissions[multiAddDialog.value.currentIndex];
    return current.commissionPremium !== null && current.payedCommission !== null && current.paymentDate !== null;
};

const allFormsValid = () => {
    return multiAddDialog.value.commissions.every((comm) => comm.commissionPremium !== null && comm.payedCommission !== null && comm.paymentDate !== null);
};

const submitAllCommissions = async () => {
    try {
        const commissionsToSubmit = multiAddDialog.value.commissions.map((comm, index) => {
            const contract = multiAddDialog.value.selectedContracts[index];
            return {
                commissionPremium: comm.commissionPremium,
                payedCommission: comm.payedCommission,
                paymentDate: comm.paymentDate ? formatDateForAPI(comm.paymentDate) : null,
                id_contracts: contract.id
            };
        });

        for (const commissionData of commissionsToSubmit) {
            await apiClient.post('app/commissions', commissionData);
        }

        toast.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Toutes les commissions ont été ajoutées',
            life: 5000
        });

        multiAddDialog.value.visible = false;
        await refreshData();
    } catch (error) {
        console.error("Erreur lors de l'enregistrement:", error);
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: "Une erreur est survenue lors de l'enregistrement",
            life: 5000
        });
    }
};

const formatDateForAPI = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().split('T')[0];
};

const calculateMultiCommissionToReceive = (index) => {
    const contract = multiAddDialog.value.selectedContracts[index];
    return contract.netPremium * (contract.product.commissionRate / 100);
};

const calculateMultiAdjustedCommission = (index) => {
    const commissionPremium = multiAddDialog.value.commissions[index]?.commissionPremium;
    const contract = multiAddDialog.value.selectedContracts[index];
    return commissionPremium * (contract.product.commissionRate / 100);
};

const calculateMultiBalance = (index) => {
    const payedCommission = multiAddDialog.value.commissions[index]?.payedCommission || 0;
    return calculateMultiCommissionToReceive(index) - payedCommission;
};

const openDeleteCommissionsDialog = () => {
    const selected = selectedContracts.value;
    const validContracts = selected.filter((contract) => hasCommission(contract));

    if (validContracts.length === 0) {
        toast.add({
            severity: 'warn',
            summary: 'Aucun contrat valide',
            detail: "Les contrats sélectionnés n'ont pas de commissions ou aucun n'est sélectionné",
            life: 5000
        });
        return;
    }

    if (validContracts.length < selected.length) {
        toast.add({
            severity: 'warn',
            summary: 'Certains contrats ignorés',
            detail: `${selected.length - validContracts.length} contrat(s) sans commission ignorés`,
            life: 5000
        });
    }

    contractsToDelete.value = validContracts;
    deleteMultipleDialog.value = true;
};

const deleteMultipleCommissions = async () => {
    try {
        const promises = contractsToDelete.value.map((contract) => {
            const commissionId = contract.commissions[0].id;
            return apiClient.delete(`app/commissions/${commissionId}`);
        });

        await Promise.all(promises);

        toast.add({
            severity: 'success',
            summary: 'Succès',
            detail: `${contractsToDelete.value.length} commission(s) supprimée(s) avec succès`,
            life: 3000
        });

        deleteMultipleDialog.value = false;
        selectedContracts.value = [];

        await refreshData();
    } catch (error) {
        console.error('Erreur lors de la suppression des commissions:', error);
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Une erreur est survenue lors de la suppression des commissions',
            life: 5000
        });
    }
};
</script>

<template>
    <div class="card">
        <Toolbar class="mb-6">
            <template #start>
                <Button label="Ajouter" icon="pi pi-plus" severity="secondary" class="mr-2" :disabled="selectedContracts.length === 0" @click="openAddCommissionsDialog" />
                <Button label="Supprimer" icon="pi pi-trash" severity="danger" :disabled="selectedContracts.length === 0" @click="openDeleteCommissionsDialog" />
            </template>

            <template #end>
                <!-- <Button label="Export" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" /> -->
            </template>
        </Toolbar>

        <DataTable
            :value="contracts"
            v-model:selection="selectedContracts"
            v-model:expandedRows="expandedRows"
            v-model:filters="filters"
            filterDisplay="menu"
            :loading="loading"
            dataKey="id"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[5, 10, 25, 50]"
            :globalFilterFields="['contractNumber', 'product.name', 'product.insurer.name', 'commissionPremium']"
            tableStyle="min-width: 60rem"
            stripedRows
        >
            <template #header>
                <div class="flex flex-wrap justify-between gap-2">
                    <h2 class="text-xl font-bold">Liste des contrats et commissions</h2>
                    <div class="flex gap-2">
                        <Button type="button" icon="pi pi-filter-slash" label="Réinitialiser filtres" outlined @click="clearFilter()" />
                        <Button text icon="pi pi-plus" label="Développer tout" @click="expandAll" />
                        <Button text icon="pi pi-minus" label="Réduire tout" @click="collapseAll" />
                    </div>
                </div>
                <div class="flex justify-between mt-4">
                    <span></span>
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

            <Column selectionMode="multiple" headerStyle="width: 3rem" :headerCheckbox="true" />
            <Column expander style="width: 3rem" />

            <Column field="contractNumber" header="N° de contrat" sortable>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Rechercher" />
                </template>
            </Column>

            <Column field="effectDate" header="Date d'effet" sortable>
                <template #body="slotProps">
                    {{ formatDate(slotProps.data.effectDate) }}
                </template>
                <template #filter="{ filterModel }">
                    <Calendar v-model="filterModel.value" dateFormat="dd/mm/yy" placeholder="jj/mm/aaaa" />
                </template>
            </Column>

            <Column field="dueDate" header="Date d'échéance" sortable>
                <template #body="slotProps">
                    {{ formatDate(slotProps.data.dueDate) }}
                </template>
                <template #filter="{ filterModel }">
                    <Calendar v-model="filterModel.value" dateFormat="dd/mm/yy" placeholder="jj/mm/aaaa" />
                </template>
            </Column>

            <Column field="product.name" header="Produit" sortable>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Rechercher" />
                </template>
            </Column>

            <Column field="product.insurer.name" header="Assureur" sortable>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Rechercher" />
                </template>
            </Column>

            <Column field="commissionPremium" header="Prime de commission" sortable>
                <template #body="slotProps">
                    {{ getCommissionPremium(slotProps.data) ? formatCurrency(getCommissionPremium(slotProps.data)) : '-' }}
                </template>
                <template #filter="{ filterModel }">
                    <InputNumber v-model="filterModel.value" mode="currency" currency="EUR" locale="fr-FR" />
                </template>
            </Column>

            <Column field="payedCommission" header="Commission payée" sortable>
                <template #body="slotProps">
                    {{ getPayedCommission(slotProps.data) ? formatCurrency(getPayedCommission(slotProps.data)) : '-' }}
                </template>
            </Column>

            <Column field="paymentDate" header="Date de paiement" sortable>
                <template #body="slotProps">
                    {{ getCommissionPaymentDate(slotProps.data) ? formatDate(getCommissionPaymentDate(slotProps.data)) : '-' }}
                </template>
            </Column>

            <Column field="commissionStatus" header="Statut commission" sortable>
                <template #body="slotProps">
                    <Tag :value="getCommissionStatus(slotProps.data)" :severity="getCommissionStatusSeverity(getCommissionStatus(slotProps.data))" />
                </template>
                <template #filter="{ filterModel }">
                    <Dropdown v-model="filterModel.value" :options="commissionStatusOptions" placeholder="Sélectionner" class="p-column-filter" showClear />
                </template>
            </Column>

            <Column headerStyle="min-width:12rem">
                <template #header>
                    <div class="text-center">Actions</div>
                </template>
                <template #body="slotProps">
                    <div class="flex justify-center gap-2">
                        <!-- Bouton Ajouter Commission -->
                        <Button
                            icon="pi pi-plus"
                            class="p-button-rounded p-button-success p-button-sm hover:scale-110 transition-all duration-300"
                            :disabled="hasCommission(slotProps.data)"
                            @click="addCommission(slotProps.data)"
                            title="Ajouter une commission"
                        />

                        <!-- Bouton Éditer Commission -->
                        <Button
                            icon="pi pi-pencil"
                            class="p-button-rounded p-button-primary p-button-sm hover:scale-110 transition-all duration-300"
                            :disabled="!hasCommission(slotProps.data)"
                            @click="editCommission(slotProps.data)"
                            title="Éditer la commission"
                        />

                        <!-- Bouton Supprimer Commission -->
                        <Button
                            icon="pi pi-trash"
                            class="p-button-rounded p-button-danger p-button-sm hover:scale-110 transition-all duration-300"
                            :disabled="!hasCommission(slotProps.data)"
                            @click="confirmDeleteCommission(slotProps.data)"
                            title="Supprimer la commission"
                        />
                    </div>
                </template>
            </Column>

            <template #expansion="slotProps">
                <div class="p-5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                        <i class="pi pi-money-bill text-green-500 mr-3" style="font-size: 1.5rem"></i>
                        <h4 class="text-xl font-bold text-gray-800 dark:text-white m-0">Détails des commissions - Contrat {{ slotProps.data.contractNumber }}</h4>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Informations du contrat -->
                        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                            <div class="bg-gray-100 dark:bg-gray-700 px-4 py-3 flex items-center">
                                <i class="pi pi-file-edit text-blue-500 mr-2"></i>
                                <h5 class="m-0 font-semibold">Informations du contrat</h5>
                            </div>
                            <div class="p-4 space-y-3">
                                <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                    <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Produit:</span>
                                    <span>{{ slotProps.data.product.name }}</span>
                                </div>
                                <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                    <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Assureur:</span>
                                    <span>{{ slotProps.data.product.insurer.name }} ({{ slotProps.data.product.insurer.acronym }})</span>
                                </div>
                                <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                    <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Taux de commission:</span>
                                    <span>{{ slotProps.data.product.commissionRate }}%</span>
                                </div>
                                <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                    <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Prime TTC:</span>
                                    <span>{{ formatCurrency(slotProps.data.ttcPremium) }}</span>
                                </div>
                                <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                    <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Prime nette:</span>
                                    <span>{{ formatCurrency(slotProps.data.netPremium) }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Détails des commissions -->
                        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                            <div class="bg-gray-100 dark:bg-gray-700 px-4 py-3 flex items-center">
                                <i class="pi pi-percentage text-orange-500 mr-2"></i>
                                <h5 class="m-0 font-semibold">Détails des commissions</h5>
                            </div>
                            <div class="p-4">
                                <div v-if="slotProps.data.commissions && slotProps.data.commissions.length > 0">
                                    <div v-for="(commission, index) in slotProps.data.commissions" :key="commission.id" class="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                        <div class="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
                                            <Tag :value="commission.paymentDate ? 'Payée' : 'En attente'" :severity="commission.paymentDate ? 'success' : 'warning'" />
                                        </div>

                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <span class="font-medium text-gray-700 dark:text-gray-300 block mb-1">Prime de commission:</span>
                                                <span class="text-lg">{{ formatCurrency(commission.commissionPremium) }}</span>
                                            </div>

                                            <div>
                                                <span class="font-medium text-gray-700 dark:text-gray-300 block mb-1">Commission payée:</span>
                                                <span class="text-lg">{{ commission.payedCommission ? formatCurrency(commission.payedCommission) : '-' }}</span>
                                            </div>

                                            <div class="sm:col-span-2">
                                                <span class="font-medium text-gray-700 dark:text-gray-300 block mb-1">Date de paiement:</span>
                                                <span>{{ commission.paymentDate ? formatDate(commission.paymentDate) : 'Non payée' }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="flex flex-col items-center justify-center p-6 text-gray-500">
                                    <i class="pi pi-exclamation-circle mb-2" style="font-size: 2rem"></i>
                                    <span class="text-center">Aucune commission n'a été créée pour ce contrat</span>
                                    <Button icon="pi pi-plus" label="Ajouter une commission" class="p-button-sm p-button-outlined mt-3" @click="addCommission(slotProps.data)" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </DataTable>
    </div>
    <!-- Ajouter ce bloc de template après les autres templates dans votre composant -->
    <!-- Dialog pour ajouter/éditer une commission -->
    <Dialog v-model:visible="dialog.visible" :style="{ width: '550px' }" header="Ajouter une commission" :modal="true" class="p-fluid">
        <div class="p-4" v-if="dialog.contract">
            <!-- Informations du contrat -->
            <div class="bg-gray-100 dark:bg-gray-700 p-3 rounded mb-4">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium mb-1">Assureur</label>
                        <div class="font-bold">{{ dialog.contract.product.insurer.name }}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Produit</label>
                        <div class="font-bold">{{ dialog.contract.product.name }}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Taux de commission</label>
                        <div class="font-bold">{{ dialog.contract.product.commissionRate }}%</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Prime nette</label>
                        <div class="font-bold">{{ dialog.contract.netPremium }}</div>
                    </div>
                </div>
            </div>

            <!-- Valeurs calculées -->
            <div class="bg-blue-50 dark:bg-blue-900 p-3 rounded mb-4">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-sm font-medium mb-1">Commission à percevoir</label>
                        <div class="font-bold">{{ formatCurrency(dialog.calculatedValues.commissionToReceive) }}</div>
                        <div class="text-xs text-gray-500">= Prime nette × Taux</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Commission réajustée</label>
                        <div class="font-bold">{{ formatCurrency(dialog.calculatedValues.adjustedCommission) }}</div>
                        <div class="text-xs text-gray-500">= Prime commission × Taux</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Solde</label>
                        <div class="font-bold" :class="{ 'text-red-500': dialog.calculatedValues.balance < 0, 'text-green-500': dialog.calculatedValues.balance >= 0 }">
                            {{ formatCurrency(dialog.calculatedValues.balance) }}
                        </div>
                        <div class="text-xs text-gray-500">= À percevoir - Payée</div>
                    </div>
                </div>
            </div>

            <!-- Formulaire -->
            <div class="p-4 bg-white rounded-lg shadow">
                <div class="grid grid-cols-1 gap-6">
                    <!-- Commission Premium Field -->
                    <div class="space-y-2">
                        <label for="commissionPremium" class="block text-sm font-medium text-gray-700"> Prime de commissionnement<span class="text-red-500">*</span> </label>
                        <InputNumber
                            id="commissionPremium"
                            v-model="dialog.form.commissionPremium"
                            mode="currency"
                            currency="EUR"
                            locale="fr-FR"
                            @update:modelValue="updateCalculatedValues"
                            :class="{ 'p-invalid': !dialog.form.commissionPremium }"
                            class="w-full"
                        />
                        <small v-if="!dialog.form.commissionPremium" class="text-red-500 text-xs"> Ce champ est requis </small>
                    </div>

                    <!-- Payed Commission Field -->
                    <div class="space-y-2">
                        <label for="payedCommission" class="block text-sm font-medium text-gray-700"> Commission payée </label>
                        <InputNumber
                            id="payedCommission"
                            v-model="dialog.form.payedCommission"
                            mode="currency"
                            currency="EUR"
                            locale="fr-FR"
                            @update:modelValue="updateCalculatedValues"
                            class="w-full"
                            :class="{ 'p-invalid': !dialog.form.payedCommission }"
                        />
                        <small v-if="!dialog.form.payedCommission" class="text-red-500 text-xs"> Ce champ est requis </small>
                    </div>

                    <!-- Payment Date Field -->
                    <div class="space-y-2">
                        <label for="paymentDate" class="block text-sm font-medium text-gray-700"> Date de paiement </label>
                        <DatePicker id="paymentDate" v-model="dialog.form.paymentDate" dateFormat="dd/mm/yy" :showIcon="true" placeholder="Sélectionner une date" :class="{ 'p-invalid': !dialog.form.paymentDate }" class="w-full" />
                        <small v-if="!dialog.form.paymentDate" class="text-red-500 text-xs"> Ce champ est requis </small>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <Button label="Annuler" icon="pi pi-times" text @click="cancelDialog" />
            <Button label="Enregistrer" icon="pi pi-check" @click="submitCommissionForm" :disabled="!dialog.form.commissionPremium || !dialog.form.payedCommission || !dialog.form.paymentDate" />
        </template>
    </Dialog>
    <!-- Multi-add commission dialog -->
    <Dialog v-model:visible="multiAddDialog.visible" :header="`Ajouter des commissions (${multiAddDialog.currentIndex + 1}/${multiAddDialog.selectedContracts.length})`" :style="{ width: '550px' }" :modal="true">
        <div v-if="multiAddDialog.selectedContracts.length > 0" class="p-4">
            <!-- Contract info -->
            <div class="bg-gray-100 dark:bg-gray-700 p-3 rounded mb-4">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium mb-1">Contrat</label>
                        <div class="font-bold">
                            {{ multiAddDialog.selectedContracts[multiAddDialog.currentIndex].contractNumber }}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Produit</label>
                        <div class="font-bold">
                            {{ multiAddDialog.selectedContracts[multiAddDialog.currentIndex].product.name }}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Taux commission</label>
                        <div class="font-bold">{{ multiAddDialog.selectedContracts[multiAddDialog.currentIndex].product.commissionRate }}%</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Prime nette</label>
                        <div class="font-bold">
                            {{ formatCurrency(multiAddDialog.selectedContracts[multiAddDialog.currentIndex].netPremium) }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Nouvelle section pour les valeurs calculées -->
            <div class="bg-blue-50 dark:bg-blue-900 p-3 rounded mb-4">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-sm font-medium mb-1">Commission à percevoir</label>
                        <div class="font-bold">
                            {{ formatCurrency(calculateMultiCommissionToReceive(multiAddDialog.currentIndex)) }}
                        </div>
                        <div class="text-xs text-gray-500">= Prime nette × Taux</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Commission réajustée</label>
                        <div class="font-bold">
                            {{ formatCurrency(calculateMultiAdjustedCommission(multiAddDialog.currentIndex)) }}
                        </div>
                        <div class="text-xs text-gray-500">= Prime commission × Taux</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Solde</label>
                        <div
                            class="font-bold"
                            :class="{
                                'text-red-500': calculateMultiBalance(multiAddDialog.currentIndex) < 0,
                                'text-green-500': calculateMultiBalance(multiAddDialog.currentIndex) >= 0
                            }"
                        >
                            {{ formatCurrency(calculateMultiBalance(multiAddDialog.currentIndex)) }}
                        </div>
                        <div class="text-xs text-gray-500">= À percevoir - Payée</div>
                    </div>
                </div>
            </div>

            <!-- Commission form -->
            <div class="space-y-4">
                <div class="field">
                    <label for="commissionPremium" class="font-medium">Prime de commission *</label>
                    <InputNumber
                        id="commissionPremium"
                        v-model="multiAddDialog.commissions[multiAddDialog.currentIndex].commissionPremium"
                        mode="currency"
                        currency="EUR"
                        locale="fr-FR"
                        :class="{ 'p-invalid': !multiAddDialog.commissions[multiAddDialog.currentIndex].commissionPremium }"
                        class="w-full"
                    />
                </div>

                <div class="field">
                    <label for="payedCommission" class="font-medium">Commission payée *</label>
                    <InputNumber
                        id="payedCommission"
                        v-model="multiAddDialog.commissions[multiAddDialog.currentIndex].payedCommission"
                        mode="currency"
                        currency="EUR"
                        locale="fr-FR"
                        :class="{ 'p-invalid': !multiAddDialog.commissions[multiAddDialog.currentIndex].payedCommission }"
                        class="w-full"
                    />
                </div>

                <div class="field">
                    <label for="paymentDate" class="font-medium">Date paiement *</label>
                    <Calendar
                        id="paymentDate"
                        v-model="multiAddDialog.commissions[multiAddDialog.currentIndex].paymentDate"
                        dateFormat="dd/mm/yy"
                        :showIcon="true"
                        class="w-full"
                        :class="{ 'p-invalid': !multiAddDialog.commissions[multiAddDialog.currentIndex].paymentDate }"
                    />
                </div>
            </div>
        </div>

        <template #footer>
            <Button label="Annuler" icon="pi pi-times" @click="cancelMultiAdd" text />
            <Button label="Précédent" icon="pi pi-chevron-left" @click="previousContract" :disabled="multiAddDialog.currentIndex === 0" />
            <Button v-if="multiAddDialog.currentIndex < multiAddDialog.selectedContracts.length - 1" label="Suivant" icon="pi pi-chevron-right" @click="nextContract" :disabled="!isCurrentFormValid()" />
            <Button v-else label="Enregistrer" icon="pi pi-check" @click="submitAllCommissions" :disabled="!allFormsValid()" />
        </template>
    </Dialog>
    <!-- Dialog de confirmation de suppression -->
    <!-- Dialog de confirmation de suppression de commission -->
    <Dialog v-model:visible="deleteCommissionDialog" modal :closable="false" :style="{ width: '450px', borderRadius: '8px' }" class="delete-confirmation-dialog">
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

            <p v-if="commissionToDelete" class="text-center text-gray-600 dark:text-gray-300 mb-2">
                Êtes-vous sûr de vouloir supprimer la commission du contrat
                <span class="font-semibold text-gray-900 dark:text-white">
                    {{ commissionToDelete.contractNumber }}
                </span>
                ?
            </p>

            <div class="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded text-sm text-yellow-800 dark:text-yellow-200">
                <i class="pi pi-info-circle mr-2"></i>
                Cette action est irréversible et supprimera définitivement les données de commission associées à ce contrat.
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button label="Annuler" icon="pi pi-times" class="p-button-text" @click="deleteCommissionDialog = false" />
                <Button label="Supprimer" icon="pi pi-trash" class="p-button-danger p-button-raised" @click="confirmDeleteCommissionAction" />
            </div>
        </template>
    </Dialog>
    <!-- Dialog de confirmation de suppression multiple -->
    <Dialog v-model:visible="deleteMultipleDialog" modal :closable="false" :style="{ width: '450px', borderRadius: '8px' }" class="delete-confirmation-dialog">
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

            <h3 class="text-xl font-bold text-gray-800 dark:text-white mb-3">Confirmer la suppression multiple</h3>

            <p class="text-center text-gray-600 dark:text-gray-300 mb-2">
                Êtes-vous sûr de vouloir supprimer les commissions de
                <span class="font-semibold text-gray-900 dark:text-white">
                    {{ contractsToDelete.length }}
                </span>
                contrat(s) ?
            </p>

            <div class="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded text-sm text-yellow-800 dark:text-yellow-200">
                <i class="pi pi-info-circle mr-2"></i>
                Cette action est irréversible et supprimera définitivement les données de commission associées à ces contrats.
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button label="Annuler" icon="pi pi-times" class="p-button-text" @click="deleteMultipleDialog = false" />
                <Button label="Supprimer" icon="pi pi-trash" class="p-button-danger p-button-raised" @click="deleteMultipleCommissions" />
            </div>
        </template>
    </Dialog>
</template>
<style scoped>
/* You can add custom styles here if needed */
.p-invalid {
    border-color: rgb(239, 68, 68);
}
</style>
