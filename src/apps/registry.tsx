import type { ReactElement } from 'react';
import type { AppId, IconName } from '../types';
import PaintToArch from './PaintToArch';
import Terminal from './Terminal';
import Notepad from './Notepad';
import NetworkVisualizer from './NetworkVisualizer';

export interface AppDef {
  id: AppId;
  title: string;
  label: string;
  icon: IconName;
  w: number;
  h: number;
  render: () => ReactElement;
}

export const APP_ORDER: AppId[] = ['paint', 'terminal', 'notepad', 'network'];

export const APPS: Record<AppId, AppDef> = {
  paint: {
    id: 'paint',
    title: 'Paint-to-Arch',
    label: 'Paint-to-Arch',
    icon: 'paint',
    w: 820,
    h: 540,
    render: () => <PaintToArch />,
  },
  terminal: {
    id: 'terminal',
    title: 'Terminal',
    label: 'Terminal',
    icon: 'terminal',
    w: 620,
    h: 400,
    render: () => <Terminal />,
  },
  notepad: {
    id: 'notepad',
    title: 'Notepad',
    label: 'Notepad',
    icon: 'notepad',
    w: 560,
    h: 420,
    render: () => <Notepad />,
  },
  network: {
    id: 'network',
    title: 'Network Visualizer',
    label: 'Network Visualizer',
    icon: 'network',
    w: 700,
    h: 580,
    render: () => <NetworkVisualizer />,
  },
};
