import { apiClient } from '@/service/auth';

export const settingsService = {
    getCountries() {
        return apiClient.get('/settings/countries/small/get');
    },

    getInsurers() {
        return apiClient.get('/settings/insurers/small/get');
    },

    getProductsByInsurer(insurerId) {
        return apiClient.get(`/settings/products/products-by-insurer/${insurerId}`);
    },

    getGuarantees() {
        return apiClient.get('/settings/guarantees/small/get');
    },

    getInsureds() {
        return apiClient.get('/settings/insureds/small/get');
    },

    getRoles() {
        return apiClient.get('/settings/roles/small/get');
    }
};

export default {
    settingsService
};
