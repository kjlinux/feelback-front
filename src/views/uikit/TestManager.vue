<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { apiClient } from '@/service/auth';

const toast = useToast();

// États réactifs
const loading = ref(false);
const devices = ref([]);
const examples = ref({});
const selectedExample = ref('');
const activeTab = ref('generate');

// Configuration pour la génération de données
const generateConfig = ref({
    devices_count: 5,
    feedbacks_per_device: 50,
    feedbacks_count: null,
    days_range: 30,
    feedback_types: [],
    unsatisfied_percentage: 15,
    neutral_percentage: 25,
    satisfied_percentage: 60,
    distribute_evenly: true
});

// Configuration pour feedback manuel
const manualFeedback = ref({
    device_id: '',
    type: 'satisfied',
    session_id: '',
    ip_address: ''
});

// Options pour les types de feedback
const feedbackTypes = [
    { label: 'Insatisfait', value: 'unsatisfied', color: 'bg-red-100 text-red-800' },
    { label: 'Neutre', value: 'neutral', color: 'bg-yellow-100 text-yellow-800' },
    { label: 'Satisfait', value: 'satisfied', color: 'bg-green-100 text-green-800' }
];

// Validation des pourcentages
const percentagesValid = computed(() => {
    const total = generateConfig.value.unsatisfied_percentage + 
                 generateConfig.value.neutral_percentage + 
                 generateConfig.value.satisfied_percentage;
    return total === 100;
});

// Mode de configuration (par device ou total)
const usePerDeviceMode = computed({
    get: () => !generateConfig.value.feedbacks_count,
    set: (value) => {
        if (value) {
            generateConfig.value.feedbacks_count = null;
        } else {
            generateConfig.value.feedbacks_count = generateConfig.value.feedbacks_per_device * generateConfig.value.devices_count;
        }
    }
});

// Charger les devices disponibles
const loadDevices = async () => {
    try {
        const response = await apiClient.get('/app/test-data/devices');
        devices.value = response.data.data;
    } catch (error) {
        console.error('Erreur lors du chargement des devices:', error);
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les devices',
            life: 5000
        });
    }
};

// Charger les exemples de configuration
const loadExamples = async () => {
    try {
        const response = await apiClient.get('/app/test-data/examples');
        examples.value = response.data.data.examples;
    } catch (error) {
        console.error('Erreur lors du chargement des exemples:', error);
    }
};

// Appliquer un exemple de configuration
const applyExample = () => {
    if (!selectedExample.value || !examples.value[selectedExample.value]) return;
    
    const example = examples.value[selectedExample.value];
    generateConfig.value = { ...generateConfig.value, ...example.payload };
    
    toast.add({
        severity: 'info',
        summary: 'Configuration appliquée',
        detail: example.description,
        life: 3000
    });
};

// Générer des données de test
const generateTestData = async () => {
    if (!percentagesValid.value && generateConfig.value.feedback_types.length === 0) {
        toast.add({
            severity: 'warn',
            summary: 'Configuration invalide',
            detail: 'Les pourcentages doivent totaliser 100%',
            life: 5000
        });
        return;
    }

    try {
        loading.value = true;
        
        const payload = { ...generateConfig.value };
        
        // Nettoyer les valeurs vides
        if (!payload.feedbacks_count) delete payload.feedbacks_count;
        if (payload.feedback_types.length === 0) delete payload.feedback_types;
        if (!payload.session_id) delete payload.session_id;
        if (!payload.ip_address) delete payload.ip_address;

        const response = await apiClient.post('/app/test-data/generate', payload);
        
        toast.add({
            severity: 'success',
            summary: 'Succès',
            detail: `${response.data.data.feedbacks_created} feedbacks créés sur ${response.data.data.devices_created} devices`,
            life: 5000
        });

        // Recharger les devices
        await loadDevices();
        
    } catch (error) {
        console.error('Erreur lors de la génération:', error);
        const message = error.response?.data?.message || 'Erreur lors de la génération des données';
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: message,
            life: 5000
        });
    } finally {
        loading.value = false;
    }
};

// Ajouter un feedback manuel
const addManualFeedback = async () => {
    if (!manualFeedback.value.device_id) {
        toast.add({
            severity: 'warn',
            summary: 'Device requis',
            detail: 'Veuillez sélectionner un device',
            life: 3000
        });
        return;
    }

    try {
        loading.value = true;
        
        const payload = { ...manualFeedback.value };
        if (!payload.session_id) delete payload.session_id;
        if (!payload.ip_address) delete payload.ip_address;

        const response = await apiClient.post('/app/test-data/feedback/manual', payload);
        
        toast.add({
            severity: 'success',
            summary: 'Feedback ajouté',
            detail: `Feedback ${response.data.data.type} ajouté pour ${response.data.data.device_name}`,
            life: 5000
        });

        // Réinitialiser le formulaire
        manualFeedback.value = {
            device_id: '',
            type: 'satisfied',
            session_id: '',
            ip_address: ''
        };
        
    } catch (error) {
        console.error('Erreur lors de l\'ajout:', error);
        const message = error.response?.data?.message || 'Erreur lors de l\'ajout du feedback';
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: message,
            life: 5000
        });
    } finally {
        loading.value = false;
    }
};

