import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '../views/LoginPage.vue';

// Define Routes
const routes = [
    {
        path: '/login',
        name: 'Login',
        component: LoginPage,
        meta: { public: true }
    },
    {
        path: '/',
        name: 'Dashboard',
        // Lazy load Dashboard (assuming it was in App.vue, we need to extract it or use App as layout)
        // For now, let's keep it simple: Assuming App.vue handles the layout, we might need a DashboardView.
        // BUT App.vue likely contains the whole app logic.
        // Let's create a wrapper or just use a dummy component for now if we haven't refactored App.vue.
        component: () => import('../views/DashboardView.vue'),
        meta: { requiresAuth: true }
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

// Global Guard
router.beforeEach((to, from, next) => {
    const isAuthenticated = !!localStorage.getItem('auth_token');

    if (to.meta.requiresAuth && !isAuthenticated) {
        next('/login');
    } else if (to.path === '/login' && isAuthenticated) {
        next('/');
    } else {
        next();
    }
});

export default router;
