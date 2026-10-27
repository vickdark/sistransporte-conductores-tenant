<script setup lang="ts">
import { IonIcon } from '@ionic/vue';
import { navigateCircleOutline } from 'ionicons/icons';
import type { InOperation } from '@/api/types';

/** «En operación»: lo que se registre queda ligado a la orden en curso y a su vehículo. */
defineProps<{ order: InOperation; message: string }>();
</script>

<template>
  <div class="in-operation">
    <IonIcon :icon="navigateCircleOutline" />
    <div>
      <strong>En operación:</strong> {{ message }} #{{ order.number }}.
      <div v-if="order.client || order.route" class="in-operation-detail">{{ [order.client, order.route].filter(Boolean).join(' · ') }}</div>
      <div v-if="order.vehicle" class="in-operation-detail">Vehículo <strong>{{ order.vehicle.plate }}</strong></div>
    </div>
  </div>
</template>

<style scoped>
/* Aviso informativo (bg-blue-50 del portal) */
.in-operation {
  display: flex;
  gap: 10px;
  padding: 12px;
  border: 1px solid #bfdbfe;
  border-radius: var(--radius);
  background: #eff6ff;
  color: #1e3a8a;
  font-size: 0.875rem;
  line-height: 1.4;
}
.in-operation ion-icon {
  flex-shrink: 0;
  font-size: 1.25rem;
}
.in-operation-detail {
  margin-top: 4px;
  opacity: 0.85;
  overflow-wrap: anywhere;
}
:global(body.dark .in-operation) {
  border-color: #1e3a8a;
  background: #172554;
  color: #bfdbfe;
}
</style>
