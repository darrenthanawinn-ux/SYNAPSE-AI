import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useRef } from 'react';
import type { IconName, WinState } from '../types';
import { TASKBAR_H } from '../hooks/useWindowManager';
import Icon from './Icon';

interface WindowProps {
  win: WinState;
  title: string;
  icon: IconName;
  active: boolean;
  onFocus: (id: string) => void;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onToggleMaximize: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  children: ReactNode;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

const ACTIVE_BAR = 'linear-gradient(90deg, #000080, #1084d0)';
const INACTIVE_BAR = 'linear-gradient(90deg, #808080, #c0c0c0)';

export default function Window({
  win,
  title,
  icon,
  active,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onMove,
  children,
}: WindowProps) {
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (win.maximized || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { px: e.clientX, py: e.clientY, ox: win.x, oy: win.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight - TASKBAR_H;
    const x = clamp(d.ox + e.clientX - d.px, 80 - win.w, vw - 80);
    const y = clamp(d.oy + e.clientY - d.py, 0, vh - 22);
    onMove(win.id, x, y);
  };

  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const frame = win.maximized
    ? { left: 0, top: 0, width: '100%', height: '100%' }
    : { left: win.x, top: win.y, width: win.w, height: win.h };

  return (
    <div
      role="dialog"
      aria-label={title}
      className="bevel-out absolute flex-col p-[3px]"
      style={{ ...frame, zIndex: win.z, display: win.minimized ? 'none' : 'flex' }}
      onPointerDownCapture={() => onFocus(win.id)}
    >
      <div
        className="flex h-[18px] shrink-0 items-center gap-1 px-[2px] font-bold text-white"
        style={{ background: active ? ACTIVE_BAR : INACTIVE_BAR, touchAction: 'none' }}
        onPointerDown={onDown}
        onPointerMove={onDrag}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={() => onToggleMaximize(win.id)}
      >
        <Icon name={icon} size={14} />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <button
          type="button"
          className="btn95 btn95-sm"
          aria-label="Minimize"
          title="Minimize"
          onClick={() => onMinimize(win.id)}
        >
          <span className="mt-[5px] block h-[2px] w-[6px] bg-black" />
        </button>
        <button
          type="button"
          className="btn95 btn95-sm"
          aria-label={win.maximized ? 'Restore' : 'Maximize'}
          title={win.maximized ? 'Restore' : 'Maximize'}
          onClick={() => onToggleMaximize(win.id)}
        >
          {win.maximized ? (
            <svg width="9" height="9" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true">
              <path d="M2.5 0.5 H8.5 V5.5 H6.5 M0.5 2.5 H6.5 V8.5 H0.5 Z" fill="none" stroke="#000" />
            </svg>
          ) : (
            <span className="block h-[9px] w-[9px] border border-t-2 border-black" />
          )}
        </button>
        <button
          type="button"
          className="btn95 btn95-sm ml-[2px]"
          aria-label="Close"
          title="Close"
          onClick={() => onClose(win.id)}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
            <path d="M0 0 L8 8 M8 0 L0 8" stroke="#000" strokeWidth="1.6" />
          </svg>
        </button>
      </div>
      <div className="mt-[3px] flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
