import { authService, ASSETS_URL, BG_IMAGE_URL } from '../services/authService.js';

class PageLogin extends HTMLElement {
  async connectedCallback() {
    this.classList.add('ion-page');
    // Configurar imagen de fondo desde variables de entorno
    document.documentElement.style.setProperty('--app-bg-image', `url('${BG_IMAGE_URL}')`);
    
    // Deshabilitar menú en el login
    const menu = document.querySelector('ion-menu');
    if (menu) menu.disabled = true;

    // Si ya está logueado, redirigir automáticamente al panel
    if (authService.isLoggedIn()) {
      const router = document.querySelector('ion-router');
      if (router) {
        router.push('/home');
      } else {
        window.location.pathname = '/home';
      }
      return;
    }
    this.render();
    this.setupListeners();
  }

  render() {
    this.innerHTML = `
      <style>
        .remember-container ion-checkbox {
          --size: 24px;
          --checkbox-background-checked: var(--ion-color-primary);
          --border-color-checked: var(--ion-color-primary);
          --border-width: 2px;
          margin-left: 5px;
        }
        /* Asegurar que el área de clic sea amplia en móvil */
        .remember-container {
          min-height: 44px;
          cursor: pointer;
        }
      </style>
      <ion-content class="login-content" scroll-y="false">
        <div class="login-container">
          <div class="login-card">
            <div class="login-header">
              <div class="login-logo-container">
                <img src="${ASSETS_URL}logo.png" alt="Logo Kemuel" class="company-logo">
              </div>
              <h1>Sistema de Transporte</h1>
              <p>Accede a tu cuenta</p>
            </div>

            <form id="login-form">
              <ion-item class="custom-input-item" lines="none">
                <ion-input 
                  id="login-user" 
                  name="nombre_usuario"
                  type="text" 
                  placeholder="Usuario"
                  required
                ></ion-input>
                <ion-icon name="person" slot="end"></ion-icon>
              </ion-item>

              <ion-item class="custom-input-item" lines="none">
                <ion-input 
                  id="login-pass" 
                  name="password_user"
                  type="password" 
                  placeholder="Contraseña"
                  required
                ></ion-input>
                <ion-button id="toggle-pass" fill="clear" slot="end" size="small" style="--padding-start: 0; --padding-end: 0; margin: 0; height: 100%;">
                  <ion-icon name="eye-outline" slot="icon-only" color="medium" style="font-size: 20px;"></ion-icon>
                </ion-button>
              </ion-item>

              <div class="remember-container" style="margin: 10px 0 20px 0; display: flex; align-items: center;">
                <ion-checkbox id="remember-me" color="primary" label-placement="end" style="--size: 20px; font-size: 0.9rem; --padding-start: 10px; width: 100%;">Recordar mi usuario</ion-checkbox>
              </div>

              <ion-button 
                id="login-submit" 
                class="login-button" 
                expand="block" 
                type="submit"
              >
                Iniciar Sesión
              </ion-button>
            </form>

            <div class="login-footer">
              &copy; 2025 Kemuel Transporte S.A.S
            </div>
          </div>
        </div>
      </ion-content>
    `;
  }

  setupListeners() {
    const userEl = this.querySelector('#login-user');
    const passEl = this.querySelector('#login-pass');
    const formEl = this.querySelector('#login-form');
    const rememberCheckbox = this.querySelector('#remember-me');

    // Cargar usuario guardado si existe
    const savedUser = localStorage.getItem('remembered_user');
    if (savedUser && userEl) {
      userEl.value = savedUser;
      if (rememberCheckbox) {
        // Usamos un pequeño delay para asegurar que el componente Ionic esté listo
        setTimeout(() => {
          rememberCheckbox.checked = true;
          // Forzamos el atributo visual por si acaso
          rememberCheckbox.setAttribute('checked', 'true');
        }, 150);
      }
    }

    // Aseguramos que el checkbox responda correctamente al cambio
    if (rememberCheckbox) {
      rememberCheckbox.addEventListener('ionChange', (ev) => {
        const isChecked = ev.detail.checked;
        console.log('Checkbox state changed to:', isChecked);
        rememberCheckbox.checked = isChecked;
      });

      // Hacer que el contenedor también sea clicable para facilitar el toque en móvil
      const container = this.querySelector('.remember-container');
      if (container) {
        container.addEventListener('click', (e) => {
          // Si el clic no fue directamente en el checkbox (que ya tiene su propia lógica), lo activamos
          if (e.target !== rememberCheckbox) {
            rememberCheckbox.checked = !rememberCheckbox.checked;
          }
        });
      }
    }

    const toggleBtn = this.querySelector('#toggle-pass');
    
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const type = passEl.getAttribute('type') === 'password' ? 'text' : 'password';
        passEl.setAttribute('type', type);
        const icon = type === 'password' ? 'eye-outline' : 'eye-off-outline';
        toggleBtn.querySelector('ion-icon').setAttribute('name', icon);
      });
    }

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const usuario = (userEl.value || '').toString().trim();
      const clave = (passEl.value || '').toString().trim();

      if (!usuario || !clave) {
        this.showAlert('Datos incompletos', 'Por favor ingresa tu usuario y contraseña');
        return;
      }

      this.showLoading();

      try {
        const result = await authService.login(usuario, clave);
        
        if (result.success) {
          // Capturamos el estado actual del checkbox
          const isRememberChecked = rememberCheckbox && rememberCheckbox.checked === true;
          
          if (isRememberChecked) {
            localStorage.setItem('remembered_user', usuario);
          } else {
            localStorage.removeItem('remembered_user');
          }

          const router = document.querySelector('ion-router');
          if (router) {
            router.push('/home');
          } else {
            window.location.pathname = '/home';
          }
        } else if (result.isWrongRole) {
          this.showAlert('Acceso Restringido', result.message);
          setTimeout(() => {
            window.location.href = result.redirectUrl;
          }, 3000);
        } else {
          // Limpiar contraseña si el acceso falla
          passEl.value = '';
          this.showAlert('Acceso Denegado', result.message);
        }
      } catch (error) {
        this.showAlert('Error de Conexión', 'No se pudo comunicar con el servidor');
      } finally {
        this.hideLoading();
      }
    });
  }

  async showAlert(header, message) {
    const alert = document.createElement('ion-alert');
    alert.header = header;
    alert.message = message;
    alert.buttons = ['OK'];
    document.body.appendChild(alert);
    return alert.present();
  }

  async showLoading() {
    const loading = document.createElement('ion-loading');
    loading.message = 'Autenticando...';
    loading.id = 'login-loading';
    loading.spinner = 'crescent';
    document.body.appendChild(loading);
    return loading.present();
  }

  async hideLoading() {
    const loading = document.querySelector('#login-loading');
    if (loading) {
      await loading.dismiss();
      loading.remove();
    }
  }
}

customElements.define('page-login', PageLogin);
