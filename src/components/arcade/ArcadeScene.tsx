"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PixelCanvas from "./PixelCanvas";
import PixelAvatar from "./PixelAvatar";
import { iconFor } from "./icons";
import { play, SFX_STORAGE_KEY } from "./sfx";
import type { LinkItem } from "@/lib/links";

const ROLES = ["DIGITAL LIBERATOR", "REALITY ARCHITECT"];
const HANDLE = "@sybimeta";
const COLUMNS = 4;

const BOOT_LINES = [
  "SYBI SYSTEM  (C) 2026",
  "MEM CHECK ........ OK",
  "LOADING SPRITES .. OK",
  "READY.",
];


/** Drawn rather than typed: the pixel font has no arrow or return characters,
 *  so the text versions render as empty boxes. */
function DpadGlyph() {
  return (
    <svg viewBox="0 0 11 11" aria-hidden className="size-3 shrink-0 fill-coin/70">
      <rect x="5" y="0" width="1" height="1" />
      <rect x="4" y="1" width="3" height="1" />
      <rect x="0" y="5" width="1" height="1" />
      <rect x="1" y="4" width="1" height="3" />
      <rect x="10" y="5" width="1" height="1" />
      <rect x="9" y="4" width="1" height="3" />
      <rect x="5" y="10" width="1" height="1" />
      <rect x="4" y="9" width="3" height="1" />
      <rect x="5" y="5" width="1" height="1" />
    </svg>
  );
}

function EnterGlyph() {
  return (
    <svg viewBox="0 0 11 9" aria-hidden className="size-3 shrink-0 fill-coin/70">
      <rect x="8" y="1" width="2" height="4" />
      <rect x="2" y="4" width="8" height="1" />
      <rect x="2" y="5" width="1" height="1" />
      <rect x="1" y="3" width="1" height="1" />
      <rect x="2" y="2" width="1" height="1" />
      <rect x="1" y="4" width="1" height="1" />
      <rect x="2" y="6" width="1" height="1" />
      <rect x="3" y="3" width="1" height="3" />
    </svg>
  );
}

