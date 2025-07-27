<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { apiClient } from '@/service/auth';

import Card from 'primevue/card';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Dropdown from 'primevue/dropdown';
import Checkbox from 'primevue/checkbox';
import RadioButton from 'primevue/radiobutton';
import Slider from 'primevue/slider';
import Tag from 'primevue/tag';
import Message from 'primevue/message';

const toast = useToast();

const loading = ref(false);
const devices = ref([]);
const examples = ref({});
const selectedExample = ref(null);
const activeTabIndex = ref(0);

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

const manualFeedback = ref({
    device_id: '',
    type: 'satisfied',
    session_id: '',
    ip_address: ''
});

const feedbackTypes = [
    { label: 'Insatisfait', value: 'unsatisfied', severity: 'danger' },
    { label: 'Neutre', value: 'neutral', severity: 'warning' },
    { label: 'Satisfait', value: 'satisfied', severity: 'success' }
];

const percentagesValid = computed(() => {
    const total = generateConfig.value.unsatisfied_percentage + generateConfig.value.neutral_percentage + generateConfig.value.satisfied_percentage;
    return total === 100;
});

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

const exampleOptions = computed(() => {
    console.log('Computing example options from:', examples.value);
    if (!examples.value || typeof examples.value !== 'object') {
        return [];
    }
    return Object.entries(examples.value).map(([key, example]) => ({
        label: example.description,
        value: key
    }));
});

const deviceOptions = computed(() => {
    return devices.value.map((device) => ({
        label: `${device.name} (${device.code})`,
        value: device.id
    }));
});

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

const loadExamples = async () => {
    try {
        const response = await apiClient.get('/app/test-data/examples');
        examples.value = response.data.data.examples;
        console.log('Examples loaded:', examples.value);
    } catch (error) {
        console.error('Erreur lors du chargement des exemples:', error);
    }
};

