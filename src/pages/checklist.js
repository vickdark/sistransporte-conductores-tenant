import { authService } from '../services/authService.js';
import { checklistService } from '../services/checklistService.js';

class PageChecklist extends HTMLElement {
  constructor() {
    super();
    this.formData = {
      vehiculo_id: '',
      empleado_id: '',
      kilometraje: '',
      aliado_id: '',
      cambio_aceite: 'NO',
      bimensual: 'NO',
      arreglo_mtto: 'NO'
    };
    
    this.searchTimer = null;
    this.checklistItems = [
      { section: 'Luces y Señalización', icon: 'flash-outline', fields: [
        { name: 'luces_exteriores', label: 'Luces exteriores (altas y bajas)' },
        { name: 'luces_direccionales', label: 'Luces direccionales delanteras y traseras' },
        { name: 'luces_estacionamiento', label: 'Luces de estacionamiento' },
        { name: 'luces_stop_reversa', label: 'Luces de stop y reversa' }
      ]},
      { section: 'Cabina', icon: 'car-outline', fields: [
        { name: 'puertas', label: 'Puertas' },
        { name: 'vidrio_ventanas', label: 'Vidrio panorámico y ventanas' },
        { name: 'limpiaparabrisas', label: 'Limpiaparabrisas' },
        { name: 'pitos', label: 'Pitos' },
        { name: 'escaleras_acceso', label: 'Escaleras de acceso (iluminación - pasamanos)' },
        { name: 'asiento_conductor', label: 'Asiento del conductor' },
        { name: 'cinturon_seguridad_conductor', label: 'Cinturón de seguridad del conductor' },
        { name: 'extintor_incendios', label: 'Extintor de incendios' },
        { name: 'espejo_central', label: 'Espejo central - retrovisor - laterales' },
        { name: 'iluminacion_cabina', label: 'Iluminación interior cabina' },
        { name: 'aire_acondicionado', label: 'Estado y funcionamiento aire acondicionado' },
        { name: 'tv_dvd_radio', label: 'Estado y funcionamiento de TV, DVD, Radio' },
        { name: 'asientos_reclinables', label: 'Asientos - espaldares - reclinables - cinturones' },
        { name: 'piso_obstaculos', label: 'Piso sin obstáculos' },
        { name: 'ventanas_emergencia', label: 'Ventanas de emergencia (señalizadas, martillo, ganchos y otros)' },
        { name: 'alarma_reserva', label: 'Alarma de reserva - alarma dispositivo de velocidad' },
        { name: 'botiquin', label: 'Botiquín' }
      ]},
      { section: 'Estado Mecánico', icon: 'hammer-outline', fields: [
        { name: 'frenos_servicio', label: 'Frenos de servicio' },
        { name: 'direccion_terminales', label: 'Dirección y terminales' },
        { name: 'suspension_gatos_muelles', label: 'Suspensión (gatos, muelles, anclajes)' },
        { name: 'fugas_hidraulicas', label: 'Control de fugas hidráulicas (motor, mangueras)' },
        { name: 'sedimentos_combustible', label: 'Estados de sedimentos en trampa de combustible, filtros y drenajes' },
        { name: 'fugas_aire', label: 'Control de fugas de aire (mangueras y tanque)' },
        { name: 'caja_cambios', label: 'Caja de cambios' },
        { name: 'cardan_crucetas', label: 'Cardán y crucetas' },
        { name: 'bateria_cable', label: 'Batería y cable (en buen estado)' },
        { name: 'tubo_escape', label: 'Tubo de escape (en buen estado)' }
      ]},
      { section: 'Neumáticos', icon: 'disc-outline', fields: [
        { name: 'llantas_estado', label: 'Estado de las llantas' }
      ]},
      { section: 'Kit Ambiental', icon: 'leaf-outline', fields: [
        { name: 'recogedor', label: 'Recogedor' },
        { name: 'escobilla', label: 'Escobilla' },
        { name: 'trapeador', label: 'Trapeador' },
        { name: 'bolsas', label: 'Bolsas' }
      ]},
      { section: 'Equipo de Carretera', icon: 'construct-outline', fields: [
        { name: 'gato', label: 'Gato' },
        { name: 'cruceta_perno', label: 'Cruceta de perno' },
        { name: 'tacos_madera', label: 'Tacos de madera (2 unidades)' },
        { name: 'linterna_pilas', label: 'Linterna con pilas' },
        { name: 'herramientas', label: 'Herramientas' },
        { name: 'triangulos', label: 'Triángulos (2 unidades)' },
        { name: 'chaleco_reflectivo', label: 'Chaleco reflectivo' },
        { name: 'conos', label: 'Conos de 40-60 cm (2 unidades)' }
      ]}
    ];

    this.checklistItems.forEach(sec => {
      sec.fields.forEach(f => {
        this.formData[f.name] = 'OK';
        this.formData[f.name + '_com'] = '';
      });
    });
  }

