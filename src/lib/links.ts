import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export type LinkItem = {
  id: string;
  label: string;
  url: string;
  icon: string;
  visible: boolean;
  order: number;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "links.json");

const SEED: LinkItem[] = [
  { id: "seed-x", label: "X", url: "https://x.com/sybimeta", icon: "x", visible: true, order: 0 },
  { id: "seed-github", label: "GitHub", url: "https://github.com/switch-afk", icon: "github", visible: true, order: 1 },
  { id: "seed-discord", label: "Discord", url: "https://discord.gg/Jd5JPkSN59", icon: "discord", visible: true, order: 2 },
  { id: "seed-telegram", label: "Telegram", url: "https://t.me/sybi_meta", icon: "telegram", visible: true, order: 3 },
];

function normalise(raw: unknown): LinkItem[] {
  if (!Array.isArray(raw)) return [];
  const cleaned = raw
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row, index) => ({
      id: typeof row.id === "string" && row.id ? row.id : crypto.randomUUID(),
      label: typeof row.label === "string" ? row.label : "Untitled",
      url: typeof row.url === "string" ? row.url : "#",
      icon: typeof row.icon === "string" ? row.icon : "link",
      visible: row.visible !== false,
      order: typeof row.order === "number" ? row.order : index,
    }));

  return cleaned
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));
}

export async function readLinks(): Promise<LinkItem[]> {
  try {
    const file = await fs.readFile(DATA_FILE, "utf8");
    return normalise(JSON.parse(file));
  } catch {
    await writeLinks(SEED);
    return SEED;
  }
}

export async function writeLinks(links: LinkItem[]): Promise<LinkItem[]> {
  const ordered = links
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));

  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(ordered, null, 2), "utf8");
  await fs.rename(tmp, DATA_FILE);
  return ordered;
}

export async function getVisibleLinks(): Promise<LinkItem[]> {
  const links = await readLinks();
  return links.filter((link) => link.visible);
}

export function newId(): string {
  return crypto.randomUUID();
}

/** Accepts bare domains and mailto:, returns a safe href or null. */
export function cleanUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  const candidate = /^(https?:\/\/|mailto:)/i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:", "mailto:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
