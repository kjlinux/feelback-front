import axios from 'axios';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_KEY = 'user';
const REMEMBER_KEY = 'remember_me';
const ROLES_KEY = 'user_roles';
const PERMISSIONS_KEY = 'user_permissions';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'https://expat.api.assursuite.com/api'
});

api.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        const timestamp = Date.now();

        config.params = config.params || {};
        config.params._ts = timestamp;

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        if (error.response && error.response.status === 401) {
            try {
                const originalRequest = error.config;

                if (!originalRequest._retry) {
                    originalRequest._retry = true;
                    const response = await refreshToken();

                    if (response.data && response.data.access_token) {
                        setToken(response.data.access_token, isRememberMeActive());

                        originalRequest.headers['Authorization'] = `Bearer ${response.data.access_token}`;
                        return api(originalRequest);
                    }
                }
            } catch (refreshError) {
                logout();
                window.location.href = '/auth/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

/**
 * Authentifie l'utilisateur et stocke le token JWT
 * @param {string} email Email de l'utilisateur
 * @param {string} password Mot de passe de l'utilisateur
 * @param {boolean} remember Si on doit se souvenir de l'utilisateur
 * @returns {Promise} Promesse avec la réponse de l'API
 */
export const login = async (email, password, remember = false) => {
    try {
        const response = await api.post('/auth/login', { email, password });

        if (response.data && response.data.access_token) {
            setToken(response.data.access_token, remember);
            setUser(response.data.profile);
            setRememberMe(remember);

            if (response.data.roles) setRoles(response.data.roles);
            if (response.data.permissions) setPermissions(response.data.permissions);
        }

        return response;
    } catch (error) {
        throw error;
    }
};

/**
 * Rafraîchit le token JWT
 * @returns {Promise} Promesse avec la réponse de l'API
 */
export const refreshToken = async () => {
    try {
        const token = getToken();
        const response = await axios.get(`${import.meta.env.VITE_API_URL || 'https://expat.api.assursuite.com/api'}/auth/users/refresh`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data && response.data.access_token) {
            setToken(response.data.access_token, isRememberMeActive());
        }

        return response;
    } catch (error) {
        throw error;
    }
};

/**
 * Déconnecte l'utilisateur
 * @returns {Promise} Promesse avec la réponse de l'API
 */
export const logout = async () => {
    try {
        const response = await api.post('/auth/users/logout');

        clearAuth();
        return response;
    } catch (error) {
        clearAuth();
        throw error;
    }
};

/**
 * Récupère le profil de l'utilisateur
 * @returns {Promise} Promesse avec la réponse de l'API
 */
export const getProfile = async () => {
    return api.get('/auth/users/profile/get');
};

/**
 * Vérifie si l'utilisateur est authentifié
 * @returns {boolean} True si l'utilisateur est authentifié
 */
export const isAuthenticated = () => {
    const token = getToken();
    return !!token;
};

/**
 * Vérifie si le token est expiré
 * @param {string} token Token JWT
 * @returns {boolean} True si le token est expiré
 */
export const isTokenExpired = (token) => {
    if (!token) return true;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));

        return payload.exp < Date.now() / 1000;
    } catch (error) {
        return true;
    }
};

/**
 * Stocke le token JWT
 * @param {string} token Token JWT
 * @param {boolean} remember Si on doit stocker le token de façon persistante
 */
export const setToken = (token, remember = false) => {
    if (remember) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
        sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    }
};

/**
 * Récupère le token JWT
 * @returns {string|null} Token JWT ou null
 */
export const getToken = () => {
    let token = sessionStorage.getItem(AUTH_TOKEN_KEY);

    if (!token) {
        token = localStorage.getItem(AUTH_TOKEN_KEY);
    }

    if (token && isTokenExpired(token)) {
        clearAuth();
        return null;
    }

    return token;
};

/**
 * Stocke les informations de l'utilisateur
 * @param {Object} user Informations de l'utilisateur
 */
