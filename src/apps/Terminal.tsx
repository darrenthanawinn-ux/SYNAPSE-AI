import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

type Kind = 'in' | 'out' | 'ok' | 'err' | 'warn' | 'dim';

interface Line {
  kind: Kind;
  text: string;
}

interface Svc {
  name: string;
  version: string;
  replicas: string;
}

const PROMPT = 'C:\\SYNAPSE>';
const COMMANDS = ['help', 'deploy', 'status', 'clear', 'echo', 'date', 'whoami', 'ver'];
const STEP_MS = 260;
const MAX_LINES = 500;

const COLORS: Record<Kind, string> = {
  in: '#ffffff',
  out: '#c0c0c0',
  ok: '#55ff55',
  err: '#ff5555',
  warn: '#ffff55',
  dim: '#808080',
};

const BANNER: Line[] = [
  { kind: 'out', text: 'SYNAPSE-95 [Version 4.00.95]' },
  { kind: 'dim', text: '(C) SYNAPSE Systems. All simulated rights reserved.' },
  { kind: 'out', text: '' },
  { kind: 'out', text: 'Type HELP for a list of commands.' },
  { kind: 'out', text: '' },
];

const HELP: Line[] = [
  { kind: 'out', text: 'Available commands:' },
  { kind: 'out', text: '  help            Show this list' },
  { kind: 'out', text: '  status          Show cluster and service status' },
  { kind: 'out', text: '  deploy [svc]    Deploy one service, or all services if none is given' },
  { kind: 'out', text: '  clear           Clear the screen (Ctrl+L)' },
  { kind: 'out', text: '  echo <text>     Print text' },
  { kind: 'out', text: '  date            Show the current date and time' },
  { kind: 'out', text: '  whoami          Show the current user' },
  { kind: 'out', text: '  ver             Show the SYNAPSE version' },
  { kind: 'dim', text: 'Tab completes commands. Arrow Up/Down walk the history.' },
];

const INITIAL_SERVICES: Svc[] = [
  { name: 'api-gateway', version: '1.4.2', replicas: '3/3' },
  { name: 'auth-svc', version: '2.0.1', replicas: '2/2' },
  { name: 'worker', version: '0.9.7', replicas: '4/4' },
  { name: 'postgres', version: '15.4', replicas: '1/1' },
  { name: 'redis', version: '7.2.0', replicas: '1/1' },
];

const bump = (version: string): string => {
  const parts = version.split('.').map(Number);
  parts[parts.length - 1] += 1;
  return parts.join('.');
};

const rand = (lo: number, hi: number) => Math.floor(lo + Math.random() * (hi - lo));

