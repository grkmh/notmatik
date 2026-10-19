import { prisma } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/http";
import { auth } from "@/auth";
import { downloadResponse } from "@/lib/storage";

// Visitors can only download published material; the author and staff can access the rest.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const m = await prisma.material.findUnique({ where: { id }, include: { file: true } });
    if (!m?.file) throw new HttpError(404, "Not found");

    if (m.status !== "PUBLISHED") {
      const uid = (await auth())?.user?.id;
      const u = uid ? await prisma.user.findUnique({ where: { id: uid }, select: { role: true } }) : null;
      if (!u || (m.authorId !== uid && u.role === "USER")) throw new HttpError(404, "Not found");
    }
    const ext = m.file.storageKey.split(".").pop();
    return await downloadResponse(m.file.storageKey, `${m.title}.${ext}`, m.file.mimeType);
  } catch (e) { return errorResponse(e); }
}