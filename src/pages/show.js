import { stateColor, formatDate } from './services-base.js';
import { alertController, toastController } from '@ionic/core/components';
import { authService } from '../services/authService.js';
import { driverService } from '../services/driverService.js';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

class PageShow extends HTMLElement {
  constructor() {
    super();
    this.serviceId = null;
    this.service = null;
    this.photoDataInicial = '';
    this.photoDataFinal = '';
  }

  async connectedCallback() {
    const menu = document.querySelector('ion-menu');
    if (menu) menu.disabled = false;

    if (!authService.isLoggedIn()) {
      window.location.pathname = '/login';
      return;
    }

    await this.render();
    this.setupActionHandlers();
    this.setupThemeHandler();

    // Si entramos al detalle y ya está en progreso, activamos el seguimiento centralizado
    if (this.service?.Estado === 'En Progreso') {
      this.initGpsTracking();
    }
  }

  initGpsTracking() {
    const user = authService.getUser();
    const driverId = user?.EmpleadoID || user?.id;
    const vehiculoId = this.service.VehiculoID || 0;
    
    driverService.startTracking(this.service.ID, driverId, vehiculoId);
  }

  disconnectedCallback() {}
  async render() {
    const pathParts = window.location.pathname.split('/');
    this.serviceId = parseInt(pathParts[pathParts.length - 1]);

    // Verificamos si podemos obtener el driverId
    const user = authService.getUser();
    const driverId = user?.EmpleadoID || user?.id;

    // Pantalla de Carga Premium
    this.innerHTML = `
      <ion-header class="ion-no-border">
        <ion-toolbar class="main-header">
          <ion-buttons slot="start">
             <ion-menu-button auto-hide="false"></ion-menu-button>
             <ion-back-button default-href="/home"></ion-back-button>
          </ion-buttons>
          <ion-title class="header-title">Detalle de Orden</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 40px;">
          <ion-spinner name="crescent" color="primary" style="width: 60px; height: 60px; margin-bottom: 20px;"></ion-spinner>
          <h2 style="font-weight: 800; color: var(--text-main);">Cargando información...</h2>
          <p style="color: var(--text-muted);">Estamos preparando los detalles de tu servicio.</p>
        </div>
      </ion-content>
    `;
    
    try {
      this.service = await driverService.getServiceById(driverId, this.serviceId);
      console.log('--- DETALLE DEL SERVICIO ---', this.service);
    } catch (error) {
      console.error('Error fetching service:', error);
      this.service = null;
    }
    
    if (!this.service) {
      this.innerHTML = `
        <ion-header class="ion-no-border">
          <ion-toolbar class="main-header">
            <ion-buttons slot="start">
              <ion-back-button default-href="/home"></ion-back-button>
            </ion-buttons>
            <ion-title class="header-title">No encontrado</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 40px;">
            <div style="background: rgba(var(--ion-color-danger-rgb), 0.1); width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
              <ion-icon name="alert-circle-outline" style="font-size: 50px; color: var(--ion-color-danger);"></ion-icon>
            </div>
            <h2 style="font-weight: 800; color: var(--text-main);">Servicio no encontrado</h2>
            <p style="color: var(--text-muted); max-width: 250px;">No pudimos localizar la orden informativa #${this.serviceId}.</p>
            <ion-button fill="outline" router-link="/home" class="ion-margin-top">Volver al inicio</ion-button>
          </div>
        </ion-content>
      `;
      return;
    }

    const estadoColor = stateColor[this.service.Estado] || '#6c757d';
    const isDark = document.body.classList.contains('dark');

    this.innerHTML = `
      <style>
        .show-content {
          --background: var(--ion-background-color);
        }
        .order-header-compact {
          background: ${estadoColor};
          padding: 24px 16px;
          color: white;
          border-bottom-left-radius: 24px;
          border-bottom-right-radius: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          text-align: center;
        }
        .status-badge {
          background: rgba(255,255,255,0.2);
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          display: inline-block;
          margin-bottom: 12px;
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }
        .order-id-title {
          font-size: 1.8rem;
          font-weight: 900;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .info-card-professional {
          background: var(--card-bg);
          border-radius: 20px;
          margin: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          overflow: hidden;
          border: 1px solid rgba(var(--ion-text-color-rgb, 0,0,0), 0.1);
        }
        body.dark .info-card-professional {
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          border-color: rgba(255,255,255,0.05);
        }
        .info-row {
          display: flex;
          border-bottom: 1px solid rgba(var(--ion-text-color-rgb, 0,0,0), 0.08);
        }
        .info-row:last-child { border-bottom: none; }
        .info-box {
          flex: 1;
          padding: 16px;
          border-right: 1px solid rgba(var(--ion-text-color-rgb, 0,0,0), 0.08);
        }
        .info-box:last-child { border-right: none; }
        .info-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 800;
          display: block;
          margin-bottom: 4px;
          letter-spacing: 0.5px;
        }
        .info-value {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .action-panel {
          padding: 0 16px 80px 16px;
        }
        .camera-box-compact {
          width: 100%;
          aspect-ratio: 4/3;
          background: #000;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          margin-bottom: 16px;
          border: 3px solid ${estadoColor};
        }
        .big-action-btn {
          height: 62px;
          --border-radius: 20px;
          font-weight: 800;
          font-size: 1.15rem;
          margin: 16px 0;
          --box-shadow: 0 8px 20px rgba(0,0,0,0.15);
          transition: all 0.2s ease-in-out;
          text-transform: none;
        }
        .big-action-btn:active { transform: scale(0.96); }
        .btn-camera-premium {
          --background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          --color: #003366;
        }
        .btn-success-premium {
          --background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%);
          --color: white;
        }
        .btn-success-premium[disabled] {
          --background: #cbd5e1;
          --color: #94a3b8;
          opacity: 0.5;
        }
        body.dark .btn-success-premium[disabled] {
          --background: #334155;
          --color: #64748b;
        }
        .btn-support-premium {
          --color: #ff9f43;
          --border-color: #ff9f43;
          font-weight: 800;
          margin-top: 20px;
        }
        .btn-photo-success {
          --background: linear-gradient(135deg, #1d976c 0%, #93f9b9 100%);
          --color: #004d40;
        }
        .action-container {
          background: var(--card-bg);
          border-radius: 28px;
          padding: 24px 20px;
          margin: 20px 0;
          box-shadow: 0 10px 40px rgba(0,0,0,0.08);
          border: 1px solid rgba(var(--ion-text-color-rgb), 0.1);
        }
        body.dark .action-container {
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          border-color: rgba(255,255,255,0.05);
        }
        .description-p {
          padding: 16px;
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-main);
          background: rgba(var(--ion-text-color-rgb), 0.05);
          margin: 0 16px 24px 16px;
          border-radius: 16px;
          border-left: 6px solid ${estadoColor};
        }
        body.dark .description-p {
          background: rgba(255,255,255,0.03);
          color: #e2e8f0;
        }
        ion-input {
          --background: rgba(var(--ion-text-color-rgb), 0.05);
          --color: var(--text-main);
          border: 2px solid rgba(var(--ion-color-primary-rgb), 0.3);
          border-radius: 16px;
          padding: 12px 20px !important;
          font-weight: 800;
          font-size: 1.5rem;
          margin-top: 10px;
        }
        body.dark ion-input {
          --background: rgba(0,0,0,0.3);
          border-color: rgba(255,255,255,0.1);
        }
        .header-btn-circle {
          --border-radius: 50%;
          width: 44px;
          height: 44px;
          --background: rgba(var(--ion-text-color-rgb), 0.08);
          --color: var(--text-main);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .show-content {
          --background: var(--app-bg);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Estilos para que el Toast sea Premium y esté al frente */
        ion-toast {
          --background: #2dd36f;
          --box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          --border-radius: 12px;
          --button-color: #fff;
          font-weight: 700;
          z-index: 99999 !important;
        }
        ion-toast.toast-error {
          --background: #eb445a;
        }
        /* Estilo para la Alerta de Éxito Premium */
        .premium-success-alert .alert-head {
          border-bottom: 2px solid #2dd36f;
          padding-bottom: 15px;
        }
        .premium-success-alert .alert-title {
          color: #2dd36f;
          font-weight: 800;
          font-size: 1.3rem;
        }
        .premium-success-alert .alert-button {
          background: #2dd36f !important;
          color: white !important;
          border-radius: 8px;
          font-weight: 700;
          margin: 10px;
        }
        .gps-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #2dd36f;
          font-weight: 800;
          font-size: 0.75rem;
          margin-top: 10px;
          animation: fadeIn 0.5s ease;
        }
        .gps-dot {
          width: 8px;
          height: 8px;
          background: #2dd36f;
          border-radius: 50%;
          box-shadow: 0 0 8px #2dd36f;
          animation: pulse-gps 1.5s infinite;
        }
        @keyframes pulse-gps {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      </style>

      <ion-header class="ion-no-border">
        <ion-toolbar class="main-header">
          <ion-buttons slot="start">
             <ion-menu-button auto-hide="false"></ion-menu-button>
             <ion-back-button default-href="/home"></ion-back-button>
          </ion-buttons>
          <ion-title class="header-title">Orden #${this.service.ID}</ion-title>
          <ion-buttons slot="end">
            <ion-button id="theme-toggle" class="header-btn-circle">
              <ion-icon name="${isDark ? 'sunny-outline' : 'moon-outline'}" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="show-content">
        <div class="order-header-compact">
          <div class="status-badge">${this.service.Estado}</div>
          <h1 class="order-id-title">Orden #${this.service.ID}</h1>
          <div style="font-size: 0.85rem; opacity: 0.9; margin-top: 4px; font-weight: 600;">
            ${formatDate(this.service.FechaInicio)}
          </div>
          ${this.service.Estado === 'En Progreso' ? `
            <div class="gps-indicator" style="animation: fadeIn 0.5s ease;">
              <div class="gps-dot"></div> 
              TRANSMITIENDO GPS EN TIEMPO REAL
            </div>
          ` : ''}
        </div>

        <div class="info-card-professional">
          <div class="info-row">
            <div class="info-box">
              <span class="info-label">Cliente</span>
              <span class="info-value">${this.service.ClienteNombre}</span>
            </div>
            <div class="info-box">
              <span class="info-label">Pasajeros</span>
              <span class="info-value">${this.service.cantidad_pasajeros}</span>
            </div>
          </div>
          <div class="info-row">
            <div class="info-box">
              <span class="info-label">Vehículo</span>
              <span class="info-value" style="font-family: monospace; letter-spacing: 1px;">${this.service.PlacaVehiculo}</span>
            </div>
            <div class="info-box">
              <span class="info-label">Ruta</span>
              <span class="info-value">${this.service.Ruta}</span>
            </div>
          </div>
          ${(this.service.Estado === 'En Progreso' || this.service.Estado === 'Completado') ? `
          <div class="info-row">
            <div class="info-box">
              <span class="info-label">Inicio Real</span>
              <span class="info-value">${formatDate(this.service.inicio)}</span>
            </div>
            ${(this.service.Estado === 'Completado') ? `
            <div class="info-box">
              <span class="info-label">Final Real</span>
              <span class="info-value">${formatDate(this.service.fin)}</span>
            </div>
            ` : ''}
          </div>
          ` : ''}
        </div>

        <div class="description-p">
          <strong>Observaciones:</strong><br>
          ${this.service.Descripcion || 'Sin observaciones.'}
        </div>

        ${(this.service.Estado === 'Pendiente' || this.service.Estado === 'En Progreso' || this.service.Estado === 'Apoyo') ? `
        <div class="action-panel">
          <div class="action-container">
            <h5 style="font-weight: 800; margin: 0 0 20px 0; color: var(--text-main); font-size: 1.1rem; display: flex; align-items: center;">
              <ion-icon name="options-outline" style="margin-right: 8px; color: var(--ion-color-primary);"></ion-icon>
              Panel de Operación
            </h5>
            
            ${(this.service.Estado === 'Pendiente' || this.service.Estado === 'Apoyo') ? `
            <div style="margin-bottom: 24px;">
              <ion-label style="font-size: 0.85rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-left: 4px;">Kilometraje Inicial *</ion-label>
              <ion-input type="number" id="kilometraje_inicial" placeholder="000,000" mode="md"></ion-input>
            </div>

            <div id="preview-container-inicial" style="display:none; margin-bottom: 15px; animation: fadeIn 0.4s ease;">
              <div style="position: relative;">
                <img id="photo-preview-inicial" style="width: 100%; border-radius: 16px; border: 3px solid #3880ff; box-shadow: 0 8px 16px rgba(0,0,0,0.15);">
                <div style="position: absolute; top: 10px; right: 10px; background: #3880ff; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 800;">FOTO CAPTURADA</div>
              </div>
            </div>

            <ion-button expand="block" id="capture-btn-inicial" class="big-action-btn btn-camera-premium">
              <ion-icon slot="start" name="camera"></ion-icon>
              Capturar Kilometraje
            </ion-button>
            
            <input type="hidden" id="foto_kilometraje_inicial">

            <ion-button expand="block" id="iniciar-btn" disabled="true" class="big-action-btn btn-success-premium">
              <ion-icon slot="start" name="play"></ion-icon>
              Iniciar Servicio Ahora
            </ion-button>
          ` : ''}

          ${(this.service.Estado === 'En Progreso') ? `
            <div style="margin-bottom: 24px;">
              <ion-label style="font-size: 0.85rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-left: 4px;">Kilometraje Final *</ion-label>
              <ion-input type="number" id="kilometraje_final" placeholder="000,000" mode="md"></ion-input>
            </div>

            <div id="preview-container-final" style="display:none; margin-bottom: 15px; animation: fadeIn 0.4s ease;">
              <div style="position: relative;">
                <img id="photo-preview-final" style="width: 100%; border-radius: 16px; border: 3px solid #3880ff; box-shadow: 0 8px 16px rgba(0,0,0,0.15);">
                <div style="position: absolute; top: 10px; right: 10px; background: #3880ff; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 800;">FOTO CAPTURADA</div>
              </div>
            </div>

            <ion-button expand="block" id="capture-btn-final" class="big-action-btn btn-camera-premium">
              <ion-icon slot="start" name="camera"></ion-icon>
              Capturar Kilometraje
            </ion-button>

            <input type="hidden" id="foto_kilometraje_final">

            <ion-button expand="block" id="completar-btn" disabled="true" class="big-action-btn btn-success-premium">
              <ion-icon slot="start" name="checkmark-done"></ion-icon>
              Finalizar Servicio
            </ion-button>

            <div style="height: 1px; background: rgba(var(--ion-text-color-rgb), 0.1); margin: 20px 0;"></div>

            <ion-button expand="block" id="solicitar-apoyo-btn" fill="clear" class="btn-support-premium">
              <ion-icon slot="start" name="help-buoy"></ion-icon>
              ¿Necesitas Apoyo Técnico?
            </ion-button>
          ` : ''}
          </div>
        </div>
        ` : ''}
        <div class="scroll-spacer"></div>
      </ion-content>
    `;
  }

