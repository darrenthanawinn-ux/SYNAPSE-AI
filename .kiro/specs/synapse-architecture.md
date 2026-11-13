# SYNAPSE-95 Architecture Spec

## Overview

SYNAPSE-95 is a single-page app that emulates a Windows 95 style desktop in the browser. It is a showcase for
infrastructure tooling concepts: sketching an architecture, deploying it from a terminal, inspecting configs and
watching live (simulated) cluster metrics. Everything runs client-side; there is no backend and no network I/O.

## Tech Stack

- React 18 + TypeScript (strict)
- Vite 5 for dev server and build
- Tailwind CSS 3 with custom Windows 95 bevel utilities (see `.kiro/steering/ui-design-rules.md`)

## Requirements (EARS)

1. WHEN the page loads, THE SYSTEM SHALL show a boot screen and then the desktop with a Terminal window open.
2. WHEN the user opens an app from a desktop icon or the Start menu, THE SYSTEM SHALL create a new window for it,
   cascaded from the previous one, and focus it.
3. WHEN the user presses a window, THE SYSTEM SHALL raise it above all others and mark it active.
4. WHEN the user drags a title bar, THE SYSTEM SHALL move the window and keep at least part of it on screen.
5. WHEN the user minimizes a window, THE SYSTEM SHALL hide it, keep its app state alive and keep its taskbar button.
6. WHEN the user clicks a taskbar button, THE SYSTEM SHALL restore, focus or minimize the window (restore if hidden,
   minimize if already active, focus otherwise).
7. WHEN the user closes a window, THE SYSTEM SHALL unmount it and remove its taskbar button.
8. WHEN the user chooses Shut Down, THE SYSTEM SHALL show the "safe to turn off" screen, and restart on click.

## Window Manager

A pure reducer (`src/hooks/useWindowManager.ts`) owns all window state:

| Field          | Meaning                                              |
| -------------- | ---------------------------------------------------- |
| `windows[]`    | `id, app, x, y, w, h, z, minimized, maximized`       |
| `activeId`     | Highest-z window that is not minimized, or `null`    |
| `zCounter`     | Monotonic counter used to assign stacking order      |
| `seq`          | Monotonic counter used for ids and cascade offsets   |

Actions: `open`, `close`, `minimize`, `focus` (also restores), `move`, `toggleMaximize`, `taskbar`, `reset`.

Invariant: `activeId` always equals the highest-z, non-minimized window (or `null`).

## Apps

| App                | File                              | Behaviour                                                                 |
| ------------------ | --------------------------------- | ------------------------------------------------------------------------- |
| Paint-to-Arch      | `src/apps/PaintToArch.tsx`        | Canvas sketching; "Compile Infrastructure" detects shapes and builds a node graph |
| Terminal           | `src/apps/Terminal.tsx`           | `help`, `deploy`, `status`, `clear` plus `echo`, `date`, `whoami`, `ver`  |
| Notepad            | `src/apps/Notepad.tsx`            | Menu-driven editor over simulated configs (YAML, nginx, JSON, Terraform)   |
| Network Visualizer | `src/apps/NetworkVisualizer.tsx`  | 16-bit LED style CPU chart, RX/TX step chart, container table             |

Apps are registered once in `src/apps/registry.tsx`; adding an app means adding an entry there plus an icon.

### Paint-to-Arch compile pipeline

1. Read the canvas pixels and mark 10px grid cells that contain ink.
2. Flood-fill (8-neighbour) to find connected shapes. Drop specks, thin connector lines and sparse scribbles;
   keep the 8 largest by bounding-box area.
3. Classify each shape by pixel bounding box and ink density, first match wins: tiny (<=44px both ways) = Cache,
   filled (ink >= 60% of box) = Message Queue, wide (w >= 1.8h) = Load Balancer, tall (h >= 1.5w) = Database,
   large (area >= 12000) = API Gateway, otherwise Service.
4. Order shapes left to right and wire each to the next to produce edges.
5. Render the graph as SVG and emit a text manifest.

## Non-Goals

- No persistence, accounts or real deployments. All metrics and outputs are simulated.
- No window resizing in v1.
