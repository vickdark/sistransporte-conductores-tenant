export const FUEL_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://test-transporteskemuel.mambacode.dev/api-transporte-kemuel/';

export const fuelService = {
  async saveFuelEntry(fuelData) {
    try {
      const response = await fetch(`${FUEL_API_BASE_URL}combustible/recarga_combustible.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(fuelData)
      });

      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.group('⚠️ ERROR DE RESPUESTA NO-JSON');
        console.error('Status:', response.status);
        console.error('Respuesta Raw:', responseText);
        console.groupEnd();
        throw new Error(`Servidor (${response.status}): ${responseText.substring(0, 100)}`);
      }

      if (!response.ok || data.error || data.status === 'error') {
        console.group('❌ ERROR DESDE API');
        console.error('Payload enviado:', fuelData);
        console.error('Data recibida:', data);
        console.groupEnd();
        const msg = data.error || data.message || data.details || 'Error desconocido en el servidor al guardar la recarga.';
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }

      return data;

    } catch (error) {
      console.error('Error in saveFuelEntry:', error);
      throw error;
    }
  }
};
