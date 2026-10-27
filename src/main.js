import { initialize } from '@ionic/core/components/index.js'
import { defineCustomElements } from '@ionic/pwa-elements/loader'
import { App } from '@capacitor/app'

// Inicializar PWA Elements (Soporte de cámara en navegador)
defineCustomElements(window);
import { defineCustomElement as ionApp } from '@ionic/core/components/ion-app.js'
import { defineCustomElement as ionRouter } from '@ionic/core/components/ion-router.js'
import { defineCustomElement as ionRoute } from '@ionic/core/components/ion-route.js'
import { defineCustomElement as ionNav } from '@ionic/core/components/ion-nav.js'
import { defineCustomElement as ionHeader } from '@ionic/core/components/ion-header.js'
import { defineCustomElement as ionToolbar } from '@ionic/core/components/ion-toolbar.js'
import { defineCustomElement as ionTitle } from '@ionic/core/components/ion-title.js'
import { defineCustomElement as ionContent } from '@ionic/core/components/ion-content.js'
import { defineCustomElement as ionGrid } from '@ionic/core/components/ion-grid.js'
import { defineCustomElement as ionRow } from '@ionic/core/components/ion-row.js'
import { defineCustomElement as ionCol } from '@ionic/core/components/ion-col.js'
import { defineCustomElement as ionCard } from '@ionic/core/components/ion-card.js'
import { defineCustomElement as ionCardHeader } from '@ionic/core/components/ion-card-header.js'
import { defineCustomElement as ionCardTitle } from '@ionic/core/components/ion-card-title.js'
import { defineCustomElement as ionCardContent } from '@ionic/core/components/ion-card-content.js'
import { defineCustomElement as ionButton } from '@ionic/core/components/ion-button.js'
import { defineCustomElement as ionList } from '@ionic/core/components/ion-list.js'
import { defineCustomElement as ionItem } from '@ionic/core/components/ion-item.js'
import { defineCustomElement as ionIcon } from '@ionic/core/components/ion-icon.js'
import { defineCustomElement as ionLabel } from '@ionic/core/components/ion-label.js'
import { defineCustomElement as ionInput } from '@ionic/core/components/ion-input.js'
import { defineCustomElement as ionButtons } from '@ionic/core/components/ion-buttons.js'
import { defineCustomElement as ionBackButton } from '@ionic/core/components/ion-back-button.js'
import { defineCustomElement as ionAlert } from '@ionic/core/components/ion-alert.js'
import { defineCustomElement as ionLoading } from '@ionic/core/components/ion-loading.js'
import { defineCustomElement as ionToast } from '@ionic/core/components/ion-toast.js'
import { defineCustomElement as ionCheckbox } from '@ionic/core/components/ion-checkbox.js'
import { defineCustomElement as ionMenu } from '@ionic/core/components/ion-menu.js'
import { defineCustomElement as ionMenuButton } from '@ionic/core/components/ion-menu-button.js'
import { defineCustomElement as ionMenuToggle } from '@ionic/core/components/ion-menu-toggle.js'
import { defineCustomElement as ionAccordion } from '@ionic/core/components/ion-accordion.js'
import { defineCustomElement as ionAccordionGroup } from '@ionic/core/components/ion-accordion-group.js'
import { defineCustomElement as ionSegment } from '@ionic/core/components/ion-segment.js'
import { defineCustomElement as ionSegmentButton } from '@ionic/core/components/ion-segment-button.js'
import { defineCustomElement as ionSelect } from '@ionic/core/components/ion-select.js'
import { defineCustomElement as ionSelectOption } from '@ionic/core/components/ion-select-option.js'
import { defineCustomElement as ionTextarea } from '@ionic/core/components/ion-textarea.js'
import { defineCustomElement as ionSpinner } from '@ionic/core/components/ion-spinner.js'
import { defineCustomElement as ionDatetime } from '@ionic/core/components/ion-datetime.js'
import { defineCustomElement as ionDatetimeButton } from '@ionic/core/components/ion-datetime-button.js'
import { defineCustomElement as ionModal } from '@ionic/core/components/ion-modal.js'

import { addIcons } from 'ionicons'
import { personCircleOutline, clipboardOutline, refreshOutline, checkmarkCircleOutline, closeCircleOutline, flameOutline, notificationsOutline, listOutline, helpCircleOutline, arrowForwardCircleOutline, arrowForwardOutline, personOutline, person, lockClosedOutline, lockClosed, eyeOutline, eyeOffOutline, logInOutline, logOutOutline, carSport, calendarOutline, ticketOutline, timeOutline, carOutline, trailSignOutline, flashOutline, documentTextOutline, menuOutline, homeOutline, moonOutline, sunnyOutline, chevronBackOutline, peopleOutline, searchOutline, saveOutline, hammerOutline, discOutline, leafOutline, constructOutline, settingsOutline, cloudUploadOutline } from 'ionicons/icons'

