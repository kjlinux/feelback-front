<script setup>
import { useLayout } from '@/layout/composables/layout';
import { apiClient } from '@/service/auth';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const { getPrimary, getSurface, isDarkTheme } = useLayout();
const toast = useToast();
const router = useRouter();

const contracts75 = ref([]);
const revenueData = ref([]);
const loading75 = ref(true);
const loadingRevenue = ref(true);
const contractsUpcoming = ref([]);
const loadingUpcoming = ref(true);
const expandedRows = ref({});
const filters = ref({
    global: { value: null }
});

const pieData = ref(null);
const barData = ref(null);
const pieOptions = ref(null);
const barOptions = ref(null);

const totalRevenue = computed(() => {
    if (!revenueData.value || revenueData.value.length === 0) return 0;
    return revenueData.value.reduce((sum, item) => sum + Number(item.total_ttc_premium), 0);
});

onMounted(async () => {
    await Promise.all([fetchContracts75(), fetchRevenueByInsurer()]);
    setColorOptions();
    await fetchUpcomingContracts();
});

async function fetchContracts75() {
    try {
        loading75.value = true;
        const response = await apiClient.get('/app/contracts/75nextyear/get');
        if (response.data.status === 'success') {
            contracts75.value = response.data.data;
        } else {
            console.error('Erreur lors de la récupération des contrats:', response.data.message);
            showErrorToast('Erreur de chargement', response.data.message || 'Impossible de charger les contrats');
        }
    } catch (error) {
        console.error('Erreur API:', error);
        showErrorToast('Erreur de chargement', "Une erreur s'est produite lors de la récupération des contrats");
    } finally {
        loading75.value = false;
    }
}

async function fetchRevenueByInsurer() {
    try {
        loadingRevenue.value = true;
        const response = await apiClient.get('/app/contracts/revenue-by-inusrer/get');
        if (response.data.status === 'success') {
            revenueData.value = response.data.data;
            updateChartData();
        } else {
            console.error("Erreur lors de la récupération du chiffre d'affaires:", response.data.message);
            showErrorToast('Erreur de chargement', response.data.message || "Impossible de charger les données de chiffre d'affaires");
        }
    } catch (error) {
        console.error('Erreur API:', error);
        showErrorToast('Erreur de chargement', "Une erreur s'est produite lors de la récupération du chiffre d'affaires");
    } finally {
        loadingRevenue.value = false;
    }
}

function showErrorToast(summary, detail) {
    toast.add({
        severity: 'error',
        summary: summary,
        detail: detail,
        life: 5000
    });
}

function updateChartData() {
    if (!revenueData.value || revenueData.value.length === 0) return;

    const insurerNames = revenueData.value.map((item) => item.name);
    const insurerRevenues = revenueData.value.map((item) => Number(item.total_ttc_premium));

    barData.value = {
        labels: insurerNames,
        datasets: [
            {
                label: "Chiffre d'affaires",
                data: insurerRevenues,
                backgroundColor: generateColors(insurerNames.length, 0.6),
                borderColor: generateColors(insurerNames.length, 1),
                borderWidth: 1
            }
        ]
    };

    pieData.value = {
        labels: insurerNames,
        datasets: [
            {
                data: insurerRevenues,
                backgroundColor: generateColors(insurerNames.length, 0.8),
                hoverBackgroundColor: generateColors(insurerNames.length, 0.6)
            }
        ]
    };
}

function setColorOptions() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    barOptions.value = {
        plugins: {
            legend: {
                labels: {
                    color: textColor
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return context.dataset.label + ': ' + formatCurrency(context.raw);
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: textColorSecondary,
                    font: {
                        weight: 500
                    }
                },
                grid: {
                    display: false,
                    drawBorder: false
                }
            },
            y: {
                ticks: {
                    color: textColorSecondary,
                    callback: function (value) {
                        return formatCurrency(value);
                    }
                },
                grid: {
                    color: surfaceBorder,
                    drawBorder: false
                }
            }
        }
    };

    pieOptions.value = {
        plugins: {
            legend: {
                labels: {
                    usePointStyle: true,
                    color: textColor
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return context.label + ': ' + formatCurrency(context.raw) + ' (' + Math.round((context.raw / totalRevenue.value) * 100) + '%)';
                    }
                }
            }
        },
        responsive: true,
        maintainAspectRatio: false
    };
}

