<script setup lang="ts">
import { IonIcon } from '@ionic/vue';
import { busOutline } from 'ionicons/icons';

/** El ícono del bus de la plataforma (login, y en lugar del logo de una empresa que no lo cargó). */
withDefaults(defineProps<{ size?: number }>(), { size: 36 });
</script>

<template>
  <span class="bus-icon" :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.56)}px` }">
    <IonIcon :icon="busOutline" />
  </span>
</template>

<style scoped>
.bus-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--primary);
  color: var(--primary-foreground);
}
</style>
