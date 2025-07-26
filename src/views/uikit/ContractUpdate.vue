<script setup>
import { apiClient } from '@/service/auth';
import { useSettings } from '@/service/useSettings';
import Step from 'primevue/step';
import StepList from 'primevue/steplist';
import Stepper from 'primevue/stepper';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const contract = ref(null);
const load = ref(null);
const err = ref(null);
const { countries, insurers, products, guarantees, loading, error, fetchCountries, fetchInsurers, fetchGuarantees, fetchAllSettings, fetchProductsByInsurer, existingInsureds } = useSettings();

const currentStep = ref(0);
const hasSubscriber = ref(null);
const hasBeneficiaries = ref(null);
const beneficiariesList = ref([]);
const showNewInsuredForm = ref(false);
const selectedExistingInsured = ref(null);

const toast = useToast();

const selectedInsurer = ref(null);
const selectedProduct = ref(null);
const selectedCountryExpatriation = ref(null);
const selectedCountryOrigin = ref(null);
const selectedPdfFile = ref(null);

const filteredInsurer = ref([]);
const filteredProduct = ref([]);
const filteredCountryExpatriation = ref([]);
const filteredCountryOrigin = ref([]);

function searchInsurer(event) {
    setTimeout(() => {
        const query = event.query?.trim().toLowerCase();

        if (!query) {
            filteredInsurer.value = [...insurers.value];
        } else {
            filteredInsurer.value = insurers.value.filter((insurer) => insurer.name.toLowerCase().startsWith(query));
        }
    }, 250);
}

function searchProduct(event) {
    setTimeout(() => {
        if (!event.query.trim().length) {
            filteredProduct.value = [...products.value];
        } else {
            filteredProduct.value = products.value.filter((product) => {
                return product.name.toLowerCase().startsWith(event.query.toLowerCase());
            });
        }
    }, 250);
}

function searchCountryExpatriation(event) {
    setTimeout(() => {
        if (!event.query.trim().length) {
            filteredCountryExpatriation.value = [...countries.value];
        } else {
            filteredCountryExpatriation.value = countries.value.filter((country) => {
                return country.name.toLowerCase().startsWith(event.query.toLowerCase());
            });
        }
    }, 250);
}

function searchCountryOrigin(event) {
    setTimeout(() => {
        if (!event.query.trim().length) {
            filteredCountryOrigin.value = [...countries.value];
        } else {
            filteredCountryOrigin.value = countries.value.filter((country) => {
                return country.name.toLowerCase().startsWith(event.query.toLowerCase());
            });
        }
    }, 250);
}

const onPdfSelected = (event) => {
    const file = event.files?.[0];
    if (file && file.type === 'application/pdf') {
        selectedPdfFile.value = file;
        contractData.value.id_medias = file;
    } else {
        selectedPdfFile.value = null;
        contractData.value.id_medias = null;
        console.warn('Veuillez sélectionner un fichier PDF valide.');
    }
};

watch(selectedInsurer, (newInsurer) => {
    if (newInsurer && newInsurer.id) {
        fetchProductsByInsurer(newInsurer.id);
        selectedProduct.value = null;
        filteredProduct.value = [];
    }
});

watch([selectedCountryOrigin, selectedCountryExpatriation], ([newOrigin, newExpatriation]) => {
    if (newOrigin && newExpatriation && hasCountryConflict.value) {
        toast.add({
            severity: 'error',
            summary: 'Erreur de validation',
            detail: "Le pays d'origine et le pays d'expatriation ne peuvent pas être identiques",
            life: 5000
        });
    }
});

const subscriberData = ref({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthdate: null
});

const contractData = ref({
    contractNumber: '',
    effectDate: null,
    dueDate: null,
    periodicity: null,
    coveragePercentage: 0,
    netPremium: 0,
    ttcPremium: 0,
    id_products: selectedProduct.value,
    id_countries_expat: selectedCountryExpatriation.value,
    id_medias: null
});

const insuredData = ref({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthdate: null,
    id_countries_origin: selectedCountryOrigin.value
});
console.log(insuredData.value);
const guaranteeData = ref([]);

const preventNonDigits = (e) => {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];

    if (!/^\d$/.test(e.key) && !allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
    }
};

const handlePaste = (e, type) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const digitsOnly = pastedText.replace(/\D/g, '');

    const targetData = type === 'subscriber' ? subscriberData.value : insuredData.value;

    targetData.phone = targetData.phone.substring(0, e.target.selectionStart) + digitsOnly + targetData.phone.substring(e.target.selectionEnd);
};

const filterNonDigits = (type) => {
    if (type === 'subscriber') {
        subscriberData.value.phone = subscriberData.value.phone.replace(/\D/g, '');
    } else {
        insuredData.value.phone = insuredData.value.phone.replace(/\D/g, '');
    }
};

const filterBeneficiaryPhone = (index) => {
    if (beneficiariesList.value[index]) {
        beneficiariesList.value[index].phone = beneficiariesList.value[index].phone.replace(/\D/g, '');
    }
};

const preventNonDigitsForBeneficiary = (e, index) => {
    preventNonDigits(e);
};

const handlePasteForBeneficiary = (e, index) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const digitsOnly = pastedText.replace(/\D/g, '');

    const targetBeneficiary = beneficiariesList.value[index];
    if (targetBeneficiary) {
        targetBeneficiary.phone = targetBeneficiary.phone.substring(0, e.target.selectionStart) + digitsOnly + targetBeneficiary.phone.substring(e.target.selectionEnd);
    }
};

const addBeneficiary = () => {
    beneficiariesList.value.push({
        firstName: '',
        lastName: '',
        birthdate: null,
        phone: '',
        email: ''
    });
};

