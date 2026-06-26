import { useState, useCallback } from 'react';
import { useConfig } from '@/hooks/useConfig';
import { useAuth } from '@/lib/auth/AuthContext';
import { updateConfiguracion } from '@/lib/db/configuracion';
import { useQueryClient } from '@tanstack/react-query';

export function useOnboarding() {
  const { negocioId } = useAuth();
  const { config, isLoading } = useConfig();
  const queryClient = useQueryClient();
  const [pasoActual, setPasoActual] = useState(1);

  const mostrarTutorial = !isLoading && !!negocioId && config && config.onboarding_completado === false;

  const completarOnboarding = useCallback(async () => {
    if (!negocioId) return;
    try {
      await updateConfiguracion(negocioId, { onboarding_completado: true });
      await queryClient.invalidateQueries({ queryKey: ['config-negocio', negocioId] });
    } catch (err) {
      console.error('Error al completar onboarding:', err);
    }
  }, [negocioId, queryClient]);

  const siguientePaso = useCallback(() => {
    setPasoActual((prev) => Math.min(prev + 1, 4));
  }, []);

  const anteriorPaso = useCallback(() => {
    setPasoActual((prev) => Math.max(prev - 1, 1));
  }, []);

  return {
    mostrarTutorial,
    completarOnboarding,
    pasoActual,
    siguientePaso,
    anteriorPaso,
    setPasoActual,
  };
}
