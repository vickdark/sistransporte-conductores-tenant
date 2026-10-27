import { ref, watch } from 'vue';
import { apiBlob } from '@/api/client';
import { session } from '@/api/session';

const logoUrl = ref<string | null>(null);
let loadedFor: string | null = null;

// La app es de todas las empresas: después de ingresar se muestra el logo de la del conductor
// (el de su Configuración), y se suelta al cambiar de sesión.
watch(
  session,
  async (current) => {
    const key = current?.account.company.has_logo ? `${current.apiUrl}|${current.token}` : null;
    if (key === loadedFor) {
      return;
    }

    loadedFor = key;
    if (logoUrl.value) {
      URL.revokeObjectURL(logoUrl.value);
      logoUrl.value = null;
    }
    if (key) {
      const blob = await apiBlob('company/logo');
      if (blob && loadedFor === key) {
        logoUrl.value = URL.createObjectURL(blob);
      }
    }
  },
  { immediate: true },
);

/** El logo de la empresa de la sesión (null si no tiene o no ha cargado). */
export function useCompanyLogo() {
  return logoUrl;
}
