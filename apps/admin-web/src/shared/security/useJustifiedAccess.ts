import { useCallback, useState } from 'react';
import { validateJustification } from '../utils/validators';

type AccessStatus = 'idle' | 'loading' | 'granted' | 'error';

interface AccessState<T> {
  status: AccessStatus;
  data: T | null;
  error: unknown;
}

const INITIAL = { status: 'idle', data: null, error: null } as const;

/**
 * Acceso justificado a datos sensibles (RNF02).
 *
 * El dato solo se pide al backend DESPUÉS de que la persona escribe una justificación
 * válida, y la justificación viaja en la misma petición para quedar en auditoría.
 * El resultado vive únicamente en el estado de este componente: no se guarda en caché
 * y desaparece al llamar `hide()` o al salir de la pantalla.
 */
export function useJustifiedAccess<T>(fetcher: (justification: string) => Promise<T>) {
  const [isPrompting, setPrompting] = useState(false);
  const [state, setState] = useState<AccessState<T>>(INITIAL);

  const requestAccess = useCallback(() => {
    setState((current) => (current.status === 'error' ? INITIAL : current));
    setPrompting(true);
  }, []);

  const cancel = useCallback(() => {
    setPrompting(false);
    setState((current) => (current.status === 'granted' ? current : INITIAL));
  }, []);

  const confirm = useCallback(
    async (justification: string) => {
      const trimmed = justification.trim();
      // Defensa adicional: sin justificación válida no se llama al backend.
      if (validateJustification(trimmed) !== null) return;
      setState({ status: 'loading', data: null, error: null });
      try {
        const data = await fetcher(trimmed);
        setState({ status: 'granted', data, error: null });
        setPrompting(false);
      } catch (error) {
        setState({ status: 'error', data: null, error });
      }
    },
    [fetcher],
  );

  const hide = useCallback(() => setState(INITIAL), []);

  return {
    isPrompting,
    status: state.status,
    data: state.data,
    error: state.error,
    requestAccess,
    confirm,
    cancel,
    hide,
  };
}
