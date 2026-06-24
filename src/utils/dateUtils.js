/**
 * Normaliza un valor de fecha a formato YYYY-MM-DD de forma segura
 * @param {string|Date} dateValue - ISO string, Date object o string simple
 * @returns {string} Fecha en formato YYYY-MM-DD o ''
 */
export function normalizeDateKey(dateValue) {
  if (!dateValue) return '';
  
  try {
    if (typeof dateValue === 'string') {
      // Si ya es YYYY-MM-DD, devolverlo
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      // Si es ISO string o date string, extraer la parte de fecha
      return dateValue.substring(0, 10);
    }
    
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0];
    }
  } catch (e) {
    console.warn('Error normalizando fecha:', e);
  }
  
  return '';
}

/**
 * Comprueba si una fecha está dentro de un rango
 * @param {string|Date} dateValue - Fecha a comparar
 * @param {string} start - Fecha inicio en YYYY-MM-DD
 * @param {string} end - Fecha fin en YYYY-MM-DD
 * @returns {boolean}
 */
export function isDateInRange(dateValue, start, end) {
  if (!dateValue || !start || !end) return false;
  const normalized = normalizeDateKey(dateValue);
  return normalized >= start && normalized <= end;
}

/**
 * Obtiene rango de fechas para un período
 * @param {string} periodo - 'hoy', 'semana', '7dias', '30dias', 'mes', 'año', 'personalizado'
 * @param {string} customStart - Fecha inicio personalizada (si aplica)
 * @param {string} customEnd - Fecha fin personalizada (si aplica)
 * @returns {{start: string, end: string}} Rango en YYYY-MM-DD
 */
export function getPeriodRange(periodo, customStart = '', customEnd = '') {
  const today = new Date();
  
  const fmt = (d) => d.toISOString().split('T')[0];
  const startOf = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  switch (periodo) {
    case 'hoy': {
      const d = fmt(today);
      return { start: d, end: d };
    }
    
    case 'semana': {
      const mon = new Date(today);
      mon.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
      return { start: fmt(startOf(mon)), end: fmt(today) };
    }
    
    case '7dias': {
      const s = new Date(today);
      s.setDate(today.getDate() - 6);
      return { start: fmt(s), end: fmt(today) };
    }
    
    case '30dias': {
      const s = new Date(today);
      s.setDate(today.getDate() - 29);
      return { start: fmt(s), end: fmt(today) };
    }
    
    case 'mes': {
      return {
        start: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
        end: fmt(today),
      };
    }
    
    case 'año': {
      return {
        start: fmt(new Date(today.getFullYear(), 0, 1)),
        end: fmt(today),
      };
    }
    
    case 'personalizado': {
      return { start: customStart || '', end: customEnd || '' };
    }
    
    default: {
      const d = fmt(today);
      return { start: d, end: d };
    }
  }
}