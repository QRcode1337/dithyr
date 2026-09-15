import { useCallback, useReducer, useRef } from 'react';
import type { EffectInstance, Palette } from '../types';

export interface DocSnapshot {
  algorithmId: string;
  paletteId: string;
  customPalette: Palette | null;
  scale: number;
  threshold: number;
  preEffects: EffectInstance[];
  postEffects: EffectInstance[];
}

const MAX_HISTORY = 50;
const DEBOUNCE_MS = 300;

function cloneSnapshot(s: DocSnapshot): DocSnapshot {
  return structuredClone(s);
}

function sameSnapshot(a: DocSnapshot, b: DocSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface HistoryState {
  past: DocSnapshot[];
  present: DocSnapshot;
  future: DocSnapshot[];
}

type Action =
  | { type: 'commit'; next: DocSnapshot }
  | { type: 'replace'; next: DocSnapshot } // live update, no history
  | { type: 'seal'; base: DocSnapshot } // push base onto past after debounced gesture
  | { type: 'undo' }
  | { type: 'redo' };

function reducer(state: HistoryState, action: Action): HistoryState {
  switch (action.type) {
    case 'commit': {
      if (sameSnapshot(state.present, action.next)) return state;
      return {
        past: [...state.past, cloneSnapshot(state.present)].slice(-MAX_HISTORY),
        present: cloneSnapshot(action.next),
        future: [],
      };
    }
    case 'replace': {
      if (sameSnapshot(state.present, action.next)) return state;
      return { ...state, present: cloneSnapshot(action.next) };
    }
    case 'seal': {
      if (sameSnapshot(action.base, state.present)) return state;
      const last = state.past[state.past.length - 1];
      if (last && sameSnapshot(last, action.base)) {
        return { ...state, future: [] };
      }
      return {
        past: [...state.past, cloneSnapshot(action.base)].slice(-MAX_HISTORY),
        present: state.present,
        future: [],
      };
    }
    case 'undo': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: cloneSnapshot(previous),
        future: [cloneSnapshot(state.present), ...state.future].slice(0, MAX_HISTORY),
      };
    }
    case 'redo': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, cloneSnapshot(state.present)].slice(-MAX_HISTORY),
        present: cloneSnapshot(next),
        future: state.future.slice(1),
      };
    }
    default:
      return state;
  }
}

export function useDocHistory(initial: DocSnapshot) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    past: [] as DocSnapshot[],
    present: cloneSnapshot(initial),
    future: [] as DocSnapshot[],
  }));

  const presentRef = useRef(state.present);
  presentRef.current = state.present;

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceBase = useRef<DocSnapshot | null>(null);

  const flushDebounce = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    const base = debounceBase.current;
    debounceBase.current = null;
    if (base) {
      dispatch({ type: 'seal', base });
    }
  }, []);

  const commit = useCallback(
    (next: DocSnapshot | ((prev: DocSnapshot) => DocSnapshot)) => {
      flushDebounce();
      const prev = presentRef.current;
      const resolved = typeof next === 'function' ? next(cloneSnapshot(prev)) : next;
      presentRef.current = resolved;
      dispatch({ type: 'commit', next: resolved });
    },
    [flushDebounce]
  );

  const commitDebounced = useCallback(
    (next: DocSnapshot | ((prev: DocSnapshot) => DocSnapshot), ms = DEBOUNCE_MS) => {
      const prev = presentRef.current;
      if (debounceBase.current === null) {
        debounceBase.current = cloneSnapshot(prev);
      }
      const resolved = typeof next === 'function' ? next(cloneSnapshot(prev)) : next;
      presentRef.current = resolved;
      dispatch({ type: 'replace', next: resolved });
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        debounceTimer.current = null;
        const base = debounceBase.current;
        debounceBase.current = null;
        if (base) dispatch({ type: 'seal', base });
      }, ms);
    },
    []
  );

  const undo = useCallback(() => {
    flushDebounce();
    dispatch({ type: 'undo' });
  }, [flushDebounce]);

  const redo = useCallback(() => {
    flushDebounce();
    dispatch({ type: 'redo' });
  }, [flushDebounce]);

  return {
    present: state.present,
    commit,
    commitDebounced,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
