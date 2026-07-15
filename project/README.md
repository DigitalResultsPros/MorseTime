# Project documentation

Design, ops, and product locks for the **MorseTime** Devvit app.

**Canonical product locks:** [agent/DECISIONS.md](./agent/DECISIONS.md)  
**Repo entry:** [../README.md](../README.md) · **About / pitch copy:** [../WEB_READ.md](../WEB_READ.md)

## Layout

```text
project/
├── README.md           ← you are here
├── design/             UX / splash / training / GUI notes
│   ├── ux.md
│   ├── gui.md
│   ├── new.md          splash daily loop
│   └── training.md     expanded Practice hub
├── ops/
│   └── reddit_guide.md moderator / runtime guide
└── agent/
    ├── README.md
    └── DECISIONS.md    locked product/tech choices
```

## By audience

| Need | Read |
|------|------|
| What we locked (no Phaser, dual timeline, board, stretch goals) | [agent/DECISIONS.md](./agent/DECISIONS.md) |
| How play should feel | [design/ux.md](./design/ux.md) |
| Splash daily loop | [design/new.md](./design/new.md) |
| Practice hub / lessons | [design/training.md](./design/training.md) |
| Display / audio notes | [design/gui.md](./design/gui.md) |
| How mods run the app on Reddit | [ops/reddit_guide.md](./ops/reddit_guide.md) |
| Player-facing pitch copy | [../WEB_READ.md](../WEB_READ.md) |

## Accuracy policy

- **DECISIONS + design/** describe product intent; **source under `src/`** is the shipped truth when they diverge.
- Prefer updating DECISIONS when a lock changes; keep design docs as living specs, not session chat logs.
