import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { verifySignature } from "@/lib/auth/signing";

// Gate de UX no Edge: barra quem não tem cookie de sessão válido nas rotas de
// gestão. A autorização DEFINITIVA (papel, sessão no banco) é feita por
// requireRole() nas páginas/actions — o middleware não acessa o banco.

export async function middleware(req: NextRequest) {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;

  let signedOk = false;
  if (raw) {
    const dot = raw.lastIndexOf(".");
    if (dot > 0) {
      const token = raw.slice(0, dot);
      const signature = raw.slice(dot + 1);
      signedOk = await verifySignature(
        token,
        signature,
        process.env.SESSION_SECRET ?? "",
      );
    }
  }

  if (!signedOk) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/manage/:path*"],
};