export const setUser = (user) => {
    const storage = isRememberMeActive() ? localStorage : sessionStorage;
    storage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Récupère les informations de l'utilisateur
 * @returns {Object|null} Informations de l'utilisateur ou null
 */
export const getUser = () => {
    let userStr = sessionStorage.getItem(USER_KEY);

    if (!userStr) {
        userStr = localStorage.getItem(USER_KEY);
    }

    return userStr ? JSON.parse(userStr) : null;
};

/**
 * Stocke les rôles de l'utilisateur
 * @param {Array} roles Liste des rôles
 */
export const setRoles = (roles) => {
    const storage = isRememberMeActive() ? localStorage : sessionStorage;
    storage.setItem(ROLES_KEY, JSON.stringify(roles));
};

/**
 * Récupère les rôles de l'utilisateur
 * @returns {Array|null} Liste des rôles ou null
 */
export const getRoles = () => {
    let rolesStr = sessionStorage.getItem(ROLES_KEY);

    if (!rolesStr) {
        rolesStr = localStorage.getItem(ROLES_KEY);
    }

    return rolesStr ? JSON.parse(rolesStr) : [];
};

/**
 * Stocke les permissions de l'utilisateur
 * @param {Array} permissions Liste des permissions
 */
export const setPermissions = (permissions) => {
    const storage = isRememberMeActive() ? localStorage : sessionStorage;
    storage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
};

/**
 * Récupère les permissions de l'utilisateur
 * @returns {Array|null} Liste des permissions ou null
 */
export const getPermissions = () => {
    let permsStr = sessionStorage.getItem(PERMISSIONS_KEY);

    if (!permsStr) {
        permsStr = localStorage.getItem(PERMISSIONS_KEY);
    }

    return permsStr ? JSON.parse(permsStr) : [];
};

/**
 * Vérifie si l'utilisateur a un rôle spécifique
 * @param {string} role Nom du rôle à vérifier
 * @returns {boolean} True si l'utilisateur a le rôle
 */
export const hasRole = (role) => {
    const roles = getRoles();
    return roles.includes(role);
};

/**
 * Vérifie si l'utilisateur a l'une des rôles spécifiés
 * @param {Array} rolesToCheck Liste des rôles à vérifier
 * @returns {boolean} True si l'utilisateur a au moins un des rôles
 */
export const hasAnyRole = (rolesToCheck) => {
    const roles = getRoles();
    return rolesToCheck.some((role) => roles.includes(role));
};

/**
 * Vérifie si l'utilisateur a une permission spécifique
 * @param {string} permission Nom de la permission à vérifier
 * @returns {boolean} True si l'utilisateur a la permission
 */
export const hasPermission = (permission) => {
    const permissions = getPermissions();
    return permissions.includes(permission);
};

/**
 * Vérifie si l'utilisateur a toutes les permissions spécifiées
 * @param {Array} permissionsToCheck Liste des permissions à vérifier
 * @returns {boolean} True si l'utilisateur a toutes les permissions
 */
export const hasAllPermissions = (permissionsToCheck) => {
    const permissions = getPermissions();
    return permissionsToCheck.every((perm) => permissions.includes(perm));
};

/**
 * Vérifie si l'utilisateur a au moins une des permissions spécifiées
 * @param {Array} permissionsToCheck Liste des permissions à vérifier
 * @returns {boolean} True si l'utilisateur a au moins une des permissions
 */
export const hasAnyPermission = (permissionsToCheck) => {
    const permissions = getPermissions();
    return permissionsToCheck.some((perm) => permissions.includes(perm));
};

/**
 * Stocke la préférence "Remember me"
 * @param {boolean} remember True si l'utilisateur veut être mémorisé
 */
export const setRememberMe = (remember) => {
    localStorage.setItem(REMEMBER_KEY, remember);
};

/**
 * Vérifie si la préférence "Remember me" est active
 * @returns {boolean} True si la préférence est active
 */
export const isRememberMeActive = () => {
    return localStorage.getItem(REMEMBER_KEY) === 'true';
};

/**
 * Supprime toutes les informations d'authentification
 */
export const clearAuth = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLES_KEY);
    sessionStorage.removeItem(ROLES_KEY);
    localStorage.removeItem(PERMISSIONS_KEY);
    sessionStorage.removeItem(PERMISSIONS_KEY);
};

export const apiClient = api;

export default {
    login,
    logout,
    refreshToken,
    getProfile,
    isAuthenticated,
    getToken,
    getUser,
    getRoles,
    getPermissions,
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    clearAuth,
    apiClient
};
