import { ref } from 'vue';

const dark = ref(localStorage.getItem('theme') === 'dark');

function apply(): void {
  document.body.classList.toggle('dark', dark.value);
}

/** Tema claro u oscuro de la app (se recuerda en el teléfono). */
export function useTheme() {
  apply();

  return {
    dark,
    toggle(): void {
      dark.value = !dark.value;
      localStorage.setItem('theme', dark.value ? 'dark' : 'light');
      apply();
    },
  };
}
