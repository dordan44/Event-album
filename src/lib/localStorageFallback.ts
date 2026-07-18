import { promises as fs } from "fs";
import path from "path";

/**
 * Local-disk storage fallback used ONLY when Cloudflare R2 is not configured
 * (i.e., local development without cloud credentials). Files land in
 * `.uploads/` at the repo root and are served by /api/blob/[...key].
 */
const ROOT = path.join(process.cwd(), ".uploads");

function safePath(storageKey: string): string {
  const resolved = path.join(ROOT, storageKey);
  if (!resolved.startsWith(ROOT)) throw new Error("Invalid storage key");
  return resolved;
}

export async function saveLocal(storageKey: string, data: Buffer) {
  const target = safePath(storageKey);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
}

export async function readLocal(storageKey: string): Promise<Buffer> {
  return fs.readFile(safePath(storageKey));
}
