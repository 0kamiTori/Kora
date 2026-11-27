import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createConnectivityWatchdog,
  type ConnectivityState,
} from '../../src/features/trips/useConnectivityWatchdog';

/**
 * RNF04: pérdida de señal cuando pasan MÁS de 30 s sin posiciones.
 * El umbral se pasa como dato (viene de los parámetros versionados); 30 s es el caso del diseño.
 */
const THRESHOLD_MS = 30_000;

describe('connectivity watchdog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays online just before and exactly at the threshold', () => {
    const watchdog = createConnectivityWatchdog({ thresholdMs: THRESHOLD_MS });
    watchdog.start();
    watchdog.notifyPosition('p-1');

    vi.advanceTimersByTime(THRESHOLD_MS - 1);
    expect(watchdog.getState().status).toBe('online');

    vi.advanceTimersByTime(1);
    expect(watchdog.getState().status).toBe('online');
    watchdog.stop();
  });

  it('marks signal loss right after the threshold is exceeded', () => {
    const watchdog = createConnectivityWatchdog({ thresholdMs: THRESHOLD_MS });
    watchdog.start();
    watchdog.notifyPosition('p-1');

    vi.advanceTimersByTime(THRESHOLD_MS + 1);
    expect(watchdog.getState().status).toBe('lost');
    watchdog.stop();
  });

  it('keeps the time of the last position when the signal is lost', () => {
    const watchdog = createConnectivityWatchdog({ thresholdMs: THRESHOLD_MS });
    watchdog.start();
    const receivedAt = Date.now();
    watchdog.notifyPosition('p-1');

    vi.advanceTimersByTime(THRESHOLD_MS * 3);
    expect(watchdog.getState()).toEqual({ status: 'lost', lastReceivedAt: receivedAt });
    watchdog.stop();
  });

  it('resumes when a new position arrives after a loss', () => {
    const watchdog = createConnectivityWatchdog({ thresholdMs: THRESHOLD_MS });
    watchdog.start();
    watchdog.notifyPosition('p-1');
    vi.advanceTimersByTime(THRESHOLD_MS + 5_000);
    expect(watchdog.getState().status).toBe('lost');

    expect(watchdog.notifyPosition('p-2')).toBe(true);
    expect(watchdog.getState().status).toBe('online');

    // La cuenta empieza de nuevo desde la posición recién recibida.
    vi.advanceTimersByTime(THRESHOLD_MS);
    expect(watchdog.getState().status).toBe('online');
    vi.advanceTimersByTime(1);
    expect(watchdog.getState().status).toBe('lost');
    watchdog.stop();
  });

  it('ignores duplicated positions so a replay does not extend the signal', () => {
    const watchdog = createConnectivityWatchdog({ thresholdMs: THRESHOLD_MS });
    watchdog.start();
    expect(watchdog.notifyPosition('p-1')).toBe(true);

    // Tras una reconexión el servidor reenvía el mismo evento 20 s después.
    vi.advanceTimersByTime(20_000);
    expect(watchdog.notifyPosition('p-1')).toBe(false);

    // Si el duplicado contara, la señal duraría hasta el segundo 50. No debe.
    vi.advanceTimersByTime(10_001);
    expect(watchdog.getState().status).toBe('lost');
    watchdog.stop();
  });

  it('treats an already old position as lost instead of current', () => {
    const watchdog = createConnectivityWatchdog({ thresholdMs: THRESHOLD_MS });
    watchdog.start();
    watchdog.notifyPosition('p-old', Date.now() - 95_000);
    expect(watchdog.getState().status).toBe('lost');
    watchdog.stop();
  });

  it('waits for the first position and reports loss if none arrives', () => {
    const watchdog = createConnectivityWatchdog({ thresholdMs: THRESHOLD_MS });
    watchdog.start();
    expect(watchdog.getState()).toEqual({ status: 'waiting', lastReceivedAt: null });

    vi.advanceTimersByTime(THRESHOLD_MS + 1);
    expect(watchdog.getState()).toEqual({ status: 'lost', lastReceivedAt: null });
    watchdog.stop();
  });

  it('notifies listeners on every transition', () => {
    const states: ConnectivityState['status'][] = [];
    const watchdog = createConnectivityWatchdog({
      thresholdMs: THRESHOLD_MS,
      onChange: (state) => states.push(state.status),
    });
    watchdog.start();
    watchdog.notifyPosition('p-1');
    vi.advanceTimersByTime(THRESHOLD_MS + 1);
    watchdog.notifyPosition('p-2');

    const transitions = states.filter((status, index) => status !== states[index - 1]);
    expect(transitions).toEqual(['waiting', 'online', 'lost', 'online']);
    watchdog.stop();
  });

  it('honours a different configured threshold', () => {
    const watchdog = createConnectivityWatchdog({ thresholdMs: 10_000 });
    watchdog.start();
    watchdog.notifyPosition('p-1');
    vi.advanceTimersByTime(10_000);
    expect(watchdog.getState().status).toBe('online');
    vi.advanceTimersByTime(1);
    expect(watchdog.getState().status).toBe('lost');
    watchdog.stop();
  });

  it('stops firing after stop()', () => {
    const onChange = vi.fn();
    const watchdog = createConnectivityWatchdog({ thresholdMs: THRESHOLD_MS, onChange });
    watchdog.start();
    watchdog.notifyPosition('p-1');
    watchdog.stop();
    onChange.mockClear();

    vi.advanceTimersByTime(THRESHOLD_MS * 2);
    expect(onChange).not.toHaveBeenCalled();
    expect(watchdog.getState().status).toBe('online');
  });
});
