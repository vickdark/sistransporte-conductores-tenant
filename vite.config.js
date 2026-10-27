import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id) return;
          if (id.includes('node_modules')) {
            if (id.includes('@ionic/core/components')) return 'ionic-components';
            if (id.includes('@ionic/core')) return 'ionic-core';
            if (id.includes('ionicons')) return 'ionicons';
            if (id.includes('@capacitor')) return 'capacitor';
            if (id.includes('@ionic/pwa-elements')) return 'pwa-elements';
            if (id.includes('capacitor-foreground-service')) return 'cap-foreground-service';
            if (id.includes('@capacitor-community')) return 'cap-community';
            return 'vendor';
          }
        }
      }
    }
  },
  optimizeDeps: {
    exclude: [
      '@ionic/pwa-elements'
    ]
  }
});
