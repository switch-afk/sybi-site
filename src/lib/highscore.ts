import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const SCORE_FILE = path.join(DATA_DIR, "highscore.json");

/** Nothing legitimate gets near this. It won't stop a determined faker, but it
 *  keeps a stray request from parking an absurd number at the top forever. */
export const MAX_PLAUSIBLE_SCORE = 2_000_000;

export type HighScore = { score: number; updatedAt: string };

const EMPTY: HighScore = { score: 0, updatedAt: new Date(0).toISOString() };

export async function readHighScore(): Promise<HighScore> {
  try {
    const raw = JSON.parse(await fs.readFile(SCORE_FILE, "utf8"));
    const score = Number(raw?.score);
    if (!Number.isFinite(score) || score < 0) return EMPTY;
    return {
      score: Math.min(Math.floor(score), MAX_PLAUSIBLE_SCORE),
      updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : EMPTY.updatedAt,
    };
  } catch {
    // No file yet — that's the normal first-run state, not an error.
    return EMPTY;
  }
}

/** Only writes when the new score actually beats the stored one. */
export async function submitHighScore(candidate: number): Promise<HighScore> {
  const current = await readHighScore();
  if (!Number.isFinite(candidate)) return current;

  const score = Math.floor(candidate);
  if (score <= current.score || score <= 0 || score > MAX_PLAUSIBLE_SCORE) return current;

  const next: HighScore = { score, updatedAt: new Date().toISOString() };

  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${SCORE_FILE}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tmp, SCORE_FILE);

  return next;
}