export default function ArcadeScene({ links }: { links: LinkItem[] }) {
  const [booted, setBooted] = useState(false);
  const [bootStep, setBootStep] = useState(0);
  const [selected, setSelected] = useState(0);
  const [sfxOn, setSfxOn] = useState(false);
  const [typed, setTyped] = useState("");
  const [roleIndex, setRoleIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const blip = useCallback((cue: string) => play(cue, sfxOn), [sfxOn]);

  // Restore the sound preference; it stays off until someone asks for it.
  useEffect(() => {
    try {
      setSfxOn(window.localStorage.getItem(SFX_STORAGE_KEY) === "on");
    } catch {
      /* private mode — leave sound off */
    }
  }, []);

  const toggleSfx = () => {
    const next = !sfxOn;
    setSfxOn(next);
    try {
      window.localStorage.setItem(SFX_STORAGE_KEY, next ? "on" : "off");
    } catch {
      /* ignore */
    }
    play("coin", next);
  };

  // Boot sequence, then the screen wipes in once.
  useEffect(() => {
    if (booted) return;
    if (bootStep >= BOOT_LINES.length) {
      const done = setTimeout(() => setBooted(true), 380);
      return () => clearTimeout(done);
    }
    const tick = setTimeout(() => setBootStep((step) => step + 1), bootStep === 0 ? 260 : 300);
    return () => clearTimeout(tick);
  }, [bootStep, booted]);

  useEffect(() => {
    if (booted) return;
    const skip = () => setBooted(true);
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [booted]);

  // Typewriter for the role line.
  useEffect(() => {
    if (!booted) return;
    const target = ROLES[roleIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (!deleting && typed.length < target.length) {
      timer = setTimeout(() => setTyped(target.slice(0, typed.length + 1)), 70);
    } else if (!deleting && typed.length === target.length) {
      timer = setTimeout(() => setDeleting(true), 1900);
    } else if (deleting && typed.length > 0) {
      timer = setTimeout(() => setTyped(typed.slice(0, -1)), 35);
    } else {
      setDeleting(false);
      setRoleIndex((index) => (index + 1) % ROLES.length);
      return;
    }
    return () => clearTimeout(timer);
  }, [typed, deleting, roleIndex, booted]);

  const move = useCallback(
    (delta: number) => {
      if (!links.length) return;
      setSelected((current) => {
        // Horizontal steps wrap around; vertical row jumps clamp, so pressing
        // down on the last row doesn't throw you back to the top.
        const next =
          Math.abs(delta) === 1
            ? (current + delta + links.length) % links.length
            : Math.min(Math.max(current + delta, 0), links.length - 1);
        if (next !== current) itemRefs.current[next]?.focus();
        return next;
      });
      blip("move");
    },
    [links.length, blip],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!booted) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        move(COLUMNS);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        move(-COLUMNS);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, booted]);

  const rows = useMemo(
    () =>
      links.map((link) => ({
        ...link,
        Icon: iconFor(link.icon),
      })),
    [links],
  );

  return (
    <div className="scanlines crt-vignette relative min-h-screen w-full overflow-hidden bg-void text-phosphor">
      {/* The boot sequence sits on top rather than replacing the page, so the
          links are in the HTML from the first byte for crawlers and no-JS. */}
      {!booted ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void px-6">
          <div className="w-full max-w-md space-y-3 text-[10px] leading-relaxed text-coin sm:text-xs">
            {BOOT_LINES.slice(0, bootStep).map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="text-phosphor/50">
              <span
                className="inline-block size-2 bg-phosphor align-middle"
                style={{ animation: "blink-step 1s steps(1, end) infinite" }}
              />
              <span className="ml-2">press any key to skip</span>
            </p>
          </div>
        </div>
      ) : null}

      <PixelCanvas />

      <div
        className="relative z-20 flex min-h-screen flex-col"
        style={booted ? { animation: "power-flicker 0.7s steps(8, end) 1" } : undefined}
      >
        {/* Status bar */}
        <header className="flex items-center justify-between gap-3 border-b-4 border-coin/25 px-3 py-3 text-[7px] sm:gap-4 sm:px-8 sm:text-[10px]">
          <span className="text-coin">SYBI.EXE</span>
          <span className="hidden text-phosphor/45 sm:inline">{HANDLE}</span>
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={toggleSfx}
              aria-pressed={sfxOn}
              className="text-phosphor/60 transition-colors hover:text-coin"
            >
              SOUND {sfxOn ? "ON" : "OFF"}
            </button>
            <span className="hidden items-center gap-2 text-phosphor/45 min-[380px]:flex">
              <span
                className="size-2 bg-coin"
                style={{ animation: "blink-step 1.6s steps(1, end) infinite" }}
              />
              ONLINE
            </span>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-10 sm:gap-10 sm:px-8 sm:py-12">
          {/* Hero sprite + logotype */}
          <div className="flex flex-col items-center gap-5 sm:gap-7">
            <PixelAvatar src="/profile.png" alt="Sybi" />

            <h1
              className="pixel-text-shadow text-center text-3xl leading-none text-coin sm:text-5xl md:text-6xl"
              style={{ animation: "glitch-shift 6s steps(2, end) infinite" }}
            >
              SYBI
            </h1>

            <p className="flex min-h-5 items-center text-center text-[9px] text-terminal sm:text-[11px]">
              {typed}
              <span
                className="ml-1 inline-block h-3 w-2 bg-terminal"
                style={{ animation: "blink-step 0.9s steps(1, end) infinite" }}
              />
            </p>
          </div>

          {/* Link grid — icon-only blocks, four per row at every width. */}
          <nav
            aria-label="Links"
            className="w-full"
            style={booted ? { animation: "rise-in 0.45s steps(5, end) both 0.2s" } : undefined}
          >
            {rows.length === 0 ? (
              <p className="py-10 text-center text-[9px] leading-loose text-phosphor/50 sm:text-[10px]">
                No links yet.
                <br />
                Add the first one in the admin panel.
              </p>
            ) : (
              <ul className="mx-auto grid w-fit grid-cols-4 gap-3 sm:gap-4">
                {rows.map((row, index) => {
                  const active = index === selected;
                  return (
                    <li key={row.id}>
                      <a
                        ref={(node) => {
                          itemRefs.current[index] = node;
                        }}
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={row.label}
                        aria-label={row.label}
                        onMouseEnter={() => {
                          if (selected !== index) {
                            setSelected(index);
                            blip("move");
                          }
                        }}
                        onFocus={() => setSelected(index)}
                        onClick={() => blip("select")}
                        className={`pixel-frame flex size-14 items-center justify-center sm:size-16 ${
                          active
                            ? "pixel-drop bg-coin/20 text-coin"
                            : "bg-slate/80 text-phosphor/70"
                        }`}
                        style={{
                          ["--px-color" as string]: active ? "var(--coin)" : "#3a3a5c",
                        }}
                      >
                        <row.Icon aria-hidden className="size-6 shrink-0 sm:size-7" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>

          <div className="flex items-center gap-4 text-[8px] text-phosphor/35 sm:text-[9px]">
            <span className="flex items-center gap-2">
              <DpadGlyph />
              move
            </span>
            <span className="text-phosphor/20">/</span>
            <span className="flex items-center gap-2">
              <EnterGlyph />
              open
            </span>
          </div>
        </main>

        <footer className="px-4 pb-6 text-center text-[8px] text-phosphor/30 sm:px-8 sm:text-[9px]">
          <span style={{ animation: "blink-step 2s steps(1, end) infinite" }}>INSERT COIN</span>
        </footer>
      </div>
    </div>
  );
}
