<script setup>
import { apiClient } from '@/service/auth';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const contract = ref(null);
const loading = ref(true);
const error = ref(null);

const formatDate = (dateString) => {
    if (!dateString) return 'Non spécifié';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR').format(date);
};

const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'Non spécifié';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
};

const translatePeriodicity = (periodicity) => {
    const translations = {
        monthly: 'Mensuel',
        quarterly: 'Trimestriel',
        biannual: 'Semestriel',
        annual: 'Annuel'
    };
    return translations[periodicity] || periodicity || 'Non spécifié';
};

const getContractStatus = (contract) => {
    if (!contract || !contract.dueDate) return 'Non défini';

    const today = new Date();
    const dueDate = new Date(contract.dueDate);

    if (dueDate < today) {
        return 'Expiré';
    } else {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        if (dueDate <= thirtyDaysFromNow) {
            return 'À renouveler';
        } else {
            return 'Actif';
        }
    }
};

const getContractStatusSeverity = (status) => {
    switch (status) {
        case 'Expiré':
            return 'danger';
        case 'À renouveler':
            return 'warning';
        case 'Actif':
            return 'success';
        default:
            return 'info';
    }
};

const computedStatus = computed(() => {
    return contract.value ? getContractStatus(contract.value) : 'Non défini';
});

const statusSeverity = computed(() => {
    return getContractStatusSeverity(computedStatus.value);
});

const loadContractDetails = async () => {
    loading.value = true;
    error.value = null;

    try {
        const contractId = route.params.id;
        if (!contractId) {
            throw new Error('ID du contrat non spécifié');
        }

        const response = await apiClient.get(`/app/contracts/${contractId}`);

        if (response.data.status === 'success' && response.data.data) {
            contract.value = response.data.data;
        } else {
            throw new Error(response.data.message || 'Erreur lors du chargement des données du contrat');
        }
    } catch (err) {
        console.error('Erreur lors du chargement du contrat:', err);
        error.value = err.message || 'Une erreur est survenue lors du chargement des détails du contrat';
    } finally {
        loading.value = false;
    }
};

const goBack = () => {
    router.back();
};

const downloadDocument = (filePath) => {
    if (filePath) {
        const fileName = filePath.replace('contracts/media/', '');

        apiClient({
            url: `/app/contracts/download/${fileName}`,
            method: 'GET',
            responseType: 'blob'
        })
            .then((response) => {
                const fileURL = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                window.open(fileURL, '_blank');

                setTimeout(() => {
                    window.URL.revokeObjectURL(fileURL);
                }, 10000);
            })
            .catch((error) => {
                toast.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: "Erreur lors de l'affichage du fichier",
                    life: 3000
                });
                console.error("Erreur d'affichage:", error);
            });
    } else {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Aucun document fourni',
            life: 3000
        });
    }
};

onMounted(() => {
    loadContractDetails();
});
</script>

