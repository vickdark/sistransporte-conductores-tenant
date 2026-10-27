# Documentación de Integración GPS Tracking (Arquitectura Ultra-Robusta)

Este documento explica el funcionamiento técnico del sistema de rastreo GPS en segundo plano implementado para la aplicación de conductores, el cual ha sido optimizado para garantizar **cero pérdida de datos** y **precisión en tiempo real**, burlando las restricciones de batería del sistema operativo Android.

## 🚀 Flujo de Funcionamiento Principal

1. **Activación Automática**: El rastreo se activa en la vista de detalle de la orden cuando una orden cambia su estado a **"En Progreso"**.
2. **Detección Ultra-Precisa (0m)**: A diferencia de los rastreadores comunes que esperan que el vehículo se mueva decenas de metros, este sistema captura *cada variación de la coordenada* (`distanceFilter: 0`), garantizando que la ruta pintada en el mapa del administrador sea perfectamente fiel a la calle.
3. **Sincronización por Lotes (Batching de 3s)**: Para no saturar el servidor ni agotar la batería haciendo peticiones HTTP individuales, JavaScript almacena los puntos en un búfer en memoria y utiliza `CapacitorHttp` para enviarlos como un **solo paquete JSON cada 3 segundos**.
4. **Filtro de Precisión**: El sistema descarta automáticamente los puntos GPS que tienen un margen de error mayor a 30 metros (común cuando hay interferencia de edificios altos), evitando así "saltos" irreales en la ruta.

## 🛡️ Las 3 Capas de Persistencia (Anti-Deep Sleep)

El mayor desafío en Android es evitar que el sistema operativo "congele" la app cuando el conductor apaga la pantalla y guarda el teléfono en su bolsillo. Para solucionarlo, hemos implementado una "Triple Barrera":

### 1. Foreground Service Nativo (Prioridad Alta)
Al iniciar el viaje, se lanza `capacitor-foreground-service`. Esto ancla una notificación inamovible en la barra de tareas ("Telemetría activa. No cerrar la aplicación.").
* **Objetivo:** Engañar al *OOM Killer* de Android, indicándole que el usuario está "usando" activamente la aplicación. Así evitamos que la aplicación se cierre por falta de memoria RAM si el conductor abre otras apps pesadas como WhatsApp o Google Maps.

### 2. Prevención de Suspensión de Pantalla (`KeepAwake`)
Se utiliza el plugin `@capacitor-community/keep-awake` para inyectar la bandera `FLAG_KEEP_SCREEN_ON` en la ventana principal.
* **Objetivo:** Si el conductor tiene el celular colocado en el soporte del vehículo con la app abierta, la pantalla **nunca se apagará por inactividad**.

### 3. HARD CPU Wakelock Nativo (`PowerWakelock`)
Esta es la protección definitiva creada a medida mediante un plugin Java (`PowerPlugin.java`). Se solicita un `PARTIAL_WAKE_LOCK` directamente al sistema Android.
* **Objetivo:** Si el conductor presiona el botón físico para bloquear la pantalla, la pantalla se apagará, **pero el Procesador (CPU) jamás entrará en Deep Sleep**. El hilo de JavaScript sigue operando al 100%, capturando el GPS y enviando las peticiones HTTP con total normalidad.

## 🌐 Gestión Inteligente de Red y Cola Offline

Hemos erradicado los cuellos de botella de red mediante un gestor inteligente usando `@capacitor/network`:

- Si la petición `CapacitorHttp` falla, el sistema intercepta el error e inmediatamente inspecciona el hardware de red:
  - **ENVÍO REAL-TIME:** El sistema prioriza el envío inmediato. Si no hay internet en el momento exacto de la captura, el punto se omite para evitar retrasos en el dashboard de producción, manteniendo siempre la telemetría en vivo como prioridad.
  - **CASO B (Falla del Servidor):** Si el celular **SÍ** tiene internet, pero la petición falla (ej. Error 500 del backend de PHP, o timeout del servidor), el paquete de GPS **se descarta**. Esto es crucial para prevenir un "Bucle de la Muerte" donde cachés gigantescos intentan enviarse infinitamente contra un servidor que ya está sufriendo problemas de sobrecarga.

## 🛠️ Componentes Técnicos y Archivos Clave

### 1. `src/services/driverService.js` (El Cerebro)
- **`startTracking(...)`**: Activa los 3 escudos de persistencia (Foreground, KeepAwake, PowerWakelock) e inicia la lectura GPS.
- **`_handleLocationUpdate(...)`**: Ensambla el JSON con telemetría rica (batería, velocidad, altitud, precisión).
- **`saveGpsPointsBatch(batch)`**: Envío por lote mediante capa nativa HTTP.
- **`_processOfflineQueue()`**: Reintento secuencial de puntos represados cuando no hay red.

### 2. `android/app/src/main/java/.../PowerPlugin.java`
Plugin Java desarrollado específicamente para interactuar con la API `android.os.PowerManager` y sostener el `PARTIAL_WAKE_LOCK`.

### 3. Base de Datos (`gps_tracking` en Backend PHP)
El JSON que se despacha cada 3 segundos y que procesa `guardar.php` incluye:
- `orden_servicio_id`, `empleado_id`, `vehiculo_id`
- `latitud`, `longitud`, `altitud`, `velocidad`, `precision_m`, `heading`
- `bateria_nivel`, `esta_cargando` (Telemetría de Hardware)
- `fecha_dispositivo` (Hora exacta de la captura, sin importar retrasos de red).
