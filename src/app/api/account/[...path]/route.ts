import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, getApiBaseUrl, refreshBackendSession } from "@/lib/auth/session";

async function forward(req: NextRequest, path: string[], accessToken: string, bodyText: string | undefined) {
  const url = `${getApiBaseUrl()}/${path.join("/")}${req.nextUrl.search}`;
  const hasBody = bodyText !== undefined && req.method !== "GET" && req.method !== "HEAD";
  return fetch(url, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    body: hasBody ? bodyText : undefined,
    cache: "no-store",
  });
}

async function handle(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
  }

  const bodyText = req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();

  let backendRes = await forward(req, path, accessToken, bodyText);
  let refreshedCookies: { accessToken: string; accessMaxAge: number; refreshToken?: string; refreshMaxAge?: number } | null = null;

  if (backendRes.status === 401 && refreshToken) {
    const refreshed = await refreshBackendSession(refreshToken);
    if (refreshed) {
      refreshedCookies = refreshed;
      backendRes = await forward(req, path, refreshed.accessToken, bodyText);
    }
  }

  const responseText = await backendRes.text();
  const contentType = backendRes.headers.get("content-type") ?? "application/json";
  const res = new NextResponse(responseText, {
    status: backendRes.status,
    headers: { "content-type": contentType },
  });

  if (refreshedCookies) {
    res.cookies.set(ACCESS_COOKIE, refreshedCookies.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: refreshedCookies.accessMaxAge,
    });
    if (refreshedCookies.refreshToken) {
      res.cookies.set(REFRESH_COOKIE, refreshedCookies.refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: refreshedCookies.refreshMaxAge ?? refreshedCookies.accessMaxAge,
      });
    }
  } else if (backendRes.status === 401) {
    res.cookies.delete(ACCESS_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);
  }

  return res;
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE, handle as PATCH };
