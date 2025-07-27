<script setup>
import { useLayout } from '@/layout/composables/layout';
import { apiClient } from '@/service/auth';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch, nextTick, onBeforeUnmount } from 'vue';
import Highcharts from 'highcharts';

const { getPrimary, getSurface, isDarkTheme } = useLayout();
const toast = useToast();

const loading = ref(true);
const hourlyData = ref(null);
const error = ref(null);
const chartContainer = ref(null);
const selectedMetric = ref('feedbacks');
let chartInstance = null;

const metricOptions = [
    { label: 'Nombre de feedbacks', value: 'feedbacks' },
    { label: 'Score moyen', value: 'score' }
];

const getGradientColor = (value, maxValue, minValue) => {
    const normalized = (value - minValue) / (maxValue - minValue);

    if (normalized > 0.8) return '#0d9488';
    if (normalized > 0.6) return '#14b8a6';
    if (normalized > 0.4) return '#2dd4bf';
    if (normalized > 0.2) return '#5eead4';
    return '#a7f3d0';
};

const chartOptions = computed(() => {
    if (!hourlyData.value || !hourlyData.value.series || hourlyData.value.series.length === 0) {
        return {};
    }

    const feedbackSeries = hourlyData.value.series.find((s) => s.name === 'Nombre de feedbacks');
    const scoreSeries = hourlyData.value.series.find((s) => s.name === 'Score moyen');

    const feedbackValues = feedbackSeries ? feedbackSeries.data.map((d) => d.y || d) : [];
    const maxFeedback = Math.max(...feedbackValues);
    const minFeedback = Math.min(...feedbackValues);

    const feedbackDataWithColors = feedbackSeries
        ? feedbackSeries.data.map((point) => ({
              y: point.y || point,
              color: getGradientColor(point.y || point, maxFeedback, minFeedback)
          }))
        : [];

    return {
        chart: {
            type: 'column',
            height: 450,
            backgroundColor: 'transparent',
            style: {
                fontFamily: 'Inter, system-ui, sans-serif'
            },
            zoomType: 'x'
        },
        title: {
            text: "Patterns Horaires d'Utilisation",
            style: {
                fontSize: '18px',
                fontWeight: '600',
                color: isDarkTheme.value ? '#ffffff' : '#374151'
            }
        },
        subtitle: {
            text: 'Distribution des feedbacks et scores moyens par heure de la journée',
            style: {
                fontSize: '14px',
                color: isDarkTheme.value ? '#d1d5db' : '#6b7280'
            }
        },
        xAxis: {
            categories: hourlyData.value.categories || [],
            labels: {
                style: {
                    color: isDarkTheme.value ? '#d1d5db' : '#6b7280',
                    fontSize: '11px'
                },
                rotation: -45
            },
            gridLineColor: isDarkTheme.value ? '#374151' : '#e5e7eb',
            lineColor: isDarkTheme.value ? '#4b5563' : '#d1d5db',
            tickColor: isDarkTheme.value ? '#4b5563' : '#d1d5db',
            title: {
                text: 'Heure de la journée',
                style: {
                    color: isDarkTheme.value ? '#d1d5db' : '#6b7280',
                    fontSize: '12px'
                }
            }
        },
        yAxis: [
            {
                title: {
                    text: 'Nombre de feedbacks',
                    style: {
                        color: '#0d9488',
                        fontSize: '12px',
                        fontWeight: '500'
                    }
                },
                labels: {
                    style: {
                        color: '#0d9488',
                        fontSize: '11px'
                    },
                    formatter: function () {
                        return this.value.toLocaleString();
                    }
                },
                gridLineColor: isDarkTheme.value ? '#374151' : '#e5e7eb',
                lineColor: isDarkTheme.value ? '#4b5563' : '#d1d5db'
            },
            {
                title: {
                    text: 'Score moyen',
                    style: {
                        color: '#ff6b6b',
                        fontSize: '12px',
                        fontWeight: '500'
                    }
                },
                labels: {
                    style: {
                        color: '#ff6b6b',
                        fontSize: '11px'
                    },
                    format: '{value:.2f}'
                },
                opposite: true,
                min: 1,
                max: 5,
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
                const hour = this.x;
                const period = getPeriodOfDay(hour);
                let tooltip = `<b>${hour}</b> - ${period}<br/>`;

                if (this.series.name === 'Nombre de feedbacks') {
                    tooltip += `<span style="color:${this.color}">●</span> ${this.series.name}: <b>${this.y.toLocaleString()}</b><br/>`;
                    tooltip += `📊 Intensité: ${getIntensityLabel(this.y, maxFeedback)}`;
                } else {
                    tooltip += `<span style="color:${this.color}">●</span> ${this.series.name}: <b>${this.y.toFixed(2)}</b><br/>`;
                    tooltip += `⭐ Qualité: ${getScoreLabel(this.y)}`;
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
            column: {
                borderRadius: 4,
                borderWidth: 0,
                dataLabels: {
                    enabled: false
                },
                pointPadding: 0.1,
                groupPadding: 0.05,
                shadow: false
            },
            spline: {
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
            }
        },
        series: [
            {
                name: 'Nombre de feedbacks',
                data: feedbackDataWithColors,
                type: 'column',
                yAxis: 0,
                animation: {
                    duration: 1200
                }
            },
            {
                name: 'Score moyen',
                data: scoreSeries ? scoreSeries.data : [],
                type: 'spline',
                yAxis: 1,
                color: '#ff6b6b',
                marker: {
                    symbol: 'circle'
                },
                animation: {
                    duration: 1500,
                    defer: 300
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

const getPeriodOfDay = (hour) => {
    const hourNum = parseInt(hour.replace(':00', ''));
    if (hourNum >= 5 && hourNum < 12) return 'Matin';
    if (hourNum >= 12 && hourNum < 18) return 'Après-midi';
    if (hourNum >= 18 && hourNum < 22) return 'Soirée';
    return 'Nuit';
};

const getIntensityLabel = (value, maxValue) => {
    const normalized = value / maxValue;
    if (normalized > 0.8) return 'Très élevée';
    if (normalized > 0.6) return 'Élevée';
    if (normalized > 0.4) return 'Modérée';
    if (normalized > 0.2) return 'Faible';
    return 'Très faible';
};

const getScoreLabel = (score) => {
    if (score >= 4) return 'Excellent';
    if (score >= 3) return 'Bon';
    if (score >= 2) return 'Moyen';
    if (score >= 1) return 'Faible';
    return 'Très faible';
};

const totalFeedbacks = computed(() => {
    if (!hourlyData.value || !hourlyData.value.series) return 0;
    const feedbackSeries = hourlyData.value.series.find((s) => s.name === 'Nombre de feedbacks');
    return feedbackSeries ? feedbackSeries.data.reduce((sum, point) => sum + (point.y || point), 0) : 0;
});

const averageScore = computed(() => {
    if (!hourlyData.value || !hourlyData.value.series) return 0;
    const scoreSeries = hourlyData.value.series.find((s) => s.name === 'Score moyen');
    if (!scoreSeries || scoreSeries.data.length === 0) return 0;
    const sum = scoreSeries.data.reduce((sum, score) => sum + score, 0);
    return (sum / scoreSeries.data.length).toFixed(2);
});

const peakHour = computed(() => {
    if (!hourlyData.value || !hourlyData.value.series) return 'N/A';
    const feedbackSeries = hourlyData.value.series.find((s) => s.name === 'Nombre de feedbacks');
    if (!feedbackSeries) return 'N/A';

    let maxValue = 0;
    let peakIndex = 0;
    feedbackSeries.data.forEach((point, index) => {
        const value = point.y || point;
        if (value > maxValue) {
            maxValue = value;
            peakIndex = index;
        }
    });

    return hourlyData.value.categories[peakIndex] || 'N/A';
});

const quietHour = computed(() => {
    if (!hourlyData.value || !hourlyData.value.series) return 'N/A';
    const feedbackSeries = hourlyData.value.series.find((s) => s.name === 'Nombre de feedbacks');
    if (!feedbackSeries) return 'N/A';

    let minValue = Infinity;
    let quietIndex = 0;
    feedbackSeries.data.forEach((point, index) => {
        const value = point.y || point;
        if (value < minValue) {
            minValue = value;
            quietIndex = index;
        }
    });

    return hourlyData.value.categories[quietIndex] || 'N/A';
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

const fetchHourlyPatterns = async () => {
    try {
        loading.value = true;
        error.value = null;

        const response = await apiClient.get('/app/dashboard/hourly-patterns');

        console.log('Données horaires reçues:', response.data);

        hourlyData.value = response.data;

        toast.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Patterns horaires chargés avec succès',
            life: 3000
        });
    } catch (err) {
        error.value = 'Erreur lors du chargement des patterns horaires';
        console.error('Error fetching hourly patterns:', err);

        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les patterns horaires',
            life: 5000
        });
    } finally {
        loading.value = false;
    }
};

onMounted(async () => {
    try {
        await fetchHourlyPatterns();
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
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Patterns Horaires d'Utilisation</h2>
                <p class="text-gray-600 dark:text-gray-400">Analyse de l'activité et de la qualité des feedbacks par heure</p>
            </div>

            <div class="flex items-center gap-4 mt-4 lg:mt-0">
                <button @click="fetchHourlyPatterns" :disabled="loading" class="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <svg class="w-4 h-4 mr-2" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    {{ loading ? 'Actualisation...' : 'Actualiser' }}
                </button>
            </div>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-3 text-gray-600 dark:text-gray-400">Chargement des patterns horaires...</span>
        </div>

        <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div class="flex items-center">
                <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="ml-2 text-red-800 dark:text-red-200">{{ error }}</span>
            </div>
            <button @click="fetchHourlyPatterns" class="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">Réessayer</button>
        </div>

        <div v-else-if="hourlyData && hourlyData.series" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div class="text-center">
                    <div class="text-2xl font-bold text-teal-600 dark:text-teal-400">
                        {{ totalFeedbacks.toLocaleString() }}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Total feedbacks</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-pink-600 dark:text-pink-400">{{ averageScore }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Score moyen global</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-green-600 dark:text-green-400">
                        {{ peakHour }}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Heure de pointe</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {{ quietHour }}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Heure la plus calme</div>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div v-if="!chartOptions || Object.keys(chartOptions).length === 0" class="text-center py-8 text-gray-500">Configuration du graphique en cours...</div>
                <div v-else>
                    <div ref="chartContainer" style="height: 450px; width: 100%"></div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 rounded-lg p-6 border border-teal-200 dark:border-teal-800">
                    <h3 class="text-lg font-semibold text-teal-800 dark:text-teal-200 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                        </svg>
                        Pics d'Activité
                    </h3>
                    <div class="space-y-3">
                        <div v-for="(category, index) in hourlyData.categories.slice(0, 5)" :key="index" class="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            <div class="flex items-center">
                                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ category }}</span>
                                <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">{{ getPeriodOfDay(category) }}</span>
                            </div>
                            <div class="flex items-center">
                                <span class="text-sm font-bold text-teal-600 dark:text-teal-400">
                                    {{ hourlyData.series[0].data[index]?.y?.toLocaleString() || hourlyData.series[0].data[index]?.toLocaleString() }}
                                </span>
                                <div class="ml-2 w-12 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        class="h-full bg-teal-500 transition-all duration-300"
                                        :style="{ width: ((hourlyData.series[0].data[index]?.y || hourlyData.series[0].data[index]) / Math.max(...hourlyData.series[0].data.map((d) => d.y || d))) * 100 + '%' }"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 rounded-lg p-6 border border-pink-200 dark:border-pink-800">
                    <h3 class="text-lg font-semibold text-pink-800 dark:text-pink-200 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                            ></path>
                        </svg>
                        Analyse Qualité
                    </h3>
                    <div class="space-y-3">
                        <div v-for="(category, index) in hourlyData.categories.slice(0, 5)" :key="index" class="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            <div class="flex items-center">
                                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ category }}</span>
                                <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">{{ getPeriodOfDay(category) }}</span>
                            </div>
                            <div class="flex items-center">
                                <span class="text-sm font-bold text-pink-600 dark:text-pink-400">
                                    {{ hourlyData.series[1].data[index]?.toFixed(2) }}
                                </span>
                                <span
                                    class="ml-2 px-2 py-1 text-xs rounded-full"
                                    :class="{
                                        'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400': hourlyData.series[1].data[index] >= 3,
                                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400': hourlyData.series[1].data[index] >= 2 && hourlyData.series[1].data[index] < 3,
                                        'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400': hourlyData.series[1].data[index] < 2
                                    }"
                                >
                                    {{ getScoreLabel(hourlyData.series[1].data[index]) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Légende et Notes</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <h4 class="font-medium text-gray-900 dark:text-white mb-2">Intensité des couleurs :</h4>
                        <div class="space-y-1">
                            <div class="flex items-center">
                                <div class="w-4 h-4 bg-teal-800 rounded mr-2"></div>
                                <span class="text-gray-600 dark:text-gray-400">Très élevée (>80%)</span>
                            </div>
                            <div class="flex items-center">
                                <div class="w-4 h-4 bg-teal-600 rounded mr-2"></div>
                                <span class="text-gray-600 dark:text-gray-400">Élevée (60-80%)</span>
                            </div>
                            <div class="flex items-center">
                                <div class="w-4 h-4 bg-teal-400 rounded mr-2"></div>
                                <span class="text-gray-600 dark:text-gray-400">Modérée (40-60%)</span>
                            </div>
                            <div class="flex items-center">
                                <div class="w-4 h-4 bg-teal-200 rounded mr-2"></div>
                                <span class="text-gray-600 dark:text-gray-400">Faible (<40%)</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 class="font-medium text-gray-900 dark:text-white mb-2">Périodes de la journée :</h4>
                        <div class="space-y-1 text-gray-600 dark:text-gray-400">
                            <div>🌅 <strong>Matin :</strong> 05:00 - 11:59</div>
                            <div>☀️ <strong>Après-midi :</strong> 12:00 - 17:59</div>
                            <div>🌆 <strong>Soirée :</strong> 18:00 - 21:59</div>
                            <div>🌙 <strong>Nuit :</strong> 22:00 - 04:59</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-else-if="!loading" class="text-center py-12 text-gray-500 dark:text-gray-400">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucune donnée horaire</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Aucun pattern horaire disponible pour le moment.</p>
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