<template>
    <div class="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-sm rounded-lg">
        <!-- En-tête avec navigation et statut -->
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
            <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                <Button icon="pi pi-arrow-left" label="Retour" class="p-button-secondary p-button-sm" @click="goBack" />
                <h1 class="text-2xl font-bold text-gray-800 dark:text-white">Détails du contrat</h1>
                <Tag v-if="contract" :value="computedStatus" :severity="statusSeverity" class="text-sm" />
            </div>
        </div>

        <!-- Affichage du chargement -->
        <div v-if="loading" class="flex justify-center items-center p-12">
            <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="3" />
            <span class="ml-3 text-gray-600 dark:text-gray-300">Chargement des détails du contrat...</span>
        </div>

        <!-- Affichage d'erreur -->
        <div v-else-if="error" class="p-6">
            <Message severity="error" :closable="false" class="mb-4">
                <div class="flex items-center">
                    <i class="pi pi-exclamation-circle mr-3" style="font-size: 1.5rem"></i>
                    <div>
                        <div class="font-bold mb-1">Erreur</div>
                        <div>{{ error }}</div>
                    </div>
                </div>
            </Message>
            <div class="flex justify-center mt-4">
                <Button icon="pi pi-refresh" label="Réessayer" @click="loadContractDetails" />
            </div>
        </div>

        <!-- Aucun contrat trouvé -->
        <div v-else-if="!contract" class="flex flex-col items-center justify-center p-12">
            <i class="pi pi-exclamation-triangle text-yellow-500 mb-4" style="font-size: 3rem"></i>
            <p class="text-lg text-gray-600 dark:text-gray-300 mb-4">Aucune information de contrat disponible.</p>
            <Button label="Retour" icon="pi pi-arrow-left" @click="goBack" />
        </div>

        <!-- Affichage des détails du contrat -->
        <div v-else class="p-6">
            <!-- Résumé du contrat -->
            <div class="mb-8 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div class="px-6 py-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <h2 class="text-xl font-bold text-gray-800 dark:text-white">Contrat N° {{ contract.contractNumber }}</h2>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                    <!-- Informations générales -->
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border border-gray-100 dark:border-gray-700">
                        <div class="flex items-center mb-4">
                            <i class="pi pi-info-circle text-primary-500 mr-2" style="font-size: 1.2rem"></i>
                            <h3 class="font-semibold text-lg">Informations générales</h3>
                        </div>
                        <div class="space-y-3">
                            <div><span class="font-medium text-gray-700 dark:text-gray-300">Produit:</span> {{ contract.product?.name || 'Non spécifié' }}</div>
                            <div><span class="font-medium text-gray-700 dark:text-gray-300">Assureur:</span> {{ contract.product?.insurer?.name || 'Non spécifié' }}</div>
                            <div><span class="font-medium text-gray-700 dark:text-gray-300">Date d'effet:</span> {{ formatDate(contract.effectDate) }}</div>
                            <div><span class="font-medium text-gray-700 dark:text-gray-300">Date d'échéance:</span> {{ formatDate(contract.dueDate) }}</div>
                            <div><span class="font-medium text-gray-700 dark:text-gray-300">Pays d'expatriation:</span> {{ contract.country_expat?.longName || 'Non spécifié' }}</div>
                        </div>
                    </div>

                    <!-- Détails financiers -->
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border border-gray-100 dark:border-gray-700">
                        <div class="flex items-center mb-4">
                            <i class="pi pi-wallet text-green-500 mr-2" style="font-size: 1.2rem"></i>
                            <h3 class="font-semibold text-lg">Détails financiers</h3>
                        </div>
                        <div class="space-y-3">
                            <div><span class="font-medium text-gray-700 dark:text-gray-300">Prime nette:</span> {{ formatCurrency(contract.netPremium) }}</div>
                            <div><span class="font-medium text-gray-700 dark:text-gray-300">Prime TTC:</span> {{ formatCurrency(contract.ttcPremium) }}</div>
                            <div><span class="font-medium text-gray-700 dark:text-gray-300">Périodicité:</span> {{ translatePeriodicity(contract.periodicity) }}</div>
                            <div><span class="font-medium text-gray-700 dark:text-gray-300">Couverture:</span> {{ contract.coveragePercentage }}%</div>
                            <div v-if="contract.product?.insurer"><span class="font-medium text-gray-700 dark:text-gray-300">Commission:</span> {{ contract.product.commissionRate }}%</div>
                        </div>
                    </div>

                    <!-- Documents -->
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border border-gray-100 dark:border-gray-700">
                        <div class="flex items-center mb-4">
                            <i class="pi pi-file text-purple-500 mr-2" style="font-size: 1.2rem"></i>
                            <h3 class="font-semibold text-lg">Documents</h3>
                        </div>
                        <div v-if="contract.media && contract.media.file" class="flex items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <i class="pi pi-file-pdf text-red-500 mr-3" style="font-size: 1.5rem"></i>
                            <div>
                                <div class="font-medium mb-1">Document contractuel</div>
                                <Button class="p-button-text p-button-sm" @click="downloadDocument(contract.media.file)"> <i class="pi pi-download mr-2"></i>Télécharger </Button>
                            </div>
                        </div>
                        <div v-else class="flex items-center justify-center h-24 text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <i class="pi pi-file-excel mr-2"></i>
                            Aucun document disponible
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sections principales -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <!-- Informations sur l'assuré -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div class="px-6 py-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center">
                        <i class="pi pi-user text-blue-500 mr-2" style="font-size: 1.2rem"></i>
                        <h3 class="font-bold text-gray-800 dark:text-white">Informations de l'assuré</h3>
                    </div>
                    <div class="p-6" v-if="contract.insured">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">Nom complet</div>
                                <div>{{ contract.insured.name }} {{ contract.insured.surname }}</div>
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">Date de naissance</div>
                                <div>{{ formatDate(contract.insured.birthdate) }}</div>
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</div>
                                <div>{{ contract.insured.phone || 'Non spécifié' }}</div>
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">Email</div>
                                <div>{{ contract.insured.email || 'Non spécifié' }}</div>
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg col-span-1 md:col-span-2">
                                <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">Pays d'origine</div>
                                <div>{{ contract.insured.country_origin?.longName || 'Non spécifié' }}</div>
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg col-span-1 md:col-span-2" v-if="contract.insured.subscribers">
                                <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">Souscripteur</div>
                                <div>{{ contract.insured.subscribers.name }} {{ contract.insured.subscribers.surname }}</div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="p-6 text-center text-gray-500">Informations de l'assuré non disponibles</div>
                </div>

                <!-- Garanties -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div class="px-6 py-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center">
                        <i class="pi pi-shield text-green-500 mr-2" style="font-size: 1.2rem"></i>
                        <h3 class="font-bold text-gray-800 dark:text-white">Garanties du contrat</h3>
                    </div>
                    <div v-if="contract.guarantees && contract.guarantees.length > 0" class="p-6">
                        <div v-for="guarantee in contract.guarantees" :key="guarantee.id" class="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border-l-4 border-green-500">
                            <div class="font-medium text-lg">{{ guarantee.name }}</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">{{ guarantee.description }}</div>
                        </div>
                    </div>
                    <div v-else class="p-6 text-center text-gray-500 flex flex-col items-center justify-center h-40">
                        <i class="pi pi-shield mb-2" style="font-size: 1.5rem"></i>
                        Aucune garantie spécifiée pour ce contrat
                    </div>
                </div>
            </div>

            <!-- Bénéficiaires -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
                <div class="px-6 py-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center">
                    <i class="pi pi-users text-orange-500 mr-2" style="font-size: 1.2rem"></i>
                    <h3 class="font-bold text-gray-800 dark:text-white">Bénéficiaires</h3>
                </div>
                <div v-if="contract.insured && contract.insured.beneficiaries && contract.insured.beneficiaries.length > 0" class="p-6">
                    <DataTable :value="contract.insured.beneficiaries" class="p-datatable-sm" showGridlines stripedRows responsiveLayout="scroll">
                        <Column field="name" header="Prénom"></Column>
                        <Column field="surname" header="Nom"></Column>
                        <Column field="birthdate" header="Date de naissance">
                            <template #body="{ data }">
                                {{ formatDate(data.birthdate) }}
                            </template>
                        </Column>
                        <Column field="phone" header="Téléphone">
                            <template #body="{ data }">
                                {{ data.phone || 'Non spécifié' }}
                            </template>
                        </Column>
                        <Column field="email" header="Email">
                            <template #body="{ data }">
                                {{ data.email || 'Non spécifié' }}
                            </template>
                        </Column>
                    </DataTable>
                </div>
                <div v-else class="p-12 text-center text-gray-500 flex flex-col items-center justify-center">
                    <i class="pi pi-users mb-3" style="font-size: 2rem"></i>
                    Aucun bénéficiaire pour ce contrat
                </div>
            </div>

            <!-- Informations supplémentaires sur l'assureur -->
            <div v-if="contract.product && contract.product.insurer" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
                <div class="px-6 py-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center">
                    <i class="pi pi-building text-purple-500 mr-2" style="font-size: 1.2rem"></i>
                    <h3 class="font-bold text-gray-800 dark:text-white">Informations sur l'assureur</h3>
                </div>
                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">Nom de l'assureur</div>
                            <div>{{ contract.product.insurer.name }}</div>
                        </div>
                        <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">Acronyme</div>
                            <div>{{ contract.product.insurer.acronym || 'Non spécifié' }}</div>
                        </div>
                        <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">Code intermédiaire</div>
                            <div>{{ contract.product.insurer.intermediateCode || 'Non spécifié' }}</div>
                        </div>
                        <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">Email</div>
                            <div>{{ contract.product.insurer.email || 'Non spécifié' }}</div>
                        </div>
                        <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone principal</div>
                            <div>{{ contract.product.insurer.phone1 || 'Non spécifié' }}</div>
                        </div>
                        <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone secondaire</div>
                            <div>{{ contract.product.insurer.phone2 || 'Non spécifié' }}</div>
                        </div>
                        <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg col-span-1 md:col-span-3">
                            <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse</div>
                            <div>{{ contract.product.insurer.address || 'Non spécifiée' }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Métadonnées -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div class="px-6 py-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center">
                    <i class="pi pi-cog text-gray-500 mr-2" style="font-size: 1.2rem"></i>
                    <h3 class="font-bold text-gray-800 dark:text-white">Métadonnées</h3>
                </div>
                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">ID du contrat</div>
                            <div class="text-sm font-mono">{{ contract.id }}</div>
                        </div>
                        <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">Créé le</div>
                            <div>{{ formatDate(contract.created_at) }}</div>
                        </div>
                        <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">Dernière mise à jour</div>
                            <div>{{ formatDate(contract.updated_at) }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
/* Vous pouvez ajouter des styles personnalisés ici si nécessaire */
.p-datatable .p-datatable-thead > tr > th {
    background-color: #f8f9fa;
    color: #495057;
    font-weight: 600;
}

.dark .p-datatable .p-datatable-thead > tr > th {
    background-color: #2d3748;
    color: #e2e8f0;
}

/* Style pour les états du contrat */
.p-tag.p-tag-success {
    background-color: #10b981;
}

.p-tag.p-tag-warning {
    background-color: #f59e0b;
}

.p-tag.p-tag-danger {
    background-color: #ef4444;
}

.p-tag.p-tag-info {
    background-color: #3b82f6;
}
</style>
