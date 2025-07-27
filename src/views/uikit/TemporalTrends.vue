<script setup>
import { useLayout } from '@/layout/composables/layout';
import { apiClient } from '@/service/auth';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch, nextTick, onBeforeUnmount } from 'vue';
import Highcharts from 'highcharts';

const { getPrimary, getSurface, isDarkTheme } = useLayout();
const toast = useToast();

const loading = ref(true);
const trendsData = ref(null);
const error = ref(null);
const selectedPeriod = ref('30d');
const startDate = ref(new Date(new Date().setDate(new Date().getDate() - 30)));
const endDate = ref(new Date());
const dateRange = ref([startDate.value, endDate.value]);
const chartRef = ref(null);
const chartContainer = ref(null);
let chartInstance = null;

const periodOptions = [
    { label: 'Quotidien', value: 'daily' },
    { label: 'Hebdomadaire', value: 'weekly' },
    { label: 'Mensuel', value: 'monthly' }
];

const chartOptions = computed(() => {
    if (!trendsData.value || !trendsData.value.series || trendsData.value.series.length === 0) {
        return {};
    }

    return {
        chart: {
            type: 'line',
            height: 400,
            backgroundColor: 'transparent',
            zoomType: 'x',
            style: {
                fontFamily: 'Inter, system-ui, sans-serif'
            }
        },
        title: {
            text: 'Évolution des Tendances',
            style: {
                fontSize: '18px',
                fontWeight: '600',
                color: isDarkTheme.value ? '#ffffff' : '#374151'
            }
        },
        subtitle: {
            text: 'Taux de satisfaction et volume de retours dans le temps',
            style: {
                fontSize: '14px',
                color: isDarkTheme.value ? '#d1d5db' : '#6b7280'
            }
        },
        xAxis: {
            categories: trendsData.value.categories || [],
            labels: {
                style: {
                    color: isDarkTheme.value ? '#d1d5db' : '#6b7280',
                    fontSize: '12px'
                },
                rotation: -45
            },
            gridLineColor: isDarkTheme.value ? '#374151' : '#e5e7eb',
            lineColor: isDarkTheme.value ? '#4b5563' : '#d1d5db',
            tickColor: isDarkTheme.value ? '#4b5563' : '#d1d5db'
        },
        yAxis: [
            {
                title: {
                    text: 'Nombre de retours',
                    style: {
                        color: '#3b82f6',
                        fontSize: '12px',
                        fontWeight: '500'
                    }
                },
                labels: {
                    style: {
                        color: '#3b82f6',
                        fontSize: '11px'
                    }
                },
                gridLineColor: isDarkTheme.value ? '#374151' : '#e5e7eb',
                lineColor: isDarkTheme.value ? '#4b5563' : '#d1d5db'
            },
            {
                title: {
                    text: 'Taux de satisfaction (%)',
                    style: {
                        color: '#10b981',
                        fontSize: '12px',
                        fontWeight: '500'
                    }
                },
                labels: {
                    style: {
                        color: '#10b981',
                        fontSize: '11px'
                    },
                    format: '{value}%'
                },
                opposite: true,
                min: 0,
                max: 100,
                gridLineColor: 'transparent'
            }
        ],
        tooltip: {
            shared: true,
            backgroundColor: isDarkTheme.value ? '#374151' : '#ffffff',
            borderColor: isDarkTheme.value ? '#6b7280' : '#d1d5db',
            borderRadius: 8,
            shadow: true,
            style: {
                color: isDarkTheme.value ? '#ffffff' : '#374151',
                fontSize: '12px'
            },
            formatter: function () {
                let tooltip = `<b>${this.x}</b><br/>`;
                this.points.forEach((point) => {
                    const color = point.series.color;
                    const value = point.series.name === 'Taux de satisfaction (%)' ? `${point.y}%` : point.y.toLocaleString();
                    tooltip += `<span style="color:${color}">●</span> ${point.series.name}: <b>${value}</b><br/>`;
                });
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
            line: {
                marker: {
                    enabled: true,
                    radius: 4,
                    states: {
                        hover: {
                            radius: 6
                        }
                    }
                },
                lineWidth: 3,
                states: {
                    hover: {
                        lineWidth: 4
                    }
                }
            },
            column: {
                borderRadius: 2,
                borderWidth: 0
            }
        },
        series: trendsData.value.series.map((series) => ({
            ...series,
            marker: {
                symbol: 'circle'
            },
            animation: {
                duration: 1000
            }
        })),
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

const totalFeedbacks = computed(() => {
    if (!trendsData.value || !trendsData.value.series) return 0;
    const feedbackSeries = trendsData.value.series.find((s) => s.name === 'Total feedbacks');
    return feedbackSeries ? feedbackSeries.data.reduce((a, b) => a + b, 0) : 0;
});

const averageSatisfaction = computed(() => {
    if (!trendsData.value || !trendsData.value.series) return 0;
    const satisfactionSeries = trendsData.value.series.find((s) => s.name === 'Taux de satisfaction (%)');
    if (!satisfactionSeries || satisfactionSeries.data.length === 0) return 0;
    const sum = satisfactionSeries.data.reduce((a, b) => a + b, 0);
    return (sum / satisfactionSeries.data.length).toFixed(1);
});

const periodsCount = computed(() => {
    return trendsData.value && trendsData.value.categories ? trendsData.value.categories.length : 0;
});

const createChart = () => {
    try {
        if (chartContainer.value && chartOptions.value && Object.keys(chartOptions.value).length > 0) {
            if (chartInstance) {
                chartInstance.destroy();
            }

            chartInstance = Highcharts.chart(chartContainer.value, chartOptions.value);
        }
    } catch (error) {
        console.error('Erreur lors de la création du graphique:', error);
    }
};

watch(
    chartOptions,
    () => {
        nextTick(() => {
            createChart();
        });
    },
    { deep: true }
);

const getSeriesData = (seriesName, index) => {
    if (!trendsData.value || !trendsData.value.series) return 0;
    let series;

    if (seriesName === 'Total feedbacks') {
        series = trendsData.value.series.find((s) => s.name === 'Total feedbacks');
    } else if (seriesName === 'satisfaction') {
        series = trendsData.value.series.find((s) => s.name === 'Taux de satisfaction (%)');
    }

    return series && series.data && series.data[index] !== undefined ? series.data[index] : 0;
};

const fetchTemporalTrends = async () => {
    try {
        loading.value = true;
        error.value = null;

        const params = {
            period: selectedPeriod.value,
            start_date: startDate.value,
            end_date: endDate.value
        };

        const response = await apiClient.get('/app/dashboard/trends', { params });

        console.log('Données reçues:', response.data);

        trendsData.value = response.data.data;

        if (!response.data.series || response.data.series.length === 0) {
            console.warn('Aucune série de données trouvée');
        }

        toast.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Tendances temporelles chargées avec succès',
            life: 3000
        });
    } catch (err) {
        error.value = 'Erreur lors du chargement des tendances temporelles';
        console.error('Error fetching temporal trends:', err);

        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les tendances temporelles',
            life: 5000
        });
    } finally {
        loading.value = false;
    }
};

