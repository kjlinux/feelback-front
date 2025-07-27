<script setup>
import { useLayout } from '@/layout/composables/layout';
import { apiClient } from '@/service/auth';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch, nextTick, onBeforeUnmount } from 'vue';
import Highcharts from 'highcharts';

const { getPrimary, getSurface, isDarkTheme } = useLayout();
const toast = useToast();

// Reactive data
const loading = ref(true);
const deviceData = ref(null);
const error = ref(null);
const chartContainer = ref(null);
let chartInstance = null;

// Highcharts configuration
const chartOptions = computed(() => {
    if (!deviceData.value || !deviceData.value.chart_data || !deviceData.value.chart_data.series) {
        return {};
    }

    const chartData = deviceData.value.chart_data;
    
    // Préparer les données pour le graphique en barres horizontales
    const satisfactionData = chartData.series.find(s => s.name === 'Taux de satisfaction (%)');
    const feedbackData = chartData.series.find(s => s.name === 'Total feedbacks');

    return {
        chart: {
            type: 'bar',
            height: 400,
            backgroundColor: 'transparent',
            style: {
                fontFamily: 'Inter, system-ui, sans-serif'
            }
        },
        title: {
            text: 'Performance par Dispositif',
            style: {
                fontSize: '18px',
                fontWeight: '600',
                color: isDarkTheme.value ? '#ffffff' : '#374151'
            }
        },
        subtitle: {
            text: 'Taux de satisfaction et volume de retours par boîtier',
            style: {
                fontSize: '14px',
                color: isDarkTheme.value ? '#d1d5db' : '#6b7280'
            }
        },
        xAxis: {
            categories: chartData.categories || [],
            labels: {
                style: {
                    color: isDarkTheme.value ? '#d1d5db' : '#6b7280',
                    fontSize: '12px'
                }
            },
            gridLineColor: isDarkTheme.value ? '#374151' : '#e5e7eb',
            lineColor: isDarkTheme.value ? '#4b5563' : '#d1d5db',
            tickColor: isDarkTheme.value ? '#4b5563' : '#d1d5db'
        },
        yAxis: [
            {
                // Primary Y-axis for satisfaction rate
                title: {
                    text: 'Taux de satisfaction (%)',
                    style: {
                        color: '#28a745',
                        fontSize: '12px',
                        fontWeight: '500'
                    }
                },
                labels: {
                    style: {
                        color: '#28a745',
                        fontSize: '11px'
                    },
                    format: '{value}%'
                },
                min: 0,
                max: 100,
                gridLineColor: isDarkTheme.value ? '#374151' : '#e5e7eb',
                lineColor: isDarkTheme.value ? '#4b5563' : '#d1d5db'
            },
            {
                // Secondary Y-axis for feedback count
                title: {
                    text: 'Nombre de retours',
                    style: {
                        color: '#17a2b8',
                        fontSize: '12px',
                        fontWeight: '500'
                    }
                },
                labels: {
                    style: {
                        color: '#17a2b8',
                        fontSize: '11px'
                    },
                    formatter: function() {
                        return this.value.toLocaleString();
                    }
                },
                opposite: true,
                gridLineColor: 'transparent'
            }
        ],
        tooltip: {
            backgroundColor: isDarkTheme.value ? '#374151' : '#ffffff',
            borderColor: isDarkTheme.value ? '#6b7280' : '#d1d5db',
            borderRadius: 8,
            shadow: true,
            style: {
                color: isDarkTheme.value ? '#ffffff' : '#374151',
                fontSize: '12px'
            },
            formatter: function () {
                const deviceInfo = deviceData.value.table_data.find(d => d.name === this.x);
                let tooltip = `<b>${this.x}</b><br/>`;
                tooltip += `<span style="color:${this.color}">●</span> ${this.series.name}: <b>${this.series.name.includes('%') ? this.y + '%' : this.y.toLocaleString()}</b><br/>`;
                if (deviceInfo) {
                    tooltip += `📍 ${deviceInfo.location}<br/>`;
                    tooltip += `📊 ${deviceInfo.avg_feedbacks_per_day} retours/jour en moyenne<br/>`;
                    tooltip += `🕒 Dernier retour: ${new Date(deviceInfo.last_feedback_date).toLocaleDateString('fr-FR')}`;
                }
                return tooltip;
            }
        },
        legend: {
            itemStyle: {
                color: isDarkTheme.value ? '#ffffff' : '#374151',
                fontSize: '12px'
            },
            itemHoverStyle: {
                color: isDarkTheme.value ? '#f3f4f6' : '#111827'
            }
        },
        plotOptions: {
            bar: {
                borderRadius: 4,
                borderWidth: 0,
                dataLabels: {
                    enabled: true,
                    style: {
                        color: isDarkTheme.value ? '#ffffff' : '#374151',
                        fontSize: '11px',
                        fontWeight: '500'
                    },
                    formatter: function() {
                        return this.series.name.includes('%') ? this.y + '%' : this.y.toLocaleString();
                    }
                },
                grouping: true,
                pointPadding: 0.1,
                groupPadding: 0.15
            }
        },
        series: [
            {
                name: 'Taux de satisfaction (%)',
                data: satisfactionData ? satisfactionData.data : [],
                color: '#28a745',
                yAxis: 0,
                animation: {
                    duration: 1000
                }
            },
            {
                name: 'Total feedbacks (milliers)',
                data: feedbackData ? feedbackData.data.map(val => Math.round(val / 1000)) : [],
                color: '#17a2b8',
                yAxis: 1,
                animation: {
                    duration: 1200,
                    defer: 200
                }
            }
        ],
        credits: {
            enabled: false
        },
        exporting: {
            enabled: true,
            buttons: {
                contextButton: {
                    theme: {
                        fill: isDarkTheme.value ? '#374151' : '#f3f4f6'
                    }
                }
            }
        }
    };
});

