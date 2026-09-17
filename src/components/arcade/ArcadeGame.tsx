"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { play } from "./sfx";

/** Same trick as the background: draw into a buffer a quarter of the viewport
 *  and upscale with smoothing off, so every pixel is a real 4x4 block. */
const SCALE = 4;

const GRUNT = [
  "..X..X..",
  "..XXXX..",
  ".XXXXXX.",
  "XX.XX.XX",
  "XXXXXXXX",
  "..X..X..",
  ".X.XX.X.",
  "X.X..X.X",
];

const ARMOURED = [
  ".XXXXXX.",
  "XXXXXXXX",
  "XX.XX.XX",
  "XXXXXXXX",
  "X.XXXX.X",
  "XXX..XXX",
  ".X.XX.X.",
  "X.X..X.X",
];

const DARTER = [
  "...XX...",
  "..XXXX..",
  ".X.XX.X.",
  ".XXXXXX.",
  "XXX..XXX",
  "X.XXXX.X",
  "...XX...",
  "..X..X..",
];

const SPLITTER = [
  "..XXXX..",
  ".XXXXXX.",
  "XX.XX.XX",
  "XXXXXXXX",
  "XXXXXXXX",
  "XX.XX.XX",
  ".X.XX.X.",
  "X..XX..X",
];

const SHARD = [".XXX.", "XX.XX", "XXXXX", ".X.X.", "X...X"];

const BOSS = [
  "...XXXXXX...",
  "..XXXXXXXX..",
  ".XXXXXXXXXX.",
  "XXX.XXXX.XXX",
  "XXXXXXXXXXXX",
  "XXX.XXXX.XXX",
  "XXXXXXXXXXXX",
  ".XX.XXXX.XX.",
  "..XXX..XXX..",
  ".XX.X..X.XX.",
  "X..X....X..X",
  "X.X......X.X",
];

const COIN = [
  "..XXXX..",
  ".XXXXXX.",
  "XX.XX.XX",
  "XX.XX.XX",
  "XX.XX.XX",
  "XX.XX.XX",
  ".XXXXXX.",
  "..XXXX..",
];

type Kind = "grunt" | "armoured" | "darter" | "splitter" | "shard" | "boss";

const SPECS: Record<Kind, { sprite: string[]; size: number; colour: string; points: number }> = {
  grunt: { sprite: GRUNT, size: 8, colour: "#3fd2ff", points: 100 },
  armoured: { sprite: ARMOURED, size: 8, colour: "#e83b3b", points: 500 },
  darter: { sprite: DARTER, size: 8, colour: "#b57bff", points: 150 },
  splitter: { sprite: SPLITTER, size: 8, colour: "#7ee787", points: 200 },
  shard: { sprite: SHARD, size: 5, colour: "#a8f0b0", points: 50 },
  boss: { sprite: BOSS, size: 12, colour: "#ff9d2e", points: 2000 },
};

type Enemy = {
  x: number;
  y: number;
  vy: number;
  vx: number;
  hp: number;
  maxHp: number;
  kind: Kind;
  flash: number;
  phase: number;
};

type Coin = { x: number; y: number; vx: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; colour: string };
type Status = "wave" | "playing" | "over";

/** What each wave is made of. Armoured enemies start at wave 3 and climb from
 *  there; darters and splitters join later so the mix keeps changing. */
function composeWave(wave: number): Kind[] {
  if (wave % 10 === 0) {
    // Boss wave: one big one plus a small escort.
    return ["boss", ...Array<Kind>(Math.min(2 + Math.floor(wave / 10), 5)).fill("grunt")];
  }

  const kinds: Kind[] = [];
  const total = Math.min(3 + wave, 13);

  if (wave >= 3) {
    const armoured = Math.min(1 + Math.floor((wave - 3) / 2), 5);
    for (let i = 0; i < armoured; i++) kinds.push("armoured");
  }
  if (wave >= 4) {
    const darters = Math.min(1 + Math.floor((wave - 4) / 3), 4);
    for (let i = 0; i < darters; i++) kinds.push("darter");
  }
  if (wave >= 6) {
    const splitters = Math.min(1 + Math.floor((wave - 6) / 4), 3);
    for (let i = 0; i < splitters; i++) kinds.push("splitter");
  }

  while (kinds.length < total) kinds.push("grunt");
  return kinds.slice(0, total);
}

