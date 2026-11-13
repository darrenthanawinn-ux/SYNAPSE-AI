import { useCallback, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { AppId } from './types';
import { useWindowManager, TASKBAR_H } from './hooks/useWindowManager';
import { APPS, APP_ORDER } from './apps/registry';
import Window from './components/Window';
import Taskbar from './components/Taskbar';
import DesktopIcon from './components/DesktopIcon';
import { BootScreen, ShutdownScreen } from './components/Screens';

type Phase = 'boot' | 'desktop' | 'off';

export default function App() {
  const { state, actions } = useWindowManager();
  const [phase, setPhase] = useState<Phase>('boot');
  const [selected, setSelected] = useState<AppId | null>(null);

  const launch = useCallback(
    (app: AppId) => {
      const def = APPS[app];
      actions.open(app, def.w, def.h);
      setSelected(null);
    },
    [actions],
  );

  const handleBooted = useCallback(() => {
    actions.reset();
    actions.open('terminal', APPS.terminal.w, APPS.terminal.h);
    setPhase('desktop');
  }, [actions]);

  const clearSelection = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!(e.target as HTMLElement).closest('[data-desktop-icon]')) setSelected(null);
  };

  if (phase === 'boot') return <BootScreen onDone={handleBooted} />;
  if (phase === 'off') return <ShutdownScreen onRestart={() => setPhase('boot')} />;

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-win-desktop">
      <div className="absolute inset-x-0 top-0" style={{ bottom: TASKBAR_H }} onPointerDown={clearSelection}>
        <div className="absolute inset-0 flex flex-col flex-wrap content-start gap-2 p-2">
          {APP_ORDER.map((id) => (
            <DesktopIcon
              key={id}
              icon={APPS[id].icon}
              label={APPS[id].label}
              selected={selected === id}
              onSelect={() => setSelected(id)}
              onOpen={() => launch(id)}
            />
          ))}
        </div>

        {state.windows.map((win) => {
          const def = APPS[win.app];
          return (
            <Window
              key={win.id}
              win={win}
              title={def.title}
              icon={def.icon}
              active={state.activeId === win.id}
              onFocus={actions.focus}
              onClose={actions.close}
              onMinimize={actions.minimize}
              onToggleMaximize={actions.toggleMaximize}
              onMove={actions.move}
            >
              {def.render()}
            </Window>
          );
        })}
      </div>

      <Taskbar
        windows={state.windows}
        activeId={state.activeId}
        onTask={actions.taskbar}
        onLaunch={launch}
        onShutdown={() => {
          actions.reset();
          setPhase('off');
        }}
      />
    </div>
  );
}
