# SisTransporte Conductores

App móvil (Android) de los conductores de SisTransporte. Con ella el conductor:

- Ve sus servicios por estado: pendientes, en curso, completados, cancelados y de apoyo.
- Inicia y finaliza cada servicio con el kilometraje y una foto del tablero, y pide apoyo si lo necesita.
- Transmite su ubicación por GPS mientras tiene un servicio en curso, incluso con la app en segundo plano.
- Registra el checklist preoperacional, los tanqueos y las novedades.

La app sirve a todas las empresas de la plataforma. El conductor ingresa en el login central y la app
trabaja con la API de su empresa. La empresa debe tener habilitada la «App móvil del conductor» en el
panel central.

Hecha con **Ionic Vue 8 + TypeScript + Vite + Capacitor 8**. El diseño replica el del portal web
(`sistema-transporte-tenant`): neutros, bordes finos, Instrument Sans y color solo en los estados.

## Requisitos

- Node.js (LTS) y npm.
- Android Studio, para compilar la APK.
- El sistema web (`sistema-transporte-tenant`) corriendo, para probar contra su API.

## Primeros pasos

```bash
npm ci                 # instala exactamente las versiones de package-lock.json
```

Crea `.env` en la raíz con la dirección de la API central:

```env
VITE_CENTRAL_API_URL=https://sistema-transporte-tenant.test/api/v1/
```

[GUIA_ENTORNOS.md](GUIA_ENTORNOS.md) explica `.env`, `.env.production` y cómo apuntar a pruebas o a producción.

> Usa `npm ci` y no `npm update`: `npm update` sube versiones y puede descuadrar binarios como esbuild.
> Si `npm ci` falla con `EBUSY`, detén primero el servidor de Vite que esté corriendo.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en el navegador (cámara y GPS limitados). |
| `npm run typecheck` | Revisa los tipos con `vue-tsc`. |
| `npm run build` | Revisa los tipos y compila a `dist/` con `.env.production`. |
| `npx vite build --mode development` | Compila con `.env` (APK de pruebas). |
| `npx cap sync android` | Copia `dist/` y los plugins al proyecto Android. |
| `npx cap open android` | Abre Android Studio para generar la APK o el AAB. |

Para generar la APK, haz el build, luego `npx cap sync android` y genera la APK en Android Studio.
Los pasos completos por entorno están en [GUIA_ENTORNOS.md](GUIA_ENTORNOS.md).

## Estructura

```
src/
  api/          Cliente HTTP (token, dirección de la empresa, 401 → login), sesión, tipos y llamadas
  views/        Pantallas: login, inicio, servicios, detalle, tanqueo, checklist y novedad
  components/   Encabezado, tarjeta de servicio, campo de foto, buscador de placas…
  composables/  Cámara (solo cámara, sin galería), logo de la empresa y tema claro/oscuro
  services/     gpsTracker.ts: rastreo GPS en segundo plano y envío por lotes
  router/       Rutas; sin sesión, solo el login
  utils/        Formatos de fecha, km y nombres de los estados
  styles.css    Tokens de color del portal y estilos de los componentes de Ionic
android/        Proyecto nativo de Capacitor (incluye PowerPlugin.java)
```

## Notas

- **Fotos:** las fotos se toman solo con la cámara del teléfono, sin galería ni archivos, porque el
  servidor solo acepta fotos tomadas en el momento.
- **GPS:** el rastreo arranca al iniciar un servicio y se detiene al finalizarlo o al cerrar sesión.
  Sigue con la pantalla apagada o la app en segundo plano, pero **se detiene si el conductor cierra la
  app** (la desliza de recientes). Al abrirla de nuevo (también tras reiniciar el teléfono) se retoma
  sola. Con un servicio en curso, el botón «atrás» minimiza la app en vez de cerrarla. Los detalles
  están en [DOCUMENTACION_GPS.md](DOCUMENTACION_GPS.md).
- **Tema:** el modo claro u oscuro se cambia con el botón del encabezado y se recuerda en el teléfono.
- **API:** el contrato está en el sistema web, en `docs/API_APP_CONDUCTOR.md`.
