# Guía de Gestión de Entornos y Compilación (Vite + Capacitor)

Este documento explica cómo el proyecto maneja automáticamente las URLs de conexión para los entornos de **Pruebas** y **Producción**.

## 1. Archivos de Configuración (.env)

El proyecto utiliza archivos `.env` para centralizar las URLs de los servidores. Estos archivos se encuentran en la raíz del proyecto:

*   **`.env` (Entorno de Pruebas)**: Se utiliza por defecto durante el desarrollo local (`npm run dev`) o compilaciones de desarrollo.
    *   URL API: `https://test-transporteskemuel.mambacode.dev/api-transporte-kemuel/`
*   **`.env.production` (Entorno de Producción)**: Se utiliza automáticamente cuando ejecutas el comando de construcción para producción (`npm run build`).
    *   URL API: `https://transporteskemuel.mambacode.dev/api-transporte-kemuel/`

## 2. Variables Disponibles

En el código JavaScript, las variables se acceden mediante `import.meta.env`. Las variables configuradas son:

*   `VITE_API_BASE_URL`: URL base para todas las peticiones a la API.
*   `VITE_ASSETS_URL`: Ruta para recursos como logos e imágenes del servidor.
*   `VITE_BG_IMAGE_URL`: URL de la imagen de fondo para la pantalla de login.

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
