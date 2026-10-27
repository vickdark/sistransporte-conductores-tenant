import { alertController } from '@ionic/core/components'

export const stateColor = {
  'Pendiente': '#ffc107',
  'En Progreso': '#007bff',
  'Completado': '#28a745',
  'Cancelado': '#dc3545',
  'Apoyo': '#fd7e14'
}

export const formatDate = (iso, withTime = true) => {
  if (!iso || iso === '0000-00-00 00:00:00' || iso === '0000-00-00') return 'N/A'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'N/A'
  const pad = (n) => String(n).padStart(2, '0')
  const day = pad(d.getDate())
  const month = pad(d.getMonth() + 1)
  const year = d.getFullYear()
  if (!withTime) return `${day}/${month}/${year}`
  let hours = d.getHours()
  const minutes = pad(d.getMinutes())
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`
}

const canStartNow = (iso) => {
  const now = new Date()
  const dt = new Date(iso)
  const todayStr = now.toISOString().split('T')[0]
  const serviceStr = dt.toISOString().split('T')[0]
  if (serviceStr < todayStr) return { allowed: true }
  if (serviceStr > todayStr) return { allowed: false, reason: 'future' }
  const diffMin = Math.floor((dt.getTime() - now.getTime()) / (1000 * 60))
  if (diffMin > 15) return { allowed: false, reason: 'too_early', minutes: diffMin }
  return { allowed: true }
}

export const renderServicesPage = ({ title, services }) => {
  const grouped = {}
  services.forEach(s => {
    const dateKey = new Date(s.FechaInicio).toISOString().split('T')[0]
    grouped[dateKey] = grouped[dateKey] || []
    grouped[dateKey].push(s)
  })

  const dateBlocks = Object.entries(grouped)
    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
    .map(([dateKey, list]) => {
      const header = `
        <ion-card class="date-card">
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="calendar-outline" class="mr-2"></ion-icon>
              ${formatDate(dateKey, false)}
              <small class="text-muted">(${list.length} órdenes)</small>
            </ion-card-title>
          </ion-card-header>
        </ion-card>
      `
      const cards = list.map(s => {
        const color = stateColor[s.Estado] || '#6c757d'
        const isFuture = new Date(s.FechaInicio).toISOString().split('T')[0] > new Date().toISOString().split('T')[0]
        
        return `
          <ion-col size="12" size-sm="6" size-md="6" size-lg="4">
            <ion-card class="card-orden" data-id="${s.ID}" data-date="${s.FechaInicio}">
              <div style="background: ${color}; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid rgba(0,0,0,0.1); box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="display: flex; align-items: center; gap: 10px; color: white;">
                  <ion-icon name="ticket-outline" style="font-size: 1.4rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"></ion-icon>
                  <span style="font-weight: 800; font-size: 1.1rem; letter-spacing: 0.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">ORDEN #${s.ID}</span>
                </div>
                ${isFuture ? '<ion-chip style="--background: rgba(255,255,255,0.2); --color: white; margin: 0; font-weight: 700; font-size: 0.7rem; border: 1px solid rgba(255,255,255,0.3);">FUTURO</ion-chip>' : ''}
              </div>
              
              <ion-card-content style="padding: 20px;">
                <div class="service-info-row">
                  <ion-icon name="person-outline" style="color: ${color};"></ion-icon>
                  <div class="service-info-content">
                    <span class="service-info-label">CLIENTE</span>
                    <span class="service-info-value">${s.ClienteNombre || '---'}</span>
                  </div>
                </div>

                <div class="service-info-row">
                  <ion-icon name="time-outline" style="color: ${color};"></ion-icon>
                  <div class="service-info-content">
                    <span class="service-info-label">INICIO DEL SERVICIO</span>
                    <span class="service-info-value">${formatDate(s.FechaInicio)}</span>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; padding-top: 15px; border-top: 1px dashed rgba(var(--ion-text-color-rgb, 0,0,0), 0.1);">
                  <div class="service-info-row" style="margin-bottom: 0;">
                    <ion-icon name="car-outline" style="color: ${color};"></ion-icon>
                    <div class="service-info-content">
                      <span class="service-info-label">PLACA</span>
                      <span class="service-info-value" style="font-family: monospace; font-size: 1.1rem; letter-spacing: 1px;">${s.PlacaVehiculo || '---'}</span>
                    </div>
                  </div>
                  <div class="service-info-row" style="margin-bottom: 0;">
                    <ion-icon name="trail-sign-outline" style="color: ${color};"></ion-icon>
                    <div class="service-info-content">
                      <span class="service-info-label">RUTA</span>
                      <span class="service-info-value">${s.Ruta || '---'}</span>
                    </div>
                  </div>
                </div>

                <div style="margin-top: 20px;">
                  <span class="service-info-label">DESCRIPCIÓN</span>
                  <div style="background: rgba(var(--ion-text-color-rgb, 0,0,0), 0.03); padding: 12px; border-radius: 12px; margin-top: 5px; font-size: 0.9rem; line-height: 1.5; color: var(--text-muted); border-left: 3px solid ${color};">
                    ${s.Descripcion || 'Sin descripción adicional.'}
                  </div>
                </div>
              </ion-card-content>
              
              <div style="padding: 12px 20px; background: rgba(0,0,0,0.02); border-top: 1px solid rgba(var(--ion-text-color-rgb, 0,0,0), 0.05); display: flex; align-items: center; justify-content: space-between;">
                 <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; box-shadow: 0 0 5px ${color};"></div>
                    <span style="font-size: 0.75rem; font-weight: 800; color: ${color}; text-transform: uppercase;">${s.Estado}</span>
                 </div>
                 <ion-button fill="clear" size="small" style="font-weight: 800; --padding-end: 0; --color: ${color};">
                   VER DETALLES <ion-icon name="arrow-forward-outline" slot="end"></ion-icon>
                 </ion-button>
              </div>
            </ion-card>
          </ion-col>
        `
      }).join('')
      return `
        ${header}
        <ion-grid>
          <ion-row>
            ${cards}
          </ion-row>
        </ion-grid>
      `
    }).join('')

  const tpl = `
    <ion-header class="ion-no-border">
      <ion-toolbar class="main-header">
        <ion-buttons slot="start">
          <ion-menu-button auto-hide="false"></ion-menu-button>
          <ion-back-button default-href="/home"></ion-back-button>
        </ion-buttons>
        <ion-title class="header-title">${title}</ion-title>
        <ion-buttons slot="end">
          <ion-button id="theme-toggle" class="theme-toggle-btn">
            <ion-icon name="${document.body.classList.contains('dark') ? 'sunny-outline' : 'moon-outline'}" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      ${dateBlocks ? dateBlocks : `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; color: var(--text-muted); opacity: 1; padding: 40px 20px;">
          <div style="background: rgba(var(--ion-color-primary-rgb), 0.1); width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.05);">
            <ion-icon name="clipboard-outline" style="font-size: 50px; color: var(--ion-color-primary);"></ion-icon>
          </div>
          <h2 style="font-weight: 800; color: var(--text-main); margin-bottom: 8px;">¡Todo al día!</h2>
          <p style="font-size: 1rem; max-width: 250px; line-height: 1.5;">No hay órdenes en este estado por el momento.</p>
        </div>
      `}
      <div class="scroll-spacer"></div>
    </ion-content>
  `
  return tpl
}

export const attachServiceHandlers = (root) => {
  root.querySelectorAll('.card-orden').forEach(card => {
    const id = Number(card.dataset.id)
    const date = card.dataset.date
    const res = canStartNow(date)
    if (res.reason === 'future') {
      card.classList.add('card-disabled')
    }
    card.addEventListener('click', async () => {
      const check = canStartNow(date)
      if (!check.allowed) {
        const opts = check.reason === 'future'
          ? { header: 'Servicio futuro', message: 'Este servicio corresponde a una fecha futura y no está disponible para acceder.', buttons: ['Entendido'] }
          : { header: 'Servicio no disponible aún', message: `Faltan ${check.minutes} minutos para poder iniciar este servicio. Solo puedes acceder cuando falten 15 minutos o menos.`, buttons: ['Entendido'] }
        const alert = await alertController.create(opts)
        await alert.present()
        return
      }
      const router = document.querySelector('ion-router');
      if (router) {
        router.push(`/show/${id}`);
      } else {
        window.location.pathname = `/show/${id}`;
      }
    })
  })

  const themeToggle = root.querySelector('#theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      const iconName = isDark ? 'sunny-outline' : 'moon-outline';
      themeToggle.querySelector('ion-icon').setAttribute('name', iconName);
    });
  }
}

export const mockServices = [
  { ID: 101, Estado: 'Pendiente', FechaInicio: new Date(Date.now() - 86400000).toISOString(), PlacaVehiculo: 'ABC123', Ruta: 'Centro - Norte', Descripcion: 'Traslado de cliente', ClienteNombre: 'Acme' },
  { ID: 102, Estado: 'Pendiente', FechaInicio: new Date(Date.now() + 3600000).toISOString(), PlacaVehiculo: 'XYZ987', Ruta: 'Sur - Oeste', Descripcion: 'Entrega paquete', ClienteNombre: 'Globex' },
  { ID: 201, Estado: 'En Progreso', FechaInicio: new Date(Date.now() - 600000).toISOString(), PlacaVehiculo: 'JKL456', Ruta: 'Norte - Este', Descripcion: 'Ruta activa', ClienteNombre: 'Umbrella' },
  { ID: 301, Estado: 'Completado', FechaInicio: new Date(Date.now() - 172800000).toISOString(), PlacaVehiculo: 'MNO321', Ruta: 'Este - Centro', Descripcion: 'Servicio finalizado', ClienteNombre: 'Stark' },
  { ID: 401, Estado: 'Cancelado', FechaInicio: new Date(Date.now()).toISOString(), PlacaVehiculo: 'PQR654', Ruta: 'Centro - Sur', Descripcion: 'Cancelado por cliente', ClienteNombre: 'Wayne' },
  { ID: 501, Estado: 'Apoyo', FechaInicio: new Date(Date.now() - 3600000).toISOString(), PlacaVehiculo: 'TUV852', Ruta: 'Apoyo Zona Norte', Descripcion: 'Apoyo a unidad', ClienteNombre: 'LexCorp' }
]
