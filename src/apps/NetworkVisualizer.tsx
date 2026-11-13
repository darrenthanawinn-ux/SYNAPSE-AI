import { useEffect, useRef, useState } from 'react';

const N = 60;
const COL_W = 4;
const CPU_W = N * COL_W;
const CPU_H = 80;
const SEG_H = 5;
const SEGS = CPU_H / SEG_H;
const NET_W = N * COL_W;
const NET_H = 64;
const SCALE = 2;

interface Box {
  name: string;
  cpu: number;
  mem: number;
  memMax: number;
  status: 'Running' | 'Degraded';
}

interface Data {
  cpu: number[];
  rx: number[];
  tx: number[];
  boxes: Box[];
  ticks: number;
}

const walk = (v: number, step: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v + (Math.random() - 0.5) * 2 * step));

const series = (start: number, step: number, lo: number, hi: number): number[] => {
  const out: number[] = [];
  let v = start;
  for (let i = 0; i < N; i++) {
    v = walk(v, step, lo, hi);
    out.push(v);
  }
  return out;
};

const makeBoxes = (): Box[] =>
  [
    ['api-gateway', 512],
    ['auth-svc', 256],
    ['worker-1', 1024],
    ['worker-2', 1024],
    ['postgres', 2048],
    ['redis', 512],
  ].map(([name, memMax]) => ({
    name: name as string,
    cpu: 20 + Math.random() * 40,
    mem: (memMax as number) * (0.3 + Math.random() * 0.3),
    memMax: memMax as number,
    status: 'Running' as const,
  }));

const initialData = (): Data => ({
  cpu: series(40, 10, 8, 95),
  rx: series(40, 14, 5, 100),
  tx: series(25, 10, 3, 80),
  boxes: makeBoxes(),
  ticks: 0,
});

function drawCpu(ctx: CanvasRenderingContext2D, cpu: number[]) {
  ctx.fillStyle = '#001800';
  ctx.fillRect(0, 0, CPU_W, CPU_H);
  ctx.fillStyle = '#003800';
  for (let y = 0; y < CPU_H; y += 20) ctx.fillRect(0, y, CPU_W, 1);
  cpu.forEach((v, i) => {
    const lit = Math.round((v / 100) * SEGS);
    for (let s = 0; s < lit; s++) {
      ctx.fillStyle = s < 9 ? '#00ff00' : s < 13 ? '#ffff00' : '#ff3030';
      ctx.fillRect(i * COL_W, CPU_H - (s + 1) * SEG_H, COL_W - 1, SEG_H - 1);
    }
  });
}

function drawStep(ctx: CanvasRenderingContext2D, values: number[], color: string) {
  const y = (v: number) => NET_H - 2 - (v / 100) * (NET_H - 6);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  values.forEach((v, i) => {
    const px = i * COL_W;
    if (i === 0) ctx.moveTo(px, Math.round(y(v)) + 0.5);
    else ctx.lineTo(px, Math.round(y(v)) + 0.5);
    ctx.lineTo(px + COL_W, Math.round(y(v)) + 0.5);
  });
  ctx.stroke();
}

function drawNet(ctx: CanvasRenderingContext2D, rx: number[], tx: number[]) {
  ctx.fillStyle = '#000018';
  ctx.fillRect(0, 0, NET_W, NET_H);
  ctx.fillStyle = '#000058';
  for (let y = 0; y < NET_H; y += 16) ctx.fillRect(0, y, NET_W, 1);
  drawStep(ctx, rx, '#00ffff');
  drawStep(ctx, tx, '#ffff00');
}

