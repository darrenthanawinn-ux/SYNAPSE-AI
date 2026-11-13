import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

type Tool = 'pen' | 'box' | 'fill' | 'erase';
type NodeKind = 'Load Balancer' | 'API Gateway' | 'Service' | 'Database' | 'Cache' | 'Message Queue';

interface GraphNode {
  id: string;
  kind: NodeKind;
  cx: number;
  cy: number;
  w: number;
  h: number;
}

interface Graph {
  nodes: GraphNode[];
  edges: [string, string][];
}

const CW = 440;
const CH = 340;
const CELL = 10;
const MAX_NODES = 8;

const COLORS = ['#000000', '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#808080'];

const KIND_META: Record<NodeKind, { prefix: string; slug: string; fill: string; replicas: number }> = {
  'Load Balancer': { prefix: 'lb', slug: 'load-balancer', fill: '#80ffff', replicas: 2 },
  'API Gateway': { prefix: 'gw', slug: 'api-gateway', fill: '#ffb060', replicas: 2 },
  Service: { prefix: 'svc', slug: 'service', fill: '#c0ffc0', replicas: 3 },
  Database: { prefix: 'db', slug: 'database', fill: '#c0c0ff', replicas: 1 },
  Cache: { prefix: 'cache', slug: 'cache', fill: '#ffff80', replicas: 1 },
  'Message Queue': { prefix: 'mq', slug: 'message-queue', fill: '#ffc0c0', replicas: 1 },
};

function classify(w: number, h: number, fill: number): NodeKind {
  if (w <= 44 && h <= 44) return 'Cache';
  if (fill >= 0.6) return 'Message Queue';
  if (w >= h * 1.8) return 'Load Balancer';
  if (h >= w * 1.5) return 'Database';
  if (w * h >= 12000) return 'API Gateway';
  return 'Service';
}

/** Finds separate inked shapes on the canvas and classifies each by its size and ink density. */
function detect(canvas: HTMLCanvasElement): GraphNode[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  const { width, height } = canvas;
  const px = ctx.getImageData(0, 0, width, height).data;
  const isInk = (i: number) => px[i] < 200 || px[i + 1] < 200 || px[i + 2] < 200;

  const cols = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);
  const occ = new Uint8Array(cols * rows);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isInk((y * width + x) * 4)) occ[Math.floor(y / CELL) * cols + Math.floor(x / CELL)] = 1;
    }
  }

  // Flood fill (8 neighbours) over the occupied cells to label connected shapes.
  const label = new Int32Array(cols * rows).fill(-1);
  let count = 0;
  for (let start = 0; start < occ.length; start++) {
    if (!occ[start] || label[start] >= 0) continue;
    const stack = [start];
    label[start] = count;
    while (stack.length > 0) {
      const c = stack.pop() as number;
      const cx = c % cols;
      const cy = Math.floor(c / cols);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const n = ny * cols + nx;
          if (occ[n] && label[n] < 0) {
            label[n] = count;
            stack.push(n);
          }
        }
      }
    }
    count++;
  }

  const stats = Array.from({ length: count }, () => ({ ink: 0, x0: width, y0: height, x1: 0, y1: 0 }));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isInk((y * width + x) * 4)) continue;
      const s = stats[label[Math.floor(y / CELL) * cols + Math.floor(x / CELL)]];
      s.ink++;
      if (x < s.x0) s.x0 = x;
      if (x > s.x1) s.x1 = x;
      if (y < s.y0) s.y0 = y;
      if (y > s.y1) s.y1 = y;
    }
  }

  const shapes = stats
    .map((s) => {
      const w = s.x1 - s.x0 + 1;
      const h = s.y1 - s.y0 + 1;
      return { w, h, cx: s.x0 + w / 2, cy: s.y0 + h / 2, fill: s.ink / (w * h), ink: s.ink };
    })
    // Drop specks, thin connector lines and sparse scribbles.
    .filter((s) => s.ink >= 20 && Math.min(s.w, s.h) >= 14 && s.fill >= 0.08)
    .sort((a, b) => b.w * b.h - a.w * a.h)
    .slice(0, MAX_NODES)
    .sort((a, b) => a.cx - b.cx || a.cy - b.cy);

  const counters: Partial<Record<NodeKind, number>> = {};
  return shapes.map((s) => {
    const kind = classify(s.w, s.h, s.fill);
    const n = (counters[kind] ?? 0) + 1;
    counters[kind] = n;
    return { id: `${KIND_META[kind].prefix}-${n}`, kind, cx: s.cx, cy: s.cy, w: s.w, h: s.h };
  });
}

