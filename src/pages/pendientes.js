import { renderServicesPage, attachServiceHandlers } from './services-base.js'
import { authService } from '../services/authService.js'
import { driverService } from '../services/driverService.js'

class PagePendientes extends HTMLElement {
  async connectedCallback() {
    const menu = document.querySelector('ion-menu');
    if (menu) menu.disabled = false;

    if (!authService.isLoggedIn()) {
      window.location.pathname = '/login';
      return;
    }

    const user = authService.getUser();
    const driverId = user?.EmpleadoID || user?.id;

    // Mostrar loading
    this.innerHTML = `
      <ion-header class="ion-no-border">
        <ion-toolbar class="main-header">
          <ion-buttons slot="start">
            <ion-menu-button auto-hide="false"></ion-menu-button>
            <ion-back-button default-href="/home"></ion-back-button>
          </ion-buttons>
          <ion-title class="header-title">Pendientes</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding ion-text-center">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
      </ion-content>
    `;

    const services = await driverService.getPendientes(driverId);
    
    this.innerHTML = renderServicesPage({ 
      title: 'Órdenes de Servicio Pendientes', 
      services: services 
    });
    attachServiceHandlers(this);
  }
}

customElements.define('page-pendientes', PagePendientes)
