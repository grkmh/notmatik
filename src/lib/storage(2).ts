import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// R2_ENDPOINT boşsa dosyalar yerel `.local-storage` klasörüne yazılır (yalnızca geliştirme için).
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
    const buf = await readFile(path.join(LOCAL, Key));
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": mime, "Content-Disposition": disposition } });
  }
  const url = await getSignedUrl(s3(), new GetObjectCommand({ Bucket, Key, ResponseContentDisposition: disposition }), { expiresIn: 300 });
  return Response.redirect(url, 302);
}
