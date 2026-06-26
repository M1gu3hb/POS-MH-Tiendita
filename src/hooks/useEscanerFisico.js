'use client';

import { useEffect } from 'react';
import escanerFisico from '@/lib/hardware/escanerFisico';

export function useEscanerFisico(config, onScan) {
  useEffect(() => {
    if (!config?.escaner_fisico_activo || typeof onScan !== 'function') {
      return undefined;
    }

    escanerFisico.iniciar(onScan);
    return () => escanerFisico.detener();
  }, [config?.escaner_fisico_activo, onScan]);
}

export default useEscanerFisico;