  setupActionHandlers() {
    if (!this.service) return;

    const validateForm = (kmId, photoId, btnId) => {
      const km = this.querySelector(`#${kmId}`)?.value;
      const ph = this.querySelector(`#${photoId}`)?.value;
      const btn = this.querySelector(`#${btnId}`);
      if (btn) {
        if (km && km.trim() !== '' && ph && ph !== '') btn.disabled = false;
        else btn.disabled = true;
      }
    };

    // Handler para Captura de Foto (Nativa)
    const setupCapture = (btnId, photoId, previewContId, previewImgId, kmId, mainBtnId) => {
      const btn = this.querySelector(`#${btnId}`);
      if (btn) {
        btn.onclick = async () => {
          try {
            // Verificar y solicitar permisos de cámara
            const checkCameraPermission = async () => {
              const status = await Camera.checkPermissions();
              if (status.camera !== 'granted') {
                const request = await Camera.requestPermissions();
                if (request.camera !== 'granted') {
                  alert('Se requiere el permiso de cámara para capturar el kilometraje.');
                  return false;
                }
              }
              return true;
            };

            const hasPermission = await checkCameraPermission();
            if (!hasPermission) return;

            const image = await Camera.getPhoto({
              quality: 50, // Calidad optimizada para evitar que el servidor rechace el peso
              allowEditing: false,
              resultType: CameraResultType.Base64,
              source: CameraSource.Camera,
            });

            const base64Data = image.base64String;
            const fullBase64 = `data:image/${image.format};base64,${base64Data}`;

            const photoInput = this.querySelector(`#${photoId}`);
            if (photoInput) photoInput.value = fullBase64; // Guardamos con prefijo
            
            const previewImg = this.querySelector(`#${previewImgId}`);
            if (previewImg) previewImg.src = fullBase64;
            
            const previewCont = this.querySelector(`#${previewContId}`);
            if (previewCont) previewCont.style.display = 'block';
            
            btn.innerHTML = '<ion-icon slot="start" name="checkmark-circle"></ion-icon> Cambiar Foto';
            btn.classList.add('btn-photo-success');
            
            validateForm(kmId, photoId, mainBtnId);
          } catch (error) {
            console.warn('Camera cancelled or failed', error);
          }
        };
      }

      const kmInput = this.querySelector(`#${kmId}`);
      if (kmInput) {
        kmInput.addEventListener('ionInput', () => validateForm(kmId, photoId, mainBtnId));
      }
    };

    if (this.service.Estado === 'Pendiente' || this.service.Estado === 'Apoyo') {
      setupCapture('capture-btn-inicial', 'foto_kilometraje_inicial', 'preview-container-inicial', 'photo-preview-inicial', 'kilometraje_inicial', 'iniciar-btn');
      
      this.querySelector('#iniciar-btn')?.addEventListener('click', async () => {
        const km = this.querySelector('#kilometraje_inicial').value;
        const alert = await alertController.create({
          header: 'Iniciar Servicio',
          message: `¿Confirmas el inicio con KM ${km}?`,
          buttons: [
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Iniciar', handler: () => {
                this.executeAction('iniciar', { kilometraje: km, foto: this.querySelector('#foto_kilometraje_inicial').value });
            }}
          ]
        });
        await alert.present();
      });
    }

    if (this.service.Estado === 'En Progreso') {
      setupCapture('capture-btn-final', 'foto_kilometraje_final', 'preview-container-final', 'photo-preview-final', 'kilometraje_final', 'completar-btn');

      this.querySelector('#completar-btn')?.addEventListener('click', async () => {
        const km = this.querySelector('#kilometraje_final').value;
        const alert = await alertController.create({
          header: 'Finalizar Servicio',
          message: `¿Confirmas el fin con KM ${km}?`,
          buttons: [
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Finalizar', handler: () => {
                this.executeAction('completar', { kilometraje: km, foto: this.querySelector('#foto_kilometraje_final').value });
            }}
          ]
        });
        await alert.present();
      });

      this.querySelector('#solicitar-apoyo-btn')?.addEventListener('click', async () => {
        const alert = await alertController.create({
          header: 'Solicitar Apoyo',
          message: '¿Necesitas reportar una novedad técnica?',
          buttons: [
            { text: 'No', role: 'cancel' },
            { text: 'Sí, Solicitar', handler: () => { 
                this.executeAction('apoyo'); 
            }}
          ]
        });
        await alert.present();
      });
    }
  }

  async executeAction(action, data) {
    const user = authService.getUser();
    const payload = {
      id_servicio: this.service.ID,
      empleado_id: user?.EmpleadoID || user?.id,
      empleado_nombre: user?.nombre || user?.usuario || 'CONDUCTOR',
      nuevo_estado: ''
    };

    // Mapeo de estados según el API PHP
    if (action === 'iniciar') {
      payload.nuevo_estado = 'En Progreso';
      payload.kilometraje_inicial = data.kilometraje;
      payload.foto_kilometraje_inicial = data.foto;
    } else if (action === 'completar') {
      payload.nuevo_estado = 'Completado';
      payload.kilometraje_final = data.kilometraje;
      payload.foto_kilometraje_final = data.foto;
    } else if (action === 'apoyo') {
      payload.nuevo_estado = 'Apoyo';
    }

    // Obtener ubicación GPS actual en el momento de la acción
    try {
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
      payload.latitud = position.coords.latitude;
      payload.longitud = position.coords.longitude;
    } catch (gpsError) {
      console.warn('No se pudo obtener la ubicación GPS, continuando sin ella:', gpsError);
      payload.latitud = null;
      payload.longitud = null;
    }

    const loading = document.createElement('ion-loading');
    loading.message = 'Sincronizando con el servidor...';
    document.body.appendChild(loading);
    await loading.present();

    try {
      console.log('Enviando Payload al Servidor:', payload);
      const result = await driverService.updateServiceStatus(payload);
      loading.dismiss();

      if (result && result.success) {
        // Manejo de tracking según la acción (ahora centralizado en driverService)
        if (action === 'iniciar') {
          this.initGpsTracking();
        } else if (action === 'completar') {
          await driverService.stopTracking();
        }

        const alert = await alertController.create({
          header: '¡Operación Exitosa!',
          subHeader: result.message || 'El estado se actualizó correctamente',
          message: 'Los datos han sido sincronizados con el centro de control.',
          cssClass: 'premium-success-alert',
          buttons: [
            {
              text: 'OK',
              handler: () => {
                const router = document.querySelector('ion-router');
                if (router) {
                  router.push('/home');
                } else {
                  window.location.pathname = '/home';
                }
              }
            }
          ]
        });
        await alert.present();
      } else {
        throw new Error(result?.error || result?.message || 'La respuesta del servidor no fue exitosa');
      }
    } catch (e) {
      if (loading) loading.dismiss();
      console.error('Error detallado en executeAction:', e);
      const alert = await alertController.create({
        header: 'Problema con la Operación',
        message: e.message || 'Ocurrió un error inesperado al conectar con el servidor.',
        buttons: ['Entendido']
      });
      await alert.present();
    }
  }

  setupThemeHandler() {
    const themeToggle = this.querySelector('#theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        const iconName = isDark ? 'sunny-outline' : 'moon-outline';
        themeToggle.querySelector('ion-icon').setAttribute('name', iconName);
      });
    }
  }
}

customElements.define('page-show', PageShow);
