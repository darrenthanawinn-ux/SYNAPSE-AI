import { useMemo, useReducer } from 'react';
import type { AppId, WinState } from '../types';

export const TASKBAR_H = 28;

export interface WMState {
  windows: WinState[];
  /** The highest-z window that is not minimized, or null. */
  activeId: string | null;
  zCounter: number;
  seq: number;
}

export type WMAction =
  | { type: 'open'; app: AppId; w: number; h: number; vw: number; vh: number }
  | { type: 'close'; id: string }
  | { type: 'minimize'; id: string }
  | { type: 'focus'; id: string }
  | { type: 'move'; id: string; x: number; y: number }
  | { type: 'toggleMaximize'; id: string }
  | { type: 'taskbar'; id: string }
  | { type: 'reset' };

export const initialWMState: WMState = { windows: [], activeId: null, zCounter: 0, seq: 0 };

/** Rebuilds state and recomputes the active window so the invariant always holds. */
function resolve(windows: WinState[], zCounter: number, seq: number): WMState {
  let top: WinState | null = null;
  for (const w of windows) {
    if (!w.minimized && (top === null || w.z > top.z)) top = w;
  }
  return { windows, activeId: top ? top.id : null, zCounter, seq };
}

const patch = (windows: WinState[], id: string, changes: Partial<WinState>): WinState[] =>
  windows.map((w) => (w.id === id ? { ...w, ...changes } : w));

export function wmReducer(state: WMState, action: WMAction): WMState {
  switch (action.type) {
    case 'open': {
      const seq = state.seq + 1;
      const z = state.zCounter + 1;
      const w = Math.min(action.w, action.vw - 8);
      const h = Math.min(action.h, action.vh - 8);
      const cascade = (state.seq % 8) * 28;
      const x = Math.max(0, Math.min(110 + cascade, action.vw - w));
      const y = Math.max(0, Math.min(16 + cascade, action.vh - h));
      const win: WinState = { id: `w${seq}`, app: action.app, x, y, w, h, z, minimized: false, maximized: false };
      return resolve([...state.windows, win], z, seq);
    }
    case 'close':
      return resolve(
        state.windows.filter((w) => w.id !== action.id),
        state.zCounter,
        state.seq,
      );
    case 'minimize':
      return resolve(patch(state.windows, action.id, { minimized: true }), state.zCounter, state.seq);
    case 'focus': {
      if (state.activeId === action.id) return state;
      if (!state.windows.some((w) => w.id === action.id)) return state;
      const z = state.zCounter + 1;
      return resolve(patch(state.windows, action.id, { z, minimized: false }), z, state.seq);
    }
    case 'move':
      return { ...state, windows: patch(state.windows, action.id, { x: action.x, y: action.y }) };
    case 'toggleMaximize': {
      const win = state.windows.find((w) => w.id === action.id);
      if (!win) return state;
      return { ...state, windows: patch(state.windows, action.id, { maximized: !win.maximized }) };
    }
    case 'taskbar': {
      const win = state.windows.find((w) => w.id === action.id);
      if (!win) return state;
      if (win.minimized) return wmReducer(state, { type: 'focus', id: action.id });
      if (state.activeId === action.id) return wmReducer(state, { type: 'minimize', id: action.id });
      return wmReducer(state, { type: 'focus', id: action.id });
    }
    case 'reset':
      return initialWMState;
  }
}

export function useWindowManager() {
  const [state, dispatch] = useReducer(wmReducer, initialWMState);

  const actions = useMemo(
    () => ({
      open: (app: AppId, w: number, h: number) =>
        dispatch({ type: 'open', app, w, h, vw: window.innerWidth, vh: window.innerHeight - TASKBAR_H }),
      close: (id: string) => dispatch({ type: 'close', id }),
      minimize: (id: string) => dispatch({ type: 'minimize', id }),
      focus: (id: string) => dispatch({ type: 'focus', id }),
      move: (id: string, x: number, y: number) => dispatch({ type: 'move', id, x, y }),
      toggleMaximize: (id: string) => dispatch({ type: 'toggleMaximize', id }),
      taskbar: (id: string) => dispatch({ type: 'taskbar', id }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [],
  );

  return { state, actions };
}