const removeBeneficiary = (index) => {
    beneficiariesList.value.splice(index, 1);
};

const availablePeriodicities = computed(() => {
    const effect = contractData.value.effectDate;
    const due = contractData.value.dueDate;

    if (!effect || !due) return [];

    const start = new Date(effect);
    const end = new Date(due);
    const diffInMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

    const options = [];
    if (diffInMonths >= 1) options.push({ name: 'Mensuelle', code: 'monthly' });
    if (diffInMonths >= 3) options.push({ name: 'Trimestrielle', code: 'quarterly' });
    if (diffInMonths >= 6) options.push({ name: 'Semestrielle', code: 'biannual' });
    if (diffInMonths >= 12) options.push({ name: 'Annuelle', code: 'annual' });

    return options;
});

watch(availablePeriodicities, (newOptions) => {
    if (!newOptions.find((p) => p.code === contractData.value.periodicity)) {
        contractData.value.periodicity = newOptions[0]?.code || null;
    }
});

const steps = computed(() => {
    const baseSteps = [{ title: 'Souscripteur', description: 'Existe-t-il un souscripteur ?' }];

    if (hasSubscriber.value === true) {
        baseSteps.push({ title: 'Informations Souscripteur', description: 'Informations du souscripteur' });
        baseSteps.push({ title: 'Informations Assuré', description: "Informations de l'assuré" });
    } else if (hasSubscriber.value === false) {
        baseSteps.push({ title: 'Informations Assuré', description: "Informations de l'assuré" });
    }

    baseSteps.push({ title: 'Bénéficiaire(s)', description: 'Existe-t-il un ou plusieurs bénéficiaires ?' });

    if (hasBeneficiaries.value === true) {
        baseSteps.push({
            title: 'Informations bénéficiaire(s)',
            description: 'Saisie des bénéficiaires'
        });
    }

    baseSteps.push({
        title: 'Contrat',
        description: 'Informations du contrat'
    });

    baseSteps.push({ title: 'Confirmation', description: 'Vérification des informations' });

    return baseSteps;
});

const nextStep = () => {
    if (currentStep.value < steps.value.length - 1) {
        currentStep.value++;
    }
};

const prevStep = () => {
    if (currentStep.value > 0) {
        currentStep.value--;
    }
};

const setHasSubscriber = (value) => {
    hasSubscriber.value = value;
    nextStep();
};

const setHasBeneficiaries = (value) => {
    hasBeneficiaries.value = value;
    nextStep();
};

const createNewInsured = () => {
    showNewInsuredForm.value = true;
};

const selectExistingInsured = () => {
    if (selectedExistingInsured.value) {
        const selected = selectedExistingInsured.value;
        const [firstName, lastName] = selected.name.split(' ');
        insuredData.value = {
            firstName,
            lastName,
            email: selected.email,
            phone: selected.phone,
            birthdate: selected.birthdate
        };
        nextStep();
    }
};

const hasCountryConflict = computed(() => {
    if (!selectedCountryOrigin.value || !selectedCountryExpatriation.value) return false;

    if (Array.isArray(selectedCountryOrigin.value) && Array.isArray(selectedCountryExpatriation.value)) {
        return selectedCountryExpatriation.value.some((expatCountry) => selectedCountryOrigin.value.some((originCountry) => originCountry.name === expatCountry.name));
    } else if (selectedCountryOrigin.value && selectedCountryExpatriation.value) {
        return selectedCountryOrigin.value.name === selectedCountryExpatriation.value.name;
    }

    return false;
});

const lastBeneficiaryIsValid = computed(() => {
    if (beneficiariesList.value.length === 0) return true;

    const lastBeneficiary = beneficiariesList.value[beneficiariesList.value.length - 1];
    return lastBeneficiary.firstName?.trim() && lastBeneficiary.lastName?.trim() && lastBeneficiary.birthdate;
});

const canProceed = computed(() => {
    if (currentStep.value === 0) {
        return hasSubscriber.value !== null;
    }

    if (currentStep.value === 1) {
        if (hasSubscriber.value === true) {
            return subscriberData.value.firstName?.trim() && subscriberData.value.lastName?.trim() && subscriberData.value.birthdate && subscriberData.value.phone?.trim();
        } else {
            if (showNewInsuredForm.value) {
                const countriesValid = selectedCountryOrigin.value !== null && !hasCountryConflict.value;

                if (selectedCountryOrigin.value && selectedCountryExpatriation.value && hasCountryConflict.value) {
                    toast.add({
                        severity: 'error',
                        summary: 'Erreur de validation',
                        detail: "Le pays d'origine et le pays d'expatriation ne peuvent pas être identiques",
                        life: 5000
                    });
                }

                return insuredData.value.firstName?.trim() && insuredData.value.lastName?.trim() && insuredData.value.email?.trim() && insuredData.value.birthdate && insuredData.value.phone?.trim() && countriesValid;
            } else {
                return selectedExistingInsured.value !== null;
            }
        }
    }

    if (currentStep.value === 2 && hasSubscriber.value === true) {
        if (showNewInsuredForm.value) {
            const countriesValid = selectedCountryOrigin.value !== null && !hasCountryConflict.value;

            if (selectedCountryOrigin.value && selectedCountryExpatriation.value && hasCountryConflict.value) {
                toast.add({
                    severity: 'error',
                    summary: 'Erreur de validation',
                    detail: "Le pays d'origine et le pays d'expatriation ne peuvent pas être identiques",
                    life: 5000
                });
            }

            return insuredData.value.firstName?.trim() && insuredData.value.lastName?.trim() && insuredData.value.email?.trim() && insuredData.value.birthdate && insuredData.value.phone?.trim() && countriesValid;
        } else {
            return selectedExistingInsured.value !== null;
        }
    }

    if (currentStep.value === steps.value.findIndex((s) => s.title === 'Informations bénéficiaire(s)')) {
        if (beneficiariesList.value.length === 0) return false;

        return beneficiariesList.value.every((b) => b.firstName?.trim() && b.lastName?.trim() && b.birthdate);
    }

    if (currentStep.value === steps.value.findIndex((s) => s.title === 'Contrat')) {
        if (selectedCountryOrigin.value && selectedCountryExpatriation.value && hasCountryConflict.value) {
            toast.add({
                severity: 'error',
                summary: 'Erreur de validation',
                detail: "Le pays d'origine et le pays d'expatriation ne peuvent pas être identiques",
                life: 5000
            });
        }

        const isValidContract =
            contractData.value.contractNumber?.trim() &&
            contractData.value.effectDate &&
            contractData.value.dueDate &&
            contractData.value.periodicity &&
            guaranteeData.value.length > 0 &&
            selectedInsurer.value &&
            selectedProduct.value &&
            selectedCountryExpatriation.value &&
            contractData.value.coveragePercentage &&
            contractData.value.ttcPremium &&
            contractData.value.dueDate > contractData.value.effectDate &&
            !hasCountryConflict.value;

        return isValidContract;
    }

    return true;
});

