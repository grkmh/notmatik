import { randomUUID } from "node:crypto";
import { ContentType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/policy";
import { inspectUpload } from "@/lib/uploads/validate";
import { putObject } from "@/lib/storage";

const opt = z.string().trim().max(200).optional().transform((v) => v || null);
const Input = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(5000),
  courseName: z.string().trim().min(2).max(200),
  gradeOrTerm: z.string().trim().min(1).max(50),
  type: z.nativeEnum(ContentType),
  institution: opt, department: opt, courseCode: opt, academicYear: opt,
  tags: z.string().optional().transform((v) => (v ?? "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10)),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    requirePermission(user, "material:create");

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "Dosya gerekli");
    form.delete("file");
    const parsed = Input.safeParse(Object.fromEntries(form));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Geçersiz alan");

    const buf = new Uint8Array(await file.arrayBuffer());
    const chk = inspectUpload(buf, file.name);
    if (!chk.ok) throw new HttpError(415, chk.error);

    const dup = await prisma.materialFile.findFirst({ where: { sha256: chk.sha256 }, select: { id: true } });
    if (dup) throw new HttpError(409, "Bu dosya daha önce yüklenmiş");

    // Dosya özel bucket'ta karantina önekiyle durur; yayın öncesi asla herkese açık değildir.
    const storageKey = `quarantine/${user.id}/${randomUUID()}.${chk.ext}`;
    await putObject(storageKey, buf, chk.mime);

    const m = await prisma.material.create({
      data: {
        ...parsed.data, authorId: user.id,
        file: { create: { storageKey, mimeType: chk.mime, sizeBytes: chk.size, sha256: chk.sha256 } },
      },
      select: { id: true, status: true },
    });
    return Response.json(m, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