function Led({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bevel-in bg-black px-2 py-1">
      <div className="text-[10px] text-win-shadow">{label}</div>
      <div className="font-mono text-[22px] leading-tight" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

export default function NetworkVisualizer() {
  const [data, setData] = useState<Data>(initialData);
  const [running, setRunning] = useState(true);
  const cpuRef = useRef<HTMLCanvasElement>(null);
  const netRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!running) return;
    const tick = () =>
      setData((d) => {
        const boxes = d.boxes.map((b): Box => {
          const cpu = walk(b.cpu, 9, 2, 98);
          return { ...b, cpu, mem: walk(b.mem, 12, 64, b.memMax), status: cpu > 88 ? 'Degraded' : 'Running' };
        });
        const avg = boxes.reduce((a, b) => a + b.cpu, 0) / boxes.length;
        return {
          cpu: [...d.cpu.slice(1), avg],
          rx: [...d.rx.slice(1), walk(d.rx[N - 1], 25, 5, 100)],
          tx: [...d.tx.slice(1), walk(d.tx[N - 1], 18, 3, 80)],
          boxes,
          ticks: d.ticks + 1,
        };
      });
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [running]);

  useEffect(() => {
    const ctx = cpuRef.current?.getContext('2d');
    if (ctx) drawCpu(ctx, data.cpu);
  }, [data.cpu]);

  useEffect(() => {
    const ctx = netRef.current?.getContext('2d');
    if (ctx) drawNet(ctx, data.rx, data.tx);
  }, [data.rx, data.tx]);

  const cpuNow = data.cpu[N - 1];
  const memUsed = data.boxes.reduce((a, b) => a + b.mem, 0);
  const memMax = data.boxes.reduce((a, b) => a + b.memMax, 0);
  const healthy = data.boxes.filter((b) => b.status === 'Running').length;
  const cpuColor = cpuNow > 80 ? '#ff3030' : cpuNow > 60 ? '#ffff00' : '#00ff00';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[6px] overflow-auto p-[3px]">
      <div className="flex gap-[6px]">
        <div className="flex flex-col gap-[6px]">
          <div>
            <div className="pb-[2px] font-bold">CPU history (60s)</div>
            <canvas
              ref={cpuRef}
              width={CPU_W}
              height={CPU_H}
              className="bevel-in block bg-black p-[2px]"
              style={{ width: CPU_W * SCALE + 4, height: CPU_H * SCALE + 4, imageRendering: 'pixelated' }}
              aria-label="CPU usage history chart"
            />
          </div>
          <div>
            <div className="flex items-center gap-3 pb-[2px] font-bold">
              Network I/O
              <span className="font-normal" style={{ color: '#008080' }}>
                RX
              </span>
              <span className="font-normal" style={{ color: '#808000' }}>
                TX
              </span>
            </div>
            <canvas
              ref={netRef}
              width={NET_W}
              height={NET_H}
              className="bevel-in block bg-black p-[2px]"
              style={{ width: NET_W * SCALE + 4, height: NET_H * SCALE + 4, imageRendering: 'pixelated' }}
              aria-label="Network throughput chart"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
          <Led label="CPU" value={`${Math.round(cpuNow)}%`} color={cpuColor} />
          <Led label="MEMORY" value={`${(memUsed / 1024).toFixed(1)}/${(memMax / 1024).toFixed(0)}G`} color="#00ff00" />
          <Led label="RX MB/s" value={`${Math.round(data.rx[N - 1])}`} color="#00ffff" />
          <Led label="TX MB/s" value={`${Math.round(data.tx[N - 1])}`} color="#ffff00" />
          <Led label="CONTAINERS" value={`${healthy}/${data.boxes.length}`} color={healthy === data.boxes.length ? '#00ff00' : '#ff3030'} />
        </div>
      </div>

      <div className="bevel-field min-h-0 flex-1 overflow-auto">
        <div className="grid grid-cols-[1.4fr_1.6fr_1fr_0.9fr] bg-win-face px-1 py-[2px] font-bold">
          <span>Container</span>
          <span>CPU</span>
          <span>Memory</span>
          <span>State</span>
        </div>
        {data.boxes.map((b) => (
          <div key={b.name} className="grid grid-cols-[1.4fr_1.6fr_1fr_0.9fr] items-center px-1 py-[2px]">
            <span className="font-mono">{b.name}</span>
            <span className="flex items-center gap-2">
              <span className="bevel-in block h-3 w-24 bg-white p-[2px]">
                <span className="block h-full bg-win-title" style={{ width: `${b.cpu}%` }} />
              </span>
              <span className="w-8 font-mono">{Math.round(b.cpu)}%</span>
            </span>
            <span className="font-mono">
              {Math.round(b.mem)}/{b.memMax}M
            </span>
            <span style={{ color: b.status === 'Running' ? '#006000' : '#c00000' }}>{b.status}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" className="btn95 w-[84px]" onClick={() => setRunning((r) => !r)}>
          {running ? 'Freeze' : 'Resume'}
        </button>
        <div className="bevel-thin-in flex-1 px-2 py-[2px]">
          {running ? 'Live, updating every 1s' : 'Frozen'} - tick #{data.ticks}
        </div>
      </div>
    </div>
  );
}
