import { API_BASE_URL } from './authService.js';

export const checklistService = {
  async searchVehiculos(term = '') {
    try {
      const response = await fetch(`${API_BASE_URL}search/buscar_vehiculo.php?term=${term}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      return data.status === 'success' ? data.data : [];
    } catch (error) {
      console.error('Error in searchVehiculos:', error);
      return [];
    }
  },

  async saveChecklist(formData) {
    try {
      const response = await fetch(`${API_BASE_URL}operacion_driver/checklist.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error in saveChecklist:', error);
      return { success: false, error: 'Error de conexión' };
    }
  }
};
