import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { alertController } from '@ionic/vue';
import type { CapturedPhoto } from '@/api/types';

// En el navegador, la cámara de pwa-elements trae un botón para subir un archivo: se oculta, porque
// las fotos deben ser tomadas en el momento (en el teléfono, `CameraSource.Camera` ya abre solo la cámara).
new MutationObserver((mutations) => {
  mutations.forEach((mutation) =>
    mutation.addedNodes.forEach((node) => {
      if (node instanceof HTMLElement && node.tagName === 'PWA-CAMERA-MODAL') {
        (node as HTMLElement & { hidePicker: boolean }).hidePicker = true;
      }
    }),
  );
}).observe(document.body, { childList: true });

/**
 * Toma una foto con la cámara del teléfono, sin galería (`CameraSource.Camera`): el servidor solo
 * acepta fotos de cámara. Devuelve null si el conductor cancela o no da el permiso.
 */
export async function takePhoto(): Promise<CapturedPhoto | null> {
  try {
    const status = await Camera.checkPermissions();
    if (status.camera !== 'granted' && (await Camera.requestPermissions({ permissions: ['camera'] })).camera !== 'granted') {
      const alert = await alertController.create({ header: 'Permiso de cámara', message: 'Se requiere el permiso de cámara para tomar la foto.', buttons: ['Entendido'] });
      await alert.present();

      return null;
    }
  } catch {
    // En el navegador no hay permisos que revisar.
  }

  try {
    const image = await Camera.getPhoto({
      quality: 60,
      width: 1600,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
    });
    const format = image.format === 'png' || image.format === 'webp' ? image.format : 'jpeg';
    const bytes = Uint8Array.from(atob(image.base64String ?? ''), (char) => char.charCodeAt(0));

    return {
      blob: new Blob([bytes], { type: `image/${format}` }),
      dataUrl: `data:image/${format};base64,${image.base64String}`,
      extension: format === 'jpeg' ? 'jpg' : format,
    };
  } catch {
    // El conductor canceló la cámara.
    return null;
  }
}
