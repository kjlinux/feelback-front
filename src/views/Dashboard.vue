<script setup>
import { useLayout } from '@/layout/composables/layout';
import { apiClient } from '@/service/auth';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import TemporalTrends from './uikit/TemporalTrends.vue';

const { getPrimary, getSurface, isDarkTheme } = useLayout();
const toast = useToast();
const router = useRouter();

// Reactive data
const loading = ref(true);
const stats = ref(null);
const error = ref(null);

// Computed properties
const satisfactionRate = computed(() => {
  return stats.value ? parseFloat(stats.value.satisfaction_rate) : 0;
});

const totalFeedbacks = computed(() => {
  return stats.value ? stats.value.total_feedbacks.toLocaleString() : '0';
});

const satisfiedCount = computed(() => {
  return stats.value ? stats.value.satisfied_count.toLocaleString() : '0';
});

const neutralCount = computed(() => {
  return stats.value ? stats.value.neutral_count.toLocaleString() : '0';
});

const unsatisfiedCount = computed(() => {
  return stats.value ? stats.value.unsatisfied_count.toLocaleString() : '0';
});

// Chart colors based on theme
const chartColors = computed(() => ({
  satisfied: '#10b981', // green
  neutral: '#f59e0b',   // amber
  unsatisfied: '#ef4444' // red
}));

// Gauge chart configuration
const gaugeOptions = computed(() => ({
  chart: {
    type: 'solidgauge',
    height: 200,
    backgroundColor: 'transparent'
  },
  title: {
    text: 'Taux de satisfaction',
    style: {
      fontSize: '16px',
      color: isDarkTheme.value ? '#ffffff' : '#374151'
    }
  },
  pane: {
    center: ['50%', '85%'],
    size: '140%',
    startAngle: -90,
    endAngle: 90,
    background: {
      backgroundColor: getSurface(),
      innerRadius: '60%',
      outerRadius: '100%',
      shape: 'arc'
    }
  },
  yAxis: {
    min: 0,
    max: 100,
    stops: [
      [0.1, '#ef4444'], // red
      [0.5, '#f59e0b'], // amber
      [0.9, '#10b981']  // green
    ],
    lineWidth: 0,
    tickWidth: 0,
    minorTickInterval: null,
    tickAmount: 2,
    labels: {
      y: 16,
      style: {
        color: isDarkTheme.value ? '#ffffff' : '#374151'
      }
    }
  },
  plotOptions: {
    solidgauge: {
      dataLabels: {
        y: 5,
        borderWidth: 0,
        useHTML: true,
        format: '<div style="text-align:center"><span style="font-size:25px;color:' +
                (isDarkTheme.value ? '#ffffff' : '#374151') + '">{y}%</span></div>'
      }
    }
  },
  series: [{
    name: 'Satisfaction',
    data: [satisfactionRate.value],
    tooltip: {
      valueSuffix: '%'
    }
  }]
}));

// Pie chart configuration
const pieOptions = computed(() => ({
  chart: {
    type: 'pie',
    height: 300,
    backgroundColor: 'transparent'
  },
  title: {
    text: 'Distribution des avis',
    style: {
      fontSize: '16px',
      color: isDarkTheme.value ? '#ffffff' : '#374151'
    }
  },
  tooltip: {
    pointFormat: '{series.name}: <b>{point.y}</b> ({point.percentage:.1f}%)'
  },
  plotOptions: {
    pie: {
      allowPointSelect: true,
      cursor: 'pointer',
      dataLabels: {
        enabled: true,
        format: '<b>{point.name}</b>: {point.percentage:.1f}%',
        style: {
          color: isDarkTheme.value ? '#ffffff' : '#374151'
        }
      },
      showInLegend: true
    }
  },
  legend: {
    itemStyle: {
      color: isDarkTheme.value ? '#ffffff' : '#374151'
    }
  },
  series: [{
    name: 'Avis',
    colorByPoint: true,
    data: stats.value ? [
      {
        name: 'Satisfait',
        y: stats.value.satisfied_count,
        color: chartColors.value.satisfied
      },
      {
        name: 'Neutre',
        y: stats.value.neutral_count,
        color: chartColors.value.neutral
      },
      {
        name: 'Insatisfait',
        y: stats.value.unsatisfied_count,
        color: chartColors.value.unsatisfied
      }
    ] : []
  }]
}));

// Fetch data function
const fetchGlobalStats = async () => {
  try {
    loading.value = true;
    error.value = null;

    const response = await apiClient.get('/app/dashboard/global-stats');
    stats.value = response.data;

    toast.add({
      severity: 'success',
      summary: 'Succès',
      detail: 'Statistiques chargées avec succès',
      life: 3000
    });
  } catch (err) {
    error.value = 'Erreur lors du chargement des statistiques';
    console.error('Error fetching global stats:', err);

    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Impossible de charger les statistiques',
      life: 5000
    });
  } finally {
    loading.value = false;
  }
};

// Lifecycle
onMounted(() => {
  fetchGlobalStats();
});