function generateColors(count, opacity) {
    const baseColors = [
        'rgba(54, 162, 235, ' + opacity + ')',
        'rgba(255, 99, 132, ' + opacity + ')',
        'rgba(75, 192, 192, ' + opacity + ')',
        'rgba(255, 159, 64, ' + opacity + ')',
        'rgba(153, 102, 255, ' + opacity + ')',
        'rgba(255, 205, 86, ' + opacity + ')',
        'rgba(201, 203, 207, ' + opacity + ')'
    ];

    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
}

function formatDate(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}

function formatCurrency(value) {
    if (value === null || value === undefined) return '0,00 €';

    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    }).format(value);
}

function calculateAge(birthdate) {
    if (!birthdate) return '';

    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
}

function getContractStatusSeverity(status) {
    switch (status) {
        case 'ACTIVE':
            return 'success';
        case 'PENDING':
            return 'warning';
        case 'EXPIRED':
            return 'danger';
        case 'SUSPENDED':
            return 'info';
        default:
            return 'secondary';
    }
}

async function sendNotification(contract) {
    try {
        const response = await apiClient.post('/app/notifications/send', {
            contractId: contract.id,
            type: 'AGE_LIMIT_WARNING',
            recipientId: contract.insured.id
        });

        if (response.data.status === 'success') {
            toast.add({
                severity: 'success',
                summary: 'Notification envoyée',
                detail: `La notification a été envoyée avec succès à ${contract.insured.surname} ${contract.insured.name}`,
                life: 3000
            });
        } else {
            showErrorToast('Erreur', response.data.message || "Impossible d'envoyer la notification");
        }
    } catch (error) {
        console.error("Erreur lors de l'envoi de la notification:", error);
        showErrorToast('Erreur', "Une erreur s'est produite lors de l'envoi de la notification");
    }
}

async function fetchUpcomingContracts() {
    try {
        loadingUpcoming.value = true;
        const response = await apiClient.get('/app/contracts/upcoming-due-date/get');
        if (response.data.status === 'success') {
            contractsUpcoming.value = response.data.data;
        } else {
            console.error('Erreur lors de la récupération des contrats:', response.data.message);
            showErrorToast('Erreur de chargement', response.data.message || 'Impossible de charger les contrats à échéance');
        }
    } catch (error) {
        console.error('Erreur API:', error);
        showErrorToast('Erreur de chargement', "Une erreur s'est produite lors de la récupération des contrats à échéance");
    } finally {
        loadingUpcoming.value = false;
    }
}

