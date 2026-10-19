import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
});
const Bucket = process.env.R2_BUCKET!;

export const putObject = (Key: string, Body: Uint8Array, ContentType: string) =>
  s3.send(new PutObjectCommand({ Bucket, Key, Body, ContentType }));

export const signedDownloadUrl = (Key: string, ttl = 300) =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket, Key, ResponseContentDisposition: "attachment" }), { expiresIn: ttl });
