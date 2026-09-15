"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ICON_OPTIONS, iconFor } from "@/components/arcade/icons";
import { labelForIcon } from "@/lib/icon-keys";
import type { LinkItem } from "@/lib/links";

type Draft = { url: string; icon: string };

/* ---------------------------------------------------------------- pieces */

function PixelToggle({
  checked,
  onChange,
  busy,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? "Shown on the site" : "Hidden from the site"}
      disabled={busy}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 disabled:opacity-40"
    >
      <span
        className={`pixel-frame pixel-frame-thin relative block h-6 w-14 transition-colors ${
          checked ? "bg-coin/25" : "bg-void"
        }`}
        style={{ ["--px-color" as string]: checked ? "var(--coin)" : "#3a3a5c" }}
      >
        <span
          className={`absolute top-1 block size-4 transition-all duration-100 ${
            checked ? "left-9 bg-coin" : "left-1 bg-phosphor/35"
          }`}
        />
      </span>
      <span className={`w-14 text-left text-[8px] ${checked ? "text-coin" : "text-phosphor/40"}`}>
        {checked ? "SHOWN" : "HIDDEN"}
      </span>
    </button>
  );
}

function IconPicker({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const Current = iconFor(value);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return ICON_OPTIONS;
    return ICON_OPTIONS.filter(
      (option) =>
        option.key.includes(term) || option.label.toLowerCase().includes(term),
    );
  }, [query]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        title={labelForIcon(value)}
        aria-label={`Icon: ${labelForIcon(value)}. Choose a different one`}
        aria-expanded={open}
        className="pixel-frame pixel-frame-thin flex size-11 items-center justify-center bg-void text-coin hover:bg-coin/15"
        style={{ ["--px-color" as string]: "#3a3a5c" }}
      >
        <Current className="size-5" aria-hidden />
      </button>

      {open ? (
        <div
          className="pixel-frame absolute top-14 left-0 z-30 w-72 bg-slate p-2"
          style={{ ["--px-color" as string]: "var(--coin)" }}
        >
          <input
            autoFocus
            value={query}
            placeholder="search icons..."
            onChange={(event) => setQuery(event.target.value)}
            className="mb-2 w-full bg-void px-2 py-2 font-mono text-base text-phosphor placeholder:text-phosphor/25 focus:outline-none"
          />

          <div className="grid max-h-56 grid-cols-6 gap-1 overflow-y-auto">
            {matches.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                title={label}
                aria-label={label}
                onClick={() => {
                  onSelect(key);
                  setOpen(false);
                  setQuery("");
                }}
                className={`flex size-10 items-center justify-center hover:bg-coin/25 ${
                  key === value ? "bg-coin/30 text-coin" : "text-phosphor/70"
                }`}
              >
                <Icon className="size-4" aria-hidden />
              </button>
            ))}
          </div>

          {matches.length === 0 ? (
            <p className="px-1 py-3 text-[8px] text-phosphor/40">No icon matches that.</p>
          ) : (
            <p className="px-1 pt-2 text-[8px] text-phosphor/30">{matches.length} icons</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  onEnter,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  type?: "text" | "password";
  autoComplete?: string;
  onEnter?: () => void;
}) {
  return (
    <label className="flex flex-1 flex-col gap-2">
      <span className="text-[8px] text-phosphor/40">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && onEnter) {
            event.preventDefault();
            onEnter();
          }
        }}
        className="pixel-frame pixel-frame-thin w-full bg-void px-3 py-2 font-mono text-base text-phosphor placeholder:text-phosphor/25 focus:outline-none"
        style={{ ["--px-color" as string]: "#3a3a5c" }}
      />
    </label>
  );
}