function calculateNextDueDate(contract) {
    if (!contract.effectDate || !contract.dueDate) return '';

    const effectDate = new Date(contract.effectDate);
    const now = new Date();
    const dueDate = new Date(contract.dueDate);

    if (contract.periodicity === 'monthly') {
        const monthsSinceStart = (now.getFullYear() - effectDate.getFullYear()) * 12 + (now.getMonth() - effectDate.getMonth());
        const nextMonth = new Date(effectDate);
        nextMonth.setMonth(effectDate.getMonth() + monthsSinceStart + 1);
        if (nextMonth <= dueDate) {
            return formatDate(nextMonth);
        }
    } else if (contract.periodicity === 'quarterly') {
        const quartersSinceStart = Math.floor((now - effectDate) / (3 * 30 * 24 * 60 * 60 * 1000));
        const nextQuarter = new Date(effectDate);
        nextQuarter.setMonth(effectDate.getMonth() + (quartersSinceStart + 1) * 3);
        if (nextQuarter <= dueDate) {
            return formatDate(nextQuarter);
        }
    } else if (contract.periodicity === 'biannual') {
        const halfYearsSinceStart = Math.floor((now - effectDate) / (6 * 30 * 24 * 60 * 60 * 1000));
        const nextHalfYear = new Date(effectDate);
        nextHalfYear.setMonth(effectDate.getMonth() + (halfYearsSinceStart + 1) * 6);
        if (nextHalfYear <= dueDate) {
            return formatDate(nextHalfYear);
        }
    } else {
        const yearsSinceStart = now.getFullYear() - effectDate.getFullYear();
        const nextYear = new Date(effectDate);
        nextYear.setFullYear(effectDate.getFullYear() + yearsSinceStart + 1);
        if (nextYear <= dueDate) {
            return formatDate(nextYear);
        }
    }

    return formatDate(dueDate); // Si aucune échéance intermédiaire, on renvoie la date de fin
}

function formatperiodicity(frequency) {
    switch (frequency) {
        case 'monthly':
            return 'Mensuelle';
        case 'quarterly':
            return 'Trimestrielle';
        case 'biannual':
            return 'Semestrielle';
        case 'annual':
            return 'Annuelle';
        default:
            return frequency || 'N/A';
    }
}