const watchSelectedInsured = computed(() => {
    if (selectedExistingInsured.value) {
        selectExistingInsured();
    }
    return selectedExistingInsured.value;
});

const periodicityLabel = computed(() => {
    return availablePeriodicities.value.find((p) => p.code === contractData.value.periodicity)?.name || 'Non renseignée';
});

const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

watch(
    () => subscriberData.value.email,
    (newEmail) => {
        if (newEmail && !isValidEmail(newEmail)) {
        }
    }
);

watch(
    () => insuredData.value.email,
    (newEmail) => {
        if (newEmail && !isValidEmail(newEmail)) {
        }
    }
);

watch(
    beneficiariesList,
    (list) => {
        list.forEach((beneficiary, index) => {
            if (beneficiary.email && !isValidEmail(beneficiary.email)) {
            }
        });
    },
    { deep: true }
);

watch(selectedProduct, (newProduct) => {
    if (newProduct) {
        contractData.value.id_products = newProduct.id;
    } else {
        contractData.value.id_products = null;
    }
});

watch(selectedCountryExpatriation, (newCountry) => {
    if (newCountry) {
        contractData.value.id_countries = newCountry.id;
    } else {
        contractData.value.id_countries = null;
    }
});

watch(selectedCountryOrigin, (newCountry) => {
    if (newCountry) {
        insuredData.value.id_countries = newCountry.id;
    } else {
        insuredData.value.id_countries = null;
    }
});

const loadContractDetails = async () => {
    load.value = true;
    err.value = null;

    try {
        const contractId = route.params.id;
        if (!contractId) {
            throw new Error('ID du contrat non spécifié');
        }

        const response = await apiClient.get(`/app/contracts/${contractId}`);

        if (response.data.status === 'success' && response.data.data) {
            contract.value = response.data.data;

            contractData.value = {
                contractNumber: contract.value.contractNumber,
                effectDate: new Date(contract.value.effectDate),
                dueDate: new Date(contract.value.dueDate),
                periodicity: contract.value.periodicity,
                coveragePercentage: contract.value.coveragePercentage,
                netPremium: parseFloat(contract.value.netPremium),
                ttcPremium: parseFloat(contract.value.ttcPremium),
                id_products: contract.value.id_products,
                id_countries_expat: contract.value.id_countries_expat,
                id_medias: contract.value.id_medias
            };

            hasSubscriber.value = contract.value.insured.subscribers !== null;
            if (hasSubscriber.value) {
                subscriberData.value = {
                    firstName: contract.value.insured.subscribers.name,
                    lastName: contract.value.insured.subscribers.surname,
                    email: contract.value.insured.subscribers.email,
                    phone: contract.value.insured.subscribers.phone,
                    birthdate: new Date(contract.value.insured.subscribers.birthdate)
                };
            }

            guaranteeData.value = contract.value.guarantees;

            if (existingInsureds.value && existingInsureds.value.length > 0) {
                const foundInsured = existingInsureds.value.find((insured) => insured.id === contract.value.insured.id);

                if (foundInsured) {
                    selectedExistingInsured.value = foundInsured;
                }
            }

            if (contract.value.insured.beneficiaries && contract.value.insured.beneficiaries.length > 0) {
                hasBeneficiaries.value = true;
                beneficiariesList.value = contract.value.insured.beneficiaries.map((b) => ({
                    firstName: b.name,
                    lastName: b.surname,
                    birthdate: new Date(b.birthdate),
                    phone: b.phone,
                    email: b.email
                }));
            } else {
                hasBeneficiaries.value = false;
            }

            const fetchedInsurer = insurers.value.find((insurer) => insurer.id === contract.value.product.id_insurers);

            if (fetchedInsurer) {
                selectedInsurer.value = fetchedInsurer;

                await fetchProductsByInsurer(fetchedInsurer.id);

                setTimeout(() => {
                    const fetchedProduct = products.value.find((product) => product.id === contract.value.id_products);
                    if (fetchedProduct) {
                        selectedProduct.value = fetchedProduct;
                    }
                }, 300);
            }

            const fetchedCountryExpatriation = countries.value.find((country) => country.id === contract.value.id_countries_expat);
            if (fetchedCountryExpatriation) {
                selectedCountryExpatriation.value = fetchedCountryExpatriation;
            }

            const fetchedCountryOrigin = countries.value.find((country) => country.id === contract.value.insured.id_countries_origin);
            if (fetchedCountryOrigin) {
                selectedCountryOrigin.value = fetchedCountryOrigin;
            }

            currentStep.value = steps.value.length - 2;
        } else {
            throw new Error(response.data.message || 'Erreur lors du chargement des données du contrat');
        }
    } catch (error) {
        console.error('Erreur lors du chargement du contrat:', error);
        err.value = error.message || 'Une erreur est survenue lors du chargement des détails du contrat';
    } finally {
        load.value = false;
    }
};

