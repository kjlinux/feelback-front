<script setup>
import { useLayout } from '@/layout/composables/layout';
import { apiClient } from '@/service/auth';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch, nextTick, onBeforeUnmount } from 'vue';
import Highcharts from 'highcharts';

const { getPrimary, getSurface, isDarkTheme } = useLayout();
const toast = useToast();

const loading = ref(true);
const sentimentData = ref(null);
const error = ref(null);
const chartContainer = ref(null);
const selectedView = ref('pie');
const selectedPeriod = ref(7);
let chartInstance = null;

const viewOptions = [
    { label: 'Graphique en secteurs', value: 'pie' },
    { label: 'Graphique en barres', value: 'bar' },
    { label: 'Graphique en anneaux', value: 'donut' }
];

const periodOptions = [
    { label: 'Derniers 7 jours', value: 7 },
    { label: 'Derniers 15 jours', value: 15 },
    { label: 'Dernier mois (30j)', value: 30 },
    { label: 'Derniers 60 jours', value: 60 },
    { label: 'Derniers 90 jours', value: 90 }
];

const chartOptions = computed(() => {
    if (!sentimentData.value || !sentimentData.value.series || sentimentData.value.series.length === 0) {
        return {};
    }

    const series = sentimentData.value.series[0];
    const totalFeedbacks = series.data.reduce((sum, item) => sum + item.y, 0);

    const baseConfig = {
        chart: {
            height: 450,
            backgroundColor: 'transparent',
            style: {
                fontFamily: 'Inter, system-ui, sans-serif'
            }
        },
        title: {
            text: 'Distribution des Sentiments',
            style: {
                fontSize: '18px',
                fontWeight: '600',
                color: isDarkTheme.value ? '#ffffff' : '#374151'
            }
        },
        subtitle: {
            text: `Analyse de ${totalFeedbacks.toLocaleString()} feedbacks sur ${selectedPeriod.value} jour${selectedPeriod.value > 1 ? 's' : ''}`,
            style: {
                fontSize: '14px',
                color: isDarkTheme.value ? '#d1d5db' : '#6b7280'
            }
        },
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
                return `<b>${this.point.name}</b><br/>
                        <span style="color:${this.point.color}">●</span>
                        Nombre: <b>${this.point.y.toLocaleString()}</b><br/>
                        Pourcentage: <b>${this.point.percentage.toFixed(1)}%</b><br/>
                        <small>Cliquez pour plus de détails</small>`;
            }
        },
        legend: {
            align: 'right',
            verticalAlign: 'middle',
            layout: 'vertical',
            itemStyle: {
                color: isDarkTheme.value ? '#ffffff' : '#374151',
                fontSize: '12px'
            },
            itemHoverStyle: {
                color: isDarkTheme.value ? '#f3f4f6' : '#111827'
            }
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b><br>{point.percentage:.1f}%',
                    style: {
                        color: isDarkTheme.value ? '#ffffff' : '#000000',
                        fontSize: '11px',
                        fontWeight: '500'
                    },
                    distance: 20
                },
                showInLegend: true,
                borderWidth: 2,
                borderColor: isDarkTheme.value ? '#374151' : '#ffffff',
                size: '70%',
                innerSize: selectedView.value === 'donut' ? '40%' : '0%'
            },
            column: {
                borderRadius: 4,
                borderWidth: 0,
                dataLabels: {
                    enabled: true,
                    style: {
                        color: isDarkTheme.value ? '#ffffff' : '#374151',
                        fontSize: '11px',
                        fontWeight: '500'
                    },
                    formatter: function () {
                        return this.y.toLocaleString();
                    }
                }
            }
        },
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

    if (selectedView.value === 'bar') {
        return {
            ...baseConfig,
            chart: {
                ...baseConfig.chart,
                type: 'column'
            },
            xAxis: {
                categories: series.data.map((item) => item.name),
                labels: {
                    style: {
                        color: isDarkTheme.value ? '#d1d5db' : '#6b7280',
                        fontSize: '12px'
                    }
                },
                gridLineColor: isDarkTheme.value ? '#374151' : '#e5e7eb',
                lineColor: isDarkTheme.value ? '#4b5563' : '#d1d5db'
            },
            yAxis: {
                title: {
                    text: 'Nombre de feedbacks',
                    style: {
                        color: isDarkTheme.value ? '#d1d5db' : '#6b7280',
                        fontSize: '12px'
                    }
                },
                labels: {
                    style: {
                        color: isDarkTheme.value ? '#d1d5db' : '#6b7280',
                        fontSize: '11px'
                    }
                },
                gridLineColor: isDarkTheme.value ? '#374151' : '#e5e7eb'
            },
            series: [
                {
                    name: 'Feedbacks',
                    data: series.data.map((item) => ({
                        name: item.name,
                        y: item.y,
                        color: item.color
                    })),
                    colorByPoint: true
                }
            ],
            legend: {
                enabled: false
            }
        };
    }

    return {
        ...baseConfig,
        chart: {
            ...baseConfig.chart,
            type: 'pie'
        },
        series: [
            {
                name: 'Feedbacks',
                colorByPoint: true,
                data: series.data.map((item) => ({
                    name: item.name,
                    y: item.y,
                    percentage: item.percentage,
                    color: item.color,
                    drilldown: item.drilldown
                }))
            }
        ]
    };
});

