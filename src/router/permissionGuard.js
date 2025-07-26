import { useAuthStore } from '@/store/modules/auth';

/**
 * Middleware de garde pour les permissions
 * Vérifie si l'utilisateur a les permissions nécessaires pour accéder à la route
 * @param {Object} to Route vers laquelle on navigue
 * @param {Object} from Route d'où on vient
 * @param {Function} next Fonction pour continuer la navigation
 */
export default function permissionGuard(to, from, next) {
    const authStore = useAuthStore();

    if (to.meta.requiresPermissions) {
        const requiredPermissions = to.meta.requiresPermissions;

        if (Array.isArray(requiredPermissions)) {
            if (!authStore.hasAllPermissions(requiredPermissions)) {
                next({ name: 'accessDenied' });
                return;
            }
        } else if (typeof requiredPermissions === 'string') {
            if (!authStore.hasPermission(requiredPermissions)) {
                next({ name: 'accessDenied' });
                return;
            }
        }
    }

    if (to.meta.requiresRoles) {
        const requiredRoles = to.meta.requiresRoles;

        if (Array.isArray(requiredRoles)) {
            if (!authStore.hasAnyRole(requiredRoles)) {
                next({ name: 'accessDenied' });
                return;
            }
        } else if (typeof requiredRoles === 'string') {
            if (!authStore.hasRole(requiredRoles)) {
                next({ name: 'accessDenied' });
                return;
            }
        }
    }

    next();
}
