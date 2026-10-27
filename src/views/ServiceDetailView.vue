<script setup lang="ts">
import { alertController, IonButton, IonContent, IonIcon, IonInput, IonPage, IonSpinner, loadingController, onIonViewWillEnter, toastController } from '@ionic/vue';
import { callOutline, carOutline, helpBuoyOutline, locationOutline, peopleOutline, personOutline, playOutline, stopOutline, timeOutline } from 'ionicons/icons';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError, errorMessage } from '@/api/client';
import { recordMileage, requestSupport, service as fetchService } from '@/api/services';
import type { CapturedPhoto, ServiceDetail } from '@/api/types';
import AppHeader from '@/components/AppHeader.vue';
import PhotoField from '@/components/PhotoField.vue';
import { gpsTracker } from '@/services/gpsTracker';
import { formatKm, formatWhen } from '@/utils/format';

/**
 * Detalle del servicio: sus datos y, según lo que el servidor permita (`can`), iniciar o finalizar con
 * el km y la foto del tablero, y pedir apoyo. Con el servicio en curso, el GPS transmite.
 */
const route = useRoute();
const id = Number(route.params.id);

const order = ref<ServiceDetail | null>(null);
const error = ref<string | null>(null);
const mileage = ref('');
const photo = ref<CapturedPhoto | null>(null);
const fieldErrors = ref<Record<string, string>>({});
const formError = ref<string | null>(null);

const stage = computed<'start' | 'finish' | null>(() => (order.value?.can.start ? 'start' : order.value?.can.finish ? 'finish' : null));
const tracking = computed(() => order.value?.status === 'in_progress');

const syncTracking = () => {
  if (order.value?.status === 'in_progress') {
    void gpsTracker.start(order.value.id, order.value.number);
  }
};

const load = async () => {
  error.value = null;
  try {
    order.value = await fetchService(id);
    syncTracking();
  } catch (exception) {
    error.value = errorMessage(exception);
  }
};

onIonViewWillEnter(load);

const run = async (message: string, action: () => Promise<ServiceDetail>, done: string) => {
  formError.value = null;
  fieldErrors.value = {};
  const loading = await loadingController.create({ message });
  await loading.present();
  try {
    order.value = await action();
    mileage.value = '';
    photo.value = null;
    syncTracking();
    if (order.value.status === 'completed') {
      await gpsTracker.stop();
    }
    const toast = await toastController.create({ message: done, duration: 2500, color: 'success', position: 'top' });
    await toast.present();
  } catch (exception) {
    if (exception instanceof ApiError && exception.status === 422) {
      fieldErrors.value = Object.fromEntries(Object.entries(exception.errors).map(([field, messages]) => [field, messages[0]]));
      // Lo que no es de un campo de la pantalla (la orden, el vehículo…) va arriba.
      const others = Object.entries(fieldErrors.value).filter(([field]) => !['mileage', 'photo'].includes(field));
      formError.value = others.length > 0 ? others.map(([, text]) => text).join('\n') : null;
    } else {
      formError.value = errorMessage(exception);
    }
  } finally {
    await loading.dismiss();
  }
};

const submitMileage = async () => {
  if (!order.value || !stage.value || !photo.value) {
    return;
  }
  const currentStage = stage.value;
  const capturedPhoto = photo.value;
  const verb = currentStage === 'start' ? 'Iniciar' : 'Finalizar';

  const confirm = await alertController.create({
    header: `${verb} servicio`,
    message: `¿Confirmas ${verb.toLowerCase()} con ${formatKm(mileage.value)}?`,
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      { text: verb, role: 'confirm' },
    ],
  });
  await confirm.present();
  if ((await confirm.onDidDismiss()).role !== 'confirm') {
    return;
  }

  await run(
    'Enviando…',
    () => recordMileage(id, currentStage, mileage.value, capturedPhoto),
    currentStage === 'start' ? 'Servicio iniciado: el GPS está transmitiendo.' : 'Servicio finalizado.',
  );
};

const askSupport = async () => {
  const confirm = await alertController.create({
    header: 'Pedir apoyo',
    message: 'La oficina recibirá una alerta para asignarte apoyo en este servicio.',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      { text: 'Pedir apoyo', role: 'confirm' },
    ],
  });
  await confirm.present();
  if ((await confirm.onDidDismiss()).role === 'confirm') {
    await run('Enviando…', () => requestSupport(id), 'Se pidió apoyo: la oficina ya lo ve.');
  }
};
</script>