  async connectedCallback() {
    this.classList.add('ion-page');
    const menu = document.querySelector('ion-menu');
    if (menu) menu.disabled = false;

    if (!authService.isLoggedIn()) {
      window.location.pathname = '/login';
      return;
    }

    const user = authService.getUser();
    this.formData.aliado_id = user?.relacionado_id || '';
    this.formData.empleado_id = user?.EmpleadoID || user?.id;

    this.render();
  }

  render() {
    const isDark = document.body.classList.contains('dark');

    this.innerHTML = `
      <style>
        .checklist-page {
          --background: var(--app-bg);
          --color: var(--text-main);
        }
        .header-card {
           background: var(--ion-card-background, var(--card-bg));
           color: var(--text-main);
           margin: 16px;
           padding: 20px;
           border-radius: 12px;
           box-shadow: 0 4px 12px rgba(0,0,0,0.1);
           position: relative;
           z-index: 1000;
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
        .section-header { display: flex; align-items: center; gap: 12px; width: 100%; }
        .section-header ion-icon { font-size: 24px; color: var(--ion-color-primary); }
        .item-card {
          background: var(--ion-card-background, var(--card-bg));
          color: var(--text-main);
          border-radius: 10px;
          margin-bottom: 16px;
          padding: 16px;
          border: 1px solid rgba(var(--ion-text-color-rgb, 0,0,0), 0.08);
        }
        .item-label { font-weight: 600; font-size: 14px; margin-bottom: 12px; display: block; color: var(--text-main); }
        .novedad-input-box { margin-top: 12px; padding: 12px; background: rgba(var(--ion-text-color-rgb, 0,0,0), 0.03); border: 1px solid rgba(var(--ion-text-color-rgb, 0,0,0), 0.1); border-radius: 8px; }
        ion-accordion-group { padding: 0 16px; }
        ion-accordion { background: var(--ion-card-background, var(--card-bg)); margin-bottom: 16px; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); overflow: hidden; }
        ion-item { --background: transparent; --color: var(--text-main); }
        .btn-save-container { padding: 20px 16px 100px 16px; }
        #btn-save-checklist {
          --background: #2e7d32;
          --border-radius: 12px;
          height: 60px;
          font-weight: 700;
        }
      </style>

      <ion-header class="ion-no-border">
        <ion-toolbar class="main-header">
          <ion-buttons slot="start">
            <ion-menu-button auto-hide="false"></ion-menu-button>
            <ion-back-button default-href="/home"></ion-back-button>
          </ion-buttons>
          <ion-title class="header-title">Registro Checklist</ion-title>
          <ion-buttons slot="end">
            <ion-button id="theme-toggle">
              <ion-icon name="${isDark ? 'sunny-outline' : 'moon-outline'}" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="checklist-page">
        <div class="header-card">
          <h2 style="margin:0 0 16px 0; font-size: 1.2em; font-weight: 700;">Datos del Vehículo</h2>
          <div class="vehicle-search-wrapper" style="position:relative; overflow:visible;">
             <ion-label style="font-size: 0.8em; font-weight: 700; color: var(--text-muted, #666);">PLACA *</ion-label>
             <ion-input id="input-vehiculo" placeholder="ABCD12" mode="md" 
                style="background: rgba(var(--ion-text-color-rgb, 0,0,0), 0.05); border-radius: 10px; padding: 12px; font-weight: 600;"
                autocapitalize="characters"></ion-input>
             <div id="results-vehiculo" class="search-results-container"></div>
          </div>
          <div style="margin-top: 15px;">
             <ion-label style="font-size: 0.8em; font-weight: 700; color: var(--text-muted, #666);">KILOMETRAJE *</ion-label>
             <ion-input type="text" id="km-input" placeholder="0" inputmode="numeric" mode="md"
                style="background: rgba(var(--ion-text-color-rgb, 0,0,0), 0.05); border-radius: 10px; padding: 12px; font-weight: 600;"></ion-input>
          </div>
        </div>

        <ion-accordion-group>
          ${this.checklistItems.map((sec, idx) => `
            <ion-accordion value="sec-${idx}">
              <ion-item slot="header" lines="none" style="--background: transparent;">
                <div class="section-header">
                  <ion-icon name="${sec.icon}"></ion-icon>
                  <ion-label style="font-weight: 700;">${sec.section}</ion-label>
                </div>
              </ion-item>
              <div slot="content" class="ion-padding">
                ${sec.fields.map(f => `
                  <div class="item-card">
                    <span class="item-label">${f.label}</span>
                    <ion-segment value="OK" class="segment-check" data-name="${f.name}" mode="ios">
                      <ion-segment-button value="OK"><ion-label>OK</ion-label></ion-segment-button>
                      <ion-segment-button value="Novedad" style="--color-checked: #d32f2f;"><ion-label>NOVEDAD</ion-label></ion-segment-button>
                    </ion-segment>
                    <div id="com-${f.name}" class="novedad-input-box" style="display:none;">
                      <ion-textarea placeholder="Detalles de la novedad..." class="comment-input" data-name="${f.name}" rows="2"></ion-textarea>
                    </div>
                  </div>
                `).join('')}
              </div>
            </ion-accordion>
          `).join('')}

          <ion-accordion value="mantenimiento">
            <ion-item slot="header" lines="none" style="--background: transparent;">
              <div class="section-header">
                <ion-icon name="settings-outline"></ion-icon>
                <ion-label style="font-weight: 700;">Mantenimiento</ion-label>
              </div>
            </ion-item>
            <div slot="content" class="ion-padding">
              <div class="item-card">
                <ion-item lines="none" style="--padding-start: 0;">
                  <ion-label position="stacked" style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: var(--text-main);">Cambio de aceite</ion-label>
                  <ion-select class="mtto-select" data-name="cambio_aceite" value="NO" interface="alert">
                    <ion-select-option value="SI">SI</ion-select-option>
                    <ion-select-option value="NO">NO</ion-select-option>
                    <ion-select-option value="N/A">N/A</ion-select-option>
                  </ion-select>
                </ion-item>
              </div>
              <div class="item-card">
                <ion-item lines="none" style="--padding-start: 0;">
                  <ion-label position="stacked" style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: var(--text-main);">Bimensual</ion-label>
                  <ion-select class="mtto-select" data-name="bimensual" value="NO" interface="alert">
                    <ion-select-option value="SI">SI</ion-select-option>
                    <ion-select-option value="NO">NO</ion-select-option>
                    <ion-select-option value="N/A">N/A</ion-select-option>
                  </ion-select>
                </ion-item>
              </div>
              <div class="item-card">
                <ion-item lines="none" style="--padding-start: 0;">
                  <ion-label position="stacked" style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: var(--text-main);">Arreglo y/o mtto</ion-label>
                  <ion-select class="mtto-select" data-name="arreglo_mtto" value="NO" interface="alert">
                    <ion-select-option value="SI">SI</ion-select-option>
                    <ion-select-option value="NO">NO</ion-select-option>
                    <ion-select-option value="N/A">N/A</ion-select-option>
                  </ion-select>
                </ion-item>
              </div>
            </div>
          </ion-accordion>
        </ion-accordion-group>

        <div class="btn-save-container">
          <ion-button expand="block" id="btn-save-checklist" size="large">
            <ion-icon name="cloud-upload-outline" slot="start"></ion-icon>
            GUARDAR REGISTRO
          </ion-button>
        </div>
      </ion-content>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const themeToggle = this.querySelector('#theme-toggle');
    if (themeToggle) {
      themeToggle.onclick = () => {
        const isDark = document.body.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        const iconName = isDark ? 'sunny-outline' : 'moon-outline';
        themeToggle.querySelector('ion-icon').setAttribute('name', iconName);
      };
    }

    const kmInput = this.querySelector('#km-input');
    kmInput.addEventListener('ionInput', (e) => {
      let val = (e.detail.value || '').replace(/[^0-9]/g, '');
      this.formData.kilometraje = val;
      kmInput.value = val.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    });

    const vInput = this.querySelector('#input-vehiculo');
    const resultsContainer = this.querySelector('#results-vehiculo');
    vInput.addEventListener('ionInput', (e) => {
      const term = (e.detail.value || '').toUpperCase();
      vInput.value = term;
      if (term.length < 1) { resultsContainer.style.display = 'none'; return; }
      this.handleSearch(term);
    });

    this.querySelectorAll('.segment-check').forEach(seg => {
      seg.addEventListener('ionChange', (e) => this.handleFieldChange(seg.getAttribute('data-name'), e.detail.value));
    });

    this.querySelectorAll('.mtto-select').forEach(sel => {
      sel.addEventListener('ionChange', (e) => {
        this.formData[sel.getAttribute('data-name')] = e.detail.value;
      });
    });

    this.querySelectorAll('.comment-input').forEach(txt => {
      txt.addEventListener('ionInput', (e) => {
        this.formData[txt.getAttribute('data-name') + '_com'] = e.detail.value;
      });
    });

    this.querySelector('#btn-save-checklist').onclick = () => this.save();
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
        this.formData.vehiculo_id = item.getAttribute('data-id');
        this.querySelector('#input-vehiculo').value = item.getAttribute('data-placa');
        container.style.display = 'none';
      };
    });
  }

  handleFieldChange(name, val) {
    this.formData[name] = val;
    const commentEl = this.querySelector(`#com-${name}`);
    if (val === 'Novedad') commentEl.style.display = 'block';
    else { commentEl.style.display = 'none'; this.formData[name + '_com'] = ''; }
  }

