<script setup lang="ts">
import { IonIcon } from '@ionic/vue';
import { carOutline, chevronForward, helpBuoyOutline, locationOutline, peopleOutline, timeOutline } from 'ionicons/icons';
import { RouterLink } from 'vue-router';
import type { Service } from '@/api/types';
import { formatWhen } from '@/utils/format';

/** Tarjeta de un servicio en el inicio y en los listados (la misma del portal); abre su detalle. */
defineProps<{ service: Service }>();
</script>

<template>
  <RouterLink :to="`/services/show/${service.id}`" class="panel panel-link service-card">
    <div class="service-body">
      <div class="service-badges">
        <span class="service-number">#{{ service.number }}</span>
        <span class="badge" :class="`badge-${service.status}`">{{ service.status_label }}</span>
        <span v-if="service.is_support" class="badge badge-muted">De apoyo</span>
        <span v-if="service.support_pending" class="badge badge-warning"><IonIcon :icon="helpBuoyOutline" /> Apoyo pedido</span>
      </div>
      <p class="service-line"><IonIcon :icon="timeOutline" /> {{ formatWhen(service.scheduled_at) }}</p>
      <p v-if="service.started_at" class="service-meta">
        Inició {{ formatWhen(service.started_at) }}<template v-if="service.finished_at"> · finalizó {{ formatWhen(service.finished_at) }}</template>
      </p>
      <p v-if="service.route" class="service-line"><IonIcon :icon="locationOutline" /> <span class="wrap">{{ service.route }}</span></p>
      <p class="service-meta service-facts">
        <span v-if="service.client" class="wrap">{{ service.client }}</span>
        <span v-if="service.vehicle" class="fact plate"><IonIcon :icon="carOutline" /> {{ service.vehicle }}</span>
        <span v-if="service.passenger_count" class="fact"><IonIcon :icon="peopleOutline" /> {{ service.passenger_count }}</span>
      </p>
      <!-- Recortadas a dos líneas: el texto completo está en el detalle. -->
      <p v-if="service.description" class="service-meta service-description">{{ service.description }}</p>
    </div>
    <IonIcon :icon="chevronForward" class="chevron" />
  </RouterLink>
</template>

<style scoped>
.service-body {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}
.service-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.service-number {
  font-weight: 600;
}
.service-line {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  font-size: 0.875rem;
}
.service-line ion-icon {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 1rem;
  color: var(--muted-foreground);
}
.service-meta {
  margin: 0;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}
.service-facts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 16px;
}
.fact {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.wrap {
  min-width: 0;
  overflow-wrap: anywhere;
}
.service-description {
  color: var(--foreground);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  white-space: pre-line;
}
</style>
