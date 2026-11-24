import { beforeEach, expect, it, vi } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { strToU8, zipSync } from "fflate";
const fake = vi.hoisted(() => ({ exec: vi.fn(), chmod: vi.fn(), rm: vi.fn(), stat: vi.fn() }));
vi.mock("node:child_process", () => ({ execFile: fake.exec }));
vi.mock("node:fs/promises", async () => ({ mkdtemp: vi.fn(async () => join(tmpdir(), "contratpro-docx-fixture")), mkdir: vi.fn(), chmod: fake.chmod,
  writeFile: vi.fn(), readFile: vi.fn(async () => new Uint8Array([37,80,68,70])), lstat: fake.stat, rm: fake.rm }));
import { ContainerDocxConverter } from "./converter";
const source = zipSync({ "[Content_Types].xml": strToU8("<Types/>"), "_rels/.rels": strToU8("<Relationships/>"), "word/document.xml": strToU8("<document/>") });
const image = `local/libreoffice@sha256:${"a".repeat(64)}`;
beforeEach(() => {
  vi.clearAllMocks(); fake.exec.mockImplementation((...args: unknown[]) => { const callback = args.at(-1) as (error: Error | null, stdout: string, stderr: string) => void; callback(null,"",""); });
  fake.stat.mockResolvedValue({ isFile: () => true, isSymbolicLink: () => false, size: 4 });
});
it("converts only through a bounded network-denied digest-pinned container", async () => {
  expect(await new ContainerDocxConverter(image).convert(source)).toEqual(new Uint8Array([37,80,68,70]));
  const [cmd,args,options] = fake.exec.mock.calls[0]!;
  expect(cmd).toBe("docker"); expect(args).toEqual(expect.arrayContaining(["--pull=never", "--network=none", "--read-only", "--cap-drop=ALL", "--memory=512m", "--user=65534:65534", image]));
  expect(options).toMatchObject({ timeout: 30000, windowsHide: true }); expect(fake.chmod).toHaveBeenCalledWith(expect.any(String), 0o777);
  expect(fake.exec.mock.calls[1]?.[1]).toEqual(expect.arrayContaining(["rm", "--force"])); expect(fake.rm).toHaveBeenCalled();
});
it("rejects symlink output and still cleans its generated resources", async () => {
  fake.stat.mockResolvedValue({ isFile: () => false, isSymbolicLink: () => true, size: 4 });
  await expect(new ContainerDocxConverter(image).convert(source)).rejects.toThrow("conversion-failed"); expect(fake.rm).toHaveBeenCalled();
});
it("reconciles container cleanup after an engine timeout", async () => {
  fake.exec.mockImplementationOnce((...args: unknown[]) => { (args.at(-1) as (e: Error) => void)(Error("timeout")); });
  await expect(new ContainerDocxConverter(image).convert(source)).rejects.toThrow("conversion-failed"); expect(fake.exec).toHaveBeenCalledTimes(2); expect(fake.rm).toHaveBeenCalled();
});
