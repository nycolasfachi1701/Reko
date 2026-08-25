import "server-only";
import type { StorageDriver } from "./types";

// Driver R2 (Cloudflare, S3-compatible) para produção — SPEC decisão #3.
// Para ativar: `npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner` e
// implementar createUploadTarget com getSignedUrl(PutObjectCommand) e
// playbackUrl com S3_PUBLIC_BASE_URL. Mantido como stub para não pesar o dev.
export const r2Driver: StorageDriver = {
  name: "r2",

  async createUploadTarget() {
    throw new Error(
      "Driver R2 ainda não implementado. Instale o aws-sdk e complete src/lib/storage/r2.ts, ou use STORAGE_DRIVER=local em dev.",
    );
  },

  playbackUrl(key) {
    const base = process.env.S3_PUBLIC_BASE_URL ?? "";
    return `${base.replace(/\/$/, "")}/${key}`;
  },
};
