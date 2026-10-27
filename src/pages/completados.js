import { renderServicesPage, attachServiceHandlers } from './services-base.js'
import { authService } from '../services/authService.js'
import { driverService } from '../services/driverService.js'

class PageCompletados extends HTMLElement {
  async connectedCallback() {
    const menu = document.querySelector('ion-menu');
    if (menu) menu.disabled = false;

    if (!authService.isLoggedIn()) {
      window.location.pathname = '/login';
      return;
    }

    const user = authService.getUser();
    const driverId = user?.EmpleadoID || user?.id;

    this.innerHTML = `
      <ion-header class="ion-no-border">
        <ion-toolbar class="main-header">
          <ion-buttons slot="start">
            <ion-menu-button auto-hide="false"></ion-menu-button>
            <ion-back-button default-href="/home"></ion-back-button>
          </ion-buttons>
          <ion-title class="header-title">Completados</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding ion-text-center">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
      </ion-content>
    `;

    const response = await driverService.getListadoServicios(driverId);
    const list = response.list || [];
    
    this.innerHTML = renderServicesPage({ 
      title: 'Servicios Completados', 
      services: list.filter(s => s.Estado === 'Completado') 
    });
    attachServiceHandlers(this);
  }
}

customElements.define('page-completados', PageCompletados)
