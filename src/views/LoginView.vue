<script setup lang="ts">
import { alertController, IonButton, IonCheckbox, IonContent, IonIcon, IonInput, IonPage, IonSpinner, useIonRouter } from '@ionic/vue';
import { eyeOffOutline, eyeOutline } from 'ionicons/icons';
import { ref } from 'vue';
import { login } from '@/api/auth';
import { ApiError, CENTRAL_API_URL, errorMessage } from '@/api/client';
import PlatformMark from '@/components/PlatformMark.vue';

/**
 * Ingreso central: usuario o correo y clave. El servidor ubica la empresa del conductor; si el usuario
 * está en varias, se elige una. Solo entran cuentas de conductor de empresas con la app habilitada.
 */
const router = useIonRouter();
const remembered = localStorage.getItem('remembered_user') ?? '';

const username = ref(remembered);
const password = ref('');
const remember = ref(remembered !== '');
const showPassword = ref(false);
const loading = ref(false);

const alert = async (header: string, message: string, buttons: Parameters<typeof alertController.create>[0]['buttons'] = ['OK']) => {
  const dialog = await alertController.create({ header, message, buttons });
  await dialog.present();
};

/** El usuario está en varias empresas: elegir a cuál entrar. */
const chooseCompany = async (companies: { id: string; name: string }[]): Promise<string | null> => {
  const dialog = await alertController.create({
    header: '¿A qué empresa ingresas?',
    inputs: companies.map((company, index) => ({ type: 'radio', label: company.name, value: company.id, checked: index === 0 })),
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      { text: 'Ingresar', role: 'confirm' },
    ],
  });
  await dialog.present();
  const { role, data } = await dialog.onDidDismiss<{ values: string }>();

  return role === 'confirm' ? (data?.values ?? null) : null;
};

const submit = async (company?: string) => {
  if (!username.value.trim() || !password.value) {
    await alert('Datos incompletos', 'Escribe tu usuario y tu clave.');

    return;
  }
  if (CENTRAL_API_URL.includes('CAMBIAR')) {
    await alert('App sin configurar', 'Falta la dirección del servidor (VITE_CENTRAL_API_URL) en esta versión de la app.');

    return;
  }

  loading.value = true;
  try {
    const choice = await login(username.value.trim(), password.value, company);
    if (choice) {
      loading.value = false;
      const selected = await chooseCompany(choice.companies);
      if (selected) {
        await submit(selected);
      }

      return;
    }

    if (remember.value) {
      localStorage.setItem('remembered_user', username.value.trim());
    } else {
      localStorage.removeItem('remembered_user');
    }
    password.value = '';
    router.replace('/home');
  } catch (error) {
    password.value = '';
    if (error instanceof ApiError && error.code === 'app_disabled' && typeof error.data.web_url === 'string') {
      const webUrl = error.data.web_url;
      await alert('App no habilitada', error.message, [
        { text: 'Cerrar', role: 'cancel' },
        { text: 'Abrir en el navegador', handler: () => void window.open(webUrl, '_system') },
      ]);
    } else {
      await alert('No pudiste ingresar', errorMessage(error));
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <IonPage>
    <IonContent>
      <div class="login">
        <div class="login-box">
          <div class="login-header">
            <PlatformMark />
            <h1>App del conductor</h1>
            <p>Ingresa con el usuario que te dio tu empresa</p>
          </div>

          <form class="login-form" @submit.prevent="submit()">
            <div class="field">
              <label class="field-label" for="login-user">Usuario o correo</label>
              <IonInput id="login-user" v-model="username" fill="outline" autocomplete="username" autocapitalize="off" required />
            </div>

            <div class="field">
              <label class="field-label" for="login-password">Clave</label>
              <IonInput
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                fill="outline"
                class="password-input"
                autocomplete="current-password"
                required
              >
                <IonButton
                  slot="end"
                  type="button"
                  fill="clear"
                  color="medium"
                  class="password-toggle"
                  :aria-label="showPassword ? 'Ocultar clave' : 'Mostrar clave'"
                  :aria-pressed="showPassword"
                  @click="showPassword = !showPassword"
                >
                  <IonIcon slot="icon-only" :icon="showPassword ? eyeOffOutline : eyeOutline" />
                </IonButton>
              </IonInput>
            </div>

            <IonCheckbox v-model="remember" label-placement="end" justify="start" class="remember">Recordar mi usuario</IonCheckbox>

            <IonButton class="big-action-btn" expand="block" type="submit" :disabled="loading">
              <IonSpinner v-if="loading" name="crescent" />
              <span v-else>Ingresar</span>
            </IonButton>
          </form>
        </div>
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: calc(var(--safe-area-top) + 24px) 24px 24px;
}
.login-box {
  display: flex;
  flex-direction: column;
  gap: 32px;
  width: 100%;
  max-width: 384px;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
}
.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}
.login-header h1 {
  margin: 8px 0 0;
  font-size: 1.25rem;
  font-weight: 500;
}
.login-header p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--muted-foreground);
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
/*
 * El ojo de la clave: un área de toque de 40 px con el ícono a la misma distancia del borde que el
 * texto del otro lado (el campo deja solo 6 px a la derecha y el botón centra el ícono de 20 px).
 */
.password-input {
  --padding-end: 6px;
}
.password-toggle {
  --padding-start: 0;
  --padding-end: 0;
  --border-radius: 50%;
  width: 40px;
  height: 40px;
  margin: 0;
}
.password-toggle ion-icon {
  font-size: 20px;
}
.remember {
  font-size: 0.875rem;
  --size: 18px;
  --border-radius: 4px;
}
</style>
