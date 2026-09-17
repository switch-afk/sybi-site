# sybimeta-site

Personal links page for [sybimeta.xyz](https://sybimeta.xyz), built as an 8-bit
arcade screen. A pixel-art hero, a grid of icon-only link blocks, a
password-protected dashboard for managing those links, and a playable game
hidden behind the background.

Built with Next.js 16 (App Router), React 19, Tailwind v4 and TypeScript.
Fonts are Press Start 2P and VT323 via `next/font/google`. Icons come from
`react-icons`. No database — everything persists to JSON files on disk.

---

## Quick start

```bash
git clone https://github.com/switch-afk/sybimeta-site.git
cd sybimeta-site
npm install
```

Create your environment file:

```bash
cp .env.example .env.local
```

Open `.env.local` and set a password:

```
ADMIN_PASSWORD=pick-something-strong
```

Then run it:

```bash
npm run dev
```

- <http://localhost:3000> — the site
- <http://localhost:3000/admin> — the link manager

> On Windows, if PowerShell blocks `npm` with a script execution error, use
> `npm.cmd run dev` instead, or run
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` once
> and reopen the terminal.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload on port 3000. |
| `npm run build` | Production build. Required before `npm start`, and after every code change on the server. |
| `npm start` | Serves the production build. Run `npm run build` first or it won't pick up changes. |
| `npm run lint` | ESLint. |

---

## Environment

One variable, and the app won't start the admin panel without it.

| Variable | Purpose |
|---|---|
| `ADMIN_PASSWORD` | The password for `/admin`. |

`.env.local` is gitignored, so it never reaches GitHub and doesn't travel with a
clone — you create it fresh on each machine. `.env.example` is committed as the
reminder of what belongs in it.

The login cookie is an HMAC signed with the password itself, so **changing the
password immediately signs out every existing session**. The cookie is
`httpOnly`, `sameSite=lax`, and `secure` in production.

---

## The home page

A boot sequence plays on load (skippable with any key or click), then the screen
wipes in: the avatar rendered as a 40px sprite, the SYBI logotype, a typewriter
role line, and the link grid.

**Links** are icon-only blocks, four per row at every screen width, 56px on
mobile and 64px above that. There's no visible text — each block's name comes
from its icon and shows as the hover tooltip and the screen-reader label.

**Keyboard:** left/right steps between blocks and wraps around; up/down jumps a
whole row. Enter opens the highlighted one. The highlighted block gets a yellow
frame and a drop shadow.

**Sound** is off by default. The toggle sits in the top-right status bar and the
choice is remembered per browser. All effects are square waves generated in
WebAudio — there are no audio files in the repo.

Only links marked visible are rendered, and the filtering happens server-side, so
hidden links never reach the browser at all.

---

## The admin dashboard

Go to `/admin` and enter your `ADMIN_PASSWORD`.

**Adding a link:** pick an icon, paste a URL, press ADD. There's no name field —
the icon supplies the name. Bare domains are fine: `twitch.tv/sybimeta` becomes
`https://twitch.tv/sybimeta`. Only `http`, `https` and `mailto` URLs are
accepted; anything else is rejected.

**Show/hide:** each link has a slider. Hidden links stay in your list but are
stripped out before the page renders.

**Editing:** change the icon or URL inline and a SAVE button appears. Changing
the icon renames the link automatically.

**Reordering:** the up/down arrows on each row. The order carries straight to the
site.

**Deleting:** two-step — DELETE, then DELETE? to confirm.

**Icons:** 265 are bundled, covering socials, crypto, dev tools, music, gaming,
writing platforms and payments, plus around 40 generic ones. The picker has a
search box, which you'll want — 265 is well past scanning by eye.

---

## The game

Clicking empty background on the home page starts an arcade shooter. Clicks on
links, the sound toggle, or any other control behave normally. The footer reads
`INSERT COIN — CLICK ANYWHERE TO PLAY` so it's discoverable rather than
accidental.

**Desktop only.** It's gated behind `(min-width: 768px) and (pointer: fine)`.
Phones and tablets get the plain site and never load the game code — the whole
thing is built around a mouse.

While playing, the site dims to 15% and stops taking clicks, and the background
critters fade out so they can't be mistaken for targets.

**How it plays:** enemies descend in waves. Click to shoot. Three reach the
bottom and it's over. Missing breaks your combo, so accuracy matters more than
clicking fast.

| Enemy | Colour | Hits | Points | Behaviour |
|---|---|---|---|---|
| Grunt | cyan | 1 | 100 | Straight descent. |
| Armoured | red | 3 | 500 | Slow and tanky. From wave 3. |
| Darter | purple | 1 | 150 | Weaves side to side, fast, leaves a trail. From wave 4. |
| Splitter | green | 2 | 200 | Breaks into two shards when killed. From wave 6. |
| Shard | pale green | 1 | 50 | Small and fast. |
| Boss | orange | 8+ | 2000 | Every 10th wave, with a health bar. Gains 4 HP each time. |

A gold coin drifts past occasionally for 250 points; missing it costs nothing.
The combo multiplier reaches ×2 at five consecutive kills and ×3 at ten, and any
miss resets it. Multi-hit enemies wash pale below 40% health so you can see
what's nearly dead.

**Controls:** mouse to aim and shoot, `ESC` or the EXIT button to leave. The loop
pauses automatically when the tab loses focus.

**High score is global** — one number shared by everyone who plays, shown as
`WORLD` in the HUD. It's stored server-side, not per browser.

> The submit endpoint has to be public, since players aren't logged in, which
> means it can be posted to directly. Submissions are capped at 2,000,000 and
> throttled to 10 per minute per IP. That stops casual nonsense but isn't
> tamper-proof; making it so would mean scoring the game server-side. To reset
> the board, delete `data/highscore.json` and restart.

---

## Where data lives

No database. Two JSON files in `data/`, both written atomically (temp file then
rename), so a crash can't leave a half-written file.

| File | Contents | In git? |
|---|---|---|
| `data/links.json` | Your links, with order and visibility. | Yes — it's your content. |
| `data/highscore.json` | The global high score. Created on first play. | No — written at runtime. |

Because `links.json` is tracked but also written by the admin panel, it can drift
between your machine and the server. See the note under updating below.

The storage layer is isolated in `src/lib/links.ts` and `src/lib/highscore.ts` —
nothing else in the app touches the filesystem.

---

## Project structure

```
data/
  links.json            your links
  highscore.json        global high score (created at runtime)
src/
  app/
    page.tsx            home page (server component, reads visible links)
    layout.tsx          fonts and metadata
    globals.css         arcade palette, pixel-frame utilities, keyframes
    admin/page.tsx      admin route
    api/
      admin/login       sign in
      admin/logout      sign out
      admin/links       list, create, update, reorder, delete
      highscore         public GET and POST for the shared score
  components/
    arcade/
      ArcadeScene.tsx   the whole home screen
      ArcadeGame.tsx    the game
      PixelCanvas.tsx   animated background
      PixelAvatar.tsx   photo to sprite
      icons.tsx         icon registry
      sfx.ts            WebAudio blips
    admin/AdminApp.tsx  login and dashboard
  lib/
    links.ts            link storage
    highscore.ts        score storage
    auth.ts             cookie session
    icon-keys.ts        allowed icon keys and display names
```

---

## Updating a running server

```bash
cd ~/htdocs/sybi-site
git pull
npm run build
pm2 restart sybimeta
```

`npm run build` is required after any code change, and `pm2 restart` after that —
PM2 won't pick up a new build on its own. `npm install` is only needed when
dependencies change.

If `git pull` complains about `data/links.json`, the server's copy has drifted
from the repo because you've edited links through the admin panel. Keep the live
version:

```bash
git stash
git pull
git stash pop
```

**Run a single PM2 instance.** Don't use cluster mode (`pm2 start -i max`) —
links and scores live in JSON files, and multiple workers writing to them will
clobber each other.

The `data/` directory must be writable by whoever PM2 runs as. If it isn't, the
site loads fine and every save silently fails:

```bash
touch data/links.json && echo "writable"
```

---

## Adding more icons

`src/lib/icon-keys.ts` holds the allowed keys and their display names;
`src/components/arcade/icons.tsx` maps each key to a `react-icons` component. Add
to both and it appears in the picker.

`react-icons` ships around 3,400 brand icons in total, and they aren't all
included on purpose: every icon in that map gets bundled into the JavaScript the
browser downloads, whether a link uses it or not. Shipping all of them would mean
megabytes of JS to display a handful of icons.

Note that Simple Icons has dropped several major brands over trademark requests
(Twitter, LinkedIn, Amazon, Xbox, Slack and others). Those come from Font Awesome
instead, which is why the registry pulls from both packages.