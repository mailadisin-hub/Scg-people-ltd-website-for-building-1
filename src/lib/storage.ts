import { promises as fs } from "fs";
import path from "path";

// Files are stored on the server's local disk. On Hostinger (a persistent
// Node server) this directory survives between requests. Set UPLOAD_DIR to a
// path OUTSIDE the deploy folder so files aren't wiped when GitHub redeploys —
// e.g. UPLOAD_DIR=/home/USER/westcote-uploads. Falls back to ./uploads locally.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// Strip any directory components from a caller-supplied key. The download
// route takes the key from the URL, so this prevents path-traversal attacks
// like "../../etc/passwd" — only the bare filename is ever used.
function safeKey(key: string): string {
  return path.basename(key);
}

async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function saveFile(key: string, data: ArrayBuffer): Promise<void> {
  await ensureDir();
  await fs.writeFile(path.join(UPLOAD_DIR, safeKey(key)), Buffer.from(data));
}

export async function readFile(key: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(UPLOAD_DIR, safeKey(key)));
  } catch {
    return null;
  }
}