export default function Terminal() {
  const [lines, setLines] = useState<Line[]>(BANNER);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const services = useRef<Svc[]>(INITIAL_SERVICES.map((s) => ({ ...s })));
  const deploys = useRef(0);
  const history = useRef<string[]>([]);
  const histIdx = useRef(0);
  const timers = useRef<number[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const push = (...added: Line[]) => setLines((prev) => [...prev, ...added].slice(-MAX_LINES));

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  useEffect(() => {
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [lines, busy]);

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  const play = (steps: Line[], onDone: () => void) => {
    setBusy(true);
    steps.forEach((step, i) => {
      timers.current.push(window.setTimeout(() => push(step), (i + 1) * STEP_MS));
    });
    timers.current.push(
      window.setTimeout(() => {
        onDone();
        setBusy(false);
      }, (steps.length + 1) * STEP_MS),
    );
  };

  const runStatus = () => {
    const head = 'SERVICE'.padEnd(14) + 'VERSION'.padEnd(10) + 'READY'.padEnd(8) + 'STATE'.padEnd(10) + 'CPU'.padEnd(6) + 'MEM';
    const rows = services.current.map(
      (s) =>
        s.name.padEnd(14) +
        `v${s.version}`.padEnd(10) +
        s.replicas.padEnd(8) +
        'Running'.padEnd(10) +
        `${rand(4, 46)}%`.padEnd(6) +
        `${rand(64, 480)}MB`,
    );
    push(
      { kind: 'warn', text: head },
      ...rows.map((text): Line => ({ kind: 'out', text })),
      { kind: 'out', text: '' },
      { kind: 'ok', text: 'Cluster synapse-prod (eu-central-1): 3 nodes Ready, 0 alerts' },
      { kind: 'dim', text: `Deployments this session: ${deploys.current}` },
    );
  };

  const runDeploy = (arg: string | undefined) => {
    const all = services.current;
    const targets = arg ? all.filter((s) => s.name === arg.toLowerCase()) : all;
    if (targets.length === 0) {
      push(
        { kind: 'err', text: `deploy: unknown service '${arg}'` },
        { kind: 'dim', text: `Try one of: ${all.map((s) => s.name).join(', ')}` },
      );
      return;
    }
    const steps: Line[] = [{ kind: 'dim', text: `Deploying ${targets.length} service(s) to synapse-prod...` }];
    for (const svc of targets) {
      const next = bump(svc.version);
      steps.push(
        { kind: 'out', text: `[${svc.name}] building image synapse/${svc.name}:${next}` },
        { kind: 'out', text: `[${svc.name}] pushing layers ........ 100%` },
        { kind: 'out', text: `[${svc.name}] rolling update ${svc.replicas.split('/')[1]} replicas, 0 unavailable` },
        { kind: 'ok', text: `[${svc.name}] healthy at v${next}` },
      );
    }
    steps.push({ kind: 'ok', text: `Deploy complete. ${targets.length} service(s) updated.` });
    play(steps, () => {
      targets.forEach((svc) => {
        svc.version = bump(svc.version);
      });
      deploys.current += 1;
    });
  };

  const submit = (raw: string) => {
    push({ kind: 'in', text: PROMPT + raw });
    const cmdline = raw.trim();
    setInput('');
    if (!cmdline) return;
    history.current.push(cmdline);
    histIdx.current = history.current.length;

    const [cmd, ...args] = cmdline.split(/\s+/);
    switch (cmd.toLowerCase()) {
      case 'help':
        push(...HELP);
        break;
      case 'status':
        runStatus();
        break;
      case 'deploy':
        runDeploy(args[0]);
        break;
      case 'clear':
        setLines([]);
        break;
      case 'echo':
        push({ kind: 'out', text: args.join(' ') });
        break;
      case 'date':
        push({ kind: 'out', text: new Date().toString() });
        break;
      case 'whoami':
        push({ kind: 'out', text: 'synapse\\administrator' });
        break;
      case 'ver':
        push({ kind: 'out', text: 'SYNAPSE-95 [Version 4.00.95]' });
        break;
      default:
        push({ kind: 'err', text: `Bad command or file name: ${cmd}` });
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.current.length === 0) return;
      histIdx.current = Math.max(0, histIdx.current - 1);
      setInput(history.current[histIdx.current]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      histIdx.current = Math.min(history.current.length, histIdx.current + 1);
      setInput(history.current[histIdx.current] ?? '');
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (!input || input.includes(' ')) return;
      const matches = COMMANDS.filter((c) => c.startsWith(input.toLowerCase()));
      if (matches.length === 1) setInput(matches[0] + ' ');
    }
  };

  const focusInput = () => {
    if (window.getSelection()?.toString()) return;
    inputRef.current?.focus();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={boxRef}
        onClick={focusInput}
        className="bevel-in min-h-0 flex-1 cursor-text select-text overflow-y-auto bg-black p-2 font-mono text-[13px] leading-[1.25]"
      >
        {lines.map((line, i) => (
          <div key={i} className="min-h-[1.25em] whitespace-pre-wrap break-words" style={{ color: COLORS[line.kind] }}>
            {line.text}
          </div>
        ))}
        {!busy && (
          <div className="flex">
            <span className="whitespace-pre text-white">{PROMPT}</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label="Terminal input"
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-[13px] text-white caret-[#c0c0c0] outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
