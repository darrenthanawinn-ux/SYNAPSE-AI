---
inclusion: always
---

# SYNAPSE-95 UI Design Rules

These rules keep every screen looking like a 1995 desktop. Follow them for any new component.

## Palette

| Token          | Hex       | Use                                  |
| -------------- | --------- | ------------------------------------ |
| `win-face`     | `#c0c0c0` | Window, button and menu surfaces     |
| `win-light`    | `#ffffff` | Top/left bevel highlight, fields     |
| `win-hi`       | `#dfdfdf` | Inner raised highlight               |
| `win-shadow`   | `#808080` | Inner shadow, disabled text          |
| `win-dark`     | `#0a0a0a` | Outer bottom/right shadow            |
| `win-title`    | `#000080` | Active title bar start, selection    |
| `win-title2`   | `#1084d0` | Active title bar gradient end        |
| `win-desktop`  | `#008080` | Desktop background                   |

Terminal and charts may use CRT colors (black background, `#00ff00`, `#ffff00`, `#ff3030`, `#00ffff`).

## Bevels

- Raised surfaces use `.bevel-out`; pressed or sunken surfaces use `.bevel-in`; text fields use `.bevel-field`.
- Buttons use `.btn95`. A pressed or toggled button also gets `.is-active`.
- Never use `border-radius`, blur, opacity fades or drop shadows. Depth comes only from the 1px/2px bevel lines.

## Typography

- UI text: `font-sans` (MS Sans Serif stack) at 11px. Window titles are bold white.
- Code, terminal and data readouts: `font-mono`.
- No web fonts or external assets; the app must work offline.

## Layout

- Window chrome: 3px padding, 18px title bar, title buttons 16x14.
- Taskbar: 28px tall, always on top (`z-[9999]`), Start button left, clock tray right.
- Desktop icons: 32px pixel icons with 11px labels, 84px wide, stacked in columns.
- Windows cascade by 28px steps and must stay at least partially on screen.

## Icons and Canvases

- Icons are 16x16 grids rendered as SVG `<rect>`s with `shapeRendering="crispEdges"`.
- Canvases that show charts use low logical resolution and `image-rendering: pixelated`.

## Interaction

- Single click selects a desktop icon; clicking a selected icon (or pressing Enter) opens it.
- Clicking anywhere in a window focuses it; dragging the title bar moves it; double-clicking it maximizes.
- Every icon-only button needs an `aria-label` or `title`.
- Keep a visible focus indicator (dotted outline) on interactive elements.

## Motion

- Avoid animation. The only animated element is the boot progress bar.
