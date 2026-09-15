# sybimeta-site — 8-bit rebuild

Drop these files into your existing repo, keeping the paths. No new npm packages
are needed: the fonts come from `next/font/google` and the icons from
`react-icons`, both already in your `package.json`.

## 1. Set the admin password

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```
ADMIN_PASSWORD=whatever-you-want
```

That one variable is the whole auth system. The login cookie is an HMAC signed
with the password itself, so changing the password immediately signs out every
session. The cookie is `httpOnly`, `sameSite=lax`, and `secure` in production.

## 2. Run it

```bash
npm run dev
```

- `/` — the site
- `/admin` — password prompt, then the link manager

## 3. Where links live

Links are stored in `data/links.json`, committed to the repo and seeded with
your four current socials. Writes go to a temp file and get renamed into place,
so a crash can't leave you with a half-written file.

`data/links.json` must **not** be gitignored — it's your content.

## Deployment note

A JSON file on disk works on a normal Node server (`npm run build && npm start`,
or PM2 behind CloudPanel on your VPS). It does **not** work on Vercel or any
other serverless host: the filesystem there is read-only and resets on every
deploy, so the site would render fine but every admin change would vanish.

If you're deploying to Vercel, the storage layer is isolated in `src/lib/links.ts`
— only `readLinks()` and `writeLinks()` need swapping for a database. Nothing
else in the app touches the filesystem.

## What's in the admin panel

- Add a link: pick an icon, give it a name and a URL. Bare domains are fine —
  `twitch.tv/sybimeta` becomes `https://twitch.tv/sybimeta`. Only `http`,
  `https` and `mailto` URLs are accepted.
- Show/hide slider per link. Hidden links stay in your list but are filtered out
  server-side, so they never reach the page at all.
- Edit the name, URL or icon inline. A SAVE button appears once something
  changes.
- Reorder with the arrows — the order carries straight to the site.
- Delete, with a confirm step.

## Adding more icons

`src/lib/icon-keys.ts` holds the key list (the server validates against it) and
`src/components/arcade/icons.tsx` maps each key to a `react-icons` component.
Add to both and the new icon shows up in the picker.
