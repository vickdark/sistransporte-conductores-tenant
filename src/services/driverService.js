import { API_BASE_URL } from './authService.js';
import { registerPlugin, Capacitor, CapacitorHttp } from '@capacitor/core';
const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';
const ForegroundService = registerPlugin('ForegroundService');
import { KeepAwake } from '@capacitor-community/keep-awake';
const PowerWakelock = registerPlugin('PowerWakelock');

let watcherId = null;
let lastSentTime = 0;
let pointsBuffer = [];
let isSending = false;
let retryBackoffMs = 0;
let nextRetryAt = 0;
let persistChain = Promise.resolve();
let flushTimerId = null;
let trackingSessionId = null;

// Configuración de rastreo ULTRA-AGRESIVA para tiempo real
const GPS_CONFIG = {
  distanceFilter: 0,
  sendIntervalMs: 3000,   // Envío cada 2 segundos (tiempo real total)
  bufferStorageKey: 'gps_current_buffer',
  logPrefix: '[GPS-REALTIME-ONLY]'
};

const SEND_CONFIG = {
  maxBatchSize: 50,
  maxBufferSize: 2000,
  minRetryMs: 5000,
  maxRetryMs: 60000,
  flushTickMs: 4000
};

const ACTIVE_TRACKING_KEY = 'gps_active_tracking_v1';

// Escuchar cambios de estado de la app para forzar sincronización
App.addListener('appStateChange', ({ isActive }) => {
  if (isActive) {
    console.log('[GPS-SYSTEM] App volvió al primer plano. Forzando sincronización de buffer...');
    driverService.forceSync();
  }
});

// Escuchar cambios de red para intentar enviar puntos acumulados inmediatamente al recuperar señal
Network.addListener('networkStatusChange', (status) => {
  if (status.connected) {
    console.log('[GPS-SYSTEM] Conexión recuperada. Forzando sincronización...');
    driverService.forceSync();
  }
});