const totalFeedbacks = computed(() => {
    if (!sentimentData.value || !sentimentData.value.series) return 0;
    return sentimentData.value.series[0].data.reduce((sum, item) => sum + item.y, 0);
});

const satisfactionRate = computed(() => {
    if (!sentimentData.value || !sentimentData.value.series) return 0;
    const satisfied = sentimentData.value.series[0].data.find((item) => item.name === 'Satisfait');
    return satisfied ? satisfied.percentage : 0;
});

const dominantSentiment = computed(() => {
    if (!sentimentData.value || !sentimentData.value.series) return null;
    return sentimentData.value.series[0].data.reduce((max, current) => (current.y > max.y ? current : max));
});

const sentimentTrend = computed(() => {
    if (!sentimentData.value || !sentimentData.value.series) return 'stable';
    const satisfied = sentimentData.value.series[0].data.find((item) => item.name === 'Satisfait');
    const unsatisfied = sentimentData.value.series[0].data.find((item) => item.name === 'Insatisfait');

    if (satisfied && unsatisfied) {
        const ratio = satisfied.y / unsatisfied.y;
        if (ratio > 4) return 'excellent';
        if (ratio > 2) return 'good';
        if (ratio > 1) return 'moderate';
        return 'poor';
    }
    return 'stable';
});

const createChart = () => {
    try {
        if (chartContainer.value && chartOptions.value && Object.keys(chartOptions.value).length > 0) {
            if (chartInstance) {
                chartInstance.destroy();
            }

            chartInstance = Highcharts.chart(chartContainer.value, chartOptions.value);

            if (chartInstance.series[0]) {
                chartInstance.series[0].points?.forEach((point) => {
                    point.graphic?.on('click', () => {
                        showDrilldownInfo(point.options);
                    });
                });
            }
        }
    } catch (error) {
        console.error('Erreur lors de la création du graphique:', error);
    }
};

const showDrilldownInfo = (pointData) => {
    toast.add({
        severity: 'info',
        summary: `Détails - ${pointData.name}`,
        detail: `${pointData.y.toLocaleString()} feedbacks (${pointData.percentage.toFixed(1)}%). Fonctionnalité de drill-down à implémenter.`,
        life: 4000
    });
};

watch(
    [chartOptions, selectedView],
    () => {
        nextTick(() => {
            createChart();
        });
    },
    { deep: true }
);

const getTrendClass = (trend) => {
    switch (trend) {
        case 'excellent':
            return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
        case 'good':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
        case 'moderate':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
        case 'poor':
            return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
};

const getTrendLabel = (trend) => {
    switch (trend) {
        case 'excellent':
            return 'Excellent';
        case 'good':
            return 'Bon';
        case 'moderate':
            return 'Modéré';
        case 'poor':
            return 'À améliorer';
        default:
            return 'Stable';
    }
};

const getTrendIcon = (trend) => {
    switch (trend) {
        case 'excellent':
            return 'Excellent';
        case 'good':
            return 'Bon';
        case 'moderate':
            return 'Modéré';
        case 'poor':
            return 'Insuffisant';
        default:
            return 'null';
    }
};

const fetchSentimentDistribution = async () => {
    try {
        loading.value = true;
        error.value = null;

        const params = {
            period: selectedPeriod.value
        };

        const response = await apiClient.get('/app/dashboard/sentiment-distribution', { params });

        console.log('Données sentiments reçues:', response.data);

        sentimentData.value = response.data;

        toast.add({
            severity: 'success',
            summary: 'Succès',
            detail: `Distribution des sentiments chargée (${selectedPeriod.value} jour${selectedPeriod.value > 1 ? 's' : ''})`,
            life: 3000
        });
    } catch (err) {
        error.value = 'Erreur lors du chargement de la distribution des sentiments';
        console.error('Error fetching sentiment distribution:', err);

        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger la distribution des sentiments',
            life: 5000
        });
    } finally {
        loading.value = false;
    }
};

watch([selectedPeriod], async () => {
    try {
        await fetchSentimentDistribution();
        await nextTick();
        createChart();
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
    }
});