function getDaysUntilDueDate(dueDate) {
    if (!dueDate) return 0;

    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

const showAllContractInfo = (contract) => {
    if (contract && contract.id) {
        router.push({ name: 'contract-details', params: { id: contract.id } });
    } else {
        console.error('ID du contrat non disponible');
        toast.add({ severity: 'error', summary: 'Erreur', detail: "Impossible d'afficher les détails du contrat", life: 3000 });
    }
};

async function sendReminder(contract) {
    try {
        const response = await apiClient.post('/app/notifications/send', {
            contractId: contract.id,
            type: 'PAYMENT_DUE_REMINDER',
            recipientId: contract.insured.id
        });

        if (response.data.status === 'success') {
            toast.add({
                severity: 'success',
                summary: 'Rappel envoyé',
                detail: `Le rappel a été envoyé avec succès à ${contract.insured.surname} ${contract.insured.name}`,
                life: 3000
            });
        } else {
            showErrorToast('Erreur', response.data.message || "Impossible d'envoyer le rappel");
        }
    } catch (error) {
        console.error("Erreur lors de l'envoi du rappel:", error);
        showErrorToast('Erreur', "Une erreur s'est produite lors de l'envoi du rappel");
    }
}

watch(
    [getPrimary, getSurface, isDarkTheme],
    () => {
        setColorOptions();
    },
    { immediate: true }
);

watch(
    revenueData,
    () => {
        updateChartData();
    },
    { deep: true }
);
</script>

<template>
    <div class="card">
        <div class="bg-white">
            <!-- <h1 class="text-2xl font-bold text-gray-800 dark:text-white mb-6">Dashboard Assurance</h1> -->

            <!-- Premier bloc : Charts -->
            <div class="grid grid-cols-12 gap-8 mb-8">
                <!-- Pie Chart -->
                <div class="col-span-12 xl:col-span-6">
                    <div class="card flex flex-col items-center">
                        <div class="font-semibold text-xl mb-4">Chiffre d'affaires par assureur</div>
                        <div v-if="loadingRevenue" class="flex items-center justify-center h-64 w-full">
                            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                        </div>
                        <Chart v-else type="pie" :data="pieData" :options="pieOptions" class="w-full"></Chart>
                        <div class="mt-4 text-sm text-gray-500 text-center">Total: {{ formatCurrency(totalRevenue) }}</div>
                    </div>
                </div>

                <!-- Bar Chart -->
                <div class="col-span-12 xl:col-span-6">
                    <div class="card">
                        <div class="font-semibold text-xl mb-4">Chiffre d'affaires par assureur</div>
                        <div v-if="loadingRevenue" class="flex items-center justify-center h-64 w-full">
                            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                        </div>
                        <Chart v-else type="bar" :data="barData" :options="barOptions" class="w-full"></Chart>
                    </div>
                </div>
            </div>

            <div class="bg-white mb-5">
                <!-- Bloc : DataTable des contrats à échéance prochaine -->
                <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
                    <div class="flex flex-wrap justify-between items-center mb-6">
                        <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-200">Contrats avec échéance de paiement dans les 30 prochains jours</h2>
                        <div class="flex items-center">
                            <span v-if="contractsUpcoming.length > 0" class="text-sm text-gray-500 mr-4">{{ contractsUpcoming.length }} contrat(s) trouvé(s)</span>
                            <IconField class="w-64">
                                <InputIcon>
                                    <i class="pi pi-search"></i>
                                </InputIcon>
                                <InputText v-model="filters['global'].value" placeholder="Recherche globale" class="w-full" />
                            </IconField>
                        </div>
                    </div>

                    <DataTable
                        :value="contractsUpcoming"
                        v-model:expandedRows="expandedRows"
                        v-model:filters="filters"
                        filterDisplay="menu"
                        :loading="loadingUpcoming"
                        dataKey="id"
                        :paginator="true"
                        :rows="5"
                        :rowsPerPageOptions="[5, 10, 25]"
                        :globalFilterFields="['contractNumber', 'insured.name', 'insured.surname', 'product.name', 'product.insurer.name', 'ttcPremium', 'periodicity']"
                        tableStyle="min-width: 60rem"
                        showGridlines
                        stripedRows
                        class="p-datatable-sm"
                    >
                        <template #empty> Aucun contrat avec échéance prochaine trouvé. </template>
                        <template #loading> Chargement des contrats en cours. Veuillez patienter. </template>

                        <Column expander style="width: 3rem" />

                        <Column field="contractNumber" header="N° de contrat" sortable>
                            <template #body="slotProps">
                                <span class="font-medium">{{ slotProps.data.contractNumber }}</span>
                            </template>
                        </Column>

                        <Column field="insured.name" header="Assuré" sortable>
                            <template #body="slotProps"> {{ slotProps.data.insured.surname }} {{ slotProps.data.insured.name }} </template>
                        </Column>

                        <Column field="product.insurer.name" header="Assureur" sortable>
                            <template #body="slotProps">
                                {{ slotProps.data.product.insurer.name }}
                            </template>
                        </Column>

                        <Column field="product.name" header="Produit" sortable>
                            <template #body="slotProps">
                                {{ slotProps.data.product.name }}
                            </template>
                        </Column>

                        <Column field="periodicity" header="Périodicité" sortable>
                            <template #body="slotProps">
                                {{ formatperiodicity(slotProps.data.periodicity) }}
                            </template>
                        </Column>

                        <Column field="nextDueDate" header="Prochaine échéance" sortable>
                            <template #body="slotProps">
                                <div class="flex items-center">
                                    {{ calculateNextDueDate(slotProps.data) }}
                                    <span
                                        class="text-xs ml-2 px-2 py-1 rounded-full"
                                        :class="{
                                            'bg-red-100 text-red-800': getDaysUntilDueDate(calculateNextDueDate(slotProps.data)) <= 7,
                                            'bg-yellow-100 text-yellow-800': getDaysUntilDueDate(calculateNextDueDate(slotProps.data)) > 7 && getDaysUntilDueDate(calculateNextDueDate(slotProps.data)) <= 15,
                                            'bg-green-100 text-green-800': getDaysUntilDueDate(calculateNextDueDate(slotProps.data)) > 15
                                        }"
                                    >
                                        {{ getDaysUntilDueDate(calculateNextDueDate(slotProps.data)) }} jour(s)
                                    </span>
                                </div>
                            </template>
                        </Column>

                        <Column field="ttcPremium" header="Prime à payer" sortable>
                            <template #body="slotProps">
                                {{ formatCurrency(slotProps.data.ttcPremium) }}
                            </template>
                        </Column>

                        <Column headerStyle="width:8rem">
                            <template #header>
                                <div class="text-center">Actions</div>
                            </template>
                            <template #body="slotProps">
                                <div class="flex justify-center gap-2">
                                    <Button icon="pi pi-eye" class="p-button-rounded p-button-info p-button-sm hover:scale-110 transition-all duration-300" title="Voir détails" @click="showAllContractInfo(slotProps.data)" />
                                    <!-- <Button icon="pi pi-bell" class="p-button-rounded p-button-warning p-button-sm hover:scale-110 transition-all duration-300" title="Envoyer rappel" @click="sendReminder(slotProps.data)" /> -->
                                </div>
                            </template>
                        </Column>

                        <template #expansion="slotProps">
                            <div class="p-5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
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
                                                <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Téléphone:</span>
                                                <span>{{ slotProps.data.insured.phone }}</span>
                                            </div>
                                            <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                                <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Email:</span>
                                                <span>{{ slotProps.data.insured.email }}</span>
                                            </div>
                                            <div class="flex flex-col sm:flex-row sm:items-center py-1">
                                                <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Pays d'origine:</span>
                                                <span>{{ slotProps.data.insured.country_origin?.longName }}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Détails du contrat -->
                                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                                        <div class="bg-gray-100 dark:bg-gray-700 px-4 py-3 flex items-center">
                                            <i class="pi pi-file text-green-500 mr-2"></i>
                                            <h5 class="m-0 font-semibold">Détails du contrat</h5>
                                        </div>
                                        <div class="p-4 space-y-3">
                                            <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                                <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Numéro:</span>
                                                <span>{{ slotProps.data.contractNumber }}</span>
                                            </div>
                                            <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                                <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Date d'effet:</span>
                                                <span>{{ formatDate(slotProps.data.effectDate) }}</span>
                                            </div>
                                            <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                                <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Date d'échéance:</span>
                                                <span>{{ formatDate(slotProps.data.dueDate) }}</span>
                                            </div>
                                            <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                                <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Prime TTC:</span>
                                                <span>{{ formatCurrency(slotProps.data.ttcPremium) }}</span>
                                            </div>
                                            <div class="flex flex-col sm:flex-row sm:items-center py-1">
                                                <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Périodicité:</span>
                                                <span>{{ formatperiodicity(slotProps.data.periodicity) }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </DataTable>
                </div>
            </div>

            <!-- Deuxième bloc : DataTable des contrats avec assurés qui auront 75 ans -->
            <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
                <div class="flex flex-wrap justify-between items-center mb-6">
                    <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-200">Contrats actifs - Assurés atteignant 75 ans l'année prochaine</h2>
                    <div class="flex items-center">
                        <span v-if="contracts75.length > 0" class="text-sm text-gray-500 mr-4">{{ contracts75.length }} contrat(s) trouvé(s)</span>
                        <IconField class="w-64">
                            <InputIcon>
                                <i class="pi pi-search"></i>
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Recherche globale" class="w-full" />
                        </IconField>
                    </div>
                </div>

                <DataTable
                    :value="contracts75"
                    v-model:expandedRows="expandedRows"
                    v-model:filters="filters"
                    filterDisplay="menu"
                    :loading="loading75"
                    dataKey="id"
                    :paginator="true"
                    :rows="5"
                    :rowsPerPageOptions="[5, 10, 25]"
                    :globalFilterFields="['contractNumber', 'insured.name', 'insured.surname', 'product.name', 'product.insurer.name', 'ttcPremium']"
                    tableStyle="min-width: 60rem"
                    showGridlines
                    stripedRows
                    class="p-datatable-sm"
                >
                    <template #empty> Aucun contrat trouvé pour les assurés ayant 75 ans l'année prochaine. </template>
                    <template #loading> Chargement des contrats en cours. Veuillez patienter. </template>

                    <Column expander style="width: 3rem" />

                    <Column field="contractNumber" header="N° de contrat" sortable>
                        <template #body="slotProps">
                            <span class="font-medium">{{ slotProps.data.contractNumber }}</span>
                        </template>
                    </Column>

                    <Column field="insured.name" header="Nom assuré" sortable>
                        <template #body="slotProps"> {{ slotProps.data.insured.surname }} {{ slotProps.data.insured.name }} </template>
                    </Column>

                    <Column field="insured.birthdate" header="Date de naissance" sortable>
                        <template #body="slotProps">
                            {{ formatDate(slotProps.data.insured.birthdate) }}
                            <span class="text-xs ml-2 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800"> {{ calculateAge(slotProps.data.insured.birthdate) }} ans </span>
                        </template>
                    </Column>

                    <Column field="product.insurer.name" header="Assureur" sortable>
                        <template #body="slotProps">
                            {{ slotProps.data.product.insurer.name }}
                        </template>
                    </Column>

                    <Column field="product.name" header="Produit" sortable>
                        <template #body="slotProps">
                            {{ slotProps.data.product.name }}
                        </template>
                    </Column>

                    <Column field="ttcPremium" header="Prime TTC" sortable>
                        <template #body="slotProps">
                            {{ formatCurrency(slotProps.data.ttcPremium) }}
                        </template>
                    </Column>

                    <!-- <Column field="status" header="Statut">
                        <template #body="slotProps">
                            <Tag :value="slotProps.data.status" :severity="getContractStatusSeverity(slotProps.data.status)" />
                        </template>
                    </Column> -->

                    <Column headerStyle="width:8rem">
                        <template #header>
                            <div class="text-center">Actions</div>
                        </template>
                        <template #body="slotProps">
                            <div class="flex justify-center gap-2">
                                <Button icon="pi pi-eye" class="p-button-rounded p-button-info p-button-sm hover:scale-110 transition-all duration-300" title="Voir détails" @click="showAllContractInfo(slotProps.data)" />
                                <!-- <Button icon="pi pi-envelope" class="p-button-rounded p-button-warning p-button-sm" title="Envoyer notification" @click="sendNotification(slotProps.data)" /> -->
                            </div>
                        </template>
                    </Column>

                    <template #expansion="slotProps">
                        <div class="p-5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
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
                                        <div class="flex flex-col sm:flex-row sm:items-center py-1">
                                            <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Pays d'origine:</span>
                                            <span>{{ slotProps.data.insured.country_origin?.longName }}</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Détails du contrat -->
                                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                                    <div class="bg-gray-100 dark:bg-gray-700 px-4 py-3 flex items-center">
                                        <i class="pi pi-file text-green-500 mr-2"></i>
                                        <h5 class="m-0 font-semibold">Détails du contrat</h5>
                                    </div>
                                    <div class="p-4 space-y-3">
                                        <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                            <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Numéro:</span>
                                            <span>{{ slotProps.data.contractNumber }}</span>
                                        </div>
                                        <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                            <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Date d'effet:</span>
                                            <span>{{ formatDate(slotProps.data.effectDate) }}</span>
                                        </div>
                                        <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                            <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Date d'échéance:</span>
                                            <span>{{ formatDate(slotProps.data.dueDate) }}</span>
                                        </div>
                                        <div class="flex flex-col sm:flex-row sm:items-center py-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                            <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Prime TTC:</span>
                                            <span>{{ formatCurrency(slotProps.data.ttcPremium) }}</span>
                                        </div>
                                        <div class="flex flex-col sm:flex-row sm:items-center py-1">
                                            <span class="font-medium text-gray-700 dark:text-gray-300 w-40">Couverture:</span>
                                            <span>{{ slotProps.data.coveragePercentage }}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </DataTable>
            </div>
        </div>
    </div>
</template>