<template>
  <IonPage>
    <AppHeader :title="order ? `Servicio #${order.number}` : 'Servicio'" />
    <IonContent>
      <div v-if="!order && !error" class="empty-state"><IonSpinner name="crescent" /></div>
      <p v-else-if="error" class="form-error ion-margin">{{ error }}</p>

      <div v-if="order" class="page">
        <div class="title-row">
          <h1 class="page-title">Servicio #{{ order.number }}</h1>
          <span class="badge" :class="`badge-${order.status}`">{{ order.status_label }}</span>
          <span v-if="order.is_support" class="badge badge-muted">De apoyo</span>
        </div>
        <p v-if="tracking" class="gps-indicator"><span class="gps-dot" /> Transmitiendo GPS</p>

        <!-- Las acciones van arriba: es lo que el conductor viene a hacer. -->
        <div v-if="stage || order.can.request_support || order.support_pending" class="form-card">
          <p v-if="formError" class="form-error">{{ formError }}</p>

          <template v-if="stage">
            <h2>{{ stage === 'start' ? 'Iniciar servicio' : 'Finalizar servicio' }}</h2>
            <div class="field">
              <span class="field-label">Kilometraje {{ stage === 'start' ? 'inicial' : 'final' }} <span class="required">*</span></span>
              <IonInput v-model="mileage" type="number" inputmode="numeric" placeholder="000000" fill="outline" />
              <p v-if="order.vehicle_mileage" class="field-hint">Km actual del vehículo: {{ formatKm(order.vehicle_mileage) }}</p>
              <p v-if="fieldErrors.mileage" class="field-error">{{ fieldErrors.mileage }}</p>
            </div>

            <PhotoField v-model="photo" label="Foto del tablero" :error="fieldErrors.photo" />

            <IonButton expand="block" class="big-action-btn" :disabled="!mileage || !photo" @click="submitMileage">
              <IonIcon slot="start" :icon="stage === 'start' ? playOutline : stopOutline" />
              {{ stage === 'start' ? 'Iniciar servicio' : 'Finalizar servicio' }}
            </IonButton>
          </template>

          <IonButton v-if="order.can.request_support" expand="block" fill="outline" class="big-action-btn" @click="askSupport">
            <IonIcon slot="start" :icon="helpBuoyOutline" />
            Pedir apoyo
          </IonButton>
          <p v-else-if="order.support_pending" class="notice"><IonIcon :icon="helpBuoyOutline" /> Pediste apoyo: la oficina te lo asigna.</p>
        </div>

        <section class="panel details">
          <p class="detail-line"><IonIcon :icon="timeOutline" /> {{ formatWhen(order.scheduled_at) }}</p>
          <dl v-if="order.started_at" class="times">
            <div>
              <dt>Inicio</dt>
              <dd>{{ formatWhen(order.started_at) }}</dd>
            </div>
            <div v-if="order.finished_at">
              <dt>Finalización</dt>
              <dd>{{ formatWhen(order.finished_at) }}</dd>
            </div>
          </dl>
          <p v-if="order.route" class="detail-line"><IonIcon :icon="locationOutline" /> <span class="wrap">{{ order.route }}</span></p>
          <p v-if="order.client" class="detail-line"><IonIcon :icon="personOutline" /> <span class="wrap">{{ order.client }}</span></p>
          <p v-if="order.vehicle || order.passenger_count" class="detail-facts">
            <span v-if="order.vehicle" class="detail-line plate"><IonIcon :icon="carOutline" /> {{ order.vehicle }}</span>
            <span v-if="order.passenger_count" class="detail-line"><IonIcon :icon="peopleOutline" /> {{ order.passenger_count }} pasajeros</span>
          </p>
          <p v-if="order.is_support && order.driver_name" class="muted small">Conductor principal: {{ order.driver_name }}</p>
          <div class="observations">
            <p class="muted tiny">Observaciones</p>
            <p class="wrap pre" :class="{ muted: !order.description }">{{ order.description || 'Sin observaciones' }}</p>
          </div>
        </section>

        <section v-if="order.readings.length" class="section">
          <h2 class="section-title">Kilometraje</h2>
          <div class="readings">
            <div v-for="reading in order.readings" :key="reading.stage" class="panel reading">
              <p class="muted tiny">{{ reading.stage_label }} · {{ formatWhen(reading.recorded_at) }}</p>
              <p class="reading-value">{{ formatKm(reading.mileage) }}</p>
            </div>
          </div>
        </section>

        <section v-if="order.supports.length" class="section">
          <h2 class="section-title">Apoyo asignado</h2>
          <ul class="panel rows">
            <li v-for="support in order.supports" :key="support.id">
              <span v-if="support.driver">{{ support.driver }}</span>
              <span v-if="support.vehicle" class="detail-line muted plate"><IonIcon :icon="carOutline" /> {{ support.vehicle }}</span>
            </li>
          </ul>
        </section>

        <section v-if="order.passengers.length" class="section">
          <h2 class="section-title">Pasajeros</h2>
          <ul class="panel rows">
            <li v-for="passenger in order.passengers" :key="passenger.id">
              <div class="wrap">
                {{ passenger.full_name }}
                <div v-if="passenger.identification_number" class="muted tiny">{{ passenger.identification_number }}</div>
              </div>
              <a v-if="passenger.phone" :href="`tel:${passenger.phone}`" class="phone" :aria-label="`Llamar a ${passenger.full_name}`">
                <IonIcon :icon="callOutline" /> {{ passenger.phone }}
              </a>
            </li>
          </ul>
        </section>
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.page {
  gap: 20px;
}
.title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.gps-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -12px 0 0;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
}
.gps-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  50% {
    opacity: 0.35;
  }
}
.details {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}
.details p {
  margin: 0;
}
.detail-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.875rem;
}
.detail-line ion-icon {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 1rem;
  color: var(--muted-foreground);
}
.detail-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
}
.times {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 24px;
  font-size: 0.875rem;
}
.times dt {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}
.times dd {
  margin: 0;
}
.observations {
  padding-top: 12px;
  border-top: 1px solid var(--border);
  font-size: 0.875rem;
}
.small {
  font-size: 0.875rem;
}
.tiny {
  margin: 0;
  font-size: 0.75rem;
}
.wrap {
  min-width: 0;
  overflow-wrap: anywhere;
}
.pre {
  white-space: pre-line;
}
.readings {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.reading {
  padding: 12px;
}
.reading p {
  margin: 0;
}
.reading-value {
  font-size: 1.125rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.rows {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.875rem;
}
.rows li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 12px;
}
.rows li + li {
  border-top: 1px solid var(--border);
}
.phone {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--foreground);
  font-weight: 500;
  text-decoration: none;
}
</style>
