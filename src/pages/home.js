import { authService, ASSETS_URL } from '../services/authService.js';
import { driverService } from '../services/driverService.js';

class PageHome extends HTMLElement {
  async connectedCallback() {
    this.classList.add('ion-page');
    console.log('Home: connected');
    const menu = document.querySelector('ion-menu');
    if (menu) menu.disabled = false;

    if (!authService.isLoggedIn()) {
      window.location.pathname = '/login';
      return;
    }

    const user = authService.getUser();
    const nombre = (user?.nombre || user?.usuario || 'CONDUCTOR').toString().toUpperCase();
    const driverId = user?.EmpleadoID || user?.id;

    this.renderLoading(nombre);
    await this.refreshDashboardData(driverId, nombre); // Wait for data to render before showing toast
  }

  renderLoading(nombre) {
    this.innerHTML = `
      <ion-header class="ion-no-border">
        <ion-toolbar class="main-header">
          <ion-buttons slot="start">
            <ion-menu-button auto-hide="false"></ion-menu-button>
            <img src="${ASSETS_URL}logo.png" class="header-logo" alt="Logo">
          </ion-buttons>
          <ion-title class="header-title">Transportes Kemuel</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div class="greeting-card">
          <div class="greeting-content">
            <div class="greeting-title">Panel del Conductor</div>
            <div class="greeting-name">${nombre}</div>
          </div>
        </div>
        <div style="display: flex; justify-content: center; padding: 50px;">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
        </div>
      </ion-content>
    `;
  }

  async refreshDashboardData(userId, nombre) {
    try {
      const { counts } = await driverService.getDashboardData(userId);
      this.renderHome(nombre, counts);
    } catch (error) {
      console.error('Home: data error', error);
      this.renderHome(nombre, { pendientes: 0, progreso: 0, completados: 0, cancelados: 0, apoyo: 0 });
    }
  }

  renderHome(nombre, counts) {
    const isDark = document.body.classList.contains('dark');
    const cards = [
      { color: 'pendientes', title: 'Servicios Pendientes', count: counts.pendientes, icon: 'list-outline', url: '/pendientes' },
      { color: 'progreso', title: 'Servicios Progreso', count: counts.progreso, icon: 'refresh-outline', url: '/progreso' },
      { color: 'completados', title: 'Servicios Completados', count: counts.completados, icon: 'checkmark-circle-outline', url: '/completados' },
      { color: 'cancelados', title: 'Servicios Cancelados', count: counts.cancelados, icon: 'close-circle-outline', url: '/cancelados' },
      { color: 'combustible', title: 'Recargas Combustible', count: null, icon: 'flame-outline', url: '/combustible' },
      // { color: 'novedades', title: 'Reporte Novedades', count: null, icon: 'notifications-outline', url: '/novedades' },
      { color: 'checklist', title: 'Check List', count: null, icon: 'clipboard-outline', url: '/checklist' },
      { color: 'apoyo', title: 'Servicios Apoyo', count: counts.apoyo, icon: 'help-circle-outline', url: '/apoyos' }
    ];

    const grid = cards
      .map(c => `
        <ion-col size="6" size-sm="6" size-md="3">
          <a href="${c.url}" style="text-decoration: none;">
            <ion-card class="dashboard-card ion-color ion-color-${c.color}">
              <div class="dashboard-card-inner">
                <ion-icon name="${c.icon}"></ion-icon>
                <div class="dashboard-card-count ${c.count === null ? 'invisible' : ''}">${c.count || '0'}</div>
                <div class="dashboard-card-label">${c.title}</div>
              </div>
              <div class="dashboard-card-footer">
                VER <ion-icon name="arrow-forward-outline"></ion-icon>
              </div>
            </ion-card>
          </a>
        </ion-col>
      `)
      .join('');

    this.innerHTML = `
      <ion-header class="ion-no-border">
        <ion-toolbar class="main-header">
          <ion-buttons slot="start">
            <ion-menu-button></ion-menu-button>
            <img src="${ASSETS_URL}logo.png" class="header-logo">
          </ion-buttons>
          <ion-title class="header-title">Panel Principal</ion-title>
          <ion-buttons slot="end">
            <ion-button id="theme-toggle">
              <ion-icon name="${isDark ? 'sunny-outline' : 'moon-outline'}" slot="icon-only"></ion-icon>
            </ion-button>
            <ion-button id="logout-btn">
              <ion-icon name="log-out-outline" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div class="greeting-card">
          <div class="greeting-content">
            <div class="greeting-title">Bienvenido</div>
            <div class="greeting-name">${nombre}</div>
          </div>
        </div>
        <ion-grid class="home-grid">
          <ion-row>${grid}</ion-row>
        </ion-grid>
        <div class="scroll-spacer"></div>
      </ion-content>
    `;

    this.setupHandlers();
  }

  setupHandlers() {
    const logoutBtn = this.querySelector('#logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = async () => {
        const alert = document.createElement('ion-alert');
        alert.header = 'Cerrar Sesión';
        alert.message = '¿Deseas salir?';
        alert.buttons = [
          { text: 'No', role: 'cancel' },
          { text: 'Sí', handler: () => authService.logout() }
        ];
        document.body.appendChild(alert);
        await alert.present();
      };
    }

    const themeToggle = this.querySelector('#theme-toggle');
    if (themeToggle) {
      themeToggle.onclick = () => {
        const isDark = document.body.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        const iconName = isDark ? 'sunny-outline' : 'moon-outline';
        themeToggle.querySelector('ion-icon').setAttribute('name', iconName);
      };
    }
  }
}

customElements.define('page-home', PageHome);
