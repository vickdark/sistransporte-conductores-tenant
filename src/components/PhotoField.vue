<script setup lang="ts">
import { IonButton, IonIcon } from '@ionic/vue';
import { cameraOutline, checkmarkCircleOutline } from 'ionicons/icons';
import type { CapturedPhoto } from '@/api/types';
import { takePhoto } from '@/composables/useCamera';

/** Foto tomada con la cámara del teléfono (sin galería), con su vista previa. */
withDefaults(defineProps<{ label: string; error?: string | null }>(), { error: null });
const photo = defineModel<CapturedPhoto | null>({ required: true });

const capture = async () => {
  const taken = await takePhoto();
  if (taken) {
    photo.value = taken;
  }
};
</script>

<template>
  <div class="field">
    <span class="field-label">{{ label }} <span class="required">*</span></span>
    <div v-if="photo" class="photo-wrapper">
      <img :src="photo.dataUrl" :alt="label" class="photo-preview" />
      <span class="badge badge-completed photo-tag"><IonIcon :icon="checkmarkCircleOutline" /> Foto tomada</span>
    </div>
    <IonButton expand="block" fill="outline" class="big-action-btn" @click="capture">
      <IonIcon slot="start" :icon="cameraOutline" />
      {{ photo ? 'Tomar otra' : 'Tomar foto' }}
    </IonButton>
    <p v-if="error" class="field-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.photo-wrapper {
  position: relative;
}
.photo-preview {
  display: block;
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
}
.photo-tag {
  position: absolute;
  top: 8px;
  right: 8px;
}
</style>
