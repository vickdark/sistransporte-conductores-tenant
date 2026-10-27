<script setup lang="ts">
import { alertController, IonButton, IonContent, IonIcon, IonInput, IonPage, IonSpinner, loadingController, onIonViewWillEnter, useIonRouter } from '@ionic/vue';
import { saveOutline } from 'ionicons/icons';
import { computed, ref } from 'vue';
import { ApiError, errorMessage } from '@/api/client';
import { fuelLoadForm, saveFuelLoad } from '@/api/operations';
import type { CapturedPhoto, InOperation, Vehicle } from '@/api/types';
import AppHeader from '@/components/AppHeader.vue';
import InOperationBanner from '@/components/InOperationBanner.vue';
import PhotoField from '@/components/PhotoField.vue';
import VehicleSearch from '@/components/VehicleSearch.vue';
import { formatKm } from '@/utils/format';

/**
 * Registrar un tanqueo: en operación, del vehículo del servicio en curso (fijo); si no, el que el
 * conductor busque. Galones, valor, km y las fotos del km y del comprobante, con la cámara.
 */
const router = useIonRouter();

const ready = ref(false);
const inOperation = ref<InOperation | null>(null);
const vehicle = ref<Vehicle | null>(null);
const gallons = ref('');
const cost = ref('');
const mileage = ref('');
const mileagePhoto = ref<CapturedPhoto | null>(null);
const receiptPhoto = ref<CapturedPhoto | null>(null);
const errors = ref<Record<string, string>>({});
const formError = ref<string | null>(null);

const currentMileage = computed(() => inOperation.value?.vehicle?.current_mileage ?? vehicle.value?.current_mileage ?? null);
const vehicleId = computed(() => (inOperation.value ? null : (vehicle.value?.id ?? null)));
const complete = computed(() => (inOperation.value !== null || vehicle.value !== null) && gallons.value && cost.value && mileage.value && mileagePhoto.value && receiptPhoto.value);

onIonViewWillEnter(async () => {
  ready.value = false;
  formError.value = null;
  try {
    inOperation.value = await fuelLoadForm();
  } catch (exception) {
    formError.value = errorMessage(exception);
  } finally {
    ready.value = true;
  }
});

const save = async () => {
  if (!complete.value || !mileagePhoto.value || !receiptPhoto.value) {
    return;
  }

  errors.value = {};
  formError.value = null;
  const loading = await loadingController.create({ message: 'Guardando el tanqueo…' });
  await loading.present();
  try {
    const result = await saveFuelLoad({
      vehicleId: vehicleId.value,
      gallons: gallons.value,
      cost: cost.value,
      mileage: mileage.value,
      mileagePhoto: mileagePhoto.value,
      receiptPhoto: receiptPhoto.value,
    });
    await loading.dismiss();
    const alert = await alertController.create({ header: '¡Listo!', message: result.message, buttons: ['Entendido'] });
    await alert.present();
    await alert.onDidDismiss();
    router.navigate('/home', 'root', 'replace');
  } catch (exception) {
    await loading.dismiss();
    if (exception instanceof ApiError && exception.status === 422) {
      errors.value = Object.fromEntries(Object.entries(exception.errors).map(([field, messages]) => [field, messages[0]]));
      const others = Object.entries(errors.value).filter(([field]) => !['vehicle_id', 'gallons', 'cost', 'mileage', 'mileage_photo', 'receipt_photo'].includes(field));
      formError.value = others.length > 0 ? others.map(([, text]) => text).join('\n') : 'Revisa los datos marcados.';
    } else {
      formError.value = errorMessage(exception);
    }
  }
};
</script>

<template>
  <IonPage>
    <AppHeader title="Registrar tanqueo" />
    <IonContent>
      <div class="page">
        <div v-if="!ready" class="empty-state"><IonSpinner name="crescent" /></div>

        <div v-else class="form-card">
          <p v-if="formError" class="form-error">{{ formError }}</p>

          <InOperationBanner v-if="inOperation" :order="inOperation" message="el tanqueo queda ligado a tu servicio" />
          <div v-else class="field">
            <span class="field-label">Vehículo <span class="required">*</span></span>
            <VehicleSearch v-model="vehicle" :error="errors.vehicle_id" />
          </div>

          <div class="field">
            <span class="field-label">Galones <span class="required">*</span></span>
            <IonInput v-model="gallons" type="text" inputmode="decimal" placeholder="Ej: 12,5" fill="outline" />
            <p v-if="errors.gallons" class="field-error">{{ errors.gallons }}</p>
          </div>

          <div class="field">
            <span class="field-label">Valor total <span class="required">*</span></span>
            <IonInput v-model="cost" type="text" inputmode="numeric" placeholder="Ej: 150000" fill="outline" />
            <p v-if="errors.cost" class="field-error">{{ errors.cost }}</p>
          </div>

          <div class="field">
            <span class="field-label">Kilometraje <span class="required">*</span></span>
            <IonInput v-model="mileage" type="text" inputmode="numeric" placeholder="Ej: 255200" fill="outline" />
            <p v-if="currentMileage !== null" class="field-hint">Km actual del vehículo: <strong>{{ formatKm(currentMileage) }}</strong></p>
            <p v-if="errors.mileage" class="field-error">{{ errors.mileage }}</p>
          </div>

          <PhotoField v-model="mileagePhoto" label="Foto del kilometraje" :error="errors.mileage_photo" />
          <PhotoField v-model="receiptPhoto" label="Foto del comprobante" :error="errors.receipt_photo" />

          <IonButton expand="block" class="big-action-btn" :disabled="!complete" @click="save">
            <IonIcon slot="start" :icon="saveOutline" />
            Guardar tanqueo
          </IonButton>
        </div>
      </div>
    </IonContent>
  </IonPage>
</template>
