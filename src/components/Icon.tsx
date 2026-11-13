import type { IconName } from '../types';

/** A pixel rectangle on a 16x16 grid: [x, y, width, height, color]. */
type Rect = [number, number, number, number, string];

const GREEN = '#00ff00';

const ICONS: Record<IconName, Rect[]> = {
  paint: [
    [3, 3, 10, 1, '#c8903c'],
    [2, 4, 12, 9, '#c8903c'],
    [3, 13, 10, 1, '#c8903c'],
    [2, 4, 1, 9, '#805020'],
    [4, 6, 2, 2, '#e02020'],
    [7, 5, 2, 2, '#20a020'],
    [10, 6, 2, 2, '#2040e0'],
    [4, 10, 2, 2, '#f0d000'],
    [8, 10, 3, 2, '#c0c0c0'],
    [10, 12, 1, 1, '#e02020'],
    [11, 11, 1, 1, '#404040'],
    [12, 10, 1, 1, '#404040'],
    [13, 9, 1, 1, '#404040'],
    [14, 8, 1, 1, '#404040'],
  ],
  terminal: [
    [0, 1, 16, 14, '#c0c0c0'],
    [1, 2, 14, 2, '#000080'],
    [12, 2, 2, 2, '#c0c0c0'],
    [1, 4, 14, 10, '#000000'],
    [3, 6, 1, 1, GREEN],
    [4, 7, 1, 1, GREEN],
    [3, 8, 1, 1, GREEN],
    [6, 9, 3, 1, GREEN],
  ],
  notepad: [
    [3, 1, 10, 14, '#ffffff'],
    [2, 1, 1, 14, '#808080'],
    [13, 1, 1, 14, '#808080'],
    [3, 14, 10, 1, '#808080'],
    [3, 1, 10, 2, '#000080'],
    [5, 5, 6, 1, '#000080'],
    [5, 7, 6, 1, '#000080'],
    [5, 9, 6, 1, '#000080'],
    [5, 11, 4, 1, '#000080'],
  ],
  network: [
    [1, 2, 14, 10, '#808080'],
    [2, 3, 12, 8, '#000000'],
    [3, 8, 2, 3, GREEN],
    [6, 5, 2, 6, '#ffff00'],
    [9, 7, 2, 4, '#00ffff'],
    [12, 4, 1, 7, '#ff3030'],
    [6, 12, 4, 1, '#c0c0c0'],
    [4, 13, 8, 2, '#c0c0c0'],
  ],
  logo: [
    [1, 2, 6, 6, '#e02020'],
    [8, 1, 6, 6, '#20a020'],
    [1, 9, 6, 6, '#2040e0'],
    [8, 8, 6, 6, '#f0b000'],
  ],
  power: [
    [1, 2, 14, 10, '#808080'],
    [2, 3, 12, 8, '#000080'],
    [6, 12, 4, 1, '#c0c0c0'],
    [4, 13, 8, 2, '#c0c0c0'],
    [7, 5, 2, 3, '#ffffff'],
    [5, 7, 1, 2, '#ffffff'],
    [10, 7, 1, 2, '#ffffff'],
    [6, 9, 4, 1, '#ffffff'],
  ],
};

interface IconProps {
  name: IconName;
  size?: number;
}

export default function Icon({ name, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      {ICONS[name].map(([x, y, w, h, fill], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
      ))}
    </svg>
  );
}
