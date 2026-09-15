import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { cleanUrl, newId, readLinks, writeLinks, type LinkItem } from "@/lib/links";
import { ICON_KEYS, labelForIcon } from "@/lib/icon-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "ADMIN_PASSWORD is not set on the server." }, { status: 500 });
  }
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  return null;
}

async function body(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed = await request.json();
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function pickIcon(value: unknown): string {
  return typeof value === "string" && (ICON_KEYS as readonly string[]).includes(value) ? value : "link";
}

export async function GET() {
  const blocked = await guard();
  if (blocked) return blocked;
  return NextResponse.json({ links: await readLinks() });
}

export async function POST(request: Request) {
  const blocked = await guard();
  if (blocked) return blocked;

  const data = await body(request);
  const url = cleanUrl(typeof data.url === "string" ? data.url : "");
  if (!url) return NextResponse.json({ error: "That URL doesn't look valid." }, { status: 400 });

  const icon = pickIcon(data.icon);
  const links = await readLinks();
  const created: LinkItem = {
    id: newId(),
    // The blocks show no text, so the icon's name becomes the link's
    // accessible name and hover tooltip.
    label: labelForIcon(icon),
    url,
    icon,
    visible: data.visible !== false,
    order: links.length,
  };

  return NextResponse.json({ links: await writeLinks([...links, created]), created: created.id });
}

export async function PATCH(request: Request) {
  const blocked = await guard();
  if (blocked) return blocked;

  const data = await body(request);
  const id = typeof data.id === "string" ? data.id : "";
  const links = await readLinks();
  const index = links.findIndex((link) => link.id === id);
  if (index === -1) return NextResponse.json({ error: "That link no longer exists." }, { status: 404 });

  // Reordering: move the item one slot up or down.
  if (data.move === "up" || data.move === "down") {
    const target = data.move === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= links.length) return NextResponse.json({ links });
    [links[index], links[target]] = [links[target], links[index]];
    return NextResponse.json({
      links: await writeLinks(links.map((link, position) => ({ ...link, order: position }))),
    });
  }

  const current = links[index];
  const next: LinkItem = { ...current };

  if (typeof data.url === "string") {
    const url = cleanUrl(data.url);
    if (!url) return NextResponse.json({ error: "That URL doesn't look valid." }, { status: 400 });
    next.url = url;
  }

  if (data.icon !== undefined) {
    next.icon = pickIcon(data.icon);
    next.label = labelForIcon(next.icon);
  }
  if (typeof data.visible === "boolean") next.visible = data.visible;

  links[index] = next;
  return NextResponse.json({ links: await writeLinks(links) });
}

export async function DELETE(request: Request) {
  const blocked = await guard();
  if (blocked) return blocked;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  const links = await readLinks();
  const remaining = links.filter((link) => link.id !== id);
  if (remaining.length === links.length) {
    return NextResponse.json({ error: "That link no longer exists." }, { status: 404 });
  }

  return NextResponse.json({ links: await writeLinks(remaining) });
}
