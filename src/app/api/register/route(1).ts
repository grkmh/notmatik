import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/http";

const Body = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı").max(100),
  name: z.string().trim().max(100).optional(),
});

export async function POST(req: Request) {
  try {
    const body = Body.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, body.error.issues[0]?.message ?? "Geçersiz bilgi");
    const { email, password, name } = body.data;

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name: name || null, passwordHash }, // rol her zaman USER; yönetici ataması elle yapılır
      select: { id: true, email: true },
    });
    return Response.json(user, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return errorResponse(new HttpError(409, "Bu e-posta zaten kayıtlı"));
    return errorResponse(e);
  }
}
