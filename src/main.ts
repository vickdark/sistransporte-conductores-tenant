import { App as CapacitorApp } from '@capacitor/app';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { IonicVue } from '@ionic/vue';
import { createApp } from 'vue';
import { setUnauthorizedHandler } from '@/api/client';
import { gpsTracker } from '@/services/gpsTracker';
import App from './App.vue';
import router from './router';

import '@ionic/vue/css/core.css';
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';
import './styles.css';

// La cámara en el navegador (pruebas sin compilar).
defineCustomElements(window);

if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
}

const app = createApp(App).use(IonicVue, { mode: 'md' }).use(router);

// La sesión venció o se cerró en el servidor: se detiene el GPS y vuelve al login.
setUnauthorizedHandler(() => {
  void gpsTracker.stop();
  void router.replace('/login');
});

// Botón «atrás» de Android: en el inicio o el login, sale de la app.
CapacitorApp.addListener('backButton', ({ canGoBack }) => {
  const name = router.currentRoute.value.name;
  if (name === 'home' || name === 'login' || !canGoBack) {
    void CapacitorApp.exitApp();
  } else {
    router.back();
  }
});

router.isReady().then(() => {
  app.mount('#app');
  // Retoma el rastreo del servicio en curso si la app se cerró o el teléfono se reinició.
  void gpsTracker.resume();
});
