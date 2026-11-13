import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

const BLOCKS = 20;

export function BootScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const t = window.setInterval(() => setProgress((p) => Math.min(100, p + 5)), 100);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (progress < 100) return;
    const t = window.setTimeout(() => done.current(), 250);
    return () => window.clearTimeout(t);
  }, [progress]);

  const lit = Math.round((progress / 100) * BLOCKS);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-black text-white">
      <div className="flex items-center gap-4">
        <Icon name="logo" size={64} />
        <div>
          <div className="text-[40px] font-bold leading-none tracking-wide">SYNAPSE-95</div>
          <div className="mt-1 text-[12px] text-win-shadow">Browser Operating System</div>
        </div>
      </div>
      <div className="bevel-in h-[18px] w-[240px] bg-black p-[3px]" role="progressbar" aria-valuenow={progress}>
        <div className="flex h-full gap-[2px]">
          {Array.from({ length: BLOCKS }, (_, i) => (
            <div key={i} className="h-full flex-1" style={{ background: i < lit ? '#1084d0' : 'transparent' }} />
          ))}
        </div>
      </div>
      <div className="font-mono text-[12px] text-win-shadow">Starting SYNAPSE-95...</div>
    </div>
  );
}

export function ShutdownScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <button
      type="button"
      onClick={onRestart}
      className="fixed inset-0 flex cursor-default flex-col items-center justify-center gap-6 bg-black text-center focus:outline-none"
    >
      <div className="text-[22px] leading-snug" style={{ color: '#ff8000' }}>
        It&apos;s now safe to turn off
        <br />
        your computer.
      </div>
      <div className="font-mono text-[12px] text-win-shadow">Click anywhere to restart.</div>
    </button>
  );
}
