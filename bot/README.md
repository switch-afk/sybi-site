# bot/ — sybi-devnet-bot

Discord bot for sybimeta.xyz's Faucet / Create Token buttons. Lives inside the
`sybi-site` repo, in this `bot/` folder, with its own `package.json` and
`node_modules` \u2014 it doesn't touch the Next.js app's dependencies and runs as
a separate process.

All commands below assume you're inside `bot/` (`cd bot`) unless noted.

- `/faucet address:<wallet> amount:<sol>` — sends devnet SOL. Capped at 2 SOL
  per claim and 2 SOL per user per rolling 24h, both env-configurable.
- `/createtoken` — opens a modal (name, symbol, decimals, supply, your
  address), mints the supply to you, then revokes mint authority so the
  supply is fixed. Capped at 3 creations per user per 24h.

Every reply is ephemeral — only the person who ran the command sees it or the
command invocation itself, nobody else in the channel.

No database: usage is tracked in `data/faucet.json` and
`data/createtoken.json`, same pattern as sybi-site's JSON storage.

---

## 1. Discord application setup

You said you already have a bot application — you'll need three things from
it, all under the Discord Developer Portal (discord.com/developers/applications):

1. **Bot token** — "Bot" tab → Reset/copy token → `DISCORD_TOKEN`
2. **Application (client) ID** — "General Information" tab → `DISCORD_CLIENT_ID`
3. **Your server ID** — in Discord, enable Developer Mode (User Settings →
   Advanced), then right-click your server icon → Copy Server ID →
   `DISCORD_GUILD_ID` (only needed while testing — see below)

Invite the bot to your server with the `applications.commands` and `bot`
scopes, and the "Send Messages" + "Use Slash Commands" permissions. Use the
OAuth2 URL Generator on the same portal page to build the invite link.

## 2. Treasury wallet

The bot needs its own devnet keypair to send SOL from and pay rent for new
mints.

```bash
solana-keygen new --outfile treasury.json
solana address -k treasury.json
solana airdrop 2 <the address printed above> --url devnet
```

Paste the contents of `treasury.json` (a `[12,34,...]` array) into
`TREASURY_SECRET_KEY` in `.env`, or export the base58 secret key from
Phantom/Solflare instead — either format works.

**Keep the treasury topped up.** `solana airdrop` is rate-limited, so once
this gets real usage, top up in small amounts regularly, or grab devnet SOL
from a provider faucet (Helius, QuickNode) and send it to the treasury
address.

## 3. Install and configure

```bash
npm install
cp .env.example .env
# fill in .env
```

## 4. Register the slash commands

```bash
npm run deploy-commands
```

With `DISCORD_GUILD_ID` set, commands show up in that one server instantly —
best while testing. Once you're happy, you can remove `DISCORD_GUILD_ID` and
re-run this to register globally (takes up to ~1 hour to reach every server).

## 5. Run it

Locally:

```bash
npm start
```

On the VPS, from inside the already-deployed sybi-site checkout:

```bash
cd ~/htdocs/sybi-site/bot
npm install
pm2 start src/index.js --name sybi-devnet-bot
pm2 save
```

You'll end up with two PM2 processes from one repo: `sybimeta` (the site) and
`sybi-devnet-bot` (this bot).

Run a single instance — like sybi-site, usage is tracked in JSON files, and
two processes writing to them will clobber each other.

## Adjusting limits

All in `.env`:

| Variable                      | Default | Meaning                              |
| ------------------------------ | ------- | ------------------------------------- |
| `FAUCET_MAX_SOL_PER_CLAIM`     | 2       | Max SOL a single `/faucet` call sends |
| `FAUCET_MAX_SOL_PER_24H`       | 2       | Max SOL per user per rolling 24h      |
| `TOKEN_CREATIONS_MAX_PER_24H`  | 3       | Max `/createtoken` runs per user/24h  |