// Watch for theme changes to update charts
watch(isDarkTheme, () => {
  // Force chart re-render when theme changes
  if (stats.value) {
    // You might need to trigger chart updates here
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Tableau de bord - Statistiques globales
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          Vue d'ensemble des retours clients et taux de satisfaction
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600 dark:text-gray-400">Chargement des statistiques...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div class="flex items-center">
          <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="ml-3 text-red-800 dark:text-red-200">{{ error }}</span>
        </div>
        <button
          @click="fetchGlobalStats"
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Réessayer
        </button>
      </div>

      <!-- Stats Content -->
      <div v-else-if="stats" class="space-y-6">
        <!-- Key Metrics Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- Total Feedbacks -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center">
              <div class="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total des retours</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalFeedbacks }}</p>
              </div>
            </div>
          </div>

          <!-- Satisfied Count -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center">
              <div class="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Satisfaits</p>
                <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ satisfiedCount }}</p>
              </div>
            </div>
          </div>

          <!-- Neutral Count -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center">
              <div class="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                <svg class="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Neutres</p>
                <p class="text-2xl font-bold text-amber-600 dark:text-amber-400">{{ neutralCount }}</p>
              </div>
            </div>
          </div>

          <!-- Unsatisfied Count -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center">
              <div class="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-3-8a9 9 0 110 18 9 9 0 010-18z"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Insatisfaits</p>
                <p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ unsatisfiedCount }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Satisfaction Gauge -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Taux de satisfaction global
            </h3>
            <div class="flex items-center justify-center">
              <div class="relative">
                <!-- Simple CSS-based gauge -->
                <div class="w-48 h-24 relative overflow-hidden">
                  <div class="w-48 h-48 rounded-full border-8 border-gray-200 dark:border-gray-600 absolute -bottom-24"></div>
                  <div
                    class="w-48 h-48 rounded-full border-8 border-transparent absolute -bottom-24 transition-all duration-1000"
                    :style="{
                      borderTopColor: satisfactionRate >= 70 ? '#10b981' : satisfactionRate >= 40 ? '#f59e0b' : '#ef4444',
                      borderRightColor: satisfactionRate >= 70 ? '#10b981' : satisfactionRate >= 40 ? '#f59e0b' : '#ef4444',
                      transform: `rotate(${(satisfactionRate / 100) * 180 - 90}deg)`
                    }"
                  ></div>
                  <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center">
                    <div class="text-3xl font-bold text-gray-900 dark:text-white">
                      {{ satisfactionRate.toFixed(1) }}%
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">
                      Satisfaction
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Distribution Pie Chart -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Distribution des avis
            </h3>
            <div class="space-y-4">
              <!-- Satisfied -->
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <div class="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                  <span class="text-gray-700 dark:text-gray-300">Satisfaits</span>
                </div>
                <div class="text-right">
                  <div class="font-semibold text-gray-900 dark:text-white">{{ satisfiedCount }}</div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    {{ ((stats.satisfied_count / stats.total_feedbacks) * 100).toFixed(1) }}%
                  </div>
                </div>
              </div>

              <!-- Neutral -->
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <div class="w-4 h-4 bg-amber-500 rounded-full mr-3"></div>
                  <span class="text-gray-700 dark:text-gray-300">Neutres</span>
                </div>
                <div class="text-right">
                  <div class="font-semibold text-gray-900 dark:text-white">{{ neutralCount }}</div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    {{ ((stats.neutral_count / stats.total_feedbacks) * 100).toFixed(1) }}%
                  </div>
                </div>
              </div>

              <!-- Unsatisfied -->
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <div class="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
                  <span class="text-gray-700 dark:text-gray-300">Insatisfaits</span>
                </div>
                <div class="text-right">
                  <div class="font-semibold text-gray-900 dark:text-white">{{ unsatisfiedCount }}</div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    {{ ((stats.unsatisfied_count / stats.total_feedbacks) * 100).toFixed(1) }}%
                  </div>
                </div>
              </div>

              <!-- Progress bars -->
              <div class="space-y-2 mt-6">
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    class="bg-green-500 h-2 rounded-full transition-all duration-1000"
                    :style="{ width: `${(stats.satisfied_count / stats.total_feedbacks) * 100}%` }"
                  ></div>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    class="bg-amber-500 h-2 rounded-full transition-all duration-1000"
                    :style="{ width: `${(stats.neutral_count / stats.total_feedbacks) * 100}%` }"
                  ></div>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    class="bg-red-500 h-2 rounded-full transition-all duration-1000"
                    :style="{ width: `${(stats.unsatisfied_count / stats.total_feedbacks) * 100}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="w-full">
            <TemporalTrends />
        </div>


        <!-- Refresh Button -->
        <div class="flex justify-center">
          <button
            @click="fetchGlobalStats"
            :disabled="loading"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            <svg
              class="w-4 h-4 mr-2"
              :class="{ 'animate-spin': loading }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            {{ loading ? 'Actualisation...' : 'Actualiser les données' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  @apply bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700;
}
</style>