function buildGraph(nodes: GraphNode[]): Graph {
  const edges: [string, string][] = [];
  for (let i = 0; i < nodes.length - 1; i++) edges.push([nodes[i].id, nodes[i + 1].id]);
  return { nodes, edges };
}

function manifest(graph: Graph): string {
  const lines = ['# synapse-compiled.yaml', 'apiVersion: synapse/v1', 'nodes:'];
  graph.nodes.forEach((n) => {
    const meta = KIND_META[n.kind];
    lines.push(`  - id: ${n.id}`, `    kind: ${meta.slug}`, `    replicas: ${meta.replicas}`);
  });
  lines.push('edges:');
  graph.edges.forEach(([a, b]) => lines.push(`  - ${a} -> ${b}`));
  return lines.join('\n');
}

const NODE_W = 116;
const NODE_H = 34;
const GAP_X = 24;
const GAP_Y = 26;
const PAD = 12;

function GraphView({ graph }: { graph: Graph }) {
  const place = new Map<string, { x: number; y: number }>();
  graph.nodes.forEach((n, i) => {
    place.set(n.id, { x: PAD + (i % 2) * (NODE_W + GAP_X), y: PAD + Math.floor(i / 2) * (NODE_H + GAP_Y) });
  });
  const rowCount = Math.ceil(graph.nodes.length / 2);
  const W = PAD * 2 + NODE_W * 2 + GAP_X;
  const H = PAD * 2 + rowCount * NODE_H + (rowCount - 1) * GAP_Y;

  const center = (id: string) => {
    const p = place.get(id) as { x: number; y: number };
    return { x: p.x + NODE_W / 2, y: p.y + NODE_H / 2 };
  };

  // Trim a center-to-center line so it starts and ends on the node borders.
  const edgePoints = (a: string, b: string) => {
    const ca = center(a);
    const cb = center(b);
    const dx = cb.x - ca.x;
    const dy = cb.y - ca.y;
    const s = Math.min(
      dx === 0 ? Infinity : NODE_W / 2 / Math.abs(dx),
      dy === 0 ? Infinity : NODE_H / 2 / Math.abs(dy),
    );
    return { x1: ca.x + dx * s, y1: ca.y + dy * s, x2: cb.x - dx * s, y2: cb.y - dy * s };
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Compiled architecture graph">
      <defs>
        <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="#000" />
        </marker>
      </defs>
      {graph.edges.map(([a, b]) => {
        const p = edgePoints(a, b);
        return (
          <line key={`${a}-${b}`} {...p} stroke="#000" strokeWidth="1.5" markerEnd="url(#arrow)" />
        );
      })}
      {graph.nodes.map((n) => {
        const p = place.get(n.id) as { x: number; y: number };
        return (
          <g key={n.id} shapeRendering="crispEdges">
            <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} fill={KIND_META[n.kind].fill} stroke="#000" />
            <rect x={p.x + 1} y={p.y + 1} width={NODE_W - 2} height={1} fill="#fff" />
            <text x={p.x + NODE_W / 2} y={p.y + 15} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">
              {n.id}
            </text>
            <text x={p.x + NODE_W / 2} y={p.y + 27} textAnchor="middle" fontSize="9" fill="#000">
              {n.kind}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const TOOLS: { id: Tool; label: string }[] = [
  { id: 'pen', label: 'Pen' },
  { id: 'box', label: 'Box' },
  { id: 'fill', label: 'Fill' },
  { id: 'erase', label: 'Erase' },
];

const HINT = 'Draw separate shapes with gaps between them, then press Compile Infrastructure.';

export default function PaintToArch() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [status, setStatus] = useState(HINT);
  const [compiling, setCompiling] = useState(false);
  const drawing = useRef<{ sx: number; sy: number; x: number; y: number; snap: ImageData | null } | null>(null);
  const timer = useRef<number>();

  const getCtx = () => canvasRef.current?.getContext('2d', { willReadFrequently: true }) ?? null;

  const clearCanvas = () => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CW, CH);
  };

  useEffect(() => {
    clearCanvas();
    return () => window.clearTimeout(timer.current);
  }, []);

  const pointer = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (CW / r.width), y: (e.clientY - r.top) * (CH / r.height) };
  };

  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const ctx = getCtx();
    if (!ctx || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointer(e);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = tool === 'erase' ? 14 : 3;
    ctx.strokeStyle = tool === 'erase' ? '#ffffff' : color;
    ctx.fillStyle = color;
    const shape = tool === 'box' || tool === 'fill';
    drawing.current = { sx: p.x, sy: p.y, x: p.x, y: p.y, snap: shape ? ctx.getImageData(0, 0, CW, CH) : null };
    if (!shape) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 0.01, p.y);
      ctx.stroke();
    }
  };

  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = drawing.current;
    const ctx = getCtx();
    if (!d || !ctx) return;
    const p = pointer(e);
    if (d.snap) {
      ctx.putImageData(d.snap, 0, 0);
      const x = Math.min(d.sx, p.x);
      const y = Math.min(d.sy, p.y);
      const w = Math.abs(p.x - d.sx);
      const h = Math.abs(p.y - d.sy);
      if (tool === 'fill') ctx.fillRect(x, y, w, h);
      else ctx.strokeRect(x, y, w, h);
    } else {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      d.x = p.x;
      d.y = p.y;
    }
  };

  const onUp = () => {
    drawing.current = null;
  };

  const loadSample = () => {
    clearCanvas();
    const ctx = getCtx();
    if (!ctx) return;
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    ctx.lineWidth = 3;
    const box = (x: number, y: number, w: number, h: number, filled = false) =>
      filled ? ctx.fillRect(x, y, w, h) : ctx.strokeRect(x, y, w, h);
    box(10, 20, 90, 40); // load balancer
    box(125, 10, 130, 100); // api gateway
    box(285, 15, 80, 60); // service
    box(390, 25, 30, 30); // cache
    box(30, 170, 90, 60); // service
    box(160, 160, 50, 110); // database
    box(250, 190, 80, 40, true); // queue
    box(360, 180, 60, 70); // service
    setGraph(null);
    setStatus('Sample sketch loaded. Press Compile Infrastructure.');
  };

  const clearAll = () => {
    clearCanvas();
    setGraph(null);
    setStatus(HINT);
  };

  const compile = () => {
    const canvas = canvasRef.current;
    if (!canvas || compiling) return;
    setCompiling(true);
    setStatus('Compiling infrastructure...');
    timer.current = window.setTimeout(() => {
      const nodes = detect(canvas);
      if (nodes.length === 0) {
        setGraph(null);
        setStatus('No shapes detected. Draw some boxes or press Load Sample.');
      } else {
        setGraph(buildGraph(nodes));
        setStatus(`Compiled ${nodes.length} node(s) and ${Math.max(0, nodes.length - 1)} link(s).`);
      }
      setCompiling(false);
    }, 700);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[3px]">
      <div className="flex items-center gap-1 px-1 py-[2px]">
        <button type="button" className="btn95 font-bold" onClick={compile} disabled={compiling}>
          Compile Infrastructure
        </button>
        <button type="button" className="btn95" onClick={loadSample}>
          Load Sample
        </button>
        <button type="button" className="btn95" onClick={clearAll}>
          Clear
        </button>
      </div>

      <div className="flex min-h-0 flex-1 gap-[3px]">
        <div className="flex w-[54px] shrink-0 flex-col gap-1 p-1">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`btn95 px-0 ${tool === t.id ? 'is-active' : ''}`}
              aria-pressed={tool === t.id}
              onClick={() => setTool(t.id)}
            >
              {t.label}
            </button>
          ))}
          <div className="bevel-in mt-1 grid grid-cols-2 gap-[2px] p-[3px]">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                aria-pressed={color === c}
                className="h-[14px] w-full"
                style={{ background: c, outline: color === c ? '1px dotted #fff' : 'none', outlineOffset: -3 }}
                onClick={() => {
                  setColor(c);
                  if (tool === 'erase') setTool('pen');
                }}
              />
            ))}
          </div>
        </div>

        <div className="bevel-in min-h-0 shrink-0 overflow-auto bg-win-shadow p-[2px]">
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            aria-label="Drawing canvas"
            className="block cursor-crosshair bg-white"
            style={{ width: CW, height: CH, touchAction: 'none' }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
        </div>

        <div className="flex min-h-0 min-w-[240px] flex-1 flex-col gap-1 pl-1">
          <div className="font-bold">Architecture graph</div>
          <div className="bevel-field min-h-0 flex-1 overflow-auto p-1">
            {graph ? <GraphView graph={graph} /> : <div className="p-2 text-win-shadow">Nothing compiled yet.</div>}
          </div>
          <div className="font-bold">Manifest</div>
          <pre className="bevel-field h-[130px] shrink-0 select-text overflow-auto p-1 font-mono text-[11px] leading-[1.3]">
            {graph ? manifest(graph) : '# compile to generate a manifest'}
          </pre>
        </div>
      </div>

      <div className="bevel-thin-in mt-[1px] px-2 py-[2px]" aria-live="polite">
        {status}
      </div>
    </div>
  );
}
