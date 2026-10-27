# SisTransporte Conductores

Este proyecto es una aplicación Ionic desarrollada con JavaScript puro, sin el uso de frameworks como Angular, React o Vue. Utiliza componentes web de Ionic para construir la interfaz de usuario.

## Requisitos Previos

Asegúrate de tener instalado lo siguiente en tu máquina:

*   **Node.js y npm:** Puedes descargarlos desde [nodejs.org](https://nodejs.org/). Se recomienda usar la versión LTS.
*   **Ionic CLI:** La interfaz de línea de comandos de Ionic. Instálala globalmente usando npm:

    ```bash
    npm install -g @ionic/cli
    ```

## Configuración del Proyecto

1.  **Clonar el repositorio:**

    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd sistransporte-conductores
    ```

2.  **Instalar dependencias:**

    Aunque este proyecto no usa un `package.json` tradicional para dependencias de desarrollo, los componentes de Ionic se cargan directamente. Sin embargo, si en el futuro se añaden dependencias, este sería el paso:

    ```bash
    npm install
    ```

## Ejecución del Proyecto

Este proyecto utiliza [Vite](https://vitejs.dev/) como su servidor de desarrollo. Para ejecutar la aplicación en tu navegador, usa el siguiente comando:

```bash
npm run dev
```

Esto iniciará un servidor de desarrollo y abrirá la aplicación en tu navegador predeterminado. La aplicación estará disponible en `http://localhost:5173` (o un puerto similar, que Vite asigna por defecto).

## Estructura del Proyecto

*   `index.html`: El punto de entrada principal de la aplicación.
*   `src/`: Contiene el código fuente de la aplicación.
    *   `src/main.js`: Archivo principal de JavaScript que inicializa Ionic y carga las páginas.
    *   `src/styles.css`: Estilos globales de la aplicación.
    *   `src/pages/`: Contiene los componentes de las diferentes páginas de la aplicación (ej. `home.js`, `login.js`, `pendientes.js`, `show.js`).
    *   `src/pages/services-base.js`: Contiene lógica y utilidades compartidas para las páginas de servicios.

## Notas Adicionales

*   Este proyecto utiliza el enrutamiento basado en hash (`#/`) para la navegación entre páginas.
*   Los componentes de Ionic se importan y definen directamente en `main.js`.
