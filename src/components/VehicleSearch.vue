<script setup lang="ts">
import { alertController, IonButton, IonIcon, IonInput, IonSpinner } from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';
import { ref } from 'vue';
import { errorMessage } from '@/api/client';
import { searchVehicles } from '@/api/operations';
import type { Vehicle } from '@/api/types';
import { formatKm } from '@/utils/format';

/**
 * Buscador de placas (vehículos activos que la cuenta puede ver). Con `blockExpired`, un vehículo con
 * documentos vencidos se muestra pero no se puede elegir (el checklist lo exige).
 */
const props = withDefaults(defineProps<{ blockExpired?: boolean; error?: string | null }>(), { blockExpired: false, error: null });
const vehicle = defineModel<Vehicle | null>({ required: true });

const term = ref('');
const results = ref<Vehicle[]>([]);
const searching = ref(false);
const open = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

const onInput = (value: string | null | undefined) => {
  term.value = (value ?? '').toUpperCase();
  clearTimeout(timer);
  if (term.value.length < 1) {
    open.value = false;

    return;
  }

  timer = setTimeout(async () => {
    searching.value = true;
    open.value = true;
    try {
      results.value = await searchVehicles(term.value);
    } catch (error) {
      results.value = [];
      const alert = await alertController.create({ header: 'Búsqueda de placas', message: errorMessage(error), buttons: ['OK'] });
      await alert.present();
    } finally {
      searching.value = false;
    }
  }, 350);
};

const choose = async (option: Vehicle) => {
  if (props.blockExpired && option.expired_documents) {
    const alert = await alertController.create({
      header: 'Vehículo no disponible',
      message: 'Tiene documentos vencidos: no puede hacer el checklist hasta renovarlos.',
      buttons: ['Entendido'],
    });
    await alert.present();

    return;
  }

  vehicle.value = option;
  open.value = false;
  term.value = '';
};
</script>

<template>
  <div class="vehicle-search">
    <div v-if="vehicle" class="vehicle-chosen">
      <div>
        <div class="vehicle-plate">{{ vehicle.plate }}</div>
        <div class="vehicle-meta">{{ vehicle.class }} · Km actual {{ formatKm(vehicle.current_mileage) }}</div>
      </div>
      <IonButton fill="clear" color="medium" aria-label="Cambiar vehículo" @click="vehicle = null">
        <IonIcon slot="icon-only" :icon="closeOutline" />
      </IonButton>
    </div>
    <template v-else>
      <IonInput
        :value="term"
        class="search-input"
        placeholder="Placa o número interno"
        autocapitalize="characters"
        fill="outline"
        @ion-input="onInput($event.detail.value)"
      />
      <div v-if="open" class="search-results">
        <div v-if="searching" class="search-empty"><IonSpinner name="dots" /></div>
        <div v-else-if="results.length === 0" class="search-empty">No se encontró ningún vehículo.</div>
        <button v-for="option in results" v-else :key="option.id" type="button" class="search-result" @click="choose(option)">
          <span class="vehicle-plate">{{ option.plate }}</span>
          <span class="vehicle-meta">
            {{ option.class }} · {{ formatKm(option.current_mileage) }}
            <span v-if="option.expired_documents" class="expired">· Documentos vencidos</span>
          </span>
        </button>
      </div>
    </template>
    <p v-if="error" class="field-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.vehicle-search {
  position: relative;
}
.vehicle-chosen {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
}
.vehicle-plate {
  display: block;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--foreground);
}
.vehicle-meta {
  display: block;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
}
.expired {
  color: var(--ion-color-danger);
  font-weight: 500;
}
.search-results {
  position: absolute;
  z-index: 50;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.search-result {
  display: block;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: transparent;
  color: var(--foreground);
  font: inherit;
  text-align: left;
}
.search-result:last-child {
  border-bottom: 0;
}
.search-result:active {
  background: var(--muted);
}
.search-empty {
  padding: 14px;
  text-align: center;
  font-size: 0.875rem;
  color: var(--muted-foreground);
}
</style>
