<script setup>
import { apiClient } from '@/service/auth';
import { useToast } from 'primevue/usetoast';
import { onBeforeMount, onMounted, ref } from 'vue';

const toast = useToast();
const contracts = ref([]);
const loading = ref(true);
const paymentDialog = ref(false);
const selectedPayment = ref(null);
const schedules = ref([]);
const selectedContracts = ref([]);
const expandedRows = ref([]);
const filters = ref(null);

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
        status: { value: null, matchMode: FilterMatchMode.EQUALS },

        'product.insurer.name': { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        paymentStatus: { value: null, matchMode: FilterMatchMode.EQUALS }
    };
};

const clearFilter = () => {
    initFilters();
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR');
};

const fetchContracts = async () => {
    try {
        const response = await apiClient.get('app/contracts/payments/get');
        contracts.value = response.data.data;
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Échec du chargement des contrats',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};

const getPaymentStatus = (payment) => {
    if (!payment.schedules || !payment.schedules.length) return 'gray';
    const paidCount = payment.schedules.filter((s) => s.status).length;
    if (paidCount === 0) return 'danger';
    if (paidCount === payment.schedules.length) return 'success';
    return 'warning';
};

const getPaymentStatusLabel = (payment) => {
    if (!payment.schedules || !payment.schedules.length) return 'Non défini';
    const paidCount = payment.schedules.filter((s) => s.status).length;
    if (paidCount === 0) return 'Non payé';
    if (paidCount === payment.schedules.length) return 'Payé';
    return 'Paiement partiel';
};

const openPaymentDialog = async (payment) => {
    const contract = contracts.value.find((c) => c.payments && c.payments.some((p) => p.id === payment.id));

    selectedPayment.value = {
        ...payment,
        contractNumber: contract?.contractNumber,
        insuredName: contract?.insured?.name,
        insuredSurname: contract?.insured?.surname
    };

    schedules.value = payment.schedules.map((s) => ({
        id: s.id,
        due_date: s.due_date,
        status: Boolean(s.status)
    }));

    paymentDialog.value = true;
};

const saveSchedules = async () => {
    try {
        const response = await apiClient.patch(`/app/payments/${selectedPayment.value.id}/update-schedules`, { schedules: schedules.value });

        toast.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Échéances mises à jour',
            life: 3000
        });

        const updatedPayment = response.data.data;
        const contractIndex = contracts.value.findIndex((c) => c.payments.some((p) => p.id === updatedPayment.id));
        if (contractIndex > -1) {
            const paymentIndex = contracts.value[contractIndex].payments.findIndex((p) => p.id === updatedPayment.id);
            contracts.value[contractIndex].payments[paymentIndex] = updatedPayment;
        }

        paymentDialog.value = false;
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Échec de la mise à jour',
            life: 3000
        });
    }
};

const expandAll = () => {
    expandedRows.value = [...contracts.value];
};

const collapseAll = () => {
    expandedRows.value = [];
};

const closeDialog = () => {
    paymentDialog.value = false;
    selectedPayment.value = null;
    schedules.value = [];
};

onBeforeMount(() => {
    initFilters();
});

onMounted(fetchContracts);
</script>

