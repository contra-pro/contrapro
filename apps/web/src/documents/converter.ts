import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, chmod, writeFile, readFile, lstat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { DocumentFault } from "./model";
import type { DocxConverter } from "./render";
import { docx, maxUpload } from "./uploads";
const execute = promisify(execFile);
/** Optional local engine. Uses only a preinstalled digest-pinned image. Never pulls an image. */
export class ContainerDocxConverter implements DocxConverter {
  constructor(private image: string) { if (!/^[a-zA-Z0-9./_-]+@sha256:[a-f0-9]{64}$/.test(image)) throw new DocumentFault("unsupported"); }
  async convert(bytes: Uint8Array) {
    docx(bytes);
    const root = await mkdtemp(join(tmpdir(), "contratpro-docx-")), name = `contratpro-docx-${randomUUID()}`;
    const input = join(root, "input"), output = join(root, "output");
    try {
      await mkdir(input); await mkdir(output); await chmod(output, 0o777);
      // Parent remains mkdtemp-private (0700); only the isolated container sees
      // this writable mount. Its unprivileged UID cannot write the input mount.
      await writeFile(join(input, "contract.docx"), bytes, { flag: "wx" });
      await execute("docker", ["run", "--rm", "--pull=never", "--name", name, "--network=none", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges",
        "--memory=512m", "--cpus=1", "--pids-limit=64", "--user=65534:65534", "--tmpfs=/tmp:rw,noexec,nosuid,size=128m",
        "--mount", `type=bind,source=${input},target=/input,readonly`, "--mount", `type=bind,source=${output},target=/output`,
        "--entrypoint=/usr/bin/libreoffice", this.image, "-env:UserInstallation=file:///tmp/profile", "--headless", "--norestore", "--nodefault", "--convert-to", "pdf:writer_pdf_Export", "--outdir", "/output", "/input/contract.docx"],
      { timeout: 30000, maxBuffer: 65536, windowsHide: true });
      const file = join(output, "contract.pdf"), info = await lstat(file);
      if (!info.isFile() || info.isSymbolicLink() || info.size > maxUpload) throw new DocumentFault("conversion-failed");
      const result = await readFile(file); if (result.length > maxUpload) throw new DocumentFault("conversion-failed"); return new Uint8Array(result);
    } catch { throw new DocumentFault("conversion-failed"); }
    finally {
      // Fixed generated name only; stop a container that survived a killed Docker CLI.
      await execute("docker", ["rm", "--force", name], { timeout: 5000, maxBuffer: 4096, windowsHide: true }).catch(() => {});
      const resolved = resolve(root), allowed = resolve(tmpdir());
      if (resolved.startsWith(allowed + sep) && resolved !== allowed && resolved.split(sep).at(-1)?.startsWith("contratpro-docx-")) await rm(resolved, { recursive: true, force: true });
    }
  }
}
