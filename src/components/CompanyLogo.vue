<script setup lang="ts">
import { session } from '@/api/session';
import BusIcon from '@/components/BusIcon.vue';
import { useCompanyLogo } from '@/composables/useCompanyLogo';

/** El logo de la empresa del conductor; si la empresa no lo cargó, el ícono del bus de la plataforma. */
withDefaults(defineProps<{ size?: number }>(), { size: 36 });

const logo = useCompanyLogo();
</script>

<template>
  <img v-if="logo" :src="logo" :alt="session?.company.name" class="company-logo" :style="{ maxWidth: `${size * 2.4}px`, height: `${size}px` }" />
  <BusIcon v-else :size="size" />
</template>

<style scoped>
.company-logo {
  flex-shrink: 0;
  border-radius: 8px;
  object-fit: contain;
}
</style>
