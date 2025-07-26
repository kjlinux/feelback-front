import * as authService from '@/service/auth';
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: authService.getToken(),
        user: authService.getUser(),
        roles: authService.getRoles(),
        permissions: authService.getPermissions(),
        loading: false,
        error: null
    }),

    getters: {
        isAuthenticated: (state) => !!state.token,
        userFullName: (state) => (state.user ? `${state.user.name}` : ''),
        hasError: (state) => !!state.error,

        hasRole: (state) => (role) => {
            if (!state.roles) return false;
            return state.roles.includes(role);
        },

        hasAnyRole: (state) => (rolesToCheck) => {
            if (!state.roles) return false;
            return rolesToCheck.some((role) => state.roles.includes(role));
        },

        hasPermission: (state) => (permission) => {
            if (!state.permissions) return false;
            return state.permissions.includes(permission);
        },

        hasAllPermissions: (state) => (permissionsToCheck) => {
            if (!state.permissions) return false;
            return permissionsToCheck.every((perm) => state.permissions.includes(perm));
        },

        hasAnyPermission: (state) => (permissionsToCheck) => {
            if (!state.permissions) return false;
            return permissionsToCheck.some((perm) => state.permissions.includes(perm));
        }
    },

    actions: {
        async login(email, password, remember) {
            this.loading = true;
            this.error = null;

            try {
                const response = await authService.login(email, password, remember);
                this.token = response.data.access_token;
                this.user = response.data.profile;
                this.roles = response.data.roles || [];
                this.permissions = response.data.permissions || [];
                return response;
            } catch (error) {
                this.error = error.response?.data?.message || 'Failed to login';
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async logout() {
            this.loading = true;
            this.error = null;

            try {
                await authService.logout();
                this.token = null;
                this.user = null;
                this.roles = [];
                this.permissions = [];
            } catch (error) {
                this.error = error.response?.data?.message || 'Failed to logout';
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async refreshToken() {
            this.loading = true;
            this.error = null;

            try {
                const response = await authService.refreshToken();
                this.token = response.data.access_token;
                return response;
            } catch (error) {
                this.error = error.response?.data?.message || 'Failed to refresh token';
                this.token = null;
                this.user = null;
                this.roles = [];
                this.permissions = [];
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchUser() {
            this.loading = true;
            this.error = null;

            try {
                const response = await authService.getProfile();
                this.user = response.data.data.user;
                this.roles = response.data.data.roles || [];
                this.permissions = response.data.data.permissions || [];
                return response;
            } catch (error) {
                this.error = error.response?.data?.message || 'Failed to fetch user profile';
                throw error;
            } finally {
                this.loading = false;
            }
        },

        clearError() {
            this.error = null;
        }
    }
});
