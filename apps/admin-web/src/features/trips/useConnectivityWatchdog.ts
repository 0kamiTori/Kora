import { useEffect, useRef, useState } from 'react';

/**
 * Vigilancia de conectividad GPS (RNF04, RF11).
 * Regla: si pasan MÁS de `thresholdMs` sin posiciones nuevas, el viaje queda "sin señal".
 * El umbral llega de los parámetros versionados; aquí no hay ningún valor fijo.
 */

export type ConnectivityStatus = 'waiting' | 'online' | 'lost';

export interface ConnectivityState {
  status: ConnectivityStatus;
  /** Instante (ms) de la última posición aceptada; null si aún no hay ninguna. */
  lastReceivedAt: number | null;
}

export interface ConnectivityWatchdog {
  /** Inicia la vigilancia. `lastReceivedAt` permite partir de una posición ya conocida. */
  start(lastReceivedAt?: number | null): void;
  /**
   * Registra una posición. Devuelve false si se ignora por duplicada: un evento repetido
   * tras una reconexión no es un dato nuevo y no debe reiniciar la cuenta.
   */
  notifyPosition(positionId: string, receivedAt?: number): boolean;
  getState(): ConnectivityState;
  stop(): void;
}

interface WatchdogOptions {
  thresholdMs: number;
  onChange?: (state: ConnectivityState) => void;
  /** Reloj inyectable para pruebas. Por defecto, Date.now. */
  now?: () => number;
}

const SEEN_CAPACITY = 200;

export function createConnectivityWatchdog(options: WatchdogOptions): ConnectivityWatchdog {
  const { thresholdMs, onChange } = options;
  const now = options.now ?? (() => Date.now());
  const seen = new Set<string>();
  const seenOrder: string[] = [];
  let state: ConnectivityState = { status: 'waiting', lastReceivedAt: null };
  let startedAt: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clear = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const setState = (next: ConnectivityState) => {
    if (next.status === state.status && next.lastReceivedAt === state.lastReceivedAt) return;
    state = next;
    onChange?.(state);
  };

  /** Recalcula el estado según el tiempo transcurrido y programa el siguiente vencimiento. */
  const evaluate = () => {
    clear();
    if (startedAt === null) return;
    const reference = state.lastReceivedAt ?? startedAt;
    const elapsed = now() - reference;
    if (elapsed > thresholdMs) {
      setState({ status: 'lost', lastReceivedAt: state.lastReceivedAt });
      return;
    }
    setState({
      status: state.lastReceivedAt === null ? 'waiting' : 'online',
      lastReceivedAt: state.lastReceivedAt,
    });
    // "Más de" el umbral: vence 1 ms después de cumplirlo, no en el instante exacto.
    timer = setTimeout(evaluate, thresholdMs - elapsed + 1);
  };

  return {
    start(lastReceivedAt = null) {
      startedAt = now();
      state = { status: 'waiting', lastReceivedAt };
      evaluate();
      onChange?.(state);
    },
    notifyPosition(positionId, receivedAt = now()) {
      if (seen.has(positionId)) return false;
      seen.add(positionId);
      seenOrder.push(positionId);
      if (seenOrder.length > SEEN_CAPACITY) {
        const oldest = seenOrder.shift();
        if (oldest !== undefined) seen.delete(oldest);
      }
      // Una posición más antigua que la última conocida no adelanta el reloj.
      const latest = Math.max(receivedAt, state.lastReceivedAt ?? Number.NEGATIVE_INFINITY);
      if (startedAt === null) startedAt = now();
      state = { status: state.status, lastReceivedAt: latest };
      const previous = state;
      evaluate();
      if (state === previous) onChange?.(state);
      return true;
    },
    getState: () => state,
    stop() {
      clear();
      startedAt = null;
    },
  };
}

interface UseConnectivityWatchdogOptions {
  /** Umbral vigente en ms; null mientras los parámetros no han cargado. */
  thresholdMs: number | null;
  /** Identificador de la última posición conocida. */
  positionId: string | null;
  /** Instante (ms) en que se recibió esa posición. */
  receivedAt: number | null;
}

const WAITING: ConnectivityState = { status: 'waiting', lastReceivedAt: null };

/** Estado de conectividad de un viaje a partir de su última posición conocida. */
export function useConnectivityWatchdog({
  thresholdMs,
  positionId,
  receivedAt,
}: UseConnectivityWatchdogOptions): ConnectivityState {
  const [state, setState] = useState<ConnectivityState>(WAITING);
  const watchdogRef = useRef<ConnectivityWatchdog | null>(null);

  useEffect(() => {
    if (thresholdMs === null) {
      setState(WAITING);
      return;
    }
    const watchdog = createConnectivityWatchdog({ thresholdMs, onChange: setState });
    watchdogRef.current = watchdog;
    watchdog.start();
    return () => {
      watchdog.stop();
      watchdogRef.current = null;
    };
  }, [thresholdMs]);

  useEffect(() => {
    if (thresholdMs === null || positionId === null || receivedAt === null) return;
    watchdogRef.current?.notifyPosition(positionId, receivedAt);
  }, [thresholdMs, positionId, receivedAt]);

  return state;
}
