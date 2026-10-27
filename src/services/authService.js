export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://test-transporteskemuel.mambacode.dev/api-transporte-kemuel/';
export const ASSETS_URL = import.meta.env.VITE_ASSETS_URL || 'https://test-transporteskemuel.mambacode.dev/public/images/';
export const BG_IMAGE_URL = import.meta.env.VITE_BG_IMAGE_URL || 'https://test-transporteskemuel.mambacode.dev/login/fondo2.webp';
export const LOGIN_URL = `${API_BASE_URL}auth/ingreso.php`;

export const authService = {
  async login(usuario, clave) {
    try {
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          nombre_usuario: String(usuario).trim(), 
          password_user: String(clave).trim() 
        }),
      });

      if (!response.ok) {
        throw new Error('Error en la conexión con el servidor');
      }

      const data = await response.json();
      
      // La API suele retornar { success: true, data: { ... } } o { status: 'success', ... }
      // Ajustaremos según lo que retorne la API real. 
      // Por ahora asumo un formato estándar y guardo los datos.
      if (data.status === 'success' || data.success) {
        const sessionData = data.usuario || data.user || data.data || data;
        
        // Verificamos si el rol_id es el de conductor (3)
        if (sessionData.rol_id != 3) {
          return { 
            success: false, 
            isWrongRole: true,
            message: 'No eres conductor, serás redireccionado al portal correspondiente.',
            redirectUrl: 'https://transporteskemuel.mambacode.dev/login/index.php'
          };
        }

        // Agregamos marca de tiempo para seguridad
        sessionData.loginTimestamp = Date.now();

        localStorage.setItem('user_session', JSON.stringify(sessionData));
        return { success: true, data: data };
      } else {
        return { success: false, message: data.message || 'Credenciales incorrectas' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error.message };
    }
  },

  async logout() {
    localStorage.removeItem('user_session');
    
    // Cerramos el menú por si está abierto
    const menu = document.querySelector('ion-menu');
    if (menu) {
      await menu.close();
      menu.disabled = true;
    }

    // Usamos href para forzar un recargo completo de la App y limpiar estados/procesos
    window.location.href = '/login';
  },

  isLoggedIn() {
    const session = localStorage.getItem('user_session');
    if (!session) return false;

    try {
      const data = JSON.parse(session);
      
      // Si no tiene marca de tiempo (sesiones viejas), le ponemos una ahora o forzamos re-login
      if (!data.loginTimestamp) return false;

      const hoursElapsed = (Date.now() - data.loginTimestamp) / (1000 * 60 * 60);
      
      // Si han pasado más de 24 horas, la sesión expira
      if (hoursElapsed > 24) {
        this.logout();
        return false;
      }

      return true;
    } catch (e) {
      return false;
    }
  },

  getUser() {
    const user = localStorage.getItem('user_session');
    return user ? JSON.parse(user) : null;
  }
};
