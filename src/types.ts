export type AppId = 'paint' | 'terminal' | 'notepad' | 'network';

export type IconName = AppId | 'logo' | 'power';

export interface WinState {
  id: string;
  app: AppId;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Stacking order. Higher is closer to the viewer. */
  z: number;
  minimized: boolean;
  maximized: boolean;
}
