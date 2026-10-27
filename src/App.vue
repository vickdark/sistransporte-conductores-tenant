<script setup lang="ts">
import { alertController, IonApp, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenu, IonMenuToggle, IonRouterOutlet, IonToolbar, useIonRouter } from '@ionic/vue';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  clipboardOutline,
  closeCircleOutline,
  helpBuoyOutline,
  homeOutline,
  listOutline,
  logOutOutline,
  playCircleOutline,
  speedometerOutline,
} from 'ionicons/icons';
import { useRoute } from 'vue-router';
import { logout } from '@/api/auth';
import { driverName, session } from '@/api/session';
import CompanyLogo from '@/components/CompanyLogo.vue';
import { gpsTracker } from '@/services/gpsTracker';

const router = useIonRouter();
const route = useRoute();

const groups = [
  { title: null, items: [{ title: 'Inicio', url: '/home', icon: homeOutline, tone: 'tone-indigo' }] },
  {
    title: 'Mis servicios',
    items: [
      { title: 'Pendientes', url: '/services/pending', icon: listOutline, tone: 'tone-amber' },
      { title: 'En curso', url: '/services/in_progress', icon: playCircleOutline, tone: 'tone-blue' },
      { title: 'Completados', url: '/services/completed', icon: checkmarkCircleOutline, tone: 'tone-emerald' },
      { title: 'Cancelados', url: '/services/cancelled', icon: closeCircleOutline, tone: 'tone-red' },
      { title: 'De apoyo', url: '/services/support', icon: helpBuoyOutline, tone: 'tone-orange' },
    ],
  },
  {
    title: 'Registros',
    items: [
      { title: 'Checklist preoperacional', url: '/checklist', icon: clipboardOutline, tone: 'tone-cyan' },
      { title: 'Registrar tanqueo', url: '/fuel', icon: speedometerOutline, tone: 'tone-violet' },
      { title: 'Reportar novedad', url: '/incidents', icon: alertCircleOutline, tone: 'tone-teal' },
    ],
  },
];

const signOut = async () => {
  const alert = await alertController.create({
    header: 'Cerrar sesión',
    message: gpsTracker.isTracking() ? 'Tienes un servicio en curso: al salir se detiene el GPS. ¿Salir de todos modos?' : '¿Quieres salir?',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      { text: 'Salir', role: 'confirm' },
    ],
  });
  await alert.present();
  if ((await alert.onDidDismiss()).role !== 'confirm') {
    return;
  }

  await gpsTracker.stop();
  await logout();
  router.navigate('/login', 'root', 'replace');
};
</script>

<template>
  <IonApp>
    <IonMenu content-id="main-content" :disabled="route.name === 'login'">
      <IonHeader class="ion-no-border">
        <IonToolbar class="menu-toolbar">
          <div class="menu-account">
            <CompanyLogo />
            <div class="menu-user">
              <div class="menu-name">{{ driverName }}</div>
              <div class="menu-company">{{ session?.company.name }}</div>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList v-for="(group, index) in groups" :key="index" class="menu-group">
          <p v-if="group.title" class="menu-group-title">{{ group.title }}</p>
          <IonMenuToggle v-for="item in group.items" :key="item.url" :auto-hide="false">
            <IonItem button :router-link="item.url" router-direction="root" lines="none" class="menu-item" :class="{ active: route.path === item.url }" :detail="false">
              <IonIcon slot="start" :icon="item.icon" :class="item.tone" />
              <IonLabel>{{ item.title }}</IonLabel>
            </IonItem>
          </IonMenuToggle>
        </IonList>
        <IonList class="menu-group">
          <IonMenuToggle :auto-hide="false">
            <IonItem button lines="none" class="menu-item" :detail="false" @click="signOut">
              <IonIcon slot="start" :icon="logOutOutline" class="tone-red" />
              <IonLabel>Cerrar sesión</IonLabel>
            </IonItem>
          </IonMenuToggle>
        </IonList>
      </IonContent>
    </IonMenu>

    <IonRouterOutlet id="main-content" />
  </IonApp>
</template>

<style scoped>
.menu-toolbar {
  --background: var(--sidebar);
  --border-width: 0 0 1px;
  --border-color: var(--border);
  --border-style: solid;
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 14px;
  --padding-bottom: 14px;
}
.menu-account {
  display: flex;
  align-items: center;
  gap: 10px;
}
.menu-user {
  min-width: 0;
}
.menu-name {
  overflow: hidden;
  color: var(--foreground);
  font-size: 0.875rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.menu-company {
  overflow: hidden;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.menu-group {
  padding: 8px;
  background: transparent;
}
.menu-group-title {
  margin: 8px 8px 4px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted-foreground);
}
.menu-item {
  --min-height: 36px;
  --padding-start: 8px;
  --inner-padding-end: 8px;
  --border-radius: 6px;
  --background: transparent;
  --background-activated: var(--accent);
  --color: var(--foreground);
  font-size: 0.875rem;
}
.menu-item ion-icon {
  margin-inline-end: 10px;
  font-size: 1.1rem;
}
.menu-item.active {
  --background: var(--accent);
  font-weight: 500;
}
</style>
