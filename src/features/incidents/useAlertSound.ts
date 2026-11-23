import { useCallback, useEffect, useRef, useState } from 'react';

const SOUND_URL = '/sounds/critical-alert.mp3';

export type SoundState = 'disabled' | 'enabled' | 'blocked';

/**
 * Sonido de alertas críticas respetando las restricciones de autoplay (RF09, RF12).
 *
 * Los navegadores no permiten reproducir audio sin un gesto de la persona usuaria.
 * Por eso el sonido empieza desactivado y se habilita con un botón visible (`enable`).
 * Si el navegador bloquea la reproducción, el estado pasa a `blocked` y la interfaz lo
 * avisa: la alerta visual nunca depende del audio.
 */
export function useAlertSound(criticalAlertIds: readonly string[]) {
  const [state, setState] = useState<SoundState>('disabled');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Alertas que ya sonaron, para no repetir el sonido en cada render o reconexión. */
  const announcedRef = useRef(new Set<string>());

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(SOUND_URL);
      audioRef.current.preload = 'auto';
    }
    return audioRef.current;
  }, []);

  /** Debe llamarse desde un clic: desbloquea el audio reproduciéndolo en silencio. */
  const enable = useCallback(async () => {
    const audio = getAudio();
    try {
      audio.muted = true;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      setState('enabled');
    } catch {
      audio.muted = false;
      setState('blocked');
    }
  }, [getAudio]);

  const disable = useCallback(() => {
    audioRef.current?.pause();
    setState('disabled');
  }, []);

  const key = criticalAlertIds.join('|');
  useEffect(() => {
    if (state !== 'enabled') return;
    const fresh = key.split('|').filter((id) => id !== '' && !announcedRef.current.has(id));
    if (fresh.length === 0) return;
    for (const id of fresh) announcedRef.current.add(id);
    const audio = getAudio();
    audio.currentTime = 0;
    audio.play().catch(() => setState('blocked'));
  }, [key, state, getAudio]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );

  return { state, enable, disable };
}
