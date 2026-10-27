<script setup lang="ts">
import { IonBackButton, IonButton, IonButtons, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToolbar } from '@ionic/vue';
import { moonOutline, sunnyOutline } from 'ionicons/icons';
import { useTheme } from '@/composables/useTheme';

/** Encabezado de las pantallas: menú, volver (si aplica), título y tema. */
withDefaults(defineProps<{ title: string; back?: string | null }>(), { back: '/home' });

const { dark, toggle } = useTheme();
</script>

<template>
  <IonHeader class="ion-no-border">
    <IonToolbar class="main-header">
      <IonButtons slot="start">
        <IonMenuButton :auto-hide="false" />
        <IonBackButton v-if="back" :default-href="back" text="" />
        <slot name="start" />
      </IonButtons>
      <IonTitle class="header-title">{{ title }}</IonTitle>
      <IonButtons slot="end">
        <slot name="end" />
        <IonButton aria-label="Cambiar tema" @click="toggle">
          <IonIcon slot="icon-only" :icon="dark ? sunnyOutline : moonOutline" />
        </IonButton>
      </IonButtons>
    </IonToolbar>
  </IonHeader>
</template>
