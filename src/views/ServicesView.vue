<script setup lang="ts">
import {
  IonContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSpinner,
  onIonViewWillEnter,
  useIonRouter,
} from '@ionic/vue';
import type { InfiniteScrollCustomEvent, RefresherCustomEvent } from '@ionic/vue';
import { clipboardOutline } from 'ionicons/icons';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { errorMessage } from '@/api/client';
import { services } from '@/api/services';
import type { Service, ServiceTab } from '@/api/types';
import AppHeader from '@/components/AppHeader.vue';
import ServiceCard from '@/components/ServiceCard.vue';
import { formatDay, tabTitles } from '@/utils/format';

/**
 * «Mis servicios» por estado (los pendientes, como antes: vencidos y de hoy a dos días), con búsqueda
 * por número, cliente, ruta o placa, agrupados por día y por páginas.
 */
const route = useRoute();
const router = useIonRouter();
const tabs = Object.keys(tabTitles) as ServiceTab[];

const status = computed(() => (tabs.includes(route.params.status as ServiceTab) ? (route.params.status as ServiceTab) : 'pending'));
const list = ref<Service[]>([]);
const page = ref(1);
const lastPage = ref(1);
const search = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const load = async (reset = true) => {
  if (reset) {
    page.value = 1;
  }
  loading.value = reset;
  error.value = null;
  try {
    const response = await services(status.value, page.value, search.value);
    list.value = reset ? response.data : [...list.value, ...response.data];
    lastPage.value = response.meta.last_page;
  } catch (exception) {
    error.value = errorMessage(exception);
  } finally {
    loading.value = false;
  }
};

onIonViewWillEnter(() => load());
watch(status, () => {
  if (route.name === 'services') {
    void load();
  }
});

let searchTimer: ReturnType<typeof setTimeout> | undefined;
const onSearch = (value: string | null | undefined) => {
  search.value = value ?? '';
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => load(), 400);
};

const more = async (event: InfiniteScrollCustomEvent) => {
  page.value++;
  await load(false);
  await event.target.complete();
};

const refresh = async (event: RefresherCustomEvent) => {
  await load();
  await event.target.complete();
};

const days = computed(() => {
  const groups = new Map<string, Service[]>();
  list.value.forEach((service) => {
    const key = new Date(service.scheduled_at).toDateString();
    groups.set(key, [...(groups.get(key) ?? []), service]);
  });

  return [...groups.values()].map((items) => ({ label: formatDay(items[0].scheduled_at), items }));
});
</script>

<template>
  <IonPage>
    <AppHeader title="Mis servicios" />
    <IonContent>
      <IonRefresher slot="fixed" @ion-refresh="refresh">
        <IonRefresherContent />
      </IonRefresher>

      <div class="page">
        <!-- Las pestañas del portal: una cuadrícula, sin deslizar de lado. -->
        <nav aria-label="Estado" class="tabs" role="tablist">
          <button
            v-for="tab in tabs"
            :key="tab"
            type="button"
            role="tab"
            class="tab"
            :class="{ active: tab === status }"
            :aria-selected="tab === status"
            @click="router.replace(`/services/${tab}`)"
          >
            {{ tabTitles[tab] }}
          </button>
        </nav>

        <IonSearchbar :value="search" placeholder="Buscar por número, cliente, ruta o placa" :debounce="0" @ion-input="onSearch($event.detail.value)" />

        <div v-if="loading" class="empty-state"><IonSpinner name="crescent" /></div>
        <p v-else-if="error" class="form-error">{{ error }}</p>
        <div v-else-if="list.length === 0" class="empty-state">
          <IonIcon :icon="clipboardOutline" />
          <h2>Todo al día</h2>
          <p>No tienes servicios {{ tabTitles[status].toLowerCase() }}{{ search ? ' con esa búsqueda' : '' }}.</p>
        </div>

        <section v-for="day in days" v-else :key="day.label" class="section">
          <h2 class="section-title day-title">{{ day.label }} <span>· {{ day.items.length }}</span></h2>
          <ServiceCard v-for="service in day.items" :key="service.id" :service="service" />
        </section>
      </div>

      <IonInfiniteScroll :disabled="page >= lastPage" @ion-infinite="more">
        <IonInfiniteScrollContent />
      </IonInfiniteScroll>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.page {
  gap: 16px;
}
.tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.tab {
  padding: 8px 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted-foreground);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
}
.tab.active {
  background: var(--primary);
  color: var(--primary-foreground);
}
.day-title::first-letter {
  text-transform: uppercase;
}
.day-title span {
  font-weight: 400;
}
</style>
