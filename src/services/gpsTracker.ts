import { KeepAwake } from '@capacitor-community/keep-awake';
import { App } from '@capacitor/app';
import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Geolocation } from '@capacitor/geolocation';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { alertController } from '@ionic/vue';
import { isSignedIn, session } from '@/api/session';

/**
 * Seguimiento GPS en segundo plano del servicio en curso (rastreo «tiempo real» de la app anterior):
 * BackgroundGeolocation (su propio foreground service de tipo `location`, con la notificación), KeepAwake
 * y el wakelock nativo (PowerPlugin.java) para que Android no congele la app con la pantalla apagada.
 * El plugin pide un punto por segundo (fijo en su código nativo) y se detiene si se cierra la app
 * (deslizarla o salir con «atrás»); al abrirla de nuevo, `resume()` lo retoma. Los puntos se acumulan en un búfer persistente
 * y se envían por lotes a `POST /gps/positions` de la empresa (contrato en la API v1): el servidor sabe
 * el conductor y el vehículo por el token, y responde `tracking: false` cuando el servicio terminó.
 */

interface BackgroundLocation {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  bearing?: number | null;
  heading?: number | null;
  time?: number | null;
}

interface BackgroundGeolocationPlugin {
  addWatcher(options: Record<string, unknown>, callback: (location?: BackgroundLocation, error?: { code?: string }) => void): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
  openSettings(): Promise<void>;
}

interface PowerWakelockPlugin {
  checkLocationAlways(): Promise<{ fineGranted?: boolean; alwaysGranted?: boolean }>;
  requestLocationAlways(): Promise<{ fineGranted?: boolean; alwaysGranted?: boolean }>;
  openAppSettings(): Promise<void>;
  requestNotificationsPermission(): Promise<{ granted?: boolean }>;
  openAppNotificationSettings(): Promise<void>;
  isIgnoringBatteryOptimizations(): Promise<{ ignoring?: boolean }>;
  requestIgnoreBatteryOptimizations(): Promise<void>;
  acquireWakeLock(): Promise<void>;
  releaseWakeLock(): Promise<void>;
}

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
const PowerWakelock = registerPlugin<PowerWakelockPlugin>('PowerWakelock');

/** Un punto como lo recibe la API (más el servicio al que pertenece). */
interface GpsPoint {
  service_id: number;
  latitude: number;
  longitude: number;
  speed: number;
  accuracy: number | null;
  heading: number | null;
  captured_at: string;
}

const CONFIG = {
  sendIntervalMs: 3000,
  flushTickMs: 4000,
  maxBatchSize: 50,
  maxBufferSize: 2000,
  minRetryMs: 5000,
  maxRetryMs: 60000,
  /** Puntos con más error que esto se ignoran (la ruta «salta» a los techos con mala señal). */
  maxAccuracyMeters: 30,
  bufferKey: 'gps_buffer_v2',
  activeKey: 'gps_active_tracking_v2',
  log: '[GPS]',
};

let watcherId: string | null = null;
let serviceId: number | null = null;
let buffer: GpsPoint[] = [];
let isSending = false;
let lastSentAt = 0;
let retryBackoffMs = 0;
let nextRetryAt = 0;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let persistChain: Promise<unknown> = Promise.resolve();

// Al volver a primer plano o recuperar la señal, se envía lo acumulado.
App.addListener('appStateChange', ({ isActive }) => {
  if (isActive) {
    void flush(true);
  }
});
Network.addListener('networkStatusChange', (status) => {
  if (status.connected) {
    void flush(true);
  }
});

async function persist(): Promise<void> {
  const snapshot = JSON.stringify(buffer);
  persistChain = persistChain.then(() => Preferences.set({ key: CONFIG.bufferKey, value: snapshot })).catch(() => {});
  await persistChain;
}

async function loadPersisted(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: CONFIG.bufferKey });
    const saved = value ? (JSON.parse(value) as GpsPoint[]) : [];
    if (saved.length > 0) {
      buffer = [...saved, ...buffer];
    }
  } catch {
    // Un búfer dañado se descarta.
  }
}

type SendResult = 'sent' | 'retry' | 'stop';

/**
 * Envía un lote (todos del mismo servicio). `stop`: el servicio ya no está en curso, no es del
 * conductor o la sesión venció; el lote se descarta y el seguimiento se apaga.
 */