export const driverService = {
  async _setActiveTracking({ ordenId, empleadoId, vehiculoId }) {
    try {
      await Preferences.set({
        key: ACTIVE_TRACKING_KEY,
        value: JSON.stringify({
          ordenId: Number(ordenId),
          empleadoId: Number(empleadoId),
          vehiculoId: Number(vehiculoId) || 0,
          sessionId: trackingSessionId || null,
          savedAt: Date.now()
        })
      });
    } catch (e) {}
  },

  async _clearActiveTracking() {
    try {
      await Preferences.remove({ key: ACTIVE_TRACKING_KEY });
    } catch (e) {}
  },

  async resumeTrackingIfNeeded() {
    if (watcherId) return true;
    if (!Capacitor.isNativePlatform()) return false;

    try {
      const saved = await Preferences.get({ key: ACTIVE_TRACKING_KEY });
      if (!saved?.value) return false;
      const data = JSON.parse(saved.value);
      if (!data?.ordenId || !data?.empleadoId) return false;
      trackingSessionId = data.sessionId || trackingSessionId;
      await this.startTracking(data.ordenId, data.empleadoId, data.vehiculoId || 0);
      return true;
    } catch (e) {
      return false;
    }
  },

  _ensureFlushTimer() {
    if (flushTimerId) return;
    flushTimerId = setInterval(() => {
      if (!watcherId) return;
      this._flushBuffer().catch(() => {});
    }, SEND_CONFIG.flushTickMs);
  },

  _clearFlushTimer() {
    if (!flushTimerId) return;
    clearInterval(flushTimerId);
    flushTimerId = null;
  },

  async getPendientes(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}operacion_driver/servicios_pendientes.php?relacionado_id=${userId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error al obtener servicios pendientes');
      const data = await response.json();
      return data.ordenes || [];
    } catch (error) {
      console.error('Error in getPendientes:', error);
      return [];
    }
  },

  async getListadoServicios(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}operacion_driver/listado_servicios.php?relacionado_id=${userId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error al obtener listado de servicios');
      const data = await response.json();
      
      if (data.status === 'success' && data.ordenes) {
        const allServices = [];
        Object.values(data.ordenes).forEach(group => {
          if (Array.isArray(group)) allServices.push(...group);
        });
        return { 
          list: allServices, 
          totales: data.totales 
        };
      }
      return { list: [], totales: {} };
    } catch (error) {
      console.error('Error in getListadoServicios:', error);
      return { list: [], totales: {} };
    }
  },

  async getDashboardData(userId) {
    const [pendientes, listadoResponse] = await Promise.all([
      this.getPendientes(userId),
      this.getListadoServicios(userId)
    ]);

    const pendientesList = Array.isArray(pendientes) ? pendientes : [];
    const generalList = listadoResponse.list || [];
    const totalesApi = listadoResponse.totales || {};

    const counts = {
      pendientes: pendientesList.length,
      progreso: totalesApi['En Progreso'] || 0,
      completados: totalesApi['Completado'] || 0,
      cancelados: totalesApi['Cancelado'] || 0,
      apoyo: totalesApi['Apoyo'] || 0
    };

    const dashboardData = { counts, pendientesList, generalList };
    localStorage.setItem(`dashboard_cache_${userId}`, JSON.stringify(dashboardData));
    return dashboardData;
  },

  getCachedDashboardData(userId) {
    const cache = localStorage.getItem(`dashboard_cache_${userId}`);
    return cache ? JSON.parse(cache) : null;
  },

  async getDetalleServicio(serviceId, userId) {
    try {
      const url = `${API_BASE_URL}operacion_driver/detalle_servicio.php?id=${serviceId}${userId ? `&relacionado_id=${userId}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error al obtener detalle del servicio');
      const data = await response.json();
      return data.status === 'success' ? data.orden : null;
    } catch (error) {
      console.error('Error in getDetalleServicio:', error);
      return null;
    }
  },

  async getServiceById(userId, serviceId) {
    return await this.getDetalleServicio(serviceId);
  },

  async updateServiceStatus(payload) {
    try {
      const response = await fetch(`${API_BASE_URL}operacion_driver/actualizar_estado.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.group('⚠️ ERROR DE RESPUESTA NO-JSON');
        console.error('Status:', response.status);
        console.error('Respuesta Raw:', responseText);
        console.groupEnd();
        throw new Error(`Servidor (${response.status}): ${responseText.substring(0, 100)}`);
      }

      if (!response.ok || data.error) {
        console.group('❌ ERROR DESDE API');
        console.error('Payload enviado:', payload);
        console.error('Data recibida:', data);
        console.groupEnd();
        
        // Extraer el mensaje más descriptivo posible
        const msg = data.error || data.message || data.details || 'Error desconocido en el servidor';
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
      return data;
    } catch (error) {
      console.error('Error in updateServiceStatus:', error);
      throw error;
    }
  },
  
  async saveGpsPoint(payload) {
    try {
      const response = await fetch(`${API_BASE_URL}gps/guardar.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        console.warn('GPS point not saved:', await response.text());
      }
    } catch (error) {
      console.error('Error in saveGpsPoint:', error);
    }
  },

  async saveGpsPointsBatch(batch) {
    if (!batch || batch.length === 0) return;
    
    try {
      const net = await Network.getStatus();
      if (!net.connected) return false;

      console.log(`${GPS_CONFIG.logPrefix} Enviando ${batch.length} puntos en tiempo real...`);
      
      const response = await CapacitorHttp.post({
        url: `${API_BASE_URL}gps/guardar.php`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        data: {
          points: batch,
          requestId: `rt_${Date.now()}`,
          sessionId: trackingSessionId || undefined
        },
        connectTimeout: 10000,
        readTimeout: 10000
      });
      
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      console.log(`${GPS_CONFIG.logPrefix} ✅ Sincronizado.`);
      return true;
      
    } catch (error) {
      console.error(`${GPS_CONFIG.logPrefix} ❌ Fallo de envío inmediato:`, error.message);
      // No guardamos en cola offline por solicitud del usuario, se prioriza el tiempo real
      return false;
    }
  },

  async _flushBuffer({ force = false } = {}) {
    if (isSending) return false;
    if (!pointsBuffer || pointsBuffer.length === 0) return true;

    const now = Date.now();
    if (!force && nextRetryAt && now < nextRetryAt) return false;

    isSending = true;
    try {
      const batch = pointsBuffer.slice(0, SEND_CONFIG.maxBatchSize);
      const ok = await this.saveGpsPointsBatch(batch);

      if (ok) {
        pointsBuffer = pointsBuffer.slice(batch.length);
        retryBackoffMs = 0;
        nextRetryAt = 0;
        await this._persistBuffer();

        if (pointsBuffer.length > 0) {
          await this._flushBuffer({ force: true });
        }
        return true;
      }

      retryBackoffMs = retryBackoffMs ? Math.min(retryBackoffMs * 2, SEND_CONFIG.maxRetryMs) : SEND_CONFIG.minRetryMs;
      nextRetryAt = Date.now() + retryBackoffMs;
      await this._persistBuffer();
      return false;
    } finally {
      isSending = false;
    }
  },

  async _persistBuffer() {
    try {
      const snapshot = JSON.stringify(pointsBuffer);
      persistChain = persistChain
        .then(() => Preferences.set({ key: GPS_CONFIG.bufferStorageKey, value: snapshot }))
        .catch(() => {});
      await persistChain;
    } catch (e) {
      console.error('Error persistiendo buffer:', e);
    }
  },

  async _loadPersistedBuffer() {
    try {
      // Cargar el buffer que quedó pendiente
      const bufferData = await Preferences.get({ key: GPS_CONFIG.bufferStorageKey });
      if (bufferData.value) {
        const savedBuffer = JSON.parse(bufferData.value);
        if (savedBuffer.length > 0) {
          pointsBuffer = [...savedBuffer, ...pointsBuffer];
          console.log(`${GPS_CONFIG.logPrefix} 📂 Recuperados ${savedBuffer.length} puntos del buffer anterior.`);
        }
      }
    } catch (e) {
      console.error('Error cargando persistencia:', e);
    }
  },
  async checkBatteryAndManufacturer() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const info = await Device.getInfo();
      const manufacturer = info.manufacturer.toLowerCase();
      
      // 1. Mostrar instrucciones específicas por fabricante
      if (manufacturer === 'xiaomi' || manufacturer === 'poco' || manufacturer === 'redmi') {
        this._showManufacturerAlert(
          'Optimización Xiaomi 📱',
          'Para que tus rutas se registren correctamente con la pantalla apagada, por favor activa el <b>"Inicio automático"</b> y en Ahorro de batería selecciona <b>"Sin restricciones"</b>.'
        );
      } else if (manufacturer === 'huawei' || manufacturer === 'honor') {
        this._showManufacturerAlert(
          'Optimización Huawei 📱',
          'Para un rastreo continuo, ve a Ajustes > Aplicaciones > Inicio de aplicaciones y selecciona <b>"Gestionar manualmente"</b> para esta app.'
        );
      } else if (manufacturer === 'samsung') {
        this._showManufacturerAlert(
          'Optimización Samsung 📱',
          'Para evitar interrupciones, asegúrate de que la aplicación esté configurada como <b>"No restringida"</b> en los ajustes de batería.'
        );
      }
    } catch (e) {
      console.error('Error al verificar dispositivo:', e);
    }
  },

  async _showManufacturerAlert(title, message) {
    const hasSeen = localStorage.getItem('gps_instruction_seen');
    if (hasSeen) return;

    // Usamos el componente ion-alert de Ionic para una interfaz nativa y amigable
    const alert = document.createElement('ion-alert');
    alert.header = title;
    alert.subHeader = 'Acción Requerida para GPS';
    alert.message = message;
    alert.backdropDismiss = false;
    alert.cssClass = 'gps-config-alert';
    alert.buttons = [
      {
        text: 'Entendido',
        role: 'cancel',
        cssClass: 'secondary'
      },
      {
        text: 'Ir a Ajustes ⚙️',
        handler: () => {
          localStorage.setItem('gps_instruction_seen', 'true');
          if (Capacitor.isNativePlatform()) {
            BackgroundGeolocation.openSettings();
          }
        }
      }
    ];

    document.body.appendChild(alert);
    return alert.present();
  },

  async startTracking(ordenId, empleadoId, vehiculoId) {
    if (!trackingSessionId) {
      trackingSessionId = `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }

    this._ensureFlushTimer();

    if (watcherId) {
      this.forceSync();
      return;
    }

    // Verificar y solicitar permisos antes de iniciar
    const checkPermissions = async () => {
      if (Capacitor.isNativePlatform()) {
        if (Capacitor.getPlatform() === 'android') {
          try {
            const loc = await PowerWakelock.requestLocationAlways();
            if (!loc?.alwaysGranted) {
              alert("Debes permitir ubicación 'Todo el tiempo' para el rastreo. Se abrirán los ajustes de la app.");
              await PowerWakelock.openAppSettings();
              return false;
            }
          } catch (e) {
            alert("No se pudo verificar permisos de ubicación. Abre ajustes y selecciona 'Permitir todo el tiempo'.");
            try { await PowerWakelock.openAppSettings(); } catch (e) {}
            return false;
          }
        } else {
          let status = await Geolocation.checkPermissions();
          if (status.location !== 'granted') {
            status = await Geolocation.requestPermissions();
          }
          if (status.location !== 'granted') {
            alert('Se requiere el permiso de ubicación para rastrear el servicio. Por favor, acéptalo en la configuración de la app.');
            return false;
          }
        }
      }
      return true;
    };

    const hasPermission = await checkPermissions();
    if (!hasPermission) return;
    
    // Verificar optimizaciones de batería y fabricante
    await this.checkBatteryAndManufacturer();
    
    // Cargar buffer pendiente si existe
    await this._loadPersistedBuffer();
    await this._flushBuffer({ force: true });

    console.log(`[GPS] Iniciando seguimiento para Orden #${ordenId}`);
    
    // Si estamos en WEB, usamos Geolocation estándar como fallback para pruebas
    if (!Capacitor.isNativePlatform()) {
      console.warn(`${GPS_CONFIG.logPrefix} WEB DETECTADA: Usando fallback de Geolocation.watchPosition`);
      
      watcherId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        async (position, err) => {
          if (err) {
            console.error(`${GPS_CONFIG.logPrefix} Fallback Error:`, err);
            return;
          }
          if (position) {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed,
              heading: position.coords.heading // Usamos heading directamente si está disponible
            };
            await this._handleLocationUpdate(ordenId, empleadoId, vehiculoId, location);
          }
        }
      );
      await this._setActiveTracking({ ordenId, empleadoId, vehiculoId });
      return;
    }

    try {
      if (Capacitor.getPlatform() === 'android') {
        try {
          const notif = await PowerWakelock.requestNotificationsPermission();
          if (notif && notif.granted === false) {
            await PowerWakelock.openAppNotificationSettings();
          }
        } catch (e) {}

        try {
          const prompted = localStorage.getItem('battery_opt_prompted');
          if (!prompted) {
            const st = await PowerWakelock.isIgnoringBatteryOptimizations();
            if (st && st.ignoring === false) {
              localStorage.setItem('battery_opt_prompted', '1');
              await PowerWakelock.requestIgnoreBatteryOptimizations();
            } else {
              localStorage.setItem('battery_opt_prompted', '1');
            }
          }
        } catch (e) {}
      }

      // 1. Mantener CPU despierta para procesar red en background
      try {
        await KeepAwake.keepAwake();
        await PowerWakelock.acquireWakeLock(); // HARD Wakelock (CPU 100% On)
        console.log(`${GPS_CONFIG.logPrefix} KeepAwake y PowerWakelock activados: WebView y CPU no entrarán en Deep Sleep.`);
      } catch (kaError) {
        console.warn("No se pudo activar Wakelocks:", kaError);
      }

      // 2. Iniciar el Foreground Service adicional para redundancia y persistencia total
      try {
        await ForegroundService.start({
          id: 101,
          title: "Kemuel Tracking: Viaje en Curso",
          body: "Telemetría activa. No cerrar la aplicación.",
          smallIcon: "ic_launcher",
          importance: 3 // High importance
        });
        console.log(`${GPS_CONFIG.logPrefix} Foreground Service de redundancia activado.`);
      } catch (fsError) {
        console.warn("No se pudo iniciar el Foreground Service de redundancia:", fsError);
      }

      watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: `Seguimiento en tiempo real activo para la Orden #${ordenId}. No detenga el servicio.`,
          backgroundTitle: "Kemuel Tracking GPS",
          requestPermissions: true,
          stale: false,
          distanceFilter: 0, // Captura cada cambio de posición
          interval: 2000,    // Captura agresiva cada 2 segundos
          fastestInterval: 1000,
          notificationIconColor: "#FF0000",
          stopOnTerminate: false,
          startOnBoot: true
        },
        async (location, error) => {
          if (error) {
            console.error(`${GPS_CONFIG.logPrefix} Error en watcher:`, error);
            
            // Si el error indica que faltan permisos de segundo plano (Android 10+)
            if (error.code === "NOT_AUTHORIZED") {
              if (window.confirm("Para rastrear en segundo plano, el permiso de ubicación debe estar en 'Permitir todo el tiempo'. ¿Deseas abrir la configuración?")) {
                BackgroundGeolocation.openSettings();
              }
            }
            return;
          }
          if (location) {
            await this._handleLocationUpdate(ordenId, empleadoId, vehiculoId, location);
          }
        }
      );
      console.log(`${GPS_CONFIG.logPrefix} Watcher nativo persistente activado con ID: ${watcherId}`);
      await this._setActiveTracking({ ordenId, empleadoId, vehiculoId });
    } catch (e) {
      console.error(`${GPS_CONFIG.logPrefix} Error fatal al iniciar rastreo:`, e);
    }
  },

  async _handleLocationUpdate(ordenId, empleado_id, vehiculoId, location) {
    const now = Date.now();
    
    // FILTRO DE PRECISIÓN: Ignorar puntos muy imprecisos (> 30 metros de error)
    // Esto evita que la ruta "salte" a techos de casas cuando hay mala señal.
    if (location.accuracy && location.accuracy > 30) {
      console.warn(`${GPS_CONFIG.logPrefix} Punto ignorado por baja precisión: ${location.accuracy}m`);
      return;
    }

    // Mostramos la captura en consola para debug
    console.log(`${GPS_CONFIG.logPrefix} Captura (3m): ${location.latitude.toFixed(7)}, ${location.longitude.toFixed(7)}`);
    
    // Conversión de m/s a km/h para la velocidad
    const speedKmH = location.speed ? (location.speed * 3.6) : 0;

    // Obtener información adicional del estado del dispositivo para telemetría rica
    let deviceStatus = {};
    try {
      const [battery, network] = await Promise.all([
        Device.getBatteryInfo(),
        // Nota: Si necesitas info de red más detallada podrías usar @capacitor/network
      ]);
      deviceStatus = {
        battery_level: battery.batteryLevel,
        is_charging: battery.isCharging,
      };
    } catch (e) {
      // Si falla obtener info del dispositivo, seguimos con la ubicación
    }

    // Construimos el punto individual con telemetría extendida
    const point = {
      orden_servicio_id: parseInt(ordenId),
      empleado_id: parseInt(empleado_id),
      vehiculo_id: parseInt(vehiculoId) || 0,
      latitud: parseFloat(location.latitude.toFixed(7)),
      longitud: parseFloat(location.longitude.toFixed(7)),
      velocidad: parseFloat(speedKmH.toFixed(2)),
      precision_m: location.accuracy ? parseFloat(parseFloat(location.accuracy).toFixed(2)) : 0,
      altitud: location.altitude ? parseFloat(location.altitude.toFixed(2)) : 0,
      heading: location.heading || location.bearing ? parseFloat((location.heading || location.bearing).toFixed(2)) : 0,
      bateria_nivel: deviceStatus.battery_level || 0,
      esta_cargando: deviceStatus.is_charging ? 1 : 0,
      // Formato compatible con MySQL DATETIME
      fecha_dispositivo: (() => {
        const d = new Date(location.time || location.timestamp || Date.now());
        const offset = d.getTimezoneOffset() * 60000;
        const local = new Date(d.getTime() - offset);
        return local.toISOString().slice(0, 19).replace('T', ' ');
      })()
    };

    // Agregamos al buffer y persistimos inmediatamente
    pointsBuffer.push(point);
    if (pointsBuffer.length > SEND_CONFIG.maxBufferSize) {
      pointsBuffer.splice(0, pointsBuffer.length - SEND_CONFIG.maxBufferSize);
    }
    this._persistBuffer();
    
    const timeDiff = now - lastSentTime;
    if (timeDiff >= GPS_CONFIG.sendIntervalMs) {
      lastSentTime = now;
      this._flushBuffer().catch(() => {});
    }
  },

  async stopTracking() {
    if (watcherId) {
      console.log('[GPS] Deteniendo seguimiento');
      try {
        // Permitir que el dispositivo duerma de nuevo (ahorro batería)
        try {
          await KeepAwake.allowSleep();
          await PowerWakelock.releaseWakeLock();
          console.log(`${GPS_CONFIG.logPrefix} KeepAwake y PowerWakelock desactivados.`);
        } catch (kaError) {
          console.warn("Error al desactivar Wakelocks:", kaError);
        }

        // Detener el Foreground Service de redundancia
        try {
          await ForegroundService.stop();
          console.log(`${GPS_CONFIG.logPrefix} Foreground Service de redundancia detenido.`);
        } catch (fsError) {
          console.warn("Error al detener el Foreground Service:", fsError);
        }

        if (Capacitor.isNativePlatform()) {
          await BackgroundGeolocation.removeWatcher({ id: watcherId });
        } else {
          await Geolocation.clearWatch({ id: watcherId });
        }
        
        // Al detener, intentamos mandar lo que quede en el buffer
        if (pointsBuffer.length > 0) {
          console.log(`${GPS_CONFIG.logPrefix} Enviando puntos restantes antes de detener...`);
          await this._flushBuffer({ force: true });
        }
      } catch (e) {
        console.error('[GPS] Error al detener:', e);
      }
      watcherId = null;
      lastSentTime = 0;
      retryBackoffMs = 0;
      nextRetryAt = 0;
    }
    trackingSessionId = null;
    await this._clearActiveTracking();
    this._clearFlushTimer();
  },

  isTracking() {
    return watcherId !== null;
  },

  async forceSync() {
    await this._flushBuffer({ force: true });
  }
};