<template>
    <div class="card">
        <Toolbar class="mb-6">
            <template #start>
                <Button label="Gérer les échéances" icon="pi pi-calendar" severity="secondary" class="mr-2" :disabled="selectedContracts.length !== 1" @click="openPaymentDialog(selectedContracts[0].payments[0])" />
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
            :globalFilterFields="['contractNumber', 'product.name', 'product.insurer.name']"
            tableStyle="min-width: 60rem"
            stripedRows
            removableSort
        >
            <template #header>
                <div class="flex flex-wrap justify-between gap-2">
                    <h2 class="text-xl font-bold">Gestion des échéances de paiement</h2>
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

            <Column field="contractNumber" header="N° Contrat" sortable>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Rechercher" />
                </template>
            </Column>

            <Column field="effectDate" header="Date effet" sortable>
                <template #body="slotProps">
                    {{ formatDate(slotProps.data.effectDate) }}
                </template>
                <template #filter="{ filterModel }">
                    <Calendar v-model="filterModel.value" dateFormat="dd/mm/yy" placeholder="jj/mm/aaaa" />
                </template>
            </Column>

            <Column field="dueDate" header="Date échéance" sortable>
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

            <Column field="insured.name" header="Nom" sortable>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Rechercher" />
                </template>
            </Column>

            <Column field="insured.surname" header="Prénom" sortable>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Rechercher" />
                </template>
            </Column>

            <Column field="paymentStatus" header="Statut Paiement" sortable>
                <template #body="slotProps">
                    <Tag v-if="slotProps.data.payments && slotProps.data.payments.length > 0" :value="slotProps.data.payments[0].status ? 'Payé' : 'En attente'" :severity="slotProps.data.payments[0].status ? 'success' : 'danger'" />
                    <Tag v-else value="Non défini" severity="gray" />
                </template>
                <template #filter="{ filterModel }">
                    <Dropdown v-model="filterModel.value" :options="['En attente', 'Payé', 'Non défini']" placeholder="Sélectionner" class="p-column-filter" showClear />
                </template>
            </Column>

            <Column headerStyle="min-width:12rem">
                <template #header>
                    <div class="text-center">Actions</div>
                </template>
                <template #body="slotProps">
                    <div class="flex justify-center gap-2">
                        <Button
                            icon="pi pi-pencil"
                            class="p-button-rounded p-button-info p-button-sm hover:scale-110 transition-all duration-300"
                            :disabled="!slotProps.data.payments || slotProps.data.payments.length === 0"
                            @click="openPaymentDialog(slotProps.data.payments[0])"
                            title="Gérer les échéances"
                        />
                    </div>
                </template>
            </Column>

            <template #expansion="slotProps">
                <div class="p-5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                        <i class="pi pi-money-bill text-green-500 mr-3" style="font-size: 1.5rem"></i>
                        <h4 class="text-xl font-bold text-gray-800 dark:text-white m-0">Détails des échéances - Contrat {{ slotProps.data.contractNumber }}</h4>
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
                                    <span>{{ slotProps.data.product.insurer.name }}</span>
                                </div>
                                <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                    <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Date d'effet:</span>
                                    <span>{{ formatDate(slotProps.data.effectDate) }}</span>
                                </div>
                                <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                    <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Date d'échéance:</span>
                                    <span>{{ formatDate(slotProps.data.dueDate) }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Détails des échéances -->
                        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                            <div class="bg-gray-100 dark:bg-gray-700 px-4 py-3 flex items-center">
                                <i class="pi pi-calendar text-orange-500 mr-2"></i>
                                <h5 class="m-0 font-semibold">Détails des échéances</h5>
                            </div>
                            <div class="p-4">
                                <div v-if="slotProps.data.payments && slotProps.data.payments.length > 0 && slotProps.data.payments[0].schedules && slotProps.data.payments[0].schedules.length > 0">
                                    <div v-for="(schedule, index) in slotProps.data.payments[0].schedules" :key="schedule.id" class="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                        <div class="flex justify-between items-center">
                                            <span class="font-medium">Échéance #{{ index + 1 }}</span>
                                            <Tag :value="schedule.status ? 'Payé' : 'En attente'" :severity="schedule.status ? 'success' : 'danger'" />
                                        </div>
                                        <div class="mt-2">
                                            <span class="font-medium text-gray-700 dark:text-gray-300 block mb-1">Date d'échéance:</span>
                                            <span>{{ formatDate(schedule.due_date) }}</span>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="flex flex-col items-center justify-center p-6 text-gray-500">
                                    <i class="pi pi-exclamation-circle mb-2" style="font-size: 2rem"></i>
                                    <span class="text-center">Aucune échéance n'a été définie pour ce contrat</span>
                                    <Button
                                        icon="pi pi-calendar-plus"
                                        label="Gérer les échéances"
                                        class="p-button-sm p-button-outlined mt-3"
                                        @click="openPaymentDialog(slotProps.data.payments[0])"
                                        v-if="slotProps.data.payments && slotProps.data.payments.length > 0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </DataTable>

        <!-- Dialog pour gérer les échéances -->
        <Dialog v-model:visible="paymentDialog" @hide="closeDialog" header="Gestion des échéances" :style="{ width: '600px' }" :modal="true" class="p-fluid">
            <div class="p-4" v-if="selectedPayment">
                <!-- Contract Information Section -->
                <div class="bg-gray-100 dark:bg-gray-700 p-3 rounded mb-4">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium mb-1">Contrat</label>
                            <div class="font-bold">{{ selectedPayment.contractNumber || 'N/A' }}</div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Assuré</label>
                            <div class="font-bold">{{ `${selectedPayment.insuredName || ''} ${selectedPayment.insuredSurname || ''}`.trim() || 'N/A' }}</div>
                        </div>
                    </div>
                </div>

                <!-- Payment Schedules List -->
                <!-- Liste des échéances -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <h5 class="font-semibold mb-4">Liste des échéances</h5>
                    <div v-for="(schedule, index) in schedules" :key="schedule.id" class="field-checkbox mb-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div class="flex items-center justify-between">
                            <!-- Groupe de gauche -->
                            <div class="flex items-center">
                                <Checkbox v-model="schedule.status" :inputId="'schedule' + index" :binary="true" />
                                <label :for="'schedule' + index" class="ml-2 font-medium"> Échéance #{{ index + 1 }} ({{ formatDate(schedule.due_date) }}) </label>
                            </div>

                            <!-- Tag à droite -->
                            <Tag :value="schedule.status ? 'Payé' : 'En attente'" :severity="schedule.status ? 'success' : 'danger'" />
                        </div>
                    </div>

                    <div v-if="schedules.length === 0" class="flex flex-col items-center justify-center p-6 text-gray-500">
                        <i class="pi pi-exclamation-circle mb-2" style="font-size: 2rem"></i>
                        <span class="text-center">Aucune échéance définie</span>
                    </div>
                </div>
            </div>

            <!-- Dialog Footer -->
            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="Annuler" icon="pi pi-times" class="p-button-text" @click="closeDialog" />
                    <Button label="Enregistrer" icon="pi pi-check" @click="saveSchedules" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
:deep(.p-tag) {
    min-width: 80px;
    justify-content: center;
}

.field-checkbox {
    display: flex;
    align-items: center;
    transition: background-color 0.2s;
}

.field-checkbox:hover {
    background-color: #f8f9fa;
}

.p-dialog .p-dialog-header {
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 1rem;
}

.p-dialog .p-dialog-footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 1rem;
}

/* Ensure proper spacing in the footer */
.p-dialog-footer .p-button {
    margin-left: 0.5rem;
}
</style>
