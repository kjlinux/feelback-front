// useSettings.js
import { settingsService } from '@/service/SettingsService.js';
import { ref } from 'vue';

export function useSettings() {
    const countries = ref(null);
    const insurers = ref(null);
    const products = ref(null);
    const guarantees = ref(null);
    const existingInsureds = ref(null);
    const roles = ref(null);
    const loading = ref({
        countries: false,
        insurers: false,
        products: false,
        guarantees: false,
        existingInsureds: false,
        roles: false
    });
    const error = ref({
        countries: null,
        insurers: null,
        products: null,
        guarantees: null,
        existingInsureds: null,
        roles: null
    });

    // Fonction pour charger les pays
    const fetchCountries = async () => {
        loading.value.countries = true;
        error.value.countries = null;

        try {
            const response = await settingsService.getCountries();
            countries.value = response.data.data;
        } catch (err) {
            console.error('Erreur lors du chargement des pays:', err);
            error.value.countries = err.message || 'Une erreur est survenue lors du chargement des pays';
        } finally {
            loading.value.countries = false;
        }
    };

    // Fonction pour charger les assureurs
    const fetchInsurers = async () => {
        loading.value.insurers = true;
        error.value.insurers = null;

        try {
            const response = await settingsService.getInsurers();
            insurers.value = response.data.data;
        } catch (err) {
            console.error('Erreur lors du chargement des assureurs:', err);
            error.value.insurers = err.message || 'Une erreur est survenue lors du chargement des assureurs';
        } finally {
            loading.value.insurers = false;
        }
    };

    // Fonction pour charger les produits
    // const fetchProducts = async () => {
    //     loading.value.products = true;
    //     error.value.products = null;

    //     try {
    //         const response = await settingsService.getProducts();
    //         products.value = response.data.data;
    //     } catch (err) {
    //         console.error('Erreur lors du chargement des produits:', err);
    //         error.value.products = err.message || 'Une erreur est survenue lors du chargement des produits';
    //     } finally {
    //         loading.value.products = false;
    //     }
    // };

    // Fonction pour charger les garanties
    const fetchGuarantees = async () => {
        loading.value.guarantees = true;
        error.value.guarantees = null;

        try {
            const response = await settingsService.getGuarantees();
            guarantees.value = response.data.data;
        } catch (err) {
            console.error('Erreur lors du chargement des garanties:', err);
            error.value.guarantees = err.message || 'Une erreur est survenue lors du chargement des garanties';
        } finally {
            loading.value.guarantees = false;
        }
    };

    const fetchProductsByInsurer = async (insurerId) => {
        loading.value.products = true;
        error.value.products = null;

        try {
            const response = await settingsService.getProductsByInsurer(insurerId);
            products.value = response.data.data;
        } catch (err) {
            console.error('Erreur lors du chargement des produits pour l’assureur:', err);
            error.value.products = err.message || 'Erreur lors du chargement des produits.';
        } finally {
            loading.value.products = false;
        }
    };

    const fetchInsureds = async () => {
        loading.value.existingInsureds = true;
        error.value.existingInsureds = null;

        try {
            const response = await settingsService.getInsureds();
            existingInsureds.value = response.data.data;
        } catch (err) {
            console.error('Erreur lors du chargement des assurés:', err);
            error.value.existingInsureds = err.message || 'Une erreur est survenue lors du chargement des assurés';
        } finally {
            loading.value.existingInsureds = false;
        }
    };

    const fetchRoles = async () => {
        loading.value.roles = true;
        error.value.roles = null;

        try {
            const response = await settingsService.getRoles();
            roles.value = response.data.data;
        } catch (err) {
            console.error('Erreur lors du chargement des roles:', err);
            error.value.roles = err.message || 'Une erreur est survenue lors du chargement des roles';
        } finally {
            loading.value.roles = false;
        }
    };

    // Fonction pour charger toutes les données en une seule fois
    const fetchAllSettings = () => {
        fetchCountries();
        fetchInsurers();
        // fetchProducts();
        fetchGuarantees();
        fetchInsureds();
        fetchRoles();
    };

    return {
        countries,
        insurers,
        products,
        guarantees,
        loading,
        error,
        existingInsureds,
        roles,
        fetchCountries,
        fetchInsurers,
        // fetchProducts,
        fetchGuarantees,
        fetchAllSettings,
        fetchProductsByInsurer,
        fetchRoles,
        fetchInsureds
    };
}
