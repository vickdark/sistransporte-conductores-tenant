# Guía de Gestión de Entornos y Compilación (Vite + Capacitor)

Este documento explica cómo el proyecto maneja automáticamente las URLs de conexión para los entornos de **Pruebas** y **Producción**.

## 1. Archivos de Configuración (.env)

La app se conecta a la **API v1 del sistema nuevo** (multiempresa). Solo necesita la dirección del
**login central**: al ingresar, el servidor devuelve la dirección de la empresa del conductor y desde ahí
la app le habla directo a su empresa. Los archivos `.env` están en la raíz y no se suben al repositorio:

*   **`.env` (desarrollo)**: `npm run dev` o `npx vite build --mode development`.
    *   `VITE_CENTRAL_API_URL=https://sistema-transporte-tenant.test/api/v1/` (en un teléfono, usar una dirección que el teléfono alcance: IP de la red o un túnel https).
*   **`.env.production` (producción)**: `npm run build`.
    *   `VITE_CENTRAL_API_URL=https://transporte.mambacode.dev/api/v1/` (el dominio central de producción; cada empresa responde en `{empresa}.transporte.mambacode.dev` y la app la recibe al ingresar).

## 2. Variables Disponibles

*   `VITE_CENTRAL_API_URL`: API central de la plataforma (solo el login), terminada en `/api/v1/`.

El contrato de la API está en el sistema: `docs/API_APP_CONDUCTOR.md`. La empresa debe tener habilitada
la «App móvil del conductor» en el panel central.

## Estructura (Ionic Vue + TypeScript)

*   `src/api/`: cliente HTTP (token, dirección de la empresa, 401 → login), sesión y tipos de la API.
*   `src/services/gpsTracker.ts`: rastreo GPS en segundo plano (BackgroundGeolocation con su foreground service de ubicación, KeepAwake y `PowerPlugin.java`), con envío por lotes a `POST /gps/positions`.
*   `src/views/`: login, inicio, servicios, detalle, tanqueo, checklist y novedad.
*   `src/components/`, `src/composables/`, `src/utils/`: piezas compartidas.

`npm run typecheck` revisa los tipos; `npm run build` los revisa y compila.

## 3. Cómo Generar la APK según el Entorno

### Para Producción (Recomendado para conductores)
Este comando compilará la aplicación usando las URLs de producción definidas en `.env.production`.

```bash
# 1. Compilar los archivos web para producción
npm run build

# 2. Sincronizar los archivos con el proyecto Android
npx cap sync android

# 3. Abrir Android Studio para generar el APK/AAB
npx cap open android
```

### Para Pruebas (Testeo interno)
Si necesitas una APK que conecte al servidor de pruebas:

```bash
# 1. Compilar forzando el modo development (usa el archivo .env)
npx vite build --mode development

# 2. Sincronizar
npx cap sync android

# 3. Abrir Android Studio
npx cap open android
```

## 4. Notas Importantes

- **No editar URLs en el código**: Siempre que necesites cambiar una URL, hazlo en los archivos `.env` correspondientes.
- **Sincronización**: Siempre ejecuta `npx cap sync android` después de hacer un `build` para asegurar que los cambios web se reflejen en la aplicación nativa.
- **Seguridad**: Las variables que comienzan con `VITE_` son las únicas que se exponen al código del cliente.
