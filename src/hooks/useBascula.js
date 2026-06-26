'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  conectarBascula,
  desconectarBascula,
  leerPeso as leerPesoBascula,
  verificarSoporte,
} from '@/lib/hardware/bascula';

export function useBascula(config) {
  const [soportada, setSoportada] = useState(false);
  const [puerto, setPuerto] = useState(null);
  const [pesoActual, setPesoActual] = useState(null);

  useEffect(() => {
    setSoportada(verificarSoporte());
  }, []);

  useEffect(() => {
    if (config?.bascula_activa || !puerto) return undefined;

    let cancelado = false;
    desconectarBascula(puerto)
      .catch(() => {})
      .finally(() => {
        if (!cancelado) {
          setPuerto(null);
          setPesoActual(null);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [config?.bascula_activa, puerto]);

  useEffect(() => {
    return () => {
      if (puerto) {
        desconectarBascula(puerto).catch(() => {});
      }
    };
  }, [puerto]);

  const conectar = useCallback(async () => {
    if (!config?.bascula_activa) return null;

    const puertoConectado = await conectarBascula();
    setPuerto(puertoConectado);
    return puertoConectado;
  }, [config?.bascula_activa]);

  const leerPeso = useCallback(async () => {
    if (!puerto) {
      throw new Error('Conecta la báscula antes de leer el peso.');
    }

    const peso = await leerPesoBascula(puerto);
    setPesoActual(peso);
    return peso;
  }, [puerto]);

  const desconectar = useCallback(async () => {
    if (!puerto) return;

    await desconectarBascula(puerto);
    setPuerto(null);
    setPesoActual(null);
  }, [puerto]);

  return {
    soportada,
    conectada: !!puerto,
    conectar,
    leerPeso,
    desconectar,
    pesoActual,
  };
}

export default useBascula;