// Statistics computed
const totalDevices = computed(() => {
    return deviceData.value && deviceData.value.table_data ? deviceData.value.table_data.length : 0;
});

const totalFeedbacks = computed(() => {
    if (!deviceData.value || !deviceData.value.table_data) return 0;
    return deviceData.value.table_data.reduce((sum, device) => sum + device.total_feedbacks, 0);
});

const averageSatisfaction = computed(() => {
    if (!deviceData.value || !deviceData.value.table_data || deviceData.value.table_data.length === 0) return 0;
    const sum = deviceData.value.table_data.reduce((sum, device) => sum + parseFloat(device.satisfaction_rate), 0);
    return (sum / deviceData.value.table_data.length).toFixed(1);
});

const bestPerformingDevice = computed(() => {
    if (!deviceData.value || !deviceData.value.table_data || deviceData.value.table_data.length === 0) return null;
    return deviceData.value.table_data.reduce((best, current) => 
        parseFloat(current.satisfaction_rate) > parseFloat(best.satisfaction_rate) ? current : best
    );
});

// Fonction pour créer le graphique
const createChart = () => {
    try {
        if (chartContainer.value && chartOptions.value && Object.keys(chartOptions.value).length > 0) {
            // Détruire l'instance précédente si elle existe
            if (chartInstance) {
                chartInstance.destroy();
            }

            // Créer une nouvelle instance
            chartInstance = Highcharts.chart(chartContainer.value, chartOptions.value);
        }
    } catch (error) {
        console.error('Erreur lors de la création du graphique:', error);
    }
};

// Watch pour recréer le graphique quand les options changent
watch(
    chartOptions,
    () => {
        nextTick(() => {
            createChart();
        });
    },
    { deep: true }
);

// Fonction pour obtenir la classe de statut
const getStatusClass = (status) => {
    switch (status) {
        case 'success':
            return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
        case 'warning':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
        case 'error':
            return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
};

// Fonction pour obtenir l'icône de statut
const getStatusIcon = (status) => {
    switch (status) {
        case 'success':
            return '✅';
        case 'warning':
            return '⚠️';
        case 'error':
            return '❌';
        default:
            return '⚪';
    }
};

// Fetch device performance data
const fetchDevicePerformance = async () => {
    try {
        loading.value = true;
        error.value = null;

        const response = await apiClient.get('/app/dashboard/devices');

        console.log('Données dispositifs reçues:', response.data);

        deviceData.value = response.data;

        toast.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Performance des dispositifs chargée avec succès',
            life: 3000
        });
    } catch (err) {
        error.value = 'Erreur lors du chargement des performances des dispositifs';
        console.error('Error fetching device performance:', err);

        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les performances des dispositifs',
            life: 5000
        });
    } finally {
        loading.value = false;
    }
};

