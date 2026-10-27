import { authService } from '../services/authService.js';

class PageNovedades extends HTMLElement {
  connectedCallback() {
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
          <ion-title class="header-title">Reporte Novedades</ion-title>
          <ion-buttons slot="end">
            <ion-button id="theme-toggle" class="theme-toggle-btn">
              <ion-icon name="${document.body.classList.contains('dark') ? 'sunny-outline' : 'moon-outline'}" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; color: var(--text-muted); opacity: 1; padding: 40px 20px;">
          <div style="background: rgba(var(--ion-color-primary-rgb), 0.1); width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; box-shadow: 0 10px 30px rgba(var(--ion-color-primary-rgb), 0.15); animation: bounce-custom 2s infinite ease-in-out;">
            <ion-icon name="construct-outline" style="font-size: 60px; color: var(--ion-color-primary);"></ion-icon>
          </div>
          <h2 style="font-weight: 800; color: var(--text-main); margin-bottom: 12px; font-size: 1.5rem;">¡Próximamente!</h2>
          <p style="font-size: 1.1rem; max-width: 280px; line-height: 1.6; color: var(--ion-color-step-600);">Estamos construyendo el sitio, pronto se vendrán novedades.</p>
          
          <div style="margin-top: 30px; padding: 15px 25px; background: rgba(var(--ion-color-warning-rgb), 0.1); border-radius: 20px; border: 1px solid rgba(var(--ion-color-warning-rgb), 0.2); display: flex; align-items: center; gap: 10px;">
             <ion-icon name="rocket-outline" style="color: var(--ion-color-warning); font-size: 1.2rem;"></ion-icon>
             <span style="color: var(--ion-color-warning-shade); font-weight: 600; font-size: 0.9rem;">Módulo en desarrollo</span>
          </div>
        </div>

        <style>
          @keyframes bounce-custom {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .main-header {
            --background: var(--ion-background-color);
            --color: var(--text-main);
          }
          .header-title {
            font-weight: 800 !important;
            letter-spacing: -0.5px;
          }
        </style>
      </ion-content>
    `

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

customElements.define('page-novedades', PageNovedades)
