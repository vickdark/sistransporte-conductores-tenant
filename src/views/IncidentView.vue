<script setup lang="ts">
import { alertController, IonButton, IonContent, IonIcon, IonPage, IonSelect, IonSelectOption, IonSpinner, IonTextarea, loadingController, onIonViewWillEnter, useIonRouter } from '@ionic/vue';
import { cameraOutline, closeCircle, sendOutline } from 'ionicons/icons';
import { computed, ref } from 'vue';
import { ApiError, errorMessage } from '@/api/client';
import { incidentForm, saveIncident } from '@/api/operations';
import type { CapturedPhoto, IncidentForm, Vehicle } from '@/api/types';
import AppHeader from '@/components/AppHeader.vue';
import InOperationBanner from '@/components/InOperationBanner.vue';
import VehicleSearch from '@/components/VehicleSearch.vue';
import { takePhoto } from '@/composables/useCamera';

/**
 * Reportar una novedad: tipo, qué pasó y fotos con la cámara. En operación queda ligada al servicio en
 * curso y a su vehículo; fuera de operación el vehículo es opcional.
 */
const router = useIonRouter();

const form = ref<IncidentForm | null>(null);
const typeId = ref<number | null>(null);
const vehicle = ref<Vehicle | null>(null);
const description = ref('');
const photos = ref<CapturedPhoto[]>([]);
const errors = ref<Record<string, string>>({});
const formError = ref<string | null>(null);

const canAddPhoto = computed(() => form.value !== null && photos.value.length < form.value.max_photos);
const complete = computed(() => typeId.value !== null && description.value.trim() !== '');

onIonViewWillEnter(async () => {
  formError.value = null;
  try {
    form.value = await incidentForm();
  } catch (exception) {
    formError.value = errorMessage(exception);
  }
});

const addPhoto = async () => {
  const photo = await takePhoto();
  if (photo) {
    photos.value = [...photos.value, photo];
  }
};

const save = async () => {
  if (!complete.value || typeId.value === null) {
    return;
  }

  errors.value = {};
  formError.value = null;
  const loading = await loadingController.create({ message: 'Enviando la novedad…' });
  await loading.present();
  try {
    const result = await saveIncident({
      typeId: typeId.value,
      vehicleId: form.value?.in_operation ? null : (vehicle.value?.id ?? null),
      description: description.value.trim(),
      photos: photos.value,
    });
    await loading.dismiss();
    const alert = await alertController.create({ header: '¡Listo!', message: result.message, buttons: ['Entendido'] });
    await alert.present();
    await alert.onDidDismiss();
    router.navigate('/home', 'root', 'replace');
  } catch (exception) {
    await loading.dismiss();
    if (exception instanceof ApiError && exception.status === 422) {
      errors.value = Object.fromEntries(Object.entries(exception.errors).map(([field, messages]) => [field.startsWith('photos') ? 'photos' : field, messages[0]]));
    }
    formError.value = errorMessage(exception);
  }
};
</script>

<template>
  <IonPage>
    <AppHeader title="Reportar novedad" />
    <IonContent>
      <div class="page">
        <div v-if="!form && !formError" class="empty-state"><IonSpinner name="crescent" /></div>

        <div v-if="form" class="form-card">
          <InOperationBanner v-if="form.in_operation" :order="form.in_operation" message="la novedad queda ligada a tu servicio" />

          <div class="field">
            <span class="field-label">Tipo de novedad <span class="required">*</span></span>
            <IonSelect v-model="typeId" interface="action-sheet" placeholder="Elige el tipo" fill="outline">
              <IonSelectOption v-for="type in form.types" :key="type.value" :value="type.value">{{ type.label }}</IonSelectOption>
            </IonSelect>
            <p v-if="errors.incident_type_id" class="field-error">{{ errors.incident_type_id }}</p>
          </div>

          <div v-if="!form.in_operation" class="field">
            <span class="field-label">Vehículo (opcional)</span>
            <VehicleSearch v-model="vehicle" :error="errors.vehicle_id" />
          </div>

          <div class="field">
            <span class="field-label">¿Qué pasó? <span class="required">*</span></span>
            <IonTextarea v-model="description" :auto-grow="true" :rows="4" :maxlength="2000" placeholder="Describe la novedad" fill="outline" />
            <p v-if="errors.description" class="field-error">{{ errors.description }}</p>
          </div>

          <div class="field">
            <span class="field-label">Fotos (hasta {{ form.max_photos }})</span>
            <div v-if="photos.length" class="photo-grid">
              <div v-for="(photo, index) in photos" :key="index" class="photo-thumb">
                <img :src="photo.dataUrl" :alt="`Foto ${index + 1}`" />
                <button type="button" class="photo-remove" aria-label="Quitar foto" @click="photos.splice(index, 1)">
                  <IonIcon :icon="closeCircle" />
                </button>
              </div>
            </div>
            <IonButton v-if="canAddPhoto" expand="block" fill="outline" class="big-action-btn" @click="addPhoto">
              <IonIcon slot="start" :icon="cameraOutline" />
              Tomar foto
            </IonButton>
            <p v-if="errors.photos" class="field-error">{{ errors.photos }}</p>
          </div>

          <IonButton expand="block" class="big-action-btn" :disabled="!complete" @click="save">
            <IonIcon slot="start" :icon="sendOutline" />
            Reportar novedad
          </IonButton>
        </div>

        <p v-if="formError" class="form-error">{{ formError }}</p>
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}
.photo-thumb {
  position: relative;
  aspect-ratio: 1;
}
.photo-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
}
.photo-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 1.5rem;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
}
</style>
