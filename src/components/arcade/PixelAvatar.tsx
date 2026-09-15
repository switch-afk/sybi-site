"use client";

import { useEffect, useRef, useState } from "react";

/** Draws the photo into a tiny buffer and lets CSS blow it back up,
 *  which turns a normal headshot into an actual sprite. */
const SPRITE_SIZE = 40;

export default function PixelAvatar({ src, alt }: { src: string; alt: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
      ctx.drawImage(image, 0, 0, SPRITE_SIZE, SPRITE_SIZE);

      // Flatten to a 5-bit-per-channel palette for a period-correct colour count.
      const frame = ctx.getImageData(0, 0, SPRITE_SIZE, SPRITE_SIZE);
      const step = 36;
      for (let i = 0; i < frame.data.length; i += 4) {
        frame.data[i] = Math.round(frame.data[i] / step) * step;
        frame.data[i + 1] = Math.round(frame.data[i + 1] / step) * step;
        frame.data[i + 2] = Math.round(frame.data[i + 2] / step) * step;
      }
      ctx.putImageData(frame, 0, 0);
    };
    image.onerror = () => setFailed(true);
    image.src = src;
  }, [src]);

  return (
    <div className="relative" style={{ animation: "sprite-bob 3.2s steps(4, end) infinite" }}>
      <div className="pixel-frame pixel-drop bg-void p-1">
        {failed ? (
          <div
            role="img"
            aria-label={alt}
            className="flex size-24 items-center justify-center bg-coin/10 text-xl text-coin sm:size-[136px] sm:text-2xl"
          >
            SY
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={SPRITE_SIZE}
            height={SPRITE_SIZE}
            role="img"
            aria-label={alt}
            className="pixelated block size-24 sm:size-[136px]"
          />
        )}
      </div>

      {/* Two coins orbiting the sprite, flipping on a stepped timeline. */}
      <span
        aria-hidden
        className="absolute -top-3 -left-4 size-3 bg-coin"
        style={{ animation: "coin-flip 1.1s steps(6, end) infinite" }}
      />
      <span
        aria-hidden
        className="absolute -right-4 -bottom-3 size-3 bg-terminal"
        style={{ animation: "coin-flip 1.4s steps(6, end) infinite 0.3s" }}
      />
    </div>
  );
}
