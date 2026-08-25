import "server-only";
import type { StorageDriver } from "./types";
import { localDriver } from "./local";
import { r2Driver } from "./r2";

/** Seleciona o driver de storage conforme STORAGE_DRIVER (default: local). */
export function getStorage(): StorageDriver {
  return process.env.STORAGE_DRIVER === "r2" ? r2Driver : localDriver;
}

export * from "./types";
