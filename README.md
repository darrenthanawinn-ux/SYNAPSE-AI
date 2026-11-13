# SYNAPSE-95

A retro Windows 95 style OS that runs entirely in your browser. Built with React 18, TypeScript and Tailwind CSS.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run typecheck   # tsc --noEmit
npm run build       # typecheck + production build into dist/
npm run preview     # serve the production build
```

## What is inside

- **Window manager**: open, drag, focus, minimize to the taskbar, maximize (double-click a title bar) and close.
- **Paint-to-Arch**: sketch separate shapes, press *Compile Infrastructure* and get a node graph and manifest.
  Use *Load Sample* for a ready-made sketch.
- **Terminal**: `help`, `deploy [service]`, `status`, `clear`, plus `echo`, `date`, `whoami`, `ver`.
  Arrow Up/Down walk the command history; Ctrl+L clears the screen.
- **Notepad**: browse and edit simulated configs from the File menu.
- **Network Visualizer**: 16-bit style CPU and network charts with a live container table. Freeze/Resume at the bottom.

Click a desktop icon once to select it and again (or press Enter) to open it. Everything is simulated, nothing
touches a real network or cluster.

## Project layout

```
src/
  App.tsx                      desktop shell
  types.ts                     shared types
  hooks/useWindowManager.ts    window state machine (reducer)
  components/                  Window, Taskbar, DesktopIcon, Icon, MenuBar, Screens
  apps/                        registry + the four apps
.kiro/
  specs/synapse-architecture.md
  steering/ui-design-rules.md
```

## License

MIT, see [LICENSE](./LICENSE).
