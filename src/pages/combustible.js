import { authService } from '../services/authService.js';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { alertController, toastController } from '@ionic/core/components';
import { fuelService } from '../services/fuelService.js';
import { checklistService } from '../services/checklistService.js';

class PageCombustible extends HTMLElement {
  constructor() {
    super();
    this.photoOdometro = '';
    this.photoRecibo = '';
    this.user = authService.getUser();
    this.vehiculo_id = '';
    this.searchTimer = null;

    // Definir límites basados en el esquema de la base de datos
    this.MAX_CANTIDAD_COMBUSTIBLE = 99.99; // decimal(14,12) - ajustado a 2 decimales para input de usuario
    this.MAX_COSTO = 99999999.99; // decimal(10,2)
    this.MAX_KILOMETRAJE = 99999999.99; // decimal(10,2)
  }

  async connectedCallback() {
    if (!authService.isLoggedIn()) {
      window.location.pathname = '/login';
      return;
    }

    this.innerHTML = `
      <ion-header class="ion-no-border">
        <ion-toolbar class="main-header">
          <ion-buttons slot="start">
            <ion-menu-button auto-hide="false"></ion-menu-button>
            <ion-back-button default-href="/home"></ion-back-button>
          </ion-buttons>
          <ion-title class="header-title">Recargas Combustible</ion-title>
          <ion-buttons slot="end">
            <ion-button id="theme-toggle" class="theme-toggle-btn">
              <ion-icon name="${document.body.classList.contains('dark') ? 'sunny-outline' : 'moon-outline'}" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <div class="form-container">
          <div class="header-card">
            <h2 style="margin:0 0 16px 0; font-size: 1.2em; font-weight: 700;">Datos del Vehículo</h2>
            <div class="vehicle-search-wrapper" style="position:relative; overflow:visible;">
               <ion-label style="font-size: 0.8em; font-weight: 700; color: var(--text-muted, #666);">PLACA *</ion-label>
               <ion-input id="input-vehiculo" placeholder="ABCD12" mode="md" 
                  style="background: rgba(var(--ion-text-color-rgb, 0,0,0), 0.05); border-radius: 10px; padding: 12px; font-weight: 600;"
                  autocapitalize="characters"></ion-input>
               <div id="results-vehiculo" class="search-results-container"></div>
            </div>
          </div>
          <ion-list lines="full" class="ion-no-margin ion-no-padding">
            <ion-item>
              <ion-label position="stacked">Cantidad (Galones) <span class="required">*</span></ion-label>
              <ion-input type="number" placeholder="Ej: 50.5" id="cantidad_galones"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Costo Total <span class="required">*</span></ion-label>
              <ion-input type="number" placeholder="Ej: 47.98" readonly id="costo_total"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Kilometraje Actual <span class="required">*</span></ion-label>
              <ion-input type="number" placeholder="Ej: 123456" id="kilometraje_actual"></ion-input>
            </ion-item>
          </ion-list>

          <div class="photo-section">
            <ion-label class="photo-section-title">Foto del Odómetro <span class="required">*</span></ion-label>
            <div id="preview-container-odometro" class="photo-preview-container" style="display:none;">
              <div class="photo-wrapper">
                <img id="photo-preview-odometro" class="photo-preview">
                <div class="photo-tag">FOTO CAPTURADA</div>
              </div>
            </div>
            <ion-button expand="block" id="capture-btn-odometro" class="big-action-btn btn-camera-premium">
              <ion-icon slot="start" name="camera"></ion-icon>
              Capturar Foto Odómetro
            </ion-button>
            <input type="hidden" id="foto_odometro">
          </div>

          <div class="photo-section">
            <ion-label class="photo-section-title">Foto del Recibo <span class="required">*</span></ion-label>
            <div id="preview-container-recibo" class="photo-preview-container" style="display:none;">
              <div class="photo-wrapper">
                <img id="photo-preview-recibo" class="photo-preview">
                <div class="photo-tag">FOTO CAPTURADA</div>
              </div>
            </div>
            <ion-button expand="block" id="capture-btn-recibo" class="big-action-btn btn-camera-premium">
              <ion-icon slot="start" name="camera"></ion-icon>
              Capturar Foto Recibo
            </ion-button>
            <input type="hidden" id="foto_recibo">
          </div>

          <ion-button expand="block" id="save-fuel-btn" class="big-action-btn btn-success-premium ion-margin-top" disabled="true">
            <ion-icon slot="start" name="save-outline"></ion-icon>
            Guardar Recarga
          </ion-button>
        </div>

        <style>
          .main-header {
            --background: var(--ion-background-color);
            --color: var(--text-main);
          }
          .header-title {
            font-weight: 800 !important;
            letter-spacing: -0.5px;
          }
          .form-container {
            background: var(--card-bg);
            border-radius: 28px;
            padding: 24px 20px;
            margin: 20px 0;
            box-shadow: 0 10px 40px rgba(0,0,0,0.08);
            border: 1px solid rgba(var(--ion-text-color-rgb), 0.1);
          }
          body.dark .form-container {
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            border-color: rgba(255,255,255,0.05);
          }
          .required {
            color: var(--ion-color-danger);
            margin-left: 4px;
          }
          ion-item {
            --background: transparent;
            --border-color: rgba(var(--ion-text-color-rgb), 0.1);
            --highlight-color-focused: transparent;
            --highlight-color-valid: transparent;
            --highlight-color-invalid: transparent;
            --padding-start: 0;
            --inner-padding-end: 0;
          }
          ion-label {
            font-weight: 600;
            color: var(--text-main);
            margin-bottom: 8px;
          }
          ion-input, ion-select {
            --background: var(--ion-color-light);
            --padding-start: 12px;
            --padding-end: 12px;
            --padding-top: 10px;
            --padding-bottom: 10px;
            border-radius: 12px;
            margin-top: 8px;
            color: var(--text-main);
          }
          body.dark ion-input, body.dark ion-select {
            --background: var(--ion-color-step-150);
          }
          .photo-section {
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid rgba(var(--ion-text-color-rgb), 0.1);
          }
          .photo-section-title {
            display: block;
            margin-bottom: 15px;
            font-size: 1rem;
            font-weight: 700;
            color: var(--text-main);
          }
          .photo-preview-container {
            margin-bottom: 15px;
            animation: fadeIn 0.4s ease;
          }
          .photo-wrapper {
            position: relative;
          }
          .photo-preview {
            width: 100%;
            border-radius: 16px;
            border: 3px solid var(--ion-color-primary);
            box-shadow: 0 8px 16px rgba(0,0,0,0.15);
          }
          .photo-tag {
            position: absolute;
            top: 10px;
            right: 10px;
            background: var(--ion-color-primary);
            color: white;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 800;
          }
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
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .search-results-container {
            position: absolute;
            z-index: 9999;
            background: var(--ion-card-background, var(--card-bg));
            width: 100%;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.25);
            max-height: 250px;
            overflow-y: auto;
            display: none;
            top: 100%;
            left: 0;
            border: 1px solid rgba(var(--ion-text-color-rgb, 0,0,0), 0.1);
          }
          .search-result-item {
            padding: 14px 16px;
            border-bottom: 1px solid rgba(var(--ion-text-color-rgb, 0,0,0), 0.05);
            cursor: pointer;
            color: var(--text-main);
          }
        </style>
      </ion-content>
    `;

    this.setupThemeHandler();
    this.setupActionHandlers();
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

  setupActionHandlers() {
    const formFields = {
      cantidadGalones: this.querySelector('#cantidad_galones'),
      costoTotal: this.querySelector('#costo_total'),
      kilometrajeActual: this.querySelector('#kilometraje_actual'),
      fotoOdometroInput: this.querySelector('#foto_odometro'),
      fotoReciboInput: this.querySelector('#foto_recibo'),
      inputVehiculo: this.querySelector('#input-vehiculo'),
    };

    const saveButton = this.querySelector('#save-fuel-btn');

    const validateForm = () => {
      const allFieldsFilled = Object.values(formFields).every(field => {
        return field.value && field.value.trim() !== '';
      }) && this.vehiculo_id !== ''; // Validate vehiculo_id
      saveButton.disabled = !allFieldsFilled;
    };

    // Add event listeners for all form fields to validate on change
    Object.values(formFields).forEach(field => {
      field.addEventListener('ionInput', validateForm);
    });

    // Camera setup
    const setupCapture = (btnId, photoInputId, previewContId, previewImgId, photoDataProp) => {
      const btn = this.querySelector(`#${btnId}`);
      if (btn) {
        btn.onclick = async () => {
          try {
            const checkCameraPermission = async () => {
              const status = await Camera.checkPermissions();
              if (status.camera !== 'granted') {
                const request = await Camera.requestPermissions();
                if (request.camera !== 'granted') {
                  const alert = await alertController.create({
                    header: 'Permiso Requerido',
                    message: 'Se requiere el permiso de cámara para capturar la foto.',
                    buttons: ['OK'],
                  });
                  await alert.present();
                  return false;
                }
              }
              return true;
            };

            const hasPermission = await checkCameraPermission();
            if (!hasPermission) return;

            const image = await Camera.getPhoto({
              quality: 70,
              allowEditing: false,
              resultType: CameraResultType.Base64,
              source: CameraSource.Camera,
            });

            const base64Data = image.base64String;
            const fullBase64 = `data:image/${image.format};base64,${base64Data}`;

            const photoInput = this.querySelector(`#${photoInputId}`);
            if (photoInput) photoInput.value = fullBase64;
            this[photoDataProp] = fullBase64; // Store in class property

            const previewImg = this.querySelector(`#${previewImgId}`);
            if (previewImg) previewImg.src = fullBase64;
            
            const previewCont = this.querySelector(`#${previewContId}`);
            if (previewCont) previewCont.style.display = 'block';
            
            btn.innerHTML = '<ion-icon slot="start" name="checkmark-circle"></ion-icon> Cambiar Foto';
            btn.classList.add('btn-photo-success');
            
            validateForm();
          } catch (error) {
            console.warn('Camera cancelled or failed', error);
            let errorMessage = 'Captura de foto cancelada o fallida.';
            if (error.message && error.message.includes('User cancelled photos app')) {
              errorMessage = 'Captura de foto cancelada por el usuario.';
            } else if (error.message && error.message.includes('No image selected')) {
              errorMessage = 'No se seleccionó ninguna imagen.';
            }
            const toast = await toastController.create({
              message: errorMessage,
              duration: 2000,
              color: 'danger',
            });
            await toast.present();
          }
        };
      }
    };

    setupCapture('capture-btn-odometro', 'foto_odometro', 'preview-container-odometro', 'photo-preview-odometro', 'photoOdometro');
    setupCapture('capture-btn-recibo', 'foto_recibo', 'preview-container-recibo', 'photo-preview-recibo', 'photoRecibo');

    // Vehicle search setup
    const vInput = this.querySelector('#input-vehiculo');
    const resultsContainer = this.querySelector('#results-vehiculo');
    vInput.addEventListener('ionInput', (e) => {
      const term = (e.detail.value || '').toUpperCase();
      vInput.value = term;
      if (term.length < 1) { 
        resultsContainer.style.display = 'none'; 
        this.vehiculo_id = ''; // Clear vehiculo_id if search term is empty
        validateForm();
        return; 
      }
      this.handleSearch(term);
    });

    // Save button handler
    saveButton.addEventListener('click', async () => {
      if (saveButton.disabled) {
        const toast = await toastController.create({
          message: 'Por favor, completa todos los campos requeridos y captura las fotos.',
          duration: 3000,
          color: 'warning',
        });
        await toast.present();
        return;
      }

      const cantidadGalones = parseFloat(formFields.cantidadGalones.value);
      const costoTotal = parseFloat(formFields.costoTotal.value);
      const kilometrajeActual = parseFloat(formFields.kilometrajeActual.value);

      // Validaciones de rango
      if (isNaN(cantidadGalones) || cantidadGalones <= 0 || cantidadGalones > this.MAX_CANTIDAD_COMBUSTIBLE) {
        this.showAlert('Error de Validación', `La cantidad de galones debe ser un número positivo y no exceder ${this.MAX_CANTIDAD_COMBUSTIBLE}.`);
        return;
      }
      if (isNaN(costoTotal) || costoTotal <= 0 || costoTotal > this.MAX_COSTO) {
        this.showAlert('Error de Validación', `El costo total debe ser un número positivo y no exceder ${this.MAX_COSTO}.`);
        return;
      }
      if (isNaN(kilometrajeActual) || kilometrajeActual < 0 || kilometrajeActual > this.MAX_KILOMETRAJE) {
        this.showAlert('Error de Validación', `El kilometraje actual debe ser un número válido y no exceder ${this.MAX_KILOMETRAJE}.`);
        return;
      }

      const fuelData = {
        galones: cantidadGalones,
        valor: costoTotal,
        kilometraje: kilometrajeActual,
        placa_id: this.vehiculo_id, // Use selected vehiculo_id
        empleado_id: this.user?.EmpleadoID || this.user?.id,
        empleado_nombre: this.user?.nombre || this.user?.usuario || 'Desconocido',
        foto_kilometraje: this.photoOdometro,
        foto_comprobante: this.photoRecibo,
      };

      try {
        const result = await fuelService.saveFuelEntry(fuelData);
        if (result.success) { // La API devuelve 'success' en lugar de 'status'
          const alert = await alertController.create({
            header: '¡Éxito!',
            message: 'Recarga de combustible guardada correctamente.',
            buttons: [{
              text: 'Entendido',
              handler: () => { window.location.pathname = '/home'; }
            }],
          });
          await alert.present();
          this.resetForm();
        } else {
          const toast = await toastController.create({
            message: result.error || 'Error al guardar la recarga de combustible.',
            duration: 3000,
            color: 'danger',
          });
          await toast.present();
        }
      } catch (error) {
        console.error('Error al guardar la recarga:', error);
        const toast = await toastController.create({
          message: 'Error de conexión o del servidor al guardar la recarga.',
          duration: 3000,
          color: 'danger',
        });
        await toast.present();
      }
    });
  }

  async handleSearch(term) {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(async () => {
      const container = this.querySelector('#results-vehiculo');
      container.innerHTML = '<div style="text-align:center; padding:10px;"><ion-spinner name="dots"></ion-spinner></div>';
      container.style.display = 'block';
      try {
        const results = await checklistService.searchVehiculos(term);
        this.renderResults(results);
      } catch (err) { container.innerHTML = '<div style="text-align:center; padding:10px; color:red;">Error</div>'; }
    }, 400);
  }

  renderResults(results) {
    const container = this.querySelector('#results-vehiculo');
    if (!results || results.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:10px;">Nada encontrado</div>';
      container.style.display = 'block';
      return;
    }

    container.innerHTML = results.map(item => `
      <div class="search-result-item" data-id="${item.id}" data-placa="${item.placa}" data-valido="${item.valido}" style="border-bottom:1px solid #eee; padding:10px;">
        <div style="font-weight: 700; color: var(--ion-color-primary);">${item.placa}</div>
        <div style="font-size: 0.8em; color: #666;">${item.TipoVehiculo} ${!item.valido ? '<span style="color:red;">(VENCIDO)</span>' : ''}</div>
      </div>
    `).join('');

    container.style.display = 'block';
    container.querySelectorAll('.search-result-item').forEach(item => {
      item.onclick = async () => {
        if (item.getAttribute('data-valido') !== 'true') {
          const alert = document.createElement('ion-alert');
          alert.header = 'Vehículo No Disponible';
          alert.message = 'No se puede seleccionar este vehículo porque tiene documentos vencidos.';
          alert.buttons = ['Entendido'];
          document.body.appendChild(alert);
          await alert.present();
          return;
        }
        this.vehiculo_id = item.getAttribute('data-id');
        this.querySelector('#input-vehiculo').value = item.getAttribute('data-placa');
        container.style.display = 'none';
        this.validateForm(); // Re-validate form after selecting vehicle
      };
    });
  }

  resetForm() {
    const formFields = {
      cantidadGalones: this.querySelector('#cantidad_galones'),
      costoTotal: this.querySelector('#costo_total'),
      kilometrajeActual: this.querySelector('#kilometraje_actual'),
      fotoOdometroInput: this.querySelector('#foto_odometro'),
      fotoReciboInput: this.querySelector('#foto_recibo'),
      inputVehiculo: this.querySelector('#input-vehiculo'),
    };

    formFields.cantidadGalones.value = '';
    formFields.costoTotal.value = '';
    formFields.kilometrajeActual.value = '';
    formFields.fotoOdometroInput.value = '';
    formFields.fotoReciboInput.value = '';
    formFields.inputVehiculo.value = ''; // Clear vehicle input
    this.vehiculo_id = ''; // Clear selected vehicle ID
    this.photoOdometro = '';
    this.photoRecibo = '';

    this.querySelector('#preview-container-odometro').style.display = 'none';
    this.querySelector('#preview-container-recibo').style.display = 'none';
    this.querySelector('#capture-btn-odometro').innerHTML = '<ion-icon slot="start" name="camera"></ion-icon> Capturar Foto Odómetro';
    this.querySelector('#capture-btn-odometro').classList.remove('btn-photo-success');
    this.querySelector('#capture-btn-recibo').innerHTML = '<ion-icon slot="start" name="camera"></ion-icon> Capturar Foto Recibo';
    this.querySelector('#capture-btn-recibo').classList.remove('btn-photo-success');
    this.querySelector('#results-vehiculo').style.display = 'none'; // Hide search results

    this.querySelector('#save-fuel-btn').disabled = true;
  }

  async showAlert(header, message) {
    const alert = document.createElement('ion-alert');
    alert.header = header;
    alert.message = message;
    alert.buttons = ['OK'];
    document.body.appendChild(alert);
    await alert.present();
  }
}

customElements.define('page-combustible', PageCombustible);
