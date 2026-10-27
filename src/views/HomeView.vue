<script setup lang="ts">
import { IonContent, IonIcon, IonPage, IonRefresher, IonRefresherContent, IonSpinner, onIonViewWillEnter } from '@ionic/vue';
import type { RefresherCustomEvent } from '@ionic/vue';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  chevronForward,
  clipboardOutline,
  closeCircleOutline,
  helpBuoyOutline,
  listOutline,
  playCircleOutline,
  speedometerOutline,
} from 'ionicons/icons';
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { errorMessage } from '@/api/client';
import { home } from '@/api/services';
import { driverName, session } from '@/api/session';
import type { Home, ServiceTab } from '@/api/types';
import AppHeader from '@/components/AppHeader.vue';
import CompanyLogo from '@/components/CompanyLogo.vue';
import ServiceCard from '@/components/ServiceCard.vue';

/** Inicio del conductor (el mismo del portal): el servicio en curso o el próximo, sus servicios por estado y los registros. */
const data = ref<Home | null>(null);
const error = ref<string | null>(null);

const load = async () => {
  error.value = null;
  try {
    data.value = await home();
  } catch (exception) {
    error.value = errorMessage(exception);
  }
};

onIonViewWillEnter(load);

const refresh = async (event: RefresherCustomEvent) => {
  await load();
  await event.target.complete();
};

const tiles: { tab: ServiceTab; label: string; icon: string; tone: string }[] = [
  { tab: 'pending', label: 'Pendientes', icon: listOutline, tone: 'tone-amber' },
  { tab: 'in_progress', label: 'En curso', icon: playCircleOutline, tone: 'tone-blue' },
  { tab: 'completed', label: 'Completados', icon: checkmarkCircleOutline, tone: 'tone-emerald' },
  { tab: 'cancelled', label: 'Cancelados', icon: closeCircleOutline, tone: 'tone-red' },
  { tab: 'support', label: 'De apoyo', icon: helpBuoyOutline, tone: 'tone-orange' },
];

const links = [
  { label: 'Checklist preoperacional', url: '/checklist', icon: clipboardOutline, tone: 'tone-cyan' },
  { label: 'Registrar tanqueo', url: '/fuel', icon: speedometerOutline, tone: 'tone-violet' },
  { label: 'Reportar novedad', url: '/incidents', icon: alertCircleOutline, tone: 'tone-teal' },
];

const featured = computed(() => (data.value?.current ? { title: 'Servicio en curso', service: data.value.current } : data.value?.next ? { title: 'Tu próximo servicio', service: data.value.next } : null));
</script>

<template>
  <IonPage>
    <AppHeader :title="session?.company.name ?? 'Inicio'" :back="null" />
    <IonContent>
      <IonRefresher slot="fixed" @ion-refresh="refresh">
        <IonRefresherContent />
      </IonRefresher>

      <div class="page">
        <div class="greeting">
          <div>
            <p class="greeting-hello">Hola,</p>
            <h1 class="page-title">{{ driverName }}</h1>
          </div>
          <CompanyLogo :size="44" />
        </div>

        <div v-if="!data && !error" class="empty-state"><IonSpinner name="crescent" /></div>
        <p v-if="error" class="form-error">{{ error }}</p>

        <section v-if="featured" class="section">
          <h2 class="section-title">{{ featured.title }}</h2>
          <ServiceCard :service="featured.service" />
        </section>

        <section v-if="data" class="tiles">
          <RouterLink v-for="tile in tiles" :key="tile.tab" :to="`/services/${tile.tab}`" class="panel panel-link tile">
            <IonIcon :icon="tile.icon" class="tile-icon" :class="tile.tone" />
            <span class="tile-count">{{ data.counts[tile.tab] }}</span>
            <span class="tile-label">{{ tile.label }}</span>
          </RouterLink>
        </section>

        <section class="links">
          <RouterLink v-for="link in links" :key="link.url" :to="link.url" class="panel panel-link">
            <IonIcon :icon="link.icon" class="link-icon" :class="link.tone" />
            <span class="link-label">{{ link.label }}</span>
            <IonIcon :icon="chevronForward" class="chevron" />
          </RouterLink>
        </section>
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.greeting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.greeting-hello {
  margin: 0;
  font-size: 0.875rem;
  color: var(--muted-foreground);
}
.tiles {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.tile {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.tile-icon {
  font-size: 1.25rem;
}
.tile-count {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.tile-label {
  font-size: 0.875rem;
  color: var(--muted-foreground);
}
.links {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.link-icon {
  font-size: 1.25rem;
}
.link-label {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
