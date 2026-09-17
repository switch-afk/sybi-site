import { NextResponse } from "next/server";
import { MAX_PLAUSIBLE_SCORE, readHighScore, submitHighScore } from "@/lib/highscore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** This endpoint has to be public — players aren't logged in. That means it
 *  can be posted to directly, so submissions are capped and throttled per IP.
 *  Neither makes it tamper-proof; see the note in SETUP.md. */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, { count: number; resetAt: number }>();

function throttled(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    // Opportunistic cleanup so the map can't grow without bound.
    if (hits.size > 5000) {
      for (const [key, value] of hits) if (now > value.resetAt) hits.delete(key);
    }
    return false;
  }

  entry.count++;
  return entry.count > MAX_PER_WINDOW;
}

export async function GET() {
  const { score } = await readHighScore();
  return NextResponse.json({ score });
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (throttled(ip)) {
    return NextResponse.json({ error: "Slow down." }, { status: 429 });
  }

  let score: unknown;
  try {
    ({ score } = await request.json());
  } catch {
    return NextResponse.json({ error: "Send a JSON body with a score." }, { status: 400 });
  }

  const value = Number(score);
  if (!Number.isFinite(value) || value < 0 || value > MAX_PLAUSIBLE_SCORE) {
    return NextResponse.json({ error: "That score isn't valid." }, { status: 400 });
  }

  const result = await submitHighScore(value);
  return NextResponse.json({ score: result.score });
}