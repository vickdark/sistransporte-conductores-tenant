import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@ionic/vue')) return 'ionic-vue';
          if (id.includes('@ionic/core')) return 'ionic-core';
          if (id.includes('ionicons')) return 'ionicons';
          if (id.includes('@capacitor-community') || id.includes('capacitor-foreground-service')) return 'cap-community';
          if (id.includes('@capacitor')) return 'capacitor';
          if (id.includes('@ionic/pwa-elements')) return 'pwa-elements';
          if (id.includes('/vue')) return 'vue';
          return 'vendor';
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@ionic/pwa-elements'],
  },
});