async function send(batch: GpsPoint[]): Promise<SendResult> {
  const current = session.value;
  if (!current) {
    return 'stop';
  }

  try {
    const network = await Network.getStatus();
    if (!network.connected) {
      return 'retry';
    }

    const response = await CapacitorHttp.post({
      url: `${current.apiUrl}gps/positions`,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${current.token}` },
      data: { service_id: batch[0].service_id, points: batch.map(({ service_id: _service, ...point }) => point) },
      connectTimeout: 10000,
      readTimeout: 10000,
    });

    if (response.status === 200) {
      return response.data?.tracking === false ? 'stop' : 'sent';
    }
    if ([401, 403, 404].includes(response.status)) {
      return 'stop';
    }
    // Un lote que el servidor no acepta (422) no se reintenta para siempre.
    return response.status === 422 ? 'sent' : 'retry';
  } catch (error) {
    console.warn(CONFIG.log, 'Fallo de envío', error);

    return 'retry';
  }
}

async function flush(force = false): Promise<void> {
  if (isSending || buffer.length === 0 || (!force && nextRetryAt && Date.now() < nextRetryAt)) {
    return;
  }

  isSending = true;
  try {
    const service = buffer[0].service_id;
    const batch = buffer.filter((point) => point.service_id === service).slice(0, CONFIG.maxBatchSize);
    const result = await send(batch);

    if (result === 'retry') {
      retryBackoffMs = retryBackoffMs ? Math.min(retryBackoffMs * 2, CONFIG.maxRetryMs) : CONFIG.minRetryMs;
      nextRetryAt = Date.now() + retryBackoffMs;
      await persist();

      return;
    }

    retryBackoffMs = 0;
    nextRetryAt = 0;
    const sent = new Set(batch);
    buffer = result === 'stop' ? buffer.filter((point) => point.service_id !== service) : buffer.filter((point) => !sent.has(point));
    await persist();

    if (result === 'stop' && service === serviceId) {
      isSending = false;
      await gpsTracker.stop();

      return;
    }
  } finally {
    isSending = false;
  }

  if (buffer.length > 0) {
    await flush(true);
  }
}

async function onLocation(location: BackgroundLocation): Promise<void> {
  if (serviceId === null || (location.accuracy && location.accuracy > CONFIG.maxAccuracyMeters)) {
    return;
  }

  const heading = location.heading ?? location.bearing;
  buffer.push({
    service_id: serviceId,
    latitude: Number(location.latitude.toFixed(7)),
    longitude: Number(location.longitude.toFixed(7)),
    // El GPS da m/s; la API recibe km/h.
    speed: location.speed ? Number((location.speed * 3.6).toFixed(2)) : 0,
    accuracy: location.accuracy ? Number(location.accuracy.toFixed(2)) : null,
    heading: heading !== null && heading !== undefined && heading >= 0 ? Number((heading % 360).toFixed(2)) : null,
    captured_at: new Date(location.time ?? Date.now()).toISOString(),
  });
  if (buffer.length > CONFIG.maxBufferSize) {
    buffer.splice(0, buffer.length - CONFIG.maxBufferSize);
  }
  void persist();

  if (Date.now() - lastSentAt >= CONFIG.sendIntervalMs) {
    lastSentAt = Date.now();
    void flush();
  }
}

async function ensurePermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }

  if (Capacitor.getPlatform() === 'android') {
    try {
      // Con «Solo mientras se usa la app» el rastreo también funciona: el foreground service de
      // ubicación arranca con la app abierta y Android le deja recibir puntos en segundo plano.
      // «Todo el tiempo» se pide una sola vez (en Android 11+ abre los ajustes; pedirlo en cada
      // servicio llevaría al conductor a los ajustes cada vez).
      const current = await PowerWakelock.checkLocationAlways();
      const askAlways = !current.alwaysGranted && !localStorage.getItem('gps_always_prompted');
      const location = !current.fineGranted || askAlways ? await PowerWakelock.requestLocationAlways() : current;
      if (askAlways) {
        localStorage.setItem('gps_always_prompted', '1');
      }

      if (!location?.fineGranted) {
        await notify('Ubicación requerida', 'Para rastrear el servicio permite la ubicación. Se abrirán los ajustes de la app.');
        await PowerWakelock.openAppSettings();

        return false;
      }
    } catch {
      await notify('Ubicación requerida', 'No se pudo verificar el permiso de ubicación. Revísalo en los ajustes de la app.');
      await PowerWakelock.openAppSettings().catch(() => {});

      return false;
    }

    return true;
  }

  let status = await Geolocation.checkPermissions();
  if (status.location !== 'granted') {
    status = await Geolocation.requestPermissions();
  }
  if (status.location !== 'granted') {
    await notify('Ubicación requerida', 'Acepta el permiso de ubicación en los ajustes de la app para rastrear el servicio.');

    return false;
  }

  return true;
}

async function notify(header: string, message: string): Promise<void> {
  const alert = await alertController.create({ header, message, buttons: ['Entendido'] });
  await alert.present();
  await alert.onDidDismiss();
}

/** Una vez: cómo evitar que el ahorro de batería del fabricante corte el rastreo. */
async function manufacturerTips(): Promise<void> {
  if (!Capacitor.isNativePlatform() || localStorage.getItem('gps_instruction_seen')) {
    return;
  }

  try {
    const manufacturer = (await Device.getInfo()).manufacturer.toLowerCase();
    const tips: Record<string, [string, string]> = {
      xiaomi: ['Optimización Xiaomi', 'Para que la ruta se registre con la pantalla apagada, activa el <b>«Inicio automático»</b> y en Ahorro de batería elige <b>«Sin restricciones»</b>.'],
      huawei: ['Optimización Huawei', 'Ve a Ajustes › Aplicaciones › Inicio de aplicaciones y elige <b>«Gestionar manualmente»</b> para esta app.'],
      samsung: ['Optimización Samsung', 'Configura la app como <b>«No restringida»</b> en los ajustes de batería.'],
    };
    const key = ['poco', 'redmi'].includes(manufacturer) ? 'xiaomi' : manufacturer === 'honor' ? 'huawei' : manufacturer;
    const tip = tips[key];
    if (!tip) {
      return;
    }

    const alert = await alertController.create({
      header: tip[0],
      subHeader: 'Acción requerida para el GPS',
      message: tip[1],
      backdropDismiss: false,
      buttons: [
        { text: 'Entendido', role: 'cancel' },
        { text: 'Ir a ajustes', handler: () => void BackgroundGeolocation.openSettings() },
      ],
    });
    await alert.present();
    localStorage.setItem('gps_instruction_seen', '1');
  } catch {
    // Sin información del equipo, no se muestra nada.
  }
}

/** Mantiene despiertos la CPU y el WebView (la notificación la pone BackgroundGeolocation). */
async function keepAlive(): Promise<void> {
  if (Capacitor.getPlatform() === 'android') {
    try {
      const notifications = await PowerWakelock.requestNotificationsPermission();
      if (notifications?.granted === false) {
        await PowerWakelock.openAppNotificationSettings();
      }
    } catch {}

    try {
      if (!localStorage.getItem('battery_opt_prompted')) {
        localStorage.setItem('battery_opt_prompted', '1');
        const status = await PowerWakelock.isIgnoringBatteryOptimizations();
        if (status?.ignoring === false) {
          await PowerWakelock.requestIgnoreBatteryOptimizations();
        }
      }
    } catch {}
  }

  try {
    await KeepAwake.keepAwake();
    await PowerWakelock.acquireWakeLock();
  } catch (error) {
    console.warn(CONFIG.log, 'Sin wakelock', error);
  }
}

export const gpsTracker = {
  /** Empieza (o retoma) el rastreo del servicio en curso. */
  async start(id: number, number: string): Promise<void> {
    if (watcherId !== null && serviceId === id) {
      void flush(true);

      return;
    }
    if (watcherId !== null) {
      await this.stop();
    }
    if (!(await ensurePermissions())) {
      return;
    }

    serviceId = id;
    await Preferences.set({ key: CONFIG.activeKey, value: JSON.stringify({ id, number }) });
    await manufacturerTips();
    await loadPersisted();
    void flush(true);

    flushTimer ??= setInterval(() => void flush(), CONFIG.flushTickMs);

    try {
      if (!Capacitor.isNativePlatform()) {
        // En el navegador (pruebas), el GPS estándar.
        watcherId = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }, (position) => {
          if (position) {
            void onLocation({ ...position.coords, time: position.timestamp });
          }
        });

        return;
      }

      await keepAlive();
      // El plugin solo lee estas opciones: el intervalo (1 s) es fijo y no sobrevive al cierre de la app.
      watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundTitle: `Servicio #${number} en curso`,
          backgroundMessage: 'Rastreo GPS activo. No cierres la aplicación hasta finalizar el servicio.',
          requestPermissions: true,
          stale: false,
          distanceFilter: 0,
        },
        (location, error) => {
          if (error?.code === 'NOT_AUTHORIZED') {
            void notify('Ubicación en segundo plano', "Para rastrear con la pantalla apagada, la ubicación debe estar en «Permitir todo el tiempo».").then(() => BackgroundGeolocation.openSettings());

            return;
          }
          if (location) {
            void onLocation(location);
          }
        },
      );
    } catch (error) {
      console.error(CONFIG.log, 'No se pudo iniciar el rastreo', error);
    }
  },

  /** Detiene el rastreo, envía lo que quede y deja dormir al teléfono. */
  async stop(): Promise<void> {
    const id = watcherId;
    watcherId = null;
    serviceId = null;

    if (id !== null) {
      try {
        if (Capacitor.isNativePlatform()) {
          await BackgroundGeolocation.removeWatcher({ id });
          await KeepAwake.allowSleep().catch(() => {});
          await PowerWakelock.releaseWakeLock().catch(() => {});
        } else {
          await Geolocation.clearWatch({ id });
        }
      } catch (error) {
        console.warn(CONFIG.log, 'Error al detener', error);
      }
    }

    if (flushTimer !== null) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    await Preferences.remove({ key: CONFIG.activeKey });
    await flush(true);
  },

  /** Al abrir la app: retoma el rastreo que quedó activo (p. ej. tras reiniciar el teléfono). */
  async resume(): Promise<void> {
    if (!isSignedIn() || watcherId !== null) {
      return;
    }

    try {
      const { value } = await Preferences.get({ key: CONFIG.activeKey });
      const saved = value ? (JSON.parse(value) as { id: number; number: string }) : null;
      if (saved?.id) {
        await this.start(saved.id, saved.number);
      }
    } catch {
      // Sin rastreo guardado.
    }
  },

  isTracking(id?: number): boolean {
    return watcherId !== null && (id === undefined || serviceId === id);
  },
};