import './styles.css'

// Define all custom elements used in the app
initialize()
ionApp()
ionRouter()
ionRoute()
ionNav()
ionHeader()
ionToolbar()
ionTitle()
ionContent()
ionGrid()
ionRow()
ionCol()
ionCard()
ionCardHeader()
ionCardTitle()
ionCardContent()
ionButton()
ionList()
ionItem()
ionIcon()
ionLabel()
ionInput()
ionButtons()
ionBackButton()
ionAlert()
ionLoading()
ionToast()
ionCheckbox()
ionMenu()
ionMenuButton()
ionMenuToggle()
ionAccordion()
ionAccordionGroup()
ionSegment()
ionSegmentButton()
ionSelect()
ionSelectOption()
ionTextarea()
ionSpinner()
ionDatetime()
ionDatetimeButton()
ionModal()

import { authService } from './services/authService.js'

addIcons({ personCircleOutline, clipboardOutline, refreshOutline, checkmarkCircleOutline, closeCircleOutline, flameOutline, notificationsOutline, listOutline, helpCircleOutline, arrowForwardCircleOutline, arrowForwardOutline, personOutline, person, lockClosedOutline, lockClosed, eyeOutline, eyeOffOutline, logInOutline, logOutOutline, carSport, calendarOutline, ticketOutline, timeOutline, carOutline, trailSignOutline, flashOutline, documentTextOutline, menuOutline, homeOutline, moonOutline, sunnyOutline, chevronBackOutline, peopleOutline, searchOutline, saveOutline, hammerOutline, discOutline, leafOutline, constructOutline, settingsOutline, cloudUploadOutline })

const loadedPages = new Set()
const loadPageModuleForPath = async (path) => {
  const clean = (path || '/').split('?')[0].split('#')[0]

  const key = clean.startsWith('/show/') ? '/show/:id' : clean
  if (loadedPages.has(key)) return

  if (key === '/' || key === '/login') {
    await import('./pages/login.js')
  } else if (key === '/home') {
    await import('./pages/home.js')
  } else if (key === '/pendientes') {
    await import('./pages/pendientes.js')
  } else if (key === '/progreso') {
    await import('./pages/progreso.js')
  } else if (key === '/completados') {
    await import('./pages/completados.js')
  } else if (key === '/cancelados') {
    await import('./pages/cancelados.js')
  } else if (key === '/combustible') {
    await import('./pages/combustible.js')
  } else if (key === '/novedades') {
    await import('./pages/novedades.js')
  } else if (key === '/checklist') {
    await import('./pages/checklist.js')
  } else if (key === '/apoyos') {
    await import('./pages/apoyos.js')
  } else if (key === '/show/:id') {
    await import('./pages/show.js')
  }

  loadedPages.add(key)
}

const router = document.querySelector('ion-router')
if (router && typeof router.push === 'function') {
  const originalPush = router.push.bind(router)
  router.push = async (path, direction, animation) => {
    await loadPageModuleForPath(path)
    return originalPush(path, direction, animation)
  }
}

document.addEventListener('click', async (e) => {
  const a = e.target.closest('a[href]')
  if (!a) return

  const href = a.getAttribute('href')
  if (!href || !href.startsWith('/')) return

  const r = document.querySelector('ion-router')
  if (!r || typeof r.push !== 'function') return

  e.preventDefault()
  await loadPageModuleForPath(href)
  r.push(href)
}, true)

loadPageModuleForPath(window.location.pathname).catch(() => {})

const tryResumeGpsTracking = async () => {
  if (!authService.isLoggedIn()) return
  try {
    const { driverService } = await import('./services/driverService.js')
    await driverService.resumeTrackingIfNeeded()
  } catch (e) {}
}

tryResumeGpsTracking()

// Global click handler for logout
document.addEventListener('click', async (e) => {
  if (e.target.id === 'menu-logout-btn' || e.target.closest('#menu-logout-btn')) {
    const alert = document.createElement('ion-alert')
    alert.header = 'Cerrar Sesión'
    alert.message = '¿Estás seguro?'
    alert.buttons = [
      { text: 'Cancelar', role: 'cancel' },
      { text: 'Sí, salir', handler: async () => await authService.logout() }
    ]
    document.body.appendChild(alert)
    await alert.present()
  }
})

// Initialize theme from storage
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
}

// Native Back Button Handling (Android/iOS)
App.addListener('backButton', () => {
    const currentPath = window.location.pathname;
    if (currentPath === '/home' || currentPath === '/login' || currentPath === '/') {
        App.exitApp();
    } else {
        window.history.back();
    }
});