  async save() {
    // Validar datos básicos
    if (!this.formData.vehiculo_id) {
       this.showAlert('Faltan datos', 'Por favor selecciona un vehículo válido.');
       return;
    }
    if (!this.formData.kilometraje) {
       this.showAlert('Faltan datos', 'Por favor ingresa el kilometraje actual.');
       return;
    }

    // Validar comentarios obligatorios para novedades
    let missingComment = false;
    this.checklistItems.forEach(sec => {
      sec.fields.forEach(f => {
        if (this.formData[f.name] === 'Novedad' && (!this.formData[f.name + '_com'] || this.formData[f.name + '_com'].trim() === '')) {
          missingComment = true;
        }
      });
    });

    if (missingComment) {
      this.showAlert('Comentarios pendientes', 'Has marcado items como NOVEDAD. Por favor escribe el detalle de cada novedad encontrada.');
      return;
    }

    const loading = document.createElement('ion-loading');
    loading.message = 'Guardando...';
    document.body.appendChild(loading);
    await loading.present();

    try {
      const res = await checklistService.saveChecklist(this.formData);
      loading.dismiss();
      if (res.success) {
        const alert = document.createElement('ion-alert');
        alert.header = '¡Todo bien!';
        alert.message = 'Checklist guardado correctamente.';
        alert.buttons = [{
          text: 'Entendido',
          handler: () => { window.location.pathname = '/home'; }
        }];
        document.body.appendChild(alert);
        await alert.present();
      }
    } catch (e) { loading.dismiss(); }
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

customElements.define('page-checklist', PageChecklist);