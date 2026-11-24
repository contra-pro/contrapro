// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { ContractPagination, exceedsA4 } from "./contract-pagination";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("detects vertical and horizontal overflow without treating boundary rounding as overflow", () => {
  expect(exceedsA4(718, 1047, 718, 1047)).toBe(false);
  expect(exceedsA4(718, 1049, 718, 1047)).toBe(true);
  expect(exceedsA4(720, 100, 718, 1047)).toBe(true);
});

it("warns on overflow, keeps all content visible, remeasures edits and cleans measurement copies", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  Object.defineProperty(document, "fonts", { configurable: true, value: { ready: Promise.resolve(), addEventListener() {}, removeEventListener() {} } });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function(this: HTMLElement) {
    return { width: 718, height: this.matches("article") ? this.textContent!.length : 1047 } as DOMRect;
  });
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(718);
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  const render = (text: string) => <ContractPagination className="document" style={{}}><article data-contract-sheet>{text}</article></ContractPagination>;
  try {
    await act(async () => root.render(render("Full conditions\n".repeat(200))));
    expect(host.querySelector('[data-pagination="overflow"]')).not.toBeNull();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("NEEDS REVISION");
    expect(host.querySelector("article")?.textContent).toBe("Full conditions\n".repeat(200));
    expect(document.querySelector('[data-print-measure]')).toBeNull();
    await act(async () => root.render(render("Short content")));
    expect(host.querySelector('[data-pagination="fits"]')).not.toBeNull();
  } finally { await act(async () => root.unmount()); host.remove(); }
});