const goBack = () => {
    router.back();
};

onMounted(async () => {
    await fetchAllSettings();
    await loadContractDetails();
});

const submitForm = async () => {
    try {
        const contractId = route.params.id;

        const formatDate = (date) => {
            if (!date) return null;

            if (typeof date === 'string') return date;

            const d = new Date(date);
            return d instanceof Date && !isNaN(d) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null;
        };

        const contractPayload = {
            contractNumber: contractData.value.contractNumber || '',
            effectDate: formatDate(contractData.value.effectDate),
            dueDate: formatDate(contractData.value.dueDate),
            periodicity: contractData.value.periodicity,
            coveragePercentage: contractData.value.coveragePercentage,
            netPremium: parseFloat(contractData.value.netPremium) || 0,
            ttcPremium: parseFloat(contractData.value.ttcPremium) || 0,
            id_products: selectedProduct.value?.id,
            id_countries_expat: selectedCountryExpatriation.value?.id,

            insured: {
                id: selectedExistingInsured.value?.id || null,

                ...(!selectedExistingInsured.value?.id && {
                    name: insuredData.value.firstName,
                    surname: insuredData.value.lastName,
                    birthdate: formatDate(insuredData.value.birthdate),
                    phone: insuredData.value.phone,
                    email: insuredData.value.email,
                    id_countries_origin: selectedCountryOrigin.value?.id
                })
            },

            subscriber: hasSubscriber.value
                ? {
                      name: subscriberData.value.firstName,
                      surname: subscriberData.value.lastName,
                      birthdate: formatDate(subscriberData.value.birthdate),
                      phone: subscriberData.value.phone,
                      email: subscriberData.value.email || null
                  }
                : null,

            guarantees: guaranteeData.value.map((guarantee) => guarantee.id),

            beneficiaries: hasBeneficiaries.value
                ? beneficiariesList.value.map((beneficiary) => ({
                      name: beneficiary.firstName,
                      surname: beneficiary.lastName,
                      birthdate: formatDate(beneficiary.birthdate),
                      phone: beneficiary.phone || null,
                      email: beneficiary.email || null
                  }))
                : []
        };

        let requestData = contractPayload;

        if (selectedPdfFile.value) {
            const fileReader = new FileReader();

            const fileBase64 = await new Promise((resolve, reject) => {
                fileReader.onload = () => resolve(fileReader.result.split(',')[1]);
                fileReader.onerror = reject;
                fileReader.readAsDataURL(selectedPdfFile.value);
            });

            requestData.mediaData = fileBase64;
            requestData.mediaName = selectedPdfFile.value.name;
            requestData.mediaType = selectedPdfFile.value.type;
        }

        console.log('JSON payload:', requestData);

        const response = await apiClient.put(`/app/contracts/${contractId}`, requestData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        toast.add({
            severity: 'success',
            summary: 'Contrat mis à jour',
            detail: 'Le contrat a été mis à jour avec succès',
            life: 5000
        });

        router.push({ name: 'contract-manager' });

        return response.data;
    } catch (error) {
        console.error('Error submitting form:', error);
        console.error('Response data:', error.response?.data);

        let errorMessage = 'Une erreur est survenue lors de la mise à jour du contrat';

        if (error.response && error.response.data && error.response.data.errors) {
            const errors = error.response.data.errors;
            const firstError = Object.values(errors)[0];
            errorMessage = firstError[0] || errorMessage;

            console.log('Validation errors:');
            Object.entries(errors).forEach(([field, messages]) => {
                console.log(`${field}: ${messages.join(', ')}`);
            });
        }

        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: errorMessage,
            life: 5000
        });

        throw error;
    }
};
</script>

