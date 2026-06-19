import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { readFile, mimeFor } from "@/lib/storage";

/**
 * يخدم إثباتات الدفع مع تحقق الصلاحية:
 * الطالب يرى ملفاته فقط (المسار يبدأ بـ userId)، والأدمن يرى الكل.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { path } = await params;
  const ownerId = path[0];
  if (user.userType !== "admin" && ownerId !== user.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const rel = `payment-proofs/${path.join("/")}`;
  const data = await readFile(rel);
  if (!data) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": mimeFor(rel),
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