onMounted(async () => {
    try {
        await fetchTemporalTrends();

        await nextTick();
        createChart();
    } catch (error) {
        console.error('Erreur lors du montage du composant:', error);
    }
});

watch([selectedPeriod, startDate, endDate], async () => {
    try {
        await fetchTemporalTrends();
        await nextTick();
        createChart();
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
    }
});

onBeforeUnmount(() => {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
});
</script>

<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Tendances Temporelles</h2>
                <p class="text-gray-600 dark:text-gray-400">Évolution du taux de satisfaction et du volume de retours</p>
            </div>

            <div class="flex flex-col sm:flex-row gap-4 mt-4 lg:mt-0">
                <Dropdown v-model="selectedPeriod" :options="periodOptions" optionLabel="label" optionValue="value" placeholder="Sélectionner une période" class="w-48" :class="{ 'p-dropdown-dark': isDarkTheme }" />

                <div class="flex gap-2">
                    <Calendar v-model="startDate" placeholder="Date de début" dateFormat="dd/mm/yy" showIcon class="w-40" :class="{ 'p-calendar-dark': isDarkTheme }" />
                    <Calendar v-model="endDate" placeholder="Date de fin" dateFormat="dd/mm/yy" showIcon class="w-40" :class="{ 'p-calendar-dark': isDarkTheme }" />
                </div>
            </div>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-3 text-gray-600 dark:text-gray-400">Chargement des tendances...</span>
        </div>

        <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div class="flex items-center">
                <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="ml-2 text-red-800 dark:text-red-200">{{ error }}</span>
            </div>
            <button @click="fetchTemporalTrends" class="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">Réessayer</button>
        </div>

        <div v-else-if="trendsData && trendsData.series && trendsData.series.length > 0" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div class="text-center">
                    <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {{ totalFeedbacks.toLocaleString() }}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Total des retours</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-green-600 dark:text-green-400">{{ averageSatisfaction }}%</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Satisfaction moyenne</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {{ periodsCount }}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Périodes analysées</div>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div v-if="!chartOptions || Object.keys(chartOptions).length === 0" class="text-center py-8 text-gray-500">Configuration du graphique en cours...</div>

                <div v-else>
                    <div ref="chartContainer" style="height: 400px; width: 100%"></div>
                </div>
            </div>

            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Résumé des données</h3>

                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                        <thead>
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Période</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total retours</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Taux satisfaction</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tendance</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 dark:divide-gray-600">
                            <tr v-for="(category, index) in trendsData.categories.slice(0, 10)" :key="index" class="hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors">
                                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                    {{ category }}
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    {{ getSeriesData('Total feedbacks', index)?.toLocaleString() || 0 }}
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm">
                                    <span
                                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                        :class="{
                                            'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400': getSeriesData('satisfaction', index) >= 60,
                                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400': getSeriesData('satisfaction', index) >= 40 && getSeriesData('satisfaction', index) < 60,
                                            'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400': getSeriesData('satisfaction', index) < 40
                                        }"
                                    >
                                        {{ getSeriesData('satisfaction', index) || 0 }}%
                                    </span>
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm">
                                    <span
                                        v-if="index > 0"
                                        class="inline-flex items-center"
                                        :class="{
                                            'text-green-600 dark:text-green-400': getSeriesData('satisfaction', index) > getSeriesData('satisfaction', index - 1),
                                            'text-red-600 dark:text-red-400': getSeriesData('satisfaction', index) < getSeriesData('satisfaction', index - 1),
                                            'text-gray-600 dark:text-gray-400': getSeriesData('satisfaction', index) === getSeriesData('satisfaction', index - 1)
                                        }"
                                    >
                                        <svg v-if="getSeriesData('satisfaction', index) > getSeriesData('satisfaction', index - 1)" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 17l9.2-9.2M17 17V7H7"></path>
                                        </svg>
                                        <svg v-else-if="getSeriesData('satisfaction', index) < getSeriesData('satisfaction', index - 1)" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 7l-9.2 9.2M7 7v10h10"></path>
                                        </svg>
                                        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                                        </svg>
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div v-if="trendsData.categories && trendsData.categories.length > 10" class="text-center py-3 text-sm text-gray-500 dark:text-gray-400">... et {{ trendsData.categories.length - 10 }} autres périodes</div>
                </div>
            </div>
        </div>

        <div v-else-if="!loading && trendsData" class="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>Aucune donnée disponible pour la période sélectionnée</p>
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
