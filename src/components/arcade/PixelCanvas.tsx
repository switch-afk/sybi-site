"use client";

import { useEffect, useRef } from "react";

/** Everything is drawn into a buffer 1/4 the size of the viewport and stretched
 *  back up with smoothing off, so every "pixel" is a real 4x4 block. */
const SCALE = 4;

const CRITTER = [
  "..X..X..",
  "..XXXX..",
  ".XXXXXX.",
  "XX.XX.XX",
  "XXXXXXXX",
  "..X..X..",
  ".X.XX.X.",
  "X.X..X.X",
];

type Star = { x: number; y: number; size: number; speed: number; hue: 0 | 1 };
type Critter = { x: number; y: number; vx: number; vy: number; step: number; tint: string };
type Block = { x: number; y: number; speed: number; length: number };

export default function PixelCanvas({ hideSprites = false }: { hideSprites?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The loop can't read the prop directly, so it reads this instead.
  const hideRef = useRef(hideSprites);

  useEffect(() => {
    hideRef.current = hideSprites;
  }, [hideSprites]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let critters: Critter[] = [];
    let blocks: Block[] = [];

    const build = () => {
      width = Math.max(1, Math.ceil(window.innerWidth / SCALE));
      height = Math.max(1, Math.ceil(window.innerHeight / SCALE));
      canvas.width = width;
      canvas.height = height;
      ctx.imageSmoothingEnabled = false;

      const starCount = Math.round((width * height) / 900);
      stars = Array.from({ length: starCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() < 0.75 ? 1 : 2,
        speed: 0.04 + Math.random() * 0.18,
        hue: Math.random() < 0.82 ? 0 : 1,
      }));

      critters = Array.from({ length: 5 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() < 0.5 ? -1 : 1) * (0.06 + Math.random() * 0.1),
        vy: (Math.random() - 0.5) * 0.05,
        step: Math.floor(Math.random() * 60),
        tint: Math.random() < 0.5 ? "rgba(234,179,8,0.30)" : "rgba(63,210,255,0.24)",
      }));

      blocks = Array.from({ length: 14 }, () => ({
        x: Math.floor(Math.random() * width),
        y: Math.random() * height,
        speed: 0.25 + Math.random() * 0.7,
        length: 2 + Math.floor(Math.random() * 5),
      }));
    };

    const drawSprite = (sprite: string[], x: number, y: number, colour: string) => {
      ctx.fillStyle = colour;
      for (let row = 0; row < sprite.length; row++) {
        for (let col = 0; col < sprite[row].length; col++) {
          if (sprite[row][col] === "X") ctx.fillRect(Math.round(x) + col, Math.round(y) + row, 1, 1);
        }
      }
    };

    let frame = 0;
    let animationId = 0;
    // Background critters look identical to the game's grunts, so they fade
    // out during play rather than sitting there as unshootable decoys.
    let critterFade = 1;

    const draw = () => {
      frame++;
      ctx.fillStyle = "#07070c";
      ctx.fillRect(0, 0, width, height);

      // Grid floor — one dot every 16 buffer pixels.
      ctx.fillStyle = "rgba(234,179,8,0.07)";
      for (let y = 0; y < height; y += 16) {
        for (let x = 0; x < width; x += 16) ctx.fillRect(x, y, 1, 1);
      }

      // Starfield drifting downward at three depths.
      for (const star of stars) {
        star.y += star.speed;
        if (star.y > height) {
          star.y = -2;
          star.x = Math.random() * width;
        }
        const twinkle = 0.35 + 0.45 * Math.abs(Math.sin((frame + star.x) * 0.02));
        ctx.fillStyle =
          star.hue === 0 ? `rgba(234,179,8,${twinkle})` : `rgba(63,210,255,${twinkle * 0.9})`;
        ctx.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size);
      }

      // Falling data columns — vertical runs of lit cells.
      ctx.fillStyle = "rgba(63,210,255,0.16)";
      for (const block of blocks) {
        block.y += block.speed;
        if (block.y > height + block.length * 4) {
          block.y = -20;
          block.x = Math.floor(Math.random() * width);
        }
        for (let i = 0; i < block.length; i++) {
          ctx.fillRect(block.x, Math.round(block.y) - i * 3, 1, 2);
        }
      }

      // Critters march two frames per second, the way a sprite sheet would.
      const target = hideRef.current ? 0 : 1;
      if (critterFade < target) critterFade = Math.min(target, critterFade + 0.1);
      if (critterFade > target) critterFade = Math.max(target, critterFade - 0.1);

      if (critterFade > 0) {
        ctx.globalAlpha = critterFade;
        for (const critter of critters) {
          critter.x += critter.vx;
          critter.y += critter.vy;
          if (critter.x < -10) critter.x = width + 10;
          if (critter.x > width + 10) critter.x = -10;
          if (critter.y < -10) critter.y = height + 10;
          if (critter.y > height + 10) critter.y = -10;
          const hop = Math.floor(frame / 30) % 2 === 0 ? 0 : 1;
          drawSprite(CRITTER, critter.x, critter.y + hop, critter.tint);
        }
        ctx.globalAlpha = 1;
      }

      // A full-width sweep bar used to run here, but at this scale it read as a
      // rendering seam across the page rather than a CRT effect.

      animationId = requestAnimationFrame(draw);
    };

    const handleResize = () => {
      build();
      if (reduced) draw();
    };

    build();
    if (reduced) {
      draw();
      cancelAnimationFrame(animationId);
    } else {
      draw();
    }

    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pixelated pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}