onMounted(async () => {
    try {
        await fetchSentimentDistribution();
        await nextTick();
        createChart();
    } catch (error) {
        console.error('Erreur lors du montage du composant:', error);
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
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Distribution des Sentiments</h2>
                <p class="text-gray-600 dark:text-gray-400">Répartition des feedbacks par catégorie de sentiment</p>
            </div>

            <div class="flex items-center gap-4 mt-4 lg:mt-0">
                <Dropdown v-model="selectedPeriod" :options="periodOptions" optionLabel="label" optionValue="value" placeholder="Période d'analyse" class="w-48" :class="{ 'p-dropdown-dark': isDarkTheme }" />

                <Dropdown v-model="selectedView" :options="viewOptions" optionLabel="label" optionValue="value" placeholder="Type de graphique" class="w-48" :class="{ 'p-dropdown-dark': isDarkTheme }" />

                <button @click="fetchSentimentDistribution" :disabled="loading" class="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <svg class="w-4 h-4 mr-2" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    {{ loading ? 'Actualisation...' : 'Actualiser' }}
                </button>
            </div>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-3 text-gray-600 dark:text-gray-400">Chargement de la distribution...</span>
        </div>

        <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div class="flex items-center">
                <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="ml-2 text-red-800 dark:text-red-200">{{ error }}</span>
            </div>
            <button @click="fetchSentimentDistribution" class="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">Réessayer</button>
        </div>

        <div v-else-if="sentimentData && sentimentData.series" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div class="text-center">
                    <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {{ totalFeedbacks.toLocaleString() }}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Total feedbacks</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-green-600 dark:text-green-400">{{ satisfactionRate.toFixed(1) }}%</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Taux de satisfaction</div>
                </div>
                <div class="text-center">
                    <div class="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {{ dominantSentiment ? dominantSentiment.name : 'N/A' }}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Sentiment dominant</div>
                </div>
                <div class="text-center">
                    <div class="flex items-center justify-center">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium" :class="getTrendClass(sentimentTrend)"> {{ getTrendIcon(sentimentTrend) }} {{ getTrendLabel(sentimentTrend) }} </span>
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Tendance globale</div>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div v-if="!chartOptions || Object.keys(chartOptions).length === 0" class="text-center py-8 text-gray-500">Configuration du graphique en cours...</div>
                <div v-else>
                    <div ref="chartContainer" style="height: 450px; width: 100%"></div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            ></path>
                        </svg>
                        Détails par Sentiment
                    </h3>
                    <div class="space-y-4">
                        <div v-for="item in sentimentData.series[0].data" :key="item.name" class="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            <div class="flex items-center">
                                <div class="w-4 h-4 rounded-full mr-3" :style="{ backgroundColor: item.color }"></div>
                                <div>
                                    <div class="font-medium text-gray-900 dark:text-white">{{ item.name }}</div>
                                    <div class="text-sm text-gray-500 dark:text-gray-400">{{ item.percentage.toFixed(1) }}% du total</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-lg font-bold text-gray-900 dark:text-white">
                                    {{ item.y.toLocaleString() }}
                                </div>
                                <div class="text-sm text-gray-500 dark:text-gray-400">feedbacks</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                    <h3 class="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                            ></path>
                        </svg>
                        Insights & Recommandations
                    </h3>
                    <div class="space-y-4">
                        <div class="p-4 bg-white dark:bg-gray-800 rounded-lg">
                            <h4 class="font-medium text-gray-900 dark:text-white mb-2">Analyse Globale</h4>
                            <p class="text-sm text-gray-600 dark:text-gray-400">
                                Sur les {{ selectedPeriod }} derniers jours, avec {{ satisfactionRate.toFixed(1) }}% de satisfaction, votre performance est
                                {{ satisfactionRate >= 70 ? 'excellente' : satisfactionRate >= 50 ? 'correcte' : 'à améliorer' }}.
                            </p>
                        </div>

                        <div class="p-4 bg-white dark:bg-gray-800 rounded-lg" v-if="sentimentData.series[0].data.find((item) => item.name === 'Insatisfait')">
                            <h4 class="font-medium text-gray-900 dark:text-white mb-2">Points d'Amélioration</h4>
                            <p class="text-sm text-gray-600 dark:text-gray-400">
                                {{ sentimentData.series[0].data.find((item) => item.name === 'Insatisfait').percentage.toFixed(1) }}% d'insatisfaction représente
                                {{ sentimentData.series[0].data.find((item) => item.name === 'Insatisfait').y.toLocaleString() }}
                                utilisateurs à reconquérir.
                            </p>
                        </div>

                        <div class="p-4 bg-white dark:bg-gray-800 rounded-lg" v-if="sentimentData.series[0].data.find((item) => item.name === 'Neutre')">
                            <h4 class="font-medium text-gray-900 dark:text-white mb-2">Potentiel de Conversion</h4>
                            <p class="text-sm text-gray-600 dark:text-gray-400">{{ sentimentData.series[0].data.find((item) => item.name === 'Neutre').percentage.toFixed(1) }}% d'utilisateurs neutres peuvent être convertis en clients satisfaits.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-else-if="!loading" class="text-center py-12 text-gray-500 dark:text-gray-400">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2h4a1 1 0 011 1v2H1V5a1 1 0 011-1h4z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 7v10a2 2 0 002 2h12a2 2 0 002-2V7H2z"></path>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucune donnée de sentiment</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Aucune distribution de sentiment disponible.</p>
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
