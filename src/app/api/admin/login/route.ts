import { NextResponse } from "next/server";
import { checkPassword, cookieOptions, createToken, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not set on the server." },
      { status: 500 },
    );
  }

  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return NextResponse.json({ error: "Send a JSON body with a password." }, { status: 400 });
  }

  if (!checkPassword(password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const token = createToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token.value, cookieOptions(token.maxAge));
  return response;
}