const applyExample = () => {
    console.log('Applying example:', selectedExample.value);
    console.log('Available examples:', examples.value);

    if (!selectedExample.value || !examples.value[selectedExample.value]) {
        console.warn('Example not found:', selectedExample.value);
        return;
    }

    const example = examples.value[selectedExample.value];
    console.log('Example payload:', example.payload);

    generateConfig.value = { ...generateConfig.value, ...example.payload };

    toast.add({
        severity: 'info',
        summary: 'Configuration appliquée',
        detail: example.description,
        life: 3000
    });
};

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

        manualFeedback.value = {
            device_id: '',
            type: 'satisfied',
            session_id: '',
            ip_address: ''
        };
    } catch (error) {
        console.error("Erreur lors de l'ajout:", error);
        const message = error.response?.data?.message || "Erreur lors de l'ajout du feedback";
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

onMounted(async () => {
    await Promise.all([loadDevices(), loadExamples()]);
});
</script>

<template>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div class="max-w-6xl mx-auto">
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Gestionnaire de Données de Test</h1>
                <p class="text-gray-600 dark:text-gray-400">Générez des données de test pour votre dashboard et ajoutez des feedbacks manuellement</p>
            </div>

            <Card class="mb-6">
                <template #content>
                    <TabView v-model:activeIndex="activeTabIndex">
                        <TabPanel header="Générer des Données">
                            <div class="space-y-6">
                                <Message severity="info" :closable="false">
                                    <div class="flex flex-col gap-4">
                                        <h3 class="text-lg font-medium">Configurations Prédéfinies</h3>
                                        <div class="flex gap-4 items-end">
                                            <div class="flex-1">
                                                <Dropdown v-model="selectedExample" :options="exampleOptions" optionLabel="label" optionValue="value" placeholder="Sélectionner un exemple" showClear class="w-full" />
                                            </div>
                                            <Button @click="applyExample" :disabled="!selectedExample" label="Appliquer" severity="info" />
                                        </div>
                                    </div>
                                </Message>

                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <Card>
                                        <template #title> Configuration de Base </template>
                                        <template #content>
                                            <div class="space-y-6">
                                                <div class="field">
                                                    <label for="devices_count" class="block text-sm font-medium mb-2"> Nombre de Devices </label>
                                                    <InputNumber id="devices_count" v-model="generateConfig.devices_count" :min="1" :max="100" showButtons class="w-full" />
                                                </div>

                                                <div class="field">
                                                    <label for="days_range" class="block text-sm font-medium mb-2"> Période (jours) </label>
                                                    <InputNumber id="days_range" v-model="generateConfig.days_range" :min="1" :max="365" showButtons class="w-full" />
                                                </div>

                                                <div class="field">
                                                    <label class="block text-sm font-medium mb-3"> Mode de configuration </label>
                                                    <div class="flex flex-col gap-3">
                                                        <div class="flex align-items-center">
                                                            <RadioButton v-model="usePerDeviceMode" inputId="per_device" :value="true" />
                                                            <label for="per_device" class="ml-2">Par device</label>
                                                        </div>
                                                        <div class="flex align-items-center">
                                                            <RadioButton v-model="usePerDeviceMode" inputId="global_total" :value="false" />
                                                            <label for="global_total" class="ml-2">Total global</label>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div v-if="usePerDeviceMode" class="field">
                                                    <label for="feedbacks_per_device" class="block text-sm font-medium mb-2"> Feedbacks par Device </label>
                                                    <InputNumber id="feedbacks_per_device" v-model="generateConfig.feedbacks_per_device" :min="1" showButtons class="w-full" />
                                                </div>
                                                <div v-else class="field">
                                                    <label for="feedbacks_count" class="block text-sm font-medium mb-2"> Total Feedbacks </label>
                                                    <InputNumber id="feedbacks_count" v-model="generateConfig.feedbacks_count" :min="1" showButtons class="w-full" />
                                                </div>

                                                <div class="field">
                                                    <div class="flex align-items-center">
                                                        <Checkbox v-model="generateConfig.distribute_evenly" inputId="distribute_evenly" :binary="true" />
                                                        <label for="distribute_evenly" class="ml-2"> Distribuer équitablement entre les devices </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </template>
                                    </Card>

                                    <Card>
                                        <template #title> Types de Feedback </template>
                                        <template #content>
                                            <div class="space-y-6">
                                                <div class="field">
                                                    <label class="block text-sm font-medium mb-2"> Types Spécifiques (optionnel) </label>
                                                    <div class="space-y-3">
                                                        <div v-for="type in feedbackTypes" :key="type.value" class="flex align-items-center">
                                                            <Checkbox v-model="generateConfig.feedback_types" :inputId="type.value" :value="type.value" />
                                                            <label :for="type.value" class="ml-2">
                                                                <Tag :value="type.label" :severity="type.severity" />
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <small class="text-gray-500 dark:text-gray-400"> Si spécifié, seuls ces types seront générés </small>
                                                </div>

                                                <div v-if="generateConfig.feedback_types.length === 0">
                                                    <label class="block text-sm font-medium mb-2"> Répartition par Pourcentages </label>
                                                    <div class="space-y-4">
                                                        <div class="field">
                                                            <div class="flex justify-between mb-2">
                                                                <span class="text-sm text-red-600">Insatisfait</span>
                                                                <Tag :value="`${generateConfig.unsatisfied_percentage}%`" severity="danger" />
                                                            </div>
                                                            <Slider v-model="generateConfig.unsatisfied_percentage" :min="0" :max="100" class="w-full" />
                                                        </div>
                                                        <div class="field">
                                                            <div class="flex justify-between mb-2">
                                                                <span class="text-sm text-yellow-600">Neutre</span>
                                                                <Tag :value="`${generateConfig.neutral_percentage}%`" severity="warning" />
                                                            </div>
                                                            <Slider v-model="generateConfig.neutral_percentage" :min="0" :max="100" class="w-full" />
                                                        </div>
                                                        <div class="field">
                                                            <div class="flex justify-between mb-2">
                                                                <span class="text-sm text-green-600">Satisfait</span>
                                                                <Tag :value="`${generateConfig.satisfied_percentage}%`" severity="success" />
                                                            </div>
                                                            <Slider v-model="generateConfig.satisfied_percentage" :min="0" :max="100" class="w-full" />
                                                        </div>
                                                    </div>
                                                    <div class="mt-3">
                                                        <Message :severity="percentagesValid ? 'success' : 'error'" :closable="false">
                                                            Total: {{ generateConfig.unsatisfied_percentage + generateConfig.neutral_percentage + generateConfig.satisfied_percentage }}%
                                                            <span v-if="!percentagesValid"> (doit être égal à 100%)</span>
                                                        </Message>
                                                    </div>
                                                </div>
                                            </div>
                                        </template>
                                    </Card>
                                </div>

                                <div class="flex justify-center pt-4">
                                    <Button @click="generateTestData" :loading="loading" label="Générer les Données de Test" icon="pi pi-cog" size="large" class="px-8" />
                                </div>
                            </div>
                        </TabPanel>

                        <TabPanel header="Feedback Manuel">
                            <div class="flex justify-center">
                                <Card class="w-full max-w-md">
                                    <template #title>
                                        <div class="text-center">
                                            <i class="pi pi-plus-circle text-2xl mr-2"></i>
                                            Ajouter un Feedback Manuel
                                        </div>
                                    </template>
                                    <template #content>
                                        <div class="space-y-6">
                                            <div class="field">
                                                <label for="device_select" class="block text-sm font-medium mb-2"> Device <span class="text-red-500">*</span> </label>
                                                <Dropdown id="device_select" v-model="manualFeedback.device_id" :options="deviceOptions" optionLabel="label" optionValue="value" placeholder="Sélectionner un device" class="w-full" />
                                            </div>

                                            <div class="field">
                                                <label class="block text-sm font-medium mb-2"> Type de Feedback <span class="text-red-500">*</span> </label>
                                                <div class="space-y-3">
                                                    <div v-for="type in feedbackTypes" :key="type.value" class="flex align-items-center">
                                                        <RadioButton v-model="manualFeedback.type" :inputId="'manual_' + type.value" :value="type.value" />
                                                        <label :for="'manual_' + type.value" class="ml-2">
                                                            <Tag :value="type.label" :severity="type.severity" />
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="field">
                                                <label for="session_id" class="block text-sm font-medium mb-2"> Session ID (optionnel) </label>
                                                <InputText id="session_id" v-model="manualFeedback.session_id" maxlength="100" class="w-full" />
                                            </div>

                                            <div class="field">
                                                <label for="ip_address" class="block text-sm font-medium mb-2"> Adresse IP (optionnel) </label>
                                                <InputText id="ip_address" v-model="manualFeedback.ip_address" placeholder="192.168.1.1" class="w-full" />
                                            </div>

                                            <Button @click="addManualFeedback" :disabled="!manualFeedback.device_id || !manualFeedback.type" :loading="loading" label="Ajouter le Feedback" icon="pi pi-check" severity="success" class="w-full" />
                                        </div>
                                    </template>
                                </Card>
                            </div>
                        </TabPanel>

                        <TabPanel header="Gestion">
                            <div class="space-y-6">
                                <Card>
                                    <template #title>
                                        <div class="flex align-items-center">
                                            <i class="pi pi-server text-xl mr-2"></i>
                                            Devices Disponibles ({{ devices.length }})
                                        </div>
                                    </template>
                                    <template #content>
                                        <div v-if="devices.length === 0" class="text-center py-8">
                                            <i class="pi pi-inbox text-6xl text-gray-400 mb-4 block"></i>
                                            <Message severity="info" :closable="false">
                                                <p class="mb-2">Aucun device disponible</p>
                                                <small>Générez des données de test pour créer des devices</small>
                                            </Message>
                                        </div>

                                        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <Card v-for="device in devices" :key="device.id" class="border border-gray-200 dark:border-gray-600">
                                                <template #content>
                                                    <div class="space-y-2">
                                                        <h4 class="font-medium text-gray-900 dark:text-white flex align-items-center">
                                                            <i class="pi pi-microchip mr-2"></i>
                                                            {{ device.name }}
                                                        </h4>
                                                        <p class="text-sm text-gray-600 dark:text-gray-400 flex align-items-center">
                                                            <i class="pi pi-tag mr-2"></i>
                                                            {{ device.code }}
                                                        </p>
                                                        <p class="text-sm text-gray-600 dark:text-gray-400 flex align-items-center">
                                                            <i class="pi pi-map-marker mr-2"></i>
                                                            {{ device.location }}
                                                        </p>
                                                    </div>
                                                </template>
                                            </Card>
                                        </div>
                                    </template>
                                </Card>

                                <Card>
                                    <template #title>
                                        <div class="flex align-items-center text-red-600">
                                            <i class="pi pi-exclamation-triangle text-xl mr-2"></i>
                                            Zone Dangereuse
                                        </div>
                                    </template>
                                    <template #content>
                                        <Message severity="error" :closable="false" class="mb-4"> Cette action supprimera définitivement toutes les données de test (devices et feedbacks). </Message>
                                        <Button @click="cleanAllData" :loading="loading" label="Supprimer Toutes les Données" icon="pi pi-trash" severity="danger" />
                                    </template>
                                </Card>
                            </div>
                        </TabPanel>
                    </TabView>
                </template>
            </Card>
        </div>
    </div>
</template>

<style scoped>
.space-y-2 > * + * {
    margin-top: 0.5rem;
}

.space-y-3 > * + * {
    margin-top: 0.75rem;
}

.space-y-4 > * + * {
    margin-top: 1rem;
}

.space-y-6 > * + * {
    margin-top: 1.5rem;
}

.field {
    margin-bottom: 1rem;
}
</style>
