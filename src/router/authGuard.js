import { isAuthenticated } from '@/service/auth';

/**
 * Middleware de garde pour l'authentification
 * Redirige vers la page de connexion si l'utilisateur n'est pas authentifié
 * @param {Object} to Route vers laquelle on navigue
 * @param {Object} from Route d'où on vient
 * @param {Function} next Fonction pour continuer la navigation
 */
export default function authGuard(to, from, next) {
    if (to.matched.some((record) => record.meta.requiresAuth)) {
        if (!isAuthenticated()) {
            next({
                path: '/auth/login',
                query: { redirect: to.fullPath }
            });
        } else {
            next();
        }
    } else {
        next();
    }
}
