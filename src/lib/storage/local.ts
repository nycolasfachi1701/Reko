import "server-only";
import type { StorageDriver } from "./types";
import { signUploadToken } from "./upload-token";

const UPLOAD_TTL_MS = 15 * 60 * 1000;

// Driver de disco local para desenvolvimento. O "URL pré-assinado" é uma rota
// PUT assinada (/api/upload/put); a reprodução é servida por /api/media/<key>.
export const localDriver: StorageDriver = {
  name: "local",

  async createUploadTarget(key) {
    const exp = Date.now() + UPLOAD_TTL_MS;
    const sig = await signUploadToken(key, exp);
    const params = new URLSearchParams({ key, exp: String(exp), sig });
    return {
      key,
      uploadUrl: `/api/upload/put?${params.toString()}`,
      method: "PUT",
    };
  },

  playbackUrl(key) {
    return `/api/media/${key}`;
  },
};