/* ----------------------------------------------------------------- login */

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Sign in failed.");
        setPassword("");
        return;
      }
      onSuccess();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="scanlines flex min-h-screen items-center justify-center bg-void px-4">
      <div
        className="pixel-frame pixel-drop w-full max-w-sm bg-slate p-6"
        style={{ animation: "rise-in 0.35s steps(4, end) both" }}
      >
        <h1 className="mb-1 text-sm text-coin">ADMIN</h1>
        <p className="mb-6 text-[9px] leading-relaxed text-phosphor/45">
          Enter the password to manage your links.
        </p>

        <Field
          label="PASSWORD"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          onEnter={submit}
        />

        <button
          type="button"
          onClick={submit}
          disabled={busy || !password}
          className="pixel-frame mt-6 w-full bg-coin px-4 py-3 text-[10px] text-void hover:bg-coin/80 disabled:opacity-40"
        >
          {busy ? "CHECKING..." : "SIGN IN"}
        </button>

        {error ? <p className="mt-4 text-[9px] leading-relaxed text-danger">{error}</p> : null}

        <Link href="/" className="mt-6 block text-[8px] text-phosphor/35 hover:text-coin">
          &#9664; back to the site
        </Link>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------- dashboard */

export default function AdminApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [newLink, setNewLink] = useState<Draft>({ url: "", icon: "link" });
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const apply = (next: LinkItem[]) => {
    setLinks(next);
    setDrafts(
      Object.fromEntries(
        next.map((link) => [link.id, { url: link.url, icon: link.icon }]),
      ),
    );
  };

  const load = async () => {
    const response = await fetch("/api/admin/links", { cache: "no-store" });
    if (response.status === 401) {
      setAuthed(false);
      return;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setAuthed(true);
      setMessage({ tone: "bad", text: data.error ?? "Couldn't load your links." });
      return;
    }
    setAuthed(true);
    apply(data.links ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const send = async (id: string | null, init: RequestInit & { query?: string }) => {
    setBusyId(id ?? "form");
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/links${init.query ?? ""}`, {
        method: init.method,
        headers: init.body ? { "Content-Type": "application/json" } : undefined,
        body: init.body,
      });
      if (response.status === 401) {
        setAuthed(false);
        return false;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ tone: "bad", text: data.error ?? "That didn't work." });
        return false;
      }
      apply(data.links ?? []);
      return true;
    } catch {
      setMessage({ tone: "bad", text: "Couldn't reach the server." });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const addLink = async () => {
    const ok = await send(null, { method: "POST", body: JSON.stringify(newLink) });
    if (ok) {
      setNewLink({ url: "", icon: "link" });
      setMessage({ tone: "ok", text: "Link added." });
    }
  };

  const saveRow = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    const ok = await send(id, { method: "PATCH", body: JSON.stringify({ id, ...draft }) });
    if (ok) setMessage({ tone: "ok", text: "Changes saved." });
  };

  const setVisible = async (id: string, visible: boolean) => {
    const ok = await send(id, { method: "PATCH", body: JSON.stringify({ id, visible }) });
    if (ok) setMessage({ tone: "ok", text: visible ? "Link is live." : "Link is hidden." });
  };

  const moveRow = (id: string, direction: "up" | "down") =>
    send(id, { method: "PATCH", body: JSON.stringify({ id, move: direction }) });

  const removeRow = async (id: string) => {
    const ok = await send(id, { method: "DELETE", query: `?id=${encodeURIComponent(id)}` });
    setConfirmingId(null);
    if (ok) setMessage({ tone: "ok", text: "Link deleted." });
  };

  const signOut = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
  };

  if (authed === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void text-[10px] text-coin">
        <span style={{ animation: "blink-step 0.8s steps(1, end) infinite" }}>LOADING...</span>
      </main>
    );
  }

  if (!authed) return <LoginScreen onSuccess={() => void load()} />;

  const visibleCount = links.filter((link) => link.visible).length;

  return (
    <main className="scanlines min-h-screen bg-void px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b-4 border-coin/25 pb-5">
          <div>
            <h1 className="text-sm text-coin">LINK MANAGER</h1>
            <p className="mt-2 text-[9px] text-phosphor/40">
              {links.length} total, {visibleCount} on the site
            </p>
          </div>
          <div className="flex items-center gap-5 text-[9px]">
            <Link href="/" className="text-phosphor/50 hover:text-coin">
              view site
            </Link>
            <button type="button" onClick={signOut} className="text-phosphor/50 hover:text-danger">
              sign out
            </button>
          </div>
        </header>

        {message ? (
          <p
            className={`mb-6 text-[9px] leading-relaxed ${
              message.tone === "ok" ? "text-coin" : "text-danger"
            }`}
          >
            {message.text}
          </p>
        ) : null}

        {/* Add */}
        <section
          className="pixel-frame mb-10 bg-slate p-5"
          style={{ ["--px-color" as string]: "#3a3a5c" }}
        >
          <h2 className="mb-5 text-[10px] text-coin">ADD A LINK</h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-2">
              <span className="max-w-24 truncate text-[8px] text-coin/60">
                {labelForIcon(newLink.icon)}
              </span>
              <IconPicker
                value={newLink.icon}
                onSelect={(icon) => setNewLink((draft) => ({ ...draft, icon }))}
              />
            </div>
            <Field
              label="URL"
              value={newLink.url}
              placeholder="twitch.tv/sybimeta"
              onChange={(url) => setNewLink((draft) => ({ ...draft, url }))}
              onEnter={addLink}
            />
            <button
              type="button"
              onClick={addLink}
              disabled={busyId === "form" || !newLink.url}
              className="pixel-frame bg-coin px-5 py-2.5 text-[9px] text-void hover:bg-coin/80 disabled:opacity-40"
            >
              ADD
            </button>
          </div>
        </section>

        {/* List */}
        <h2 className="mb-4 text-[10px] text-coin">YOUR LINKS</h2>

        {links.length === 0 ? (
          <p className="py-10 text-center text-[9px] leading-loose text-phosphor/40">
            Nothing here yet. Add your first link above.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {links.map((link, index) => {
              const draft = drafts[link.id] ?? { url: link.url, icon: link.icon };
              const dirty = draft.url !== link.url || draft.icon !== link.icon;
              const busy = busyId === link.id;

              return (
                <li
                  key={link.id}
                  className={`pixel-frame bg-slate p-4 ${busy ? "opacity-60" : ""}`}
                  style={{ ["--px-color" as string]: link.visible ? "var(--coin)" : "#3a3a5c" }}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="flex flex-col gap-2">
                      <span className="max-w-24 truncate text-[8px] text-coin/60">
                        {labelForIcon(draft.icon)}
                      </span>
                      <IconPicker
                        value={draft.icon}
                        onSelect={(icon) =>
                          setDrafts((state) => ({ ...state, [link.id]: { ...draft, icon } }))
                        }
                      />
                    </div>
                    <Field
                      label="URL"
                      value={draft.url}
                      onChange={(url) =>
                        setDrafts((state) => ({ ...state, [link.id]: { ...draft, url } }))
                      }
                      onEnter={() => saveRow(link.id)}
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t-2 border-phosphor/10 pt-4">
                    <PixelToggle
                      checked={link.visible}
                      busy={busy}
                      onChange={(next) => setVisible(link.id, next)}
                    />

                    <div className="flex items-center gap-2 text-[8px]">
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={index === 0 || busy}
                        onClick={() => moveRow(link.id, "up")}
                        className="pixel-frame pixel-frame-thin bg-void px-3 py-2 text-phosphor/60 hover:text-coin disabled:opacity-25"
                        style={{ ["--px-color" as string]: "#3a3a5c" }}
                      >
                        &#9650;
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={index === links.length - 1 || busy}
                        onClick={() => moveRow(link.id, "down")}
                        className="pixel-frame pixel-frame-thin bg-void px-3 py-2 text-phosphor/60 hover:text-coin disabled:opacity-25"
                        style={{ ["--px-color" as string]: "#3a3a5c" }}
                      >
                        &#9660;
                      </button>

                      {dirty ? (
                        <button
                          type="button"
                          onClick={() => saveRow(link.id)}
                          disabled={busy}
                          className="pixel-frame bg-coin px-4 py-2 text-void hover:bg-coin/80"
                        >
                          SAVE
                        </button>
                      ) : null}

                      {confirmingId === link.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => removeRow(link.id)}
                            disabled={busy}
                            className="pixel-frame bg-danger px-4 py-2 text-void"
                          >
                            DELETE?
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            className="px-2 py-2 text-phosphor/45 hover:text-phosphor"
                          >
                            KEEP
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingId(link.id)}
                          disabled={busy}
                          className="pixel-frame pixel-frame-thin bg-void px-4 py-2 text-danger hover:bg-danger/15"
                          style={{ ["--px-color" as string]: "var(--danger)" }}
                        >
                          DELETE
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