// Nettoyer toutes les données
const cleanAllData = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer toutes les données de test ? Cette action est irréversible.')) {
        return;
    }

    try {
        loading.value = true;
        
        const response = await apiClient.delete('/app/test-data/clean');
        
        toast.add({
            severity: 'success',
            summary: 'Données supprimées',
            detail: `${response.data.data.feedbacks_deleted} feedbacks et ${response.data.data.devices_deleted} devices supprimés`,
            life: 5000
        });

        // Recharger les devices
        devices.value = [];
        
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        const message = error.response?.data?.message || 'Erreur lors de la suppression';
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: message,
            life: 5000
        });
    } finally {
        loading.value = false;
    }
};

// Lifecycle
onMounted(async () => {
    await Promise.all([loadDevices(), loadExamples()]);
});
</script>

<template>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div class="max-w-6xl mx-auto">
            <!-- Header -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Gestionnaire de Données de Test
                </h1>
                <p class="text-gray-600 dark:text-gray-400">
                    Générez des données de test pour votre dashboard et ajoutez des feedbacks manuellement
                </p>
            </div>

            <!-- Navigation Tabs -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                <div class="border-b border-gray-200 dark:border-gray-700">
                    <nav class="flex space-x-8 px-6">
                        <button @click="activeTab = 'generate'"
                            :class="[
                                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                                activeTab === 'generate' 
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            ]">
                            Générer des Données
                        </button>
                        <button @click="activeTab = 'manual'"
                            :class="[
                                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                                activeTab === 'manual' 
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            ]">
                            Feedback Manuel
                        </button>
                        <button @click="activeTab = 'manage'"
                            :class="[
                                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                                activeTab === 'manage' 
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            ]">
                            Gestion
                        </button>
                    </nav>
                </div>

                <!-- Tab Content -->
                <div class="p-6">
                    <!-- Generate Data Tab -->
                    <div v-if="activeTab === 'generate'" class="space-y-6">
                        <!-- Examples Selector -->
                        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <h3 class="text-lg font-medium text-blue-900 dark:text-blue-100 mb-3">
                                Configurations Prédéfinies
                            </h3>
                            <div class="flex gap-4 items-center">
                                <select v-model="selectedExample"
                                    class="flex-1 px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                                    <option value="">Sélectionner un exemple</option>
                                    <option v-for="(example, key) in examples" :key="key" :value="key">
                                        {{ example.description }}
                                    </option>
                                </select>
                                <button @click="applyExample" :disabled="!selectedExample"
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    Appliquer
                                </button>
                            </div>
                        </div>

                        <!-- Configuration Form -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <!-- Basic Configuration -->
                            <div class="space-y-4">
                                <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                                    Configuration de Base
                                </h3>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nombre de Devices
                                    </label>
                                    <input v-model.number="generateConfig.devices_count" type="number" min="1" max="100"
                                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Période (jours)
                                    </label>
                                    <input v-model.number="generateConfig.days_range" type="number" min="1" max="365"
                                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                                </div>

                                <div>
                                    <div class="flex items-center space-x-4 mb-3">
                                        <label class="flex items-center">
                                            <input v-model="usePerDeviceMode" type="radio" :value="true" class="text-blue-600">
                                            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Par device</span>
                                        </label>
                                        <label class="flex items-center">
                                            <input v-model="usePerDeviceMode" type="radio" :value="false" class="text-blue-600">
                                            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Total global</span>
                                        </label>
                                    </div>

                                    <div v-if="usePerDeviceMode">
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Feedbacks par Device
                                        </label>
                                        <input v-model.number="generateConfig.feedbacks_per_device" type="number" min="1"
                                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <div v-else>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Total Feedbacks
                                        </label>
                                        <input v-model.number="generateConfig.feedbacks_count" type="number" min="1"
                                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                                    </div>
                                </div>

                                <div>
                                    <label class="flex items-center">
                                        <input v-model="generateConfig.distribute_evenly" type="checkbox" class="text-blue-600">
                                        <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            Distribuer équitablement entre les devices
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <!-- Feedback Types Configuration -->
                            <div class="space-y-4">
                                <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                                    Types de Feedback
                                </h3>

                                <!-- Specific Types -->
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Types Spécifiques (optionnel)
                                    </label>
                                    <div class="space-y-2">
                                        <label v-for="type in feedbackTypes" :key="type.value" class="flex items-center">
                                            <input v-model="generateConfig.feedback_types" :value="type.value" type="checkbox" class="text-blue-600">
                                            <span class="ml-2 text-sm" :class="type.color + ' px-2 py-1 rounded-full'">
                                                {{ type.label }}
                                            </span>
                                        </label>
                                    </div>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Si spécifié, seuls ces types seront générés
                                    </p>
                                </div>

                                <!-- Percentages -->
                                <div v-if="generateConfig.feedback_types.length === 0">
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Répartition par Pourcentages
                                    </label>
                                    <div class="space-y-3">
                                        <div>
                                            <div class="flex justify-between mb-1">
                                                <span class="text-sm text-red-600">Insatisfait</span>
                                                <span class="text-sm text-red-600">{{ generateConfig.unsatisfied_percentage }}%</span>
                                            </div>
                                            <input v-model.number="generateConfig.unsatisfied_percentage" type="range" min="0" max="100"
                                                class="w-full accent-red-500">
                                        </div>
                                        <div>
                                            <div class="flex justify-between mb-1">
                                                <span class="text-sm text-yellow-600">Neutre</span>
                                                <span class="text-sm text-yellow-600">{{ generateConfig.neutral_percentage }}%</span>
                                            </div>
                                            <input v-model.number="generateConfig.neutral_percentage" type="range" min="0" max="100"
                                                class="w-full accent-yellow-500">
                                        </div>
                                        <div>
                                            <div class="flex justify-between mb-1">
                                                <span class="text-sm text-green-600">Satisfait</span>
                                                <span class="text-sm text-green-600">{{ generateConfig.satisfied_percentage }}%</span>
                                            </div>
                                            <input v-model.number="generateConfig.satisfied_percentage" type="range" min="0" max="100"
                                                class="w-full accent-green-500">
                                        </div>
                                    </div>
                                    <div class="mt-2 text-sm" :class="percentagesValid ? 'text-green-600' : 'text-red-600'">
                                        Total: {{ generateConfig.unsatisfied_percentage + generateConfig.neutral_percentage + generateConfig.satisfied_percentage }}%
                                        <span v-if="!percentagesValid">(doit être égal à 100%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Generate Button -->
                        <div class="flex justify-center pt-4">
                            <button @click="generateTestData" :disabled="loading"
                                class="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
                                <span v-if="loading" class="flex items-center">
                                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Génération en cours...
                                </span>
                                <span v-else>
                                    Générer les Données de Test
                                </span>
                            </button>
                        </div>
                    </div>

                    <!-- Manual Feedback Tab -->
                    <div v-if="activeTab === 'manual'" class="space-y-6">
                        <div class="max-w-md mx-auto">
                            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4 text-center">
                                Ajouter un Feedback Manuel
                            </h3>

                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Device <span class="text-red-500">*</span>
                                    </label>
                                    <select v-model="manualFeedback.device_id" required
                                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                                        <option value="">Sélectionner un device</option>
                                        <option v-for="device in devices" :key="device.id" :value="device.id">
                                            {{ device.name }} ({{ device.code }})
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Type de Feedback <span class="text-red-500">*</span>
                                    </label>
                                    <div class="space-y-2">
                                        <label v-for="type in feedbackTypes" :key="type.value" class="flex items-center">
                                            <input v-model="manualFeedback.type" :value="type.value" type="radio" class="text-blue-600">
                                            <span class="ml-2 text-sm" :class="type.color + ' px-2 py-1 rounded-full'">
                                                {{ type.label }}
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Session ID (optionnel)
                                    </label>
                                    <input v-model="manualFeedback.session_id" type="text" maxlength="100"
                                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Adresse IP (optionnel)
                                    </label>
                                    <input v-model="manualFeedback.ip_address" type="text" 
                                        placeholder="192.168.1.1"
                                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                                </div>

                                <button @click="addManualFeedback" :disabled="loading || !manualFeedback.device_id"
                                    class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
                                    <span v-if="loading" class="flex items-center justify-center">
                                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Ajout en cours...
                                    </span>
                                    <span v-else>
                                        Ajouter le Feedback
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Management Tab -->
                    <div v-if="activeTab === 'manage'" class="space-y-6">
                        <!-- Devices List -->
                        <div>
                            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                Devices Disponibles ({{ devices.length }})
                            </h3>
                            
                            <div v-if="devices.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
                                <p>Aucun device disponible</p>
                                <p class="text-sm">Générez des données de test pour créer des devices</p>
                            </div>
                            
                            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div v-for="device in devices" :key="device.id"
                                    class="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                    <h4 class="font-medium text-gray-900 dark:text-white">{{ device.name }}</h4>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">{{ device.code }}</p>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">{{ device.location }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Danger Zone -->
                        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                            <h3 class="text-lg font-medium text-red-900 dark:text-red-100 mb-4">
                                Zone Dangereuse
                            </h3>
                            <p class="text-red-800 dark:text-red-200 mb-4">
                                Cette action supprimera définitivement toutes les données de test (devices et feedbacks).
                            </p>
                            <button @click="cleanAllData" :disabled="loading"
                                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
                                <span v-if="loading" class="flex items-center">
                                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Suppression en cours...
                                </span>
                                <span v-else>
                                    Supprimer Toutes les Données
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Custom styles pour les sliders */
input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    border-radius: 3px;
    background: #e5e7eb;
    outline: none;
}

input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: currentColor;
    cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: currentColor;
    cursor: pointer;
    border: none;
}
</style>