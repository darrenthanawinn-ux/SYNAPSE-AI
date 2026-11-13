import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import MenuBar from '../components/MenuBar';
import type { MenuDef } from '../components/MenuBar';

const SAMPLE_FILES: Record<string, string> = {
  'synapse.config.yaml': `# SYNAPSE-95 cluster configuration
cluster:
  name: synapse-prod
  region: eu-central-1
  nodes: 3

services:
  - name: api-gateway
    image: synapse/api-gateway:1.4.2
    replicas: 3
    port: 8080
    env:
      LOG_LEVEL: info
      UPSTREAM: auth-svc:9000
  - name: auth-svc
    image: synapse/auth-svc:2.0.1
    replicas: 2
    port: 9000
  - name: worker
    image: synapse/worker:0.9.7
    replicas: 4
    queue: redis:6379
  - name: postgres
    image: postgres:15.4
    replicas: 1
    volume: pgdata:/var/lib/postgresql/data
  - name: redis
    image: redis:7.2.0
    replicas: 1

autoscale:
  min: 2
  max: 12
  target_cpu: 70
`,
  'nginx.conf': `worker_processes  auto;

events {
    worker_connections  1024;
}

http {
    upstream api_gateway {
        least_conn;
        server api-gateway-0:8080;
        server api-gateway-1:8080;
        server api-gateway-2:8080;
    }

    server {
        listen 80;
        server_name synapse.local;

        location / {
            proxy_pass http://api_gateway;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /healthz {
            return 200 "ok";
        }
    }
}
`,
  'main.tf': `terraform {
  required_version = ">= 1.5"
}

variable "region" {
  type    = string
  default = "eu-central-1"
}

resource "aws_vpc" "synapse" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "synapse-prod" }
}

resource "aws_subnet" "private" {
  count      = 3
  vpc_id     = aws_vpc.synapse.id
  cidr_block = cidrsubnet(aws_vpc.synapse.cidr_block, 8, count.index)
}

resource "aws_eks_cluster" "synapse" {
  name     = "synapse-prod"
  role_arn = aws_iam_role.cluster.arn

  vpc_config {
    subnet_ids = aws_subnet.private[*].id
  }
}
`,
  'deploy.json': `{
  "name": "synapse-pipeline",
  "trigger": "push:main",
  "stages": [
    { "name": "build", "command": "npm run build" },
    { "name": "test", "command": "npm test", "parallel": true },
    { "name": "image", "command": "docker build -t synapse/api-gateway ." },
    { "name": "rollout", "command": "kubectl rollout restart deploy/api-gateway" }
  ],
  "notify": ["#ops", "oncall@synapse.local"]
}
`,
  'README.txt': `SYNAPSE-95
==========

Everything in this OS is simulated. No files here touch a real disk and
no command in the Terminal deploys anything.

Try this:
  1. Open Terminal and run: status
  2. Run: deploy api-gateway
  3. Open Paint-to-Arch, press Load Sample, then Compile Infrastructure
  4. Open Network Visualizer to watch the fake cluster breathe

Edits you make here can be saved with File > Save (kept in memory only).
`,
};

const FIRST_FILE = 'synapse.config.yaml';

export default function Notepad() {
  const [store, setStore] = useState<Record<string, string>>(() => ({ ...SAMPLE_FILES }));
  const [name, setName] = useState(FIRST_FILE);
  const [text, setText] = useState(SAMPLE_FILES[FIRST_FILE]);
  const [dirty, setDirty] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [pos, setPos] = useState({ ln: 1, col: 1 });
  const [msg, setMsg] = useState('Ready');
  const ta = useRef<HTMLTextAreaElement>(null);

  const confirmDiscard = () => !dirty || window.confirm('Discard unsaved changes?');

  const openFile = (file: string) => {
    if (!confirmDiscard()) return;
    setName(file);
    setText(store[file] ?? '');
    setDirty(false);
    setPos({ ln: 1, col: 1 });
    setMsg(`Opened ${file}`);
  };

  const newFile = () => {
    if (!confirmDiscard()) return;
    setName('Untitled.txt');
    setText('');
    setDirty(false);
    setPos({ ln: 1, col: 1 });
    setMsg('New file');
  };

  const save = () => {
    setStore((s) => ({ ...s, [name]: text }));
    setDirty(false);
    setMsg(`Saved ${name} to the virtual disk`);
  };

  const insertDate = () => {
    const el = ta.current;
    const stamp = new Date().toLocaleString();
    const start = el ? el.selectionStart : text.length;
    const end = el ? el.selectionEnd : start;
    setText(text.slice(0, start) + stamp + text.slice(end));
    setDirty(true);
  };

  const updatePos = (el: HTMLTextAreaElement) => {
    const before = el.value.slice(0, el.selectionStart);
    setPos({ ln: before.split('\n').length, col: before.length - before.lastIndexOf('\n') });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'F5') {
      e.preventDefault();
      insertDate();
    }
  };

  const menus: MenuDef[] = [
    {
      label: 'File',
      items: [
        { label: 'New', onSelect: newFile },
        ...Object.keys(store).map((file) => ({
          label: `Open ${file}`,
          checked: file === name,
          onSelect: () => openFile(file),
        })),
        { separator: true },
        { label: 'Save', disabled: !dirty, onSelect: save },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Select All', onSelect: () => ta.current?.select() },
        { label: 'Time/Date', hint: 'F5', onSelect: insertDate },
      ],
    },
    {
      label: 'Format',
      items: [{ label: 'Word Wrap', checked: wrap, onSelect: () => setWrap((w) => !w) }],
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MenuBar menus={menus} />
      <div className="px-2 pb-[2px]">
        File: <b>{name}</b>
        {dirty ? ' *' : ''}
      </div>
      <textarea
        ref={ta}
        value={text}
        wrap={wrap ? 'soft' : 'off'}
        spellCheck={false}
        aria-label="Notepad text"
        className="bevel-field min-h-0 flex-1 resize-none select-text p-1 font-mono text-[13px] leading-[1.3] outline-none"
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
          updatePos(e.target);
        }}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => updatePos(e.currentTarget)}
        onClick={(e) => updatePos(e.currentTarget)}
        onSelect={(e) => updatePos(e.currentTarget)}
      />
      <div className="flex gap-[2px] pt-[3px]">
        <div className="bevel-thin-in min-w-0 flex-1 truncate px-2 py-[1px]">{msg}</div>
        <div className="bevel-thin-in w-[110px] px-2 py-[1px]">
          Ln {pos.ln}, Col {pos.col}
        </div>
      </div>
    </div>
  );
}