// Lifecycle
onMounted(async () => {
    try {
        await fetchDevicePerformance();
        await nextTick();
        createChart();
    } catch (error) {
        console.error('Erreur lors du montage du composant:', error);
    }
});

// Cleanup
onBeforeUnmount(() => {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
});
</script>

<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <!-- Header -->
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Performance par Dispositif</h2>
                <p class="text-gray-600 dark:text-gray-400">Analyse des performances de chaque boîtier de feedback</p>
            </div>

            <!-- Refresh Button -->
            <button 
                @click="fetchDevicePerformance"
                :disabled="loading"
                class="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-4 lg:mt-0"
            >
                <svg class="w-4 h-4 mr-2" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                {{ loading ? 'Actualisation...' : 'Actualiser' }}
            </button>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-3 text-gray-600 dark:text-gray-400">Chargement des performances...</span>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div class="flex items-center">
                <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="ml-2 text-red-800 dark:text-red-200">{{ error }}</span>
            </div>
            <button @click="fetchDevicePerformance" class="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">Réessayer</button>
        </div>

        <!-- Content -->
        <div v-else-if="deviceData && deviceData.chart_data && deviceData.table_data" class="space-y-6">
            <!-- Statistics Summary -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div class="text-center">
                    <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {{ totalDevices }}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Dispositifs actifs</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-green-600 dark:text-green-400">{{ averageSatisfaction }}%</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Satisfaction moyenne</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {{ totalFeedbacks.toLocaleString() }}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Total des retours</div>
                </div>
                <div class="text-center">
                    <div class="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {{ bestPerformingDevice ? bestPerformingDevice.name : 'N/A' }}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Meilleur dispositif</div>
                </div>
            </div>

            <!-- Highcharts Container -->
            <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div v-if="!chartOptions || Object.keys(chartOptions).length === 0" class="text-center py-8 text-gray-500">Configuration du graphique en cours...</div>
                <div v-else>
                    <div ref="chartContainer" style="height: 400px; width: 100%"></div>
                </div>
            </div>

            <!-- Device Details Table -->
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Détails des Dispositifs</h3>

                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                        <thead>
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dispositif</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Localisation</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total retours</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Satisfaction</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Moyenne/jour</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dernier retour</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 dark:divide-gray-600">
                            <tr v-for="device in deviceData.table_data" :key="device.id" class="hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors">
                                <td class="px-4 py-3 whitespace-nowrap">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0 h-10 w-10">
                                            <div class="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                                <span class="text-blue-600 dark:text-blue-400 font-medium text-sm">
                                                    {{ device.name.charAt(0) }}
                                                </span>
                                            </div>
                                        </div>
                                        <div class="ml-4">
                                            <div class="text-sm font-medium text-gray-900 dark:text-white">{{ device.name }}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    📍 {{ device.location }}
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                    {{ device.total_feedbacks.toLocaleString() }}
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm">
                                    <span
                                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                        :class="{
                                            'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400': parseFloat(device.satisfaction_rate) >= 70,
                                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400': parseFloat(device.satisfaction_rate) >= 50 && parseFloat(device.satisfaction_rate) < 70,
                                            'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400': parseFloat(device.satisfaction_rate) < 50
                                        }"
                                    >
                                        {{ device.satisfaction_rate }}%
                                    </span>
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    {{ parseFloat(device.avg_feedbacks_per_day).toFixed(1) }}
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    {{ new Date(device.last_feedback_date).toLocaleDateString('fr-FR') }}
                                    <br>
                                    <span class="text-xs text-gray-400">
                                        {{ new Date(device.last_feedback_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }}
                                    </span>
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm">
                                    <span
                                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                        :class="getStatusClass(device.status)"
                                    >
                                        {{ getStatusIcon(device.status) }} {{ device.status }}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- No Data State -->
        <div v-else-if="!loading" class="text-center py-12 text-gray-500 dark:text-gray-400">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucun dispositif trouvé</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Aucune donnée de performance disponible.</p>
        </div>
    </div>
</template>

<style scoped>
.overflow-x-auto::-webkit-scrollbar {
    height: 6px;
}

.overflow-x-auto::-webkit-scrollbar-track {
    @apply bg-gray-100 dark:bg-gray-700 rounded;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
    @apply bg-gray-300 dark:bg-gray-600 rounded;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
    @apply bg-gray-400 dark:bg-gray-500;
}
</style>