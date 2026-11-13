import { useEffect, useRef, useState } from 'react';
import type { AppId, WinState } from '../types';
import { APPS, APP_ORDER } from '../apps/registry';
import Icon from './Icon';

interface TaskbarProps {
  windows: WinState[];
  activeId: string | null;
  onTask: (id: string) => void;
  onLaunch: (app: AppId) => void;
  onShutdown: () => void;
}

export default function Taskbar({ windows, activeId, onTask, onLaunch, onShutdown }: TaskbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 10000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const launch = (app: AppId) => {
    setMenuOpen(false);
    onLaunch(app);
  };

  return (
    <div
      className="taskbar-surface absolute inset-x-0 bottom-0 z-[9999] flex items-center gap-1 px-[2px]"
      style={{ height: 28 }}
    >
      <div ref={wrap} className="relative">
        {menuOpen && (
          <div
            role="menu"
            className="bevel-out absolute bottom-full left-0 z-[10000] mb-[2px] flex w-[200px]"
          >
            <div className="flex w-[22px] items-end bg-win-title pb-2">
              <span
                className="whitespace-nowrap text-[16px] font-bold leading-none text-win-face"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto' }}
              >
                SYNAPSE<span className="font-normal">-95</span>
              </span>
            </div>
            <div className="flex flex-1 flex-col py-[3px]">
              {APP_ORDER.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  className="menu-item flex items-center gap-3 px-2 py-[5px] text-left text-[12px]"
                  onClick={() => launch(id)}
                >
                  <Icon name={APPS[id].icon} size={24} />
                  {APPS[id].title}
                </button>
              ))}
              <div className="menu-sep" />
              <button
                type="button"
                role="menuitem"
                className="menu-item flex items-center gap-3 px-2 py-[5px] text-left text-[12px]"
                onClick={() => {
                  setMenuOpen(false);
                  onShutdown();
                }}
              >
                <Icon name="power" size={24} />
                Shut Down...
              </button>
            </div>
          </div>
        )}
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          className={`btn95 h-[22px] min-h-0 px-[6px] font-bold ${menuOpen ? 'is-active' : ''}`}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <Icon name="logo" size={16} />
          Start
        </button>
      </div>

      <div className="mx-[2px] h-[22px] w-[2px] bevel-thin-in" />

      <div className="flex min-w-0 flex-1 gap-1">
        {windows.map((w) => (
          <button
            key={w.id}
            type="button"
            title={APPS[w.app].title}
            className={`btn95 h-[22px] min-h-0 w-[160px] min-w-0 shrink justify-start px-[6px] ${
              w.id === activeId ? 'is-active font-bold' : ''
            }`}
            onClick={() => onTask(w.id)}
          >
            <Icon name={APPS[w.app].icon} size={14} />
            <span className="truncate">{APPS[w.app].title}</span>
          </button>
        ))}
      </div>

      <div className="bevel-thin-in flex h-[22px] items-center gap-2 px-2" aria-label="Clock">
        <span className="font-mono text-[11px]">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
