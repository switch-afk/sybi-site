"use client";

import { useState } from "react";

type VaultAction = "faucet" | "createtoken";

const DISCORD_INVITE_URL =
  process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || "https://discord.gg/your-invite-code";

const COPY: Record<VaultAction, { title: string; body: string; command: string }> = {
  faucet: {
    title: "CLAIM DEVNET SOL",
    body: "Join the Discord server, then run the command below in any channel. Up to 2 SOL per claim, capped at 2 SOL per person every 24h. Only you can see the command and the reply.",
    command: "/faucet address:<your wallet> amount:<sol>",
  },
  createtoken: {
    title: "CREATE A DEVNET TOKEN",
    body: "Join the Discord server, then run the command below. A form pops up for the token's name, symbol, decimals, supply and your wallet \u2014 only you can see it.",
    command: "/createtoken",
  },
};

export default function DevnetVault() {
  const [open, setOpen] = useState<VaultAction | null>(null);

  return (
    <section
      aria-label="Devnet tools"
      className="mx-auto flex w-full max-w-xs flex-col gap-4 sm:max-w-sm"
    >
      <VaultButton label="FAUCET" onClick={() => setOpen("faucet")} />
      <VaultButton label="CREATE TOKEN" onClick={() => setOpen("createtoken")} />

      {open ? <VaultModal action={open} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}

function VaultButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pixel-frame pixel-drop w-full bg-slate/80 px-6 py-4 text-center text-[10px] text-phosphor/80
                 transition-colors hover:bg-coin/20 hover:text-coin sm:text-xs"
    >
      {label}
    </button>
  );
}

function VaultModal({ action, onClose }: { action: VaultAction; onClose: () => void }) {
  const copy = COPY[action];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 px-4"
      onClick={onClose}
    >
      <div
        className="pixel-frame w-full max-w-sm bg-void p-5 text-phosphor"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-4 text-[10px] leading-relaxed text-coin sm:text-xs">{copy.title}</h2>

        <p className="mb-4 font-mono text-base leading-snug text-phosphor/80 sm:text-lg">
          {copy.body}
        </p>

        <code className="mb-5 block break-words border-2 border-coin/40 bg-slate/60 px-3 py-2 font-mono text-sm text-terminal sm:text-base">
          {copy.command}
        </code>

        <a
          href={DISCORD_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="pixel-frame mb-3 block w-full bg-coin py-3 text-center text-[10px] text-void transition-colors hover:bg-terminal sm:text-xs"
        >
          JOIN DISCORD
        </a>

        <button
          type="button"
          onClick={onClose}
          className="block w-full py-2 text-center font-mono text-sm text-phosphor/50 hover:text-phosphor"
        >
          close
        </button>
      </div>
    </div>
  );
}
