import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// If R2_ENDPOINT is empty, files go to the local .local-storage folder (development only).
const useR2 = Boolean(process.env.R2_ENDPOINT);
const LOCAL = path.join(process.cwd(), ".local-storage");
const Bucket = process.env.R2_BUCKET!;
let client: S3Client | undefined;
const s3 = () =>
  (client ??= new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  }));

export async function putObject(Key: string, Body: Uint8Array, ContentType: string) {
  if (!useR2) {
    const p = path.join(LOCAL, Key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, Body);
    return;
  }
  await s3().send(new PutObjectCommand({ Bucket, Key, Body, ContentType }));
}

export async function downloadResponse(Key: string, filename: string, mime: string) {
  const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`;
  if (!useR2) {
    try {
      const buf = await readFile(path.join(LOCAL, Key));
      return new Response(new Uint8Array(buf), { headers: { "Content-Type": mime, "Content-Disposition": disposition } });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return new Response("Dosya bulunamadı", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      throw error;
    }
  }
  const url = await getSignedUrl(s3(), new GetObjectCommand({ Bucket, Key, ResponseContentDisposition: disposition }), { expiresIn: 300 });
  return Response.redirect(url, 302);
}

/** Dosyayı sunucu tarafında okur (ör. PDF kapak görseli üretmek için). */
export async function getObject(Key: string): Promise<Uint8Array> {
  if (!useR2) {
    try {
      return new Uint8Array(await readFile(path.join(LOCAL, Key)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error("Dosya bulunamadı");
      throw error;
    }
  }
  const res = await s3().send(new GetObjectCommand({ Bucket, Key }));
  if (!res.Body) throw new Error("Dosya bulunamadı");
  return res.Body.transformToByteArray();
}