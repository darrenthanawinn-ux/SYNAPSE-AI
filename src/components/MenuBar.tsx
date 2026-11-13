import { useEffect, useRef, useState } from 'react';

export interface MenuItem {
  label?: string;
  hint?: string;
  checked?: boolean;
  disabled?: boolean;
  separator?: boolean;
  onSelect?: () => void;
}

export interface MenuDef {
  label: string;
  items: MenuItem[];
}

export default function MenuBar({ menus }: { menus: MenuDef[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open === null) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} role="menubar" className="relative flex px-[2px] py-[1px]">
      {menus.map((menu, i) => (
        <div key={menu.label} className="relative">
          <button
            type="button"
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={open === i}
            className={`px-2 py-[1px] ${open === i ? 'bg-win-title text-white' : ''}`}
            onClick={() => setOpen(open === i ? null : i)}
            onMouseEnter={() => {
              if (open !== null) setOpen(i);
            }}
          >
            {menu.label}
          </button>
          {open === i && (
            <div role="menu" className="bevel-out absolute left-0 top-full z-50 min-w-[200px] py-[3px]">
              {menu.items.map((item, j) =>
                item.separator ? (
                  <div key={j} className="menu-sep" />
                ) : (
                  <button
                    key={j}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    className="menu-item flex w-full items-center py-[2px] pl-1 pr-6 text-left"
                    onClick={() => {
                      setOpen(null);
                      item.onSelect?.();
                    }}
                  >
                    <span className="flex w-4 justify-center">
                      {item.checked && (
                        <svg width="8" height="8" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
                          <path d="M0 4 L1 3 L3 5 L7 1 L8 2 L3 7 Z" fill="currentColor" />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 whitespace-nowrap pl-1">{item.label}</span>
                    {item.hint && <span className="pl-6">{item.hint}</span>}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