<template>
    <div class="form-container w-full p-6 bg-white rounded-lg shadow-lg">
        <!-- En-tête avec navigation et statut -->
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
            <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                <Button icon="pi pi-arrow-left" label="Retour à la liste" class="p-button-secondary p-button-sm" @click="goBack" />
                <h1 class="text-2xl font-bold text-gray-800 dark:text-white">
                    Modification du contrat
                    <span class="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-blue-800 dark:text-blue-200">
                        {{ contractData.contractNumber }}
                    </span>
                </h1>
            </div>
        </div>

        <!-- Affichage du chargement -->
        <div v-if="load" class="flex justify-center items-center p-12">
            <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="3" />
            <span class="ml-3 text-gray-600 dark:text-gray-300">Chargement des détails du contrat...</span>
        </div>

        <div v-else-if="err" class="p-6">
            <Message severity="error" :closable="false" class="mb-4">
                <div class="flex items-center">
                    <i class="pi pi-exclamation-circle mr-3" style="font-size: 1.5rem"></i>
                    <div>
                        <div class="font-bold mb-1">Erreur</div>
                        <div>{{ err }}</div>
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

        <Stepper :value="currentStep + 1" class="mb-8 w-full">
            <StepList>
                <Step v-for="(step, index) in steps" :key="index" :value="index + 1">
                    {{ step.title }}
                </Step>
            </StepList>
        </Stepper>

        <!-- Contenu du formulaire -->
        <TransitionGroup name="fade" mode="out-in" class="w-full">
            <!-- Étape 1: Existe-t-il un souscripteur? -->
            <div v-if="currentStep === 0" key="step-1" class="fade-transition w-full">
                <h2 class="text-2xl font-bold mb-6 text-center">{{ steps[currentStep].description }}</h2>

                <div class="flex justify-center gap-4 mb-8">
                    <Button @click="setHasSubscriber(true)" :class="hasSubscriber === true ? 'p-button-primary' : 'p-button-secondary'" label="Oui" />
                    <Button @click="setHasSubscriber(false)" :class="hasSubscriber === false ? 'p-button-primary' : 'p-button-secondary'" label="Non" />
                </div>
            </div>

            <!-- Étape 2: Formulaire Souscripteur (quand hasSubscriber est true) -->
            <div v-if="currentStep === 1 && hasSubscriber === true" key="step-2-subscriber" class="fade-transition w-full">
                <h2 class="text-2xl font-bold mb-6 text-center">Informations du souscripteur</h2>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 w-full">
                    <div class="flex flex-col w-full">
                        <FloatLabel class="w-full">
                            <InputText id="subscriber-firstName" v-model="subscriberData.firstName" class="w-full" />
                            <label for="subscriber-firstName">Nom*</label>
                        </FloatLabel>
                    </div>

                    <div class="flex flex-col w-full">
                        <FloatLabel class="w-full">
                            <InputText id="subscriber-lastName" v-model="subscriberData.lastName" class="w-full" />
                            <label for="subscriber-lastName">Prénom(s)*</label>
                        </FloatLabel>
                    </div>

                    <div class="flex flex-col w-full">
                        <FloatLabel>
                            <DatePicker v-model="subscriberData.birthdate" :showIcon="true" :showButtonBar="true" dateFormat="dd/mm/yy" class="w-full" />
                            <label>Date de naissance*</label>
                        </FloatLabel>
                    </div>

                    <div class="flex flex-col w-full">
                        <FloatLabel class="w-full">
                            <InputText id="subscriber-phone" v-model="subscriberData.phone" type="tel" class="w-full" @keydown="preventNonDigits" @paste="(e) => handlePaste(e, 'subscriber')" @input="() => filterNonDigits('subscriber')" />
                            <label for="subscriber-phone">Téléphone*</label>
                        </FloatLabel>
                    </div>

                    <div class="flex flex-col w-full">
                        <FloatLabel class="w-full">
                            <InputText v-model="subscriberData.email" :class="{ 'p-invalid': subscriberData.email && !isValidEmail(subscriberData.email) }" />
                            <label for="subscriber-email">Email</label>
                        </FloatLabel>
                    </div>
                </div>
            </div>

            <!-- Étape Assuré (quand hasSubscriber est false) ou Étape 3 (quand hasSubscriber est true) -->
            <div v-if="(currentStep === 1 && hasSubscriber === false) || (currentStep === 2 && hasSubscriber === true)" key="step-insured" class="fade-transition w-full">
                <h2 class="text-2xl font-bold mb-6 text-center">{{ showNewInsuredForm ? 'Créer un nouvel assuré' : 'Sélectionner un autre assuré' }}</h2>

                <div v-if="!showNewInsuredForm" class="flex flex-col gap-6 mb-6 w-full">
                    <div class="w-full">
                        <Listbox v-model="selectedExistingInsured" :options="existingInsureds" optionLabel="name" :filter="true" placeholder="Rechercher un assuré existant" class="w-full" />
                    </div>

                    <div class="flex justify-center mt-6">
                        <Button @click="createNewInsured" label="Créer un nouvel assuré" class="p-button-secondary" />
                    </div>
                </div>

                <div v-if="showNewInsuredForm" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 w-full">
                    <div class="flex flex-col w-full">
                        <FloatLabel class="w-full">
                            <InputText id="insured-firstName" v-model="insuredData.firstName" class="w-full" />
                            <label for="insured-firstName">Nom*</label>
                        </FloatLabel>
                    </div>

                    <div class="flex flex-col w-full">
                        <FloatLabel class="w-full">
                            <InputText id="insured-lastName" v-model="insuredData.lastName" class="w-full" />
                            <label for="insured-lastName">Prénom(s)*</label>
                        </FloatLabel>
                    </div>

                    <div class="flex flex-col w-full">
                        <FloatLabel>
                            <DatePicker v-model="insuredData.birthdate" :showIcon="true" :showButtonBar="true" dateFormat="dd/mm/yy" class="w-full" />
                            <label>Date de naissance*</label>
                        </FloatLabel>
                    </div>

                    <AutoComplete v-model="selectedCountryOrigin" :suggestions="filteredCountryOrigin" optionLabel="name" placeholder="Pays d'origine*" dropdown display="chip" @complete="searchCountryOrigin($event)" />

                    <div class="flex flex-col w-full">
                        <FloatLabel class="w-full">
                            <InputText id="insured-phone" v-model="insuredData.phone" type="tel" class="w-full" @keydown="preventNonDigits" @paste="(e) => handlePaste(e, 'insured')" @input="() => filterNonDigits('insured')" />
                            <label for="insured-phone">Téléphone*</label>
                        </FloatLabel>
                    </div>

                    <div class="flex flex-col w-full">
                        <FloatLabel class="w-full">
                            <InputText v-model="insuredData.email" :class="{ 'p-invalid': insuredData.email && !isValidEmail(insuredData.email) }" />
                            <label for="insured-email">Email*</label>
                        </FloatLabel>
                    </div>

                    <div class="col-span-full flex justify-center mt-6">
                        <Button @click="showNewInsuredForm = false" label="← Retour à la sélection" class="p-button-text" />
                    </div>
                </div>
            </div>

            <div v-if="(currentStep === 2 && hasSubscriber === false) || (currentStep === 3 && hasSubscriber === true)" key="step-3" class="fade-transition w-full">
                <h2 class="text-2xl font-bold mb-6 text-center">{{ steps[currentStep].description }}</h2>

                <div class="flex justify-center gap-4 mb-8">
                    <Button @click="setHasBeneficiaries(true)" :class="hasBeneficiaries === true ? 'p-button-primary' : 'p-button-secondary'" label="Oui" />
                    <Button @click="setHasBeneficiaries(false)" :class="hasBeneficiaries === false ? 'p-button-primary' : 'p-button-secondary'" label="Non" />
                </div>
            </div>

            <!-- Gestion des Bénéficiaires -->
            <div v-if="currentStep === steps.findIndex((s) => s.title === 'Informations bénéficiaire(s)')" key="step-beneficiary" class="fade-transition w-full">
                <h2 class="text-2xl font-bold mb-6 text-center">Saisie des bénéficiaires</h2>

                <div v-for="(beneficiary, index) in beneficiariesList" :key="index" class="beneficiary-form mb-6 p-4 border rounded">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FloatLabel>
                            <InputText v-model="beneficiary.firstName" class="w-full" />
                            <label>Nom*</label>
                        </FloatLabel>

                        <FloatLabel>
                            <InputText v-model="beneficiary.lastName" class="w-full" />
                            <label>Prénom(s)*</label>
                        </FloatLabel>

                        <FloatLabel class="w-full">
                            <DatePicker v-model="beneficiary.birthdate" :showIcon="true" :showButtonBar="true" dateFormat="dd/mm/yy" class="w-full" />
                            <label>Date de naissance*</label>
                        </FloatLabel>

                        <FloatLabel>
                            <InputText
                                v-model="beneficiary.phone"
                                type="tel"
                                class="w-full"
                                @keydown="(e) => preventNonDigitsForBeneficiary(e, index)"
                                @paste="(e) => handlePasteForBeneficiary(e, index)"
                                @input="() => filterBeneficiaryPhone(index)"
                            />
                            <label>Téléphone</label>
                        </FloatLabel>

                        <FloatLabel>
                            <InputText v-model="beneficiary.email" :class="{ 'p-invalid': beneficiary.email && !isValidEmail(beneficiary.email) }" />
                            <label>Email</label>
                        </FloatLabel>
                    </div>

                    <Button @click="removeBeneficiary(index)" icon="pi pi-trash" class="p-button-danger mt-2" />
                </div>

                <Button @click="addBeneficiary" icon="pi pi-plus" label="Ajouter un bénéficiaire" class="p-button-primary" :disabled="!lastBeneficiaryIsValid" />
            </div>

            <!-- Étape Contrat -->
            <div v-if="currentStep === steps.findIndex((s) => s.title === 'Contrat')" key="step-contract" class="fade-transition w-full">
                <h2 class="text-2xl font-bold mb-6 text-center">Informations du contrat</h2>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <FloatLabel>
                        <InputText v-model="contractData.contractNumber" />
                        <label>Numéro de contrat*</label>
                    </FloatLabel>

                    <FloatLabel>
                        <DatePicker v-model="contractData.effectDate" :showIcon="true" :showButtonBar="true" dateFormat="dd/mm/yy" class="w-full" />
                        <label>Date d'effet*</label>
                    </FloatLabel>

                    <FloatLabel>
                        <DatePicker v-model="contractData.dueDate" :showIcon="true" :showButtonBar="true" dateFormat="dd/mm/yy" class="w-full" />
                        <label>Date d'échéance*</label>
                    </FloatLabel>

                    <Select v-model="contractData.periodicity" :options="availablePeriodicities" optionLabel="name" optionValue="code" placeholder="Périodicité*" class="w-full" :disabled="!contractData.effectDate || !contractData.dueDate" />

                    <MultiSelect
                        v-model="guaranteeData"
                        :options="guarantees"
                        optionLabel="name"
                        placeholder="Garanties*"
                        :filter="true"
                        class="w-full"
                        :maxSelectedLabels="1"
                        :showSelectAll="false"
                        :showClear="true"
                        :display="multiple"
                        :hideSelectedOptions="false"
                    >
                        <template #value="slotProps">
                            <div class="inline-flex items-center py-1 px-2 bg-primary text-primary-contrast rounded-border mr-2" v-for="option of slotProps.value" :key="option.code">
                                <div>{{ option.name }}</div>
                            </div>
                            <template v-if="!slotProps.value || slotProps.value.length === 0">
                                <div class="p-1">Garanties*</div>
                            </template>
                        </template>
                        <template #option="slotProps">
                            <div class="flex items-center">
                                <div>{{ slotProps.option.name }}</div>
                            </div>
                        </template>
                    </MultiSelect>

                    <AutoComplete v-model="selectedInsurer" :suggestions="filteredInsurer" optionLabel="name" placeholder="Assureur*" dropdown display="chip" @complete="searchInsurer($event)" />
                    <AutoComplete v-model="selectedProduct" :suggestions="filteredProduct" optionLabel="name" placeholder="Produit*" dropdown display="chip" :disabled="!selectedInsurer" @complete="searchProduct($event)" />

                    <AutoComplete v-model="selectedCountryExpatriation" :suggestions="filteredCountryExpatriation" optionLabel="name" placeholder="Pays d'expatriation*" dropdown display="chip" @complete="searchCountryExpatriation($event)" />

                    <div class="flex flex-col gap-2">
                        <label class="font-medium text-gray-700">Taux de couverture*</label>
                        <div class="flex flex-col md:flex-row gap-4">
                            <div class="flex items-center">
                                <RadioButton id="option1" name="coverage" value="80" v-model="contractData.coveragePercentage" />
                                <label for="option1" class="leading-none ml-2">80 %</label>
                            </div>
                            <div class="flex items-center">
                                <RadioButton id="option2" name="coverage" value="90" v-model="contractData.coveragePercentage" />
                                <label for="option2" class="leading-none ml-2">90 %</label>
                            </div>
                            <div class="flex items-center">
                                <RadioButton id="option3" name="coverage" value="100" v-model="contractData.coveragePercentage" />
                                <label for="option3" class="leading-none ml-2">100 %</label>
                            </div>
                        </div>
                    </div>

                    <FloatLabel class="w-full mt-3">
                        <InputNumber v-model="contractData.netPremium" locale="fr-FR" :useGrouping="false" :minFractionDigits="0" :maxFractionDigits="2" class="w-full" />
                        <label>Prime nette</label>
                    </FloatLabel>

                    <FloatLabel class="w-full mt-3">
                        <InputNumber v-model="contractData.ttcPremium" locale="fr-FR" :useGrouping="false" :minFractionDigits="0" :maxFractionDigits="2" class="w-full" />
                        <label>Prime TTC*</label>
                    </FloatLabel>

                    <div class="md:col-span-4">
                        <FileUpload mode="basic" name="contractPdf" :customUpload="true" accept="application/pdf" :maxFileSize="5000000" @select="onPdfSelected" class="w-full" chooseLabel="Choisir un fichier PDF" />
                    </div>
                </div>
            </div>

            <!-- Étape Confirmation (dernière étape) -->
            <div v-if="currentStep === steps.findIndex((s) => s.title === 'Confirmation')" key="step-confirmation" class="fade-transition w-full max-w-4xl mx-auto">
                <h2 class="text-3xl font-bold mb-8 text-center text-gray-800">Confirmation des informations</h2>

                <!-- Section Souscripteur (si existant) -->
                <div v-if="hasSubscriber === true" class="mb-8">
                    <div class="flex items-center mb-4">
                        <div class="bg-blue-500 p-2 rounded-full mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h3 class="text-xl font-semibold text-gray-800">Informations du souscripteur</h3>
                    </div>
                    <div class="bg-white shadow-md rounded-lg overflow-hidden border border-gray-100">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                            <div class="space-y-2">
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-24">Nom:</span> <span class="text-gray-800">{{ subscriberData.firstName }}</span>
                                </p>
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-24">Prénom(s):</span> <span class="text-gray-800">{{ subscriberData.lastName }}</span>
                                </p>
                            </div>
                            <div class="space-y-2">
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-24">Naissance:</span> <span class="text-gray-800">{{ subscriberData.birthdate ? new Date(subscriberData.birthdate).toLocaleDateString('fr-FR') : 'Non renseignée' }}</span>
                                </p>
                            </div>
                            <div class="space-y-2">
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-24">Téléphone:</span> <span class="text-gray-800">{{ subscriberData.phone || 'Non renseigné' }}</span>
                                </p>
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-24">Email:</span> <span class="text-gray-800">{{ subscriberData.email || 'Non renseigné' }}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Section Assuré -->
                <div class="mb-8">
                    <div class="flex items-center mb-4">
                        <div class="bg-green-500 p-2 rounded-full mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                            </svg>
                        </div>
                        <h3 class="text-xl font-semibold text-gray-800">Informations de l'assuré</h3>
                    </div>
                    <div class="bg-white shadow-md rounded-lg overflow-hidden border border-gray-100">
                        <div v-if="insuredData && insuredData.firstName" class="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                            <div class="space-y-2">
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-24">Nom:</span> <span class="text-gray-800">{{ insuredData.firstName }}</span>
                                </p>
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-24">Prénom(s):</span> <span class="text-gray-800">{{ insuredData.lastName }}</span>
                                </p>
                            </div>
                            <div class="space-y-2">
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-24">Naissance:</span> <span class="text-gray-800">{{ insuredData.birthdate ? new Date(insuredData.birthdate).toLocaleDateString('fr-FR') : 'Non renseignée' }}</span>
                                </p>
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-24">Origine:</span>
                                    <span class="text-gray-800">{{
                                        selectedCountryOrigin ? (Array.isArray(selectedCountryOrigin) ? selectedCountryOrigin.map((country) => country.name).join(', ') : selectedCountryOrigin.name) : 'Non renseigné'
                                    }}</span>
                                </p>
                            </div>
                            <div class="space-y-2">
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-24">Téléphone:</span> <span class="text-gray-800">{{ insuredData.phone || 'Non renseigné' }}</span>
                                </p>
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-24">Email:</span> <span class="text-gray-800">{{ insuredData.email || 'Non renseigné' }}</span>
                                </p>
                            </div>
                        </div>
                        <div v-else class="p-6">
                            <p class="flex items-center">
                                <span class="font-medium text-gray-600 w-40">Assuré sélectionné:</span> <span class="text-gray-800">{{ selectedExistingInsured?.name || 'Non renseigné' }}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Section Bénéficiaires (si existants) -->
                <div v-if="hasBeneficiaries === true" class="mb-8">
                    <div class="flex items-center mb-4">
                        <div class="bg-purple-500 p-2 rounded-full mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            </svg>
                        </div>
                        <h3 class="text-xl font-semibold text-gray-800">Bénéficiaires</h3>
                    </div>
                    <div v-for="(beneficiary, index) in beneficiariesList" :key="index" class="bg-white shadow-md rounded-lg overflow-hidden border border-gray-100 mb-4">
                        <div class="bg-purple-50 px-6 py-3 border-b border-purple-100">
                            <h4 class="font-medium text-purple-800">Bénéficiaire {{ index + 1 }}</h4>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                            <div class="space-y-2">
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-24">Nom:</span> <span class="text-gray-800">{{ beneficiary.firstName }}</span>
                                </p>
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-24">Prénom(s):</span> <span class="text-gray-800">{{ beneficiary.lastName }}</span>
                                </p>
                            </div>
                            <div class="space-y-2">
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-24">Naissance:</span> <span class="text-gray-800">{{ beneficiary.birthdate ? new Date(beneficiary.birthdate).toLocaleDateString('fr-FR') : 'Non renseignée' }}</span>
                                </p>
                            </div>
                            <div class="space-y-2">
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-24">Téléphone:</span> <span class="text-gray-800">{{ beneficiary.phone || 'Non renseigné' }}</span>
                                </p>
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-24">Email:</span> <span class="text-gray-800">{{ beneficiary.email || 'Non renseigné' }}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Section Contrat -->
                <div class="mb-8">
                    <div class="flex items-center mb-4">
                        <div class="bg-amber-500 p-2 rounded-full mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 class="text-xl font-semibold text-gray-800">Informations du contrat</h3>
                    </div>
                    <div class="bg-white shadow-md rounded-lg overflow-hidden border border-gray-100">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                            <div class="space-y-3">
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-32">N° de contrat:</span> <span class="text-gray-800">{{ contractData.contractNumber }}</span>
                                </p>
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-32">Date d'effet:</span> <span class="text-gray-800">{{ contractData.effectDate ? new Date(contractData.effectDate).toLocaleDateString('fr-FR') : 'Non renseignée' }}</span>
                                </p>
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-32">Date d'échéance:</span> <span class="text-gray-800">{{ contractData.dueDate ? new Date(contractData.dueDate).toLocaleDateString('fr-FR') : 'Non renseignée' }}</span>
                                </p>
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-32">Périodicité:</span> <span class="text-gray-800">{{ periodicityLabel }}</span>
                                </p>
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-32">Assureur:</span> <span class="text-gray-800">{{ selectedInsurer ? selectedInsurer.name : 'Non renseigné' }}</span>
                                </p>
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-32">Produit:</span> <span class="text-gray-800">{{ selectedProduct ? selectedProduct.name : 'Non renseigné' }}</span>
                                </p>
                            </div>
                            <div class="space-y-3">
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-32">Expatriation:</span>
                                    <span class="text-gray-800">{{
                                        selectedCountryExpatriation ? (Array.isArray(selectedCountryExpatriation) ? selectedCountryExpatriation.map((country) => country.name).join(', ') : selectedCountryExpatriation.name) : 'Non renseigné'
                                    }}</span>
                                </p>
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-32">Taux couverture:</span> <span class="text-gray-800 font-medium">{{ contractData.coveragePercentage }}%</span>
                                </p>
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-32">Prime nette:</span>
                                    <span class="text-gray-800">{{ contractData.netPremium ? contractData.netPremium.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : '0.00 €' }}</span>
                                </p>
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-32">Prime TTC:</span>
                                    <span class="text-gray-800 font-medium">{{ contractData.ttcPremium ? contractData.ttcPremium.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : '0.00 €' }}</span>
                                </p>
                                <p class="flex items-center">
                                    <span class="font-medium text-gray-600 w-32">Document joint:</span> <span class="text-gray-800">{{ selectedPdfFile ? selectedPdfFile.name : 'Aucun' }}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Section Garanties -->
                <div class="mb-8">
                    <div class="flex items-center mb-4">
                        <div class="bg-teal-500 p-2 rounded-full mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                            </svg>
                        </div>
                        <h3 class="text-xl font-semibold text-gray-800">Garanties sélectionnées</h3>
                    </div>
                    <div class="bg-white shadow-md rounded-lg overflow-hidden border border-gray-100">
                        <div class="p-6">
                            <div v-if="guaranteeData.length > 0" class="flex flex-wrap gap-2">
                                <div v-for="guarantee in guaranteeData" :key="guarantee.id" class="bg-teal-50 text-teal-700 px-3 py-2 rounded-full border border-teal-200 font-medium text-sm">
                                    {{ guarantee.name }}
                                </div>
                            </div>
                            <p v-else class="text-gray-500 italic">Aucune garantie sélectionnée</p>
                        </div>
                    </div>
                </div>

                <!-- Bouton de soumission -->
                <div class="flex justify-center mt-10 mb-6">
                    <button @click="submitForm" class="bg-blue-600 hover:bg-blue-700 font-medium py-3 px-8 rounded-lg shadow-md transition duration-200 ease-in-out transform hover:-translate-y-1 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Confirmer et mettre à jour le contrat
                    </button>
                </div>
            </div>
        </TransitionGroup>

        <!-- Boutons de navigation -->
        <div class="flex justify-between mt-8 w-full">
            <Button v-if="currentStep > 0" @click="prevStep" label="Précédent" class="p-button-secondary" />
            <div v-else></div>

            <Button v-if="currentStep < steps.length - 1" @click="nextStep" label="Suivant" class="p-button-primary" :disabled="!canProceed" :class="{ 'p-disabled': !canProceed }" />
            <div v-else></div>
        </div>
    </div>
</template>

<style scoped>
.fade-transition-enter-active,
.fade-transition-leave-active {
    transition: opacity 0.5s ease;
}

.fade-transition-enter-from,
.fade-transition-leave-to {
    opacity: 0;
}

.fade-transition {
    transition: all 0.3s ease;
}

.form-container {
    width: 100%;
    min-height: 500px;
}

.p-invalid {
    border: 1px solid red !important;
    background-color: #ffe6e6;
}

:deep(.p-inputtext) {
    width: 100%;
}

:deep(.p-float-label) {
    width: 100%;
    display: block;
}

:deep(.p-button) {
    min-width: 120px;
}

:deep(.p-listbox) {
    width: 100%;
}
</style>
