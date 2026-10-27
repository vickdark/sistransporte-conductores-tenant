<script setup lang="ts">
import {
  alertController,
  IonAccordion,
  IonAccordionGroup,
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  loadingController,
  onIonViewWillEnter,
  useIonRouter,
} from '@ionic/vue';
import { carOutline, cloudUploadOutline, constructOutline, discOutline, flashOutline, hammerOutline, leafOutline, settingsOutline, warningOutline } from 'ionicons/icons';
import { computed, reactive, ref } from 'vue';
import { ApiError, errorMessage } from '@/api/client';
import { checklistForm, saveChecklist } from '@/api/operations';
import type { ChecklistForm, Vehicle } from '@/api/types';
import AppHeader from '@/components/AppHeader.vue';
import VehicleSearch from '@/components/VehicleSearch.vue';

/**
 * Checklist preoperacional con el catálogo del servidor: cada ítem OK o Novedad (con su comentario) y
 * los de mantenimiento Sí, No o No aplica. El vehículo y el conductor deben tener los documentos al día.
 */
const router = useIonRouter();

const form = ref<ChecklistForm | null>(null);
const vehicle = ref<Vehicle | null>(null);
const mileage = ref('');
const answers = reactive<Record<string, { value: string; comment: string }>>({});
const errors = ref<Record<string, string>>({});
const formError = ref<string | null>(null);

const icons: Record<string, string> = {
  'Luces y señalización': flashOutline,
  Cabina: carOutline,
  'Estado mecánico': hammerOutline,
  Neumáticos: discOutline,
  'Kit ambiental': leafOutline,
  'Equipo de carretera': constructOutline,
  Mantenimiento: settingsOutline,
};

const blocked = computed(() => form.value?.driver?.expired_documents === true);
const issues = computed(() => Object.values(answers).filter((answer) => answer.value === 'issue').length);

onIonViewWillEnter(async () => {
  formError.value = null;
  try {
    form.value = await checklistForm();
    form.value.groups.forEach((group) =>
      group.items.forEach((item) => {
        answers[item.key] = { value: item.maintenance ? 'no' : 'ok', comment: '' };
      }),
    );
  } catch (exception) {
    formError.value = errorMessage(exception);
  }
});

const save = async () => {
  if (!vehicle.value) {
    formError.value = 'Elige el vehículo.';

    return;
  }
  const missing = Object.entries(answers).filter(([, answer]) => answer.value === 'issue' && answer.comment.trim() === '');
  if (missing.length > 0) {
    formError.value = 'Describe cada novedad marcada.';

    return;
  }

  errors.value = {};
  formError.value = null;
  const loading = await loadingController.create({ message: 'Guardando el checklist…' });
  await loading.present();
  try {
    const result = await saveChecklist({
      vehicle_id: vehicle.value.id,
      mileage: mileage.value ? Number(mileage.value.replace(/\D/g, '')) : null,
      answers: Object.fromEntries(Object.entries(answers).map(([key, answer]) => [key, { value: answer.value, comment: answer.comment.trim() || null }])),
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
    }
    formError.value = errorMessage(exception);
  }
};
</script>

<template>
  <IonPage>
    <AppHeader title="Checklist preoperacional" />
    <IonContent>
      <div class="page">
        <div v-if="!form && !formError" class="empty-state"><IonSpinner name="crescent" /></div>

        <template v-if="form">
          <div v-if="blocked" class="form-error">
            <IonIcon :icon="warningOutline" /> Tienes documentos vencidos: no puedes hacer el checklist hasta renovarlos. Comunícate con la empresa.
          </div>

          <div class="form-card">
            <h2>Vehículo</h2>
            <div class="field">
              <span class="field-label">Placa <span class="required">*</span></span>
              <VehicleSearch v-model="vehicle" block-expired :error="errors.vehicle_id" />
            </div>
            <div class="field">
              <span class="field-label">Kilometraje</span>
              <IonInput v-model="mileage" type="text" inputmode="numeric" placeholder="Ej: 255200" fill="outline" />
              <p v-if="errors.mileage" class="field-error">{{ errors.mileage }}</p>
            </div>
          </div>

          <IonAccordionGroup>
            <IonAccordion v-for="group in form.groups" :key="group.name" :value="group.name" class="checklist-group">
              <IonItem slot="header" lines="none">
                <IonIcon slot="start" :icon="icons[group.name] ?? settingsOutline" />
                <IonLabel class="group-title">{{ group.name }}</IonLabel>
              </IonItem>
              <div slot="content" class="group-content">
                <div v-for="item in group.items" :key="item.key" class="item-card">
                  <span class="item-label">{{ item.label }}</span>
                  <span v-if="item.hint" class="field-hint">{{ item.hint }}</span>

                  <IonSelect v-if="item.maintenance" v-model="answers[item.key].value" interface="alert" fill="outline">
                    <IonSelectOption v-for="option in item.answers" :key="option.value" :value="option.value">{{ option.label }}</IonSelectOption>
                  </IonSelect>
                  <template v-else>
                    <IonSegment v-model="answers[item.key].value" mode="ios">
                      <IonSegmentButton v-for="option in item.answers" :key="option.value" :value="option.value">
                        <IonLabel>{{ option.label }}</IonLabel>
                      </IonSegmentButton>
                    </IonSegment>
                    <IonTextarea
                      v-if="answers[item.key].value === 'issue'"
                      v-model="answers[item.key].comment"
                      class="issue-comment"
                      placeholder="¿Qué pasa?"
                      :auto-grow="true"
                      fill="outline"
                      :maxlength="255"
                    />
                  </template>
                  <p v-if="errors[`answers.${item.key}.comment`]" class="field-error">{{ errors[`answers.${item.key}.comment`] }}</p>
                </div>
              </div>
            </IonAccordion>
          </IonAccordionGroup>
        </template>

        <p v-if="formError" class="form-error">{{ formError }}</p>

        <IonButton v-if="form" expand="block" class="big-action-btn" :disabled="blocked || !vehicle" @click="save">
          <IonIcon slot="start" :icon="cloudUploadOutline" />
          Guardar checklist{{ issues > 0 ? ` (${issues} ${issues === 1 ? 'novedad' : 'novedades'})` : '' }}
        </IonButton>
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.checklist-group {
  margin-bottom: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
}
.checklist-group ion-item {
  --background: transparent;
  font-size: 0.9375rem;
}
.checklist-group ion-item ion-icon {
  color: var(--muted-foreground);
}
.group-title {
  font-weight: 500;
}
.group-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 12px 12px;
}
.item-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.item-label {
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
