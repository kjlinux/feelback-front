import { useAuthStore } from '@/store/modules/auth';

/**
 * Directive permettant de conditionner l'affichage d'un élément selon les permissions/rôles
 *
 * Utilisation:
 * v-permission:permission="'users.create'" - Vérifie une permission spécifique
 * v-permission:permission="['users.create', 'users.edit']" - Vérifie la présence d'au moins une permission
 * v-permission:permission.all="['users.create', 'users.edit']" - Vérifie la présence de toutes les permissions
 * v-permission:role="'admin'" - Vérifie un rôle spécifique
 * v-permission:role="['admin', 'editor']" - Vérifie la présence d'au moins un rôle
 * v-permission:role.all="['admin', 'editor']" - Vérifie la présence de tous les rôles
 */

export const vPermission = {
    mounted(el, binding) {
        const authStore = useAuthStore();
        const { arg, value, modifiers } = binding;
        const hasAllModifier = modifiers.all;

        const isVisible = checkVisibility(authStore, arg, value, hasAllModifier);

        if (!isVisible) {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }
    }
};

/**
 * Vérifie si l'élément doit être visible selon les permissions/rôles
 * @param {Object} authStore Store d'authentification
 * @param {String} type Type de vérification ('permission' ou 'role')
 * @param {String|Array} value Valeur(s) à vérifier
 * @param {Boolean} checkAll Vérifier la présence de toutes les valeurs ou d'au moins une
 * @returns {Boolean} True si l'élément doit être visible
 */
function checkVisibility(authStore, type, value, checkAll) {
    if (type === 'permission') {
        if (Array.isArray(value)) {
            return checkAll ? authStore.hasAllPermissions(value) : authStore.hasAnyPermission(value);
        }
        return authStore.hasPermission(value);
    } else if (type === 'role') {
        if (Array.isArray(value)) {
            return checkAll ? value.every((role) => authStore.hasRole(role)) : authStore.hasAnyRole(value);
        }
        return authStore.hasRole(value);
    }

    return false;
}

export default {
    install(app) {
        app.directive('permission', vPermission);
    }
};