export default function ArcadeGame({
  sfxOn,
  onExit,
  origin,
}: {
  sfxOn: boolean;
  onExit: () => void;
  /** Where the starting click landed, so the crosshair is drawn immediately
   *  instead of waiting for the first mouse movement. */
  origin: { x: number; y: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [combo, setCombo] = useState(0);
  const [status, setStatus] = useState<Status>("wave");
  const [paused, setPaused] = useState(false);
  const [boss, setBoss] = useState<{ hp: number; max: number } | null>(null);

  // The loop reads these every frame; keeping them in refs avoids re-rendering
  // sixty times a second.
  const world = useRef({
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    coin: null as Coin | null,
    pointer: { x: -99, y: -99 },
    shake: 0,
    frame: 0,
    waveTimer: 0,
    coinTimer: 600,
    score: 0,
    lives: 3,
    wave: 1,
    combo: 0,
    status: "wave" as Status,
    paused: false,
    width: 0,
    height: 0,
  });

  const blip = useCallback((cue: string) => play(cue, sfxOn), [sfxOn]);

  // The best score is shared by everyone who plays, so it comes from the server
  // rather than this browser.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/highscore", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setBest(Number(data?.score) || 0);
      })
      .catch(() => {
        /* offline — the HUD just shows 0 until the next load */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveBest = useCallback((value: number) => {
    // Submit regardless of the local figure; the server decides what's highest,
    // since another player may have beaten it mid-game.
    fetch("/api/highscore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: value }),
    })
      .then((response) => response.json())
      .then((data) => {
        const confirmed = Number(data?.score);
        if (Number.isFinite(confirmed)) setBest(confirmed);
      })
      .catch(() => {
        setBest((current) => Math.max(current, value));
      });
  }, []);

  const makeEnemy = useCallback((kind: Kind, wave: number, width: number): Enemy => {
    const base = 0.2 + wave * 0.022;
    const spec = SPECS[kind];
    const hp = kind === "boss" ? 8 + Math.floor(wave / 10) * 4 : kind === "armoured" ? 3 : kind === "splitter" ? 2 : 1;

    const speed =
      kind === "boss"
        ? base * 0.3
        : kind === "armoured"
          ? base * 0.6
          : kind === "darter"
            ? base * 1.7
            : kind === "shard"
              ? base * 1.4
              : base;

    return {
      x: 12 + Math.random() * Math.max(1, width - spec.size - 24),
      y: -spec.size - 4 - Math.random() * 70,
      vy: speed * (0.88 + Math.random() * 0.24),
      vx: kind === "darter" ? 0 : (Math.random() - 0.5) * 0.08,
      hp,
      maxHp: hp,
      kind,
      flash: 0,
      phase: Math.random() * Math.PI * 2,
    };
  }, []);

  const spawnWave = useCallback(
    (waveNumber: number) => {
      const state = world.current;
      const kinds = composeWave(waveNumber);
      state.enemies = kinds.map((kind) => makeEnemy(kind, waveNumber, state.width));

      const bossEnemy = state.enemies.find((enemy) => enemy.kind === "boss");
      setBoss(bossEnemy ? { hp: bossEnemy.hp, max: bossEnemy.maxHp } : null);
    },
    [makeEnemy],
  );

  const restart = useCallback(() => {
    const state = world.current;
    state.enemies = [];
    state.particles = [];
    state.coin = null;
    state.score = 0;
    state.lives = 3;
    state.wave = 1;
    state.combo = 0;
    state.status = "wave";
    state.waveTimer = 90;
    state.coinTimer = 600;
    setScore(0);
    setLives(3);
    setWave(1);
    setCombo(0);
    setBoss(null);
    setStatus("wave");
  }, []);

  const burst = useCallback((x: number, y: number, colour: string, amount: number) => {
    const state = world.current;
    for (let i = 0; i < amount; i++) {
      const angle = (Math.PI * 2 * i) / amount + Math.random();
      const speed = 0.3 + Math.random() * 0.9;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.2,
        life: 18 + Math.random() * 16,
        colour,
      });
    }
  }, []);

  /* ------------------------------------------------------------ the loop */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = world.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      state.width = Math.max(1, Math.ceil(window.innerWidth / SCALE));
      state.height = Math.max(1, Math.ceil(window.innerHeight / SCALE));
      canvas.width = state.width;
      canvas.height = state.height;
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    state.waveTimer = 90;
    state.pointer = { x: origin.x / SCALE, y: origin.y / SCALE };

    const sprite = (bitmap: string[], x: number, y: number, colour: string) => {
      ctx.fillStyle = colour;
      for (let row = 0; row < bitmap.length; row++) {
        for (let col = 0; col < bitmap[row].length; col++) {
          if (bitmap[row][col] === "X") {
            ctx.fillRect(Math.round(x) + col, Math.round(y) + row, 1, 1);
          }
        }
      }
    };

    let animation = 0;

    const step = () => {
      animation = requestAnimationFrame(step);
      if (state.paused) return;

      state.frame++;
      ctx.clearRect(0, 0, state.width, state.height);

      ctx.save();
      if (state.shake > 0) {
        // Stepped, not smooth — a blurred shake would break the pixel look.
        ctx.translate(state.frame % 2 === 0 ? 2 : -2, 0);
        state.shake--;
      }

      /* wave banner */
      if (state.status === "wave") {
        state.waveTimer--;
        if (state.waveTimer <= 0) {
          spawnWave(state.wave);
          state.status = "playing";
          setStatus("playing");
        }
      }

      /* enemy movement */
      if (state.status === "playing") {
        for (const enemy of state.enemies) {
          enemy.y += enemy.vy;
          enemy.phase += 0.06;

          if (enemy.kind === "darter") {
            // Weaves across the screen instead of falling straight.
            enemy.x += Math.sin(enemy.phase) * 0.9;
            if (state.frame % 4 === 0) {
              state.particles.push({
                x: enemy.x + 4,
                y: enemy.y + 2,
                vx: 0,
                vy: -0.15,
                life: 10,
                colour: "rgba(181,123,255,0.5)",
              });
            }
          } else if (enemy.kind === "boss") {
            enemy.x += Math.sin(enemy.phase * 0.35) * 0.55;
          } else {
            enemy.x += enemy.vx;
          }

          const size = SPECS[enemy.kind].size;
          if (enemy.x < 2) enemy.x = 2;
          if (enemy.x > state.width - size - 2) enemy.x = state.width - size - 2;
          if (enemy.flash > 0) enemy.flash--;

          if (enemy.y > state.height - 4) {
            // Reached the bottom: costs a life and resets the combo.
            enemy.hp = 0;
            enemy.y = -9999;
            state.lives--;
            state.combo = 0;
            state.shake = reduced ? 0 : 12;
            setLives(state.lives);
            setCombo(0);
            blip("error");

            if (state.lives <= 0) {
              state.status = "over";
              setStatus("over");
              saveBest(state.score);
            }
          }
        }
        state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);

        if (state.enemies.length === 0 && state.status === "playing") {
          state.wave++;
          state.status = "wave";
          state.waveTimer = 80;
          setWave(state.wave);
          setBoss(null);
          setStatus("wave");
        }

        /* bonus coin */
        state.coinTimer--;
        if (state.coinTimer <= 0 && !state.coin) {
          const fromLeft = Math.random() < 0.5;
          state.coin = {
            x: fromLeft ? -10 : state.width + 10,
            y: 20 + Math.random() * (state.height * 0.5),
            vx: fromLeft ? 0.7 : -0.7,
          };
          state.coinTimer = 700 + Math.random() * 500;
        }
        if (state.coin) {
          state.coin.x += state.coin.vx;
          if (state.coin.x < -20 || state.coin.x > state.width + 20) state.coin = null;
        }
      }

      /* draw enemies */
      for (const enemy of state.enemies) {
        const spec = SPECS[enemy.kind];
        let colour = spec.colour;

        if (enemy.flash > 0) {
          colour = "#f4f4ef";
        } else if (enemy.maxHp > 1 && enemy.hp < enemy.maxHp) {
          // Damaged multi-hit enemies wash out so their health is readable.
          colour = enemy.hp / enemy.maxHp < 0.4 ? "#ffd7a0" : spec.colour;
        }

        sprite(spec.sprite, enemy.x, enemy.y, colour);
      }

      if (state.coin) {
        const shine = Math.floor(state.frame / 8) % 2 === 0 ? "#eab308" : "#fff3b0";
        sprite(COIN, state.coin.x, state.coin.y, shine);
      }

      /* particles */
      for (const particle of state.particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.04;
        particle.life--;
        ctx.fillStyle = particle.colour;
        ctx.fillRect(Math.round(particle.x), Math.round(particle.y), 1, 1);
      }
      state.particles = state.particles.filter((particle) => particle.life > 0);

      /* crosshair */
      if (state.status !== "over" && !state.paused && state.pointer.x > -50) {
        const { x, y } = state.pointer;
        ctx.fillStyle = "#eab308";
        ctx.fillRect(Math.round(x) - 5, Math.round(y), 3, 1);
        ctx.fillRect(Math.round(x) + 3, Math.round(y), 3, 1);
        ctx.fillRect(Math.round(x), Math.round(y) - 5, 1, 3);
        ctx.fillRect(Math.round(x), Math.round(y) + 3, 1, 3);
      }

      ctx.restore();
    };

    step();

    /* -------------------------------------------------------- input */
    const toBuffer = (event: MouseEvent) => ({
      x: event.clientX / SCALE,
      y: event.clientY / SCALE,
    });

    const onMove = (event: MouseEvent) => {
      state.pointer = toBuffer(event);
    };

    const onClick = (event: MouseEvent) => {
      if (state.status === "over" || state.paused) return;
      // EXIT and other controls shouldn't register as a missed shot.
      if ((event.target as HTMLElement).closest("button")) return;

      const { x, y } = toBuffer(event);
      let hit = false;

      for (const enemy of state.enemies) {
        const size = SPECS[enemy.kind].size;
        // Hit box is a shade larger than the sprite so near-misses feel fair.
        if (
          x >= enemy.x - 1 &&
          x <= enemy.x + size + 1 &&
          y >= enemy.y - 1 &&
          y <= enemy.y + size + 1
        ) {
          enemy.hp--;
          enemy.flash = 4;
          hit = true;

          if (enemy.kind === "boss") setBoss({ hp: Math.max(enemy.hp, 0), max: enemy.maxHp });

          if (enemy.hp <= 0) {
            const spec = SPECS[enemy.kind];
            burst(enemy.x + size / 2, enemy.y + size / 2, spec.colour, enemy.kind === "boss" ? 40 : 12);

            if (enemy.kind === "splitter") {
              // Breaks into two fast shards rather than simply dying.
              for (let i = 0; i < 2; i++) {
                const shard = makeEnemy("shard", state.wave, state.width);
                shard.x = Math.min(Math.max(enemy.x + (i === 0 ? -6 : 6), 2), state.width - 8);
                shard.y = enemy.y;
                state.enemies.push(shard);
              }
            }

            if (enemy.kind === "boss") {
              state.shake = reduced ? 0 : 20;
              setBoss(null);
            }

            state.combo++;
            const multiplier = state.combo >= 10 ? 3 : state.combo >= 5 ? 2 : 1;
            state.score += spec.points * multiplier;
            setScore(state.score);
            setCombo(state.combo);
            blip(enemy.kind === "boss" ? "coin" : "select");
          } else {
            burst(enemy.x + size / 2, enemy.y + size / 2, "#f4f4ef", 5);
            blip("move");
          }
          break;
        }
      }

      if (!hit && state.coin) {
        const coin = state.coin;
        if (x >= coin.x - 1 && x <= coin.x + 9 && y >= coin.y - 1 && y <= coin.y + 9) {
          burst(coin.x + 4, coin.y + 4, "#eab308", 16);
          state.score += 250;
          setScore(state.score);
          state.coin = null;
          hit = true;
          blip("coin");
        }
      }

      if (!hit) {
        // A miss breaks the combo — that's what makes accuracy matter.
        burst(x, y, "#3a3a5c", 4);
        if (state.combo > 0) {
          state.combo = 0;
          setCombo(0);
        }
        blip("back");
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        state.paused = true;
        setPaused(true);
      }
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(animation);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [blip, burst, saveBest, spawnWave, makeEnemy, origin]);

  /* exit on ESC */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  const resume = () => {
    world.current.paused = false;
    setPaused(false);
  };

  const multiplier = combo >= 10 ? 3 : combo >= 5 ? 2 : 1;

  // The canvas only draws the crosshair while play is live, so the real cursor
  // has to come back on the game over and pause screens.
  const crosshairActive = status !== "over" && !paused;

  return (
    <div className={`fixed inset-0 z-40 select-none ${crosshairActive ? "cursor-none" : ""}`}>
      <canvas ref={canvasRef} className="pixelated absolute inset-0 h-full w-full" />

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 text-[9px] text-phosphor sm:p-6 sm:text-[10px]">
        <div className="space-y-2">
          <p className="text-coin">SCORE {String(score).padStart(6, "0")}</p>
          <p className="text-phosphor/45">WORLD {String(best).padStart(6, "0")}</p>
          {multiplier > 1 ? <p className="text-terminal">COMBO x{multiplier}</p> : null}
        </div>

        <p className="text-phosphor/60">WAVE {wave}</p>

        <div className="flex items-center gap-1.5">
          {Array.from({ length: 3 }, (_, index) => (
            <span
              key={index}
              className={`size-3 ${index < lives ? "bg-danger" : "bg-phosphor/15"}`}
            />
          ))}
        </div>
      </div>

      {/* Boss health */}
      {boss ? (
        <div className="pointer-events-none absolute inset-x-0 top-20 flex flex-col items-center gap-2 sm:top-24">
          <p className="text-[8px] tracking-widest text-[#ff9d2e]">WARNING</p>
          <div
            className="pixel-frame pixel-frame-thin h-3 w-56 bg-void"
            style={{ ["--px-color" as string]: "#ff9d2e" }}
          >
            <div
              className="h-full bg-[#ff9d2e] transition-[width] duration-150"
              style={{ width: `${Math.max(0, (boss.hp / boss.max) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onExit}
        aria-label="Exit game"
        className="pixel-frame pixel-frame-thin absolute right-4 bottom-4 cursor-pointer bg-void px-3 py-2 text-[9px] text-phosphor/60 hover:text-coin sm:right-6 sm:bottom-6"
        style={{ ["--px-color" as string]: "#3a3a5c" }}
      >
        EXIT [ESC]
      </button>

      {/* Wave banner */}
      {status === "wave" ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4">
          <p
            className="pixel-text-shadow text-2xl text-coin sm:text-4xl"
            style={{ animation: "blink-step 0.5s steps(1, end) infinite" }}
          >
            WAVE {wave}
          </p>
          {wave % 10 === 0 ? (
            <p className="text-[10px] text-[#ff9d2e]">BOSS INCOMING</p>
          ) : null}
        </div>
      ) : null}

      {/* Paused (tab lost focus) */}
      {paused && status !== "over" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-void/80">
          <button
            type="button"
            onClick={resume}
            className="pixel-frame cursor-pointer bg-coin px-6 py-4 text-[10px] text-void"
          >
            PAUSED — RESUME
          </button>
        </div>
      ) : null}

      {/* Game over */}
      {status === "over" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-void/85 px-4">
          <div
            className="pixel-frame pixel-drop w-full max-w-sm bg-slate p-6 text-center"
            style={{ animation: "rise-in 0.3s steps(4, end) both" }}
          >
            <h2 className="mb-6 text-sm text-danger">GAME OVER</h2>
            <p className="mb-2 text-[10px] text-coin">SCORE {String(score).padStart(6, "0")}</p>
            <p className="mb-2 text-[9px] text-phosphor/45">
              WORLD BEST {String(best).padStart(6, "0")}
            </p>
            {score >= best && score > 0 ? (
              <p className="mb-2 text-[9px] text-coin">NEW RECORD</p>
            ) : null}
            <p className="mb-6 text-[9px] text-phosphor/35">REACHED WAVE {wave}</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={restart}
                className="pixel-frame cursor-pointer bg-coin px-4 py-3 text-[10px] text-void hover:bg-coin/80"
              >
                PLAY AGAIN
              </button>
              <button
                type="button"
                onClick={onExit}
                className="pixel-frame pixel-frame-thin cursor-pointer bg-void px-4 py-3 text-[9px] text-phosphor/60 hover:text-coin"
                style={{ ["--px-color" as string]: "#3a3a5c" }}
              >
                BACK TO SITE
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}