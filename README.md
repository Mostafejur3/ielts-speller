# Spelling Lab — IELTS Listening & Spelling Trainer

> **Option B — Local-only, GitHub push ready**
> No database, no env vars, no backend. All data lives in IndexedDB + localStorage.
> Push to GitHub → deploy to Vercel / Netlify / Cloudflare Pages in one click.

Keyboard-first IELTS spelling trainer focused on:

**Learn → Hear → Recall → Type → Check → Classify → Review → Master**

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4)
![Local-only](https://img.shields.io/badge/Storage-IndexedDB_%2B_localStorage-success)

---

## ✨ Features

### Core Training Loop
- **Learn Mode** — study spelling, hide/reveal with `H`, meaning + Bangla translation
- **Practice Mode** — hear → type → instant letter-level diff on mistakes
- **Test Mode** — exam conditions, word stays hidden (IELTS Listening style)

### Smart Review
- Spaced repetition: `New → Learning → Complete → Need Review → Weak`
- Intervals: 0 / 1d / 1d / 6h / 3-7-14-30d
- Weak words weighted 3× in random queues
- Due-today queue, recently wrong, unpracticed, bookmarked filters

### Library
- Search, category / status / difficulty / bookmark filters
- Sort: A-Z, recent, most wrong, most practiced, accuracy
- Bulk: complete / review / weak / move category / add to list / delete
- Categories + custom lists (a word can live in many lists)

### Import
- Drag & drop **JSON / CSV / TXT**
- Auto-detect format, trim, normalize caps, dedupe
- Preview before saving, per-row opt-out
- Example formats included

### Keyboard-First
```
1       Hear word
2       Focus typing
3 / B   Bookmark
4 / C   Complete
5 / N   Need Review
6 / W   Weak
R / Space Replay
H       Hide / reveal (Learn)
← →     Prev / Next
Enter   Check / Continue
Esc     Blur / Close modal
Ctrl+K  Command palette
?       Shortcuts help
```
Shortcuts are inert while typing — typing "1" types "1", never plays audio.

### Audio
- Browser SpeechSynthesis, British English default (IELTS)
- Auto-ranks voices, cancels overlapping speech
- Adjustable speed 0.7–1.0×, auto-play + auto-focus options

### Progress
- Dashboard: mastery bar, daily goal, streak, 12 stat tiles, 7-day activity
- Statistics: accuracy trend, mastered over time, hardest words
- Export library as JSON, reset progress / words / everything

### Design
- Minimal premium SaaS, light default + dark mode
- Mobile: bottom nav, large tap targets, sticky action bar
- Desktop: compact sidebar, keyboard-heavy, right stats panel
- Toasts only, no disruptive modals during practice

---

## 🚀 Quick Start (Option B)

```bash
# 1. Clone
git clone https://github.com/yourname/spelling-lab.git
cd spelling-lab

# 2. Install
npm install

# 3. Run (no env vars needed)
npm run dev
# → http://localhost:3000

# 4. Build
npm run build
npm start
```

### Deploy

**Vercel (recommended)**
1. Push to GitHub
2. Import repo in Vercel
3. No env vars → Deploy

**Netlify / Cloudflare Pages**
- Build command: `npm run build`
- Publish: `.next` (Next.js) or `out` if you enable static export

**GitHub Pages (static)**
If you need fully static:
```ts
// next.config.ts
const nextConfig = { output: 'export' }
```
Then `npm run build` → `out/` folder.

---

## 📁 Project Structure

```
src/
  app/               # Next.js App Router (page.tsx per route)
    api/health/      # only API route — always ok, no DB
    learn/ practice/ test/ review/ library/ bookmarks/ stats/ import/ settings/
  components/
    ui.tsx           # design system: Button, Card, Badge, Modal...
    app-shell.tsx    # sidebar + mobile nav + command palette + toasts
    session/         # session-runner, controls, word-difference, summary, setup
    library/         # word-editor
  features/          # page-level features (dashboard, review, library, import...)
  hooks/             # use-hotkeys, use-speech
  lib/
    local-db.ts      # ⭐ Option B core — IndexedDB + localStorage, seed, CRUD, SRS
    srs.ts           # spaced repetition engine
    answers.ts       # normalize + diff
    queue.ts         # smart queue builder
    speech.ts        # SpeechSynthesis wrapper
    importers.ts     # JSON/CSV/TXT parsers
    types.ts         # shared types
    stats.ts         # deriveStats, formatDuration
  store/
    app-store.tsx    # React context, optimistic updates, persistence
```

**No `src/db`, no `src/server`, no Postgres.** Everything client-side.

---

## 💾 Data Model (local)

```ts
Word {
  id, word, category, meaning, translation, pronunciation,
  difficulty, notes, tags,
  status: 'new'|'learning'|'complete'|'review'|'weak',
  bookmarked, correctCount, wrongCount,
  consecutiveCorrect, consecutiveWrong, reviewStage,
  lastPracticed, nextReview, listIds
}
```

Stored as single JSON blob in `localStorage: spelling-lab:v2:store` + mirrored in IndexedDB `spelling-lab / kv / store` for larger libraries (10k+ words).

---

## 📥 Import Formats

**JSON**
```json
[
  { "word": "accommodation", "category": "Travel", "meaning": "...", "translation": "আবাসন", "difficulty": "hard", "tags": ["IELTS"] },
  { "word": "curriculum", "category": "Academic" }
]
```

**CSV**
```
word,category,meaning,translation
accommodation,Travel & Places,a place where someone stays,আবাসন
```

**TXT**
```
accommodation | Travel & Places
curriculum | Academic
questionnaire
```

Only `word` is required. Duplicates (case-insensitive) are skipped automatically.

---

## 🔧 Settings

- Accent: en-GB (IELTS) / en-US
- Voice + speed
- Auto-play + auto-focus
- Show shortcuts, strict mode, shuffle, show meaning/translation
- Daily goal 10/20/30/50/custom
- Dark mode
- Export / reset

---

## 🧪 Scripts

```bash
npm run dev       # dev server
npm run build     # production build
npm start         # start production
npm run lint      # eslint
npm run typecheck # tsc --noEmit
```

---

## 📦 GitHub Push Ready Checklist

- [x] No DATABASE_URL required
- [x] No server DB, no drizzle push needed
- [x] `npm install && npm run build` works fresh clone
- [x] `.env.example` included, `.env` gitignored
- [x] `.gitignore` covers Next.js, env, IDE, OS
- [x] `README.md` with deploy instructions
- [x] Health endpoint returns ok without DB
- [x] All data in IndexedDB + localStorage
- [x] Works on Vercel / Netlify / Cloudflare

---

## 📝 License

MIT — do what you want, just keep the attribution.

---

## 🙏 Credits

Built as a premium IELTS productivity tool — fast, keyboard-first, mobile-friendly, listening-focused.

> Practice flow: `1` hear → `2` type → `Enter` check → `4/5/6` classify → `→` next. No mouse needed.
