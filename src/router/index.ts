import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { isSignedIn } from '@/api/session';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/home' },
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
  { path: '/home', name: 'home', component: () => import('@/views/HomeView.vue') },
  { path: '/services/:status', name: 'services', component: () => import('@/views/ServicesView.vue') },
  { path: '/services/show/:id', name: 'service', component: () => import('@/views/ServiceDetailView.vue') },
  { path: '/fuel', name: 'fuel', component: () => import('@/views/FuelLoadView.vue') },
  { path: '/checklist', name: 'checklist', component: () => import('@/views/ChecklistView.vue') },
  { path: '/incidents', name: 'incidents', component: () => import('@/views/IncidentView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/home' },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Sin sesión, solo el login; con sesión, el login lleva al inicio.
router.beforeEach((to) => {
  if (!to.meta.public && !isSignedIn()) {
    return { name: 'login' };
  }
  if (to.name === 'login' && isSignedIn()) {
    return { name: 'home' };
  }

  return true;
});

export default router;
