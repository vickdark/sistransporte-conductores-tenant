<script setup lang="ts">
import BusIcon from '@/components/BusIcon.vue';

/**
 * Marca de la plataforma para antes de ingresar (la app es de todas las empresas). Provisional
 * hasta tener el logo definitivo de SisTransporte.
 */
</script>

<template>
  <div class="platform-mark">
    <BusIcon />
    <span class="platform-name">SisTransporte</span>
  </div>
</template>

<style scoped>
.platform-mark {
  display: flex;
  align-items: center;
  gap: 10px;
}
.platform-name {
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}
</style>
