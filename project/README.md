# Project documentation

Index of design, ops, research, and agent notes for the **MorseTime Devvit** app.

**Canonical product locks:** [agent/DECISIONS.md](./agent/DECISIONS.md)  
**Living status:** [agent/STATUS.md](./agent/STATUS.md)  
**Repo entry:** [../README.md](../README.md) · **Agent coding rules:** [../AGENTS.md](../AGENTS.md)

---

## Layout

```text
project/
├── README.md                 ← you are here
├── design/                   living UX / GUI specs
│   ├── ux.md
│   ├── gui.md
│   ├── new.md              splash daily loop
│   └── training.md         expanded Training hub
├── ops/                      Reddit / mod / runtime ops
│   └── reddit_guide.md
├── research/                 historical or QA reference (not current law)
│   ├── morse-hackathon-report.md
│   ├── devvit-verification-plan.md
│   └── timing-tests-plan.md
└── agent/                    AI session notes
    ├── README.md
    ├── DECISIONS.md
    ├── STATUS.md
    └── NOTES.md
```

---

## By audience

| Need | Read |
|------|------|
| What we locked (no Phaser, dual timeline, leaderboard, stretch goals) | [agent/DECISIONS.md](./agent/DECISIONS.md) |
| What’s broken / next | [agent/STATUS.md](./agent/STATUS.md) |
| How play should feel | [design/ux.md](./design/ux.md) |
| **New main page (splash) build brief** | [design/new.md](./design/new.md) |
| **Training hub (expanded) build brief** | [design/training.md](./design/training.md) |
| How display/audio should look | [design/gui.md](./design/gui.md) |
| How mods run the app on Reddit | [ops/reddit_guide.md](./ops/reddit_guide.md) |
| Original hackathon vision (Phaser-era, outdated) | [research/morse-hackathon-report.md](./research/morse-hackathon-report.md) |
| Devvit iframe / timing risk checklist | [research/devvit-verification-plan.md](./research/devvit-verification-plan.md) |
| Timing unit-test plan | [research/timing-tests-plan.md](./research/timing-tests-plan.md) |

---

## Accuracy policy

- **DECISIONS + STATUS + design/** override older research when they conflict.
- Research docs keep historical context; each has a banner at the top.
- When you change gameplay or architecture, update **DECISIONS** (if locked) and **STATUS**, then design docs.
