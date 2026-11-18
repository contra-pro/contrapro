import { clientUnicodeProfile as profile } from "./client-unicode-data";
function contains(cp: number, ranges: number[][]): boolean {
  let lo = 0, hi = ranges.length - 1;
  while (lo <= hi) { const mid = (lo + hi) >>> 1, range = ranges[mid]!;
    if (cp < range[0]!) hi = mid - 1; else if (cp >= range[1]!) lo = mid + 1; else return true;
  } return false;
}
/** Pinned Unicode 17 default casing, including Final_Sigma; no runtime locale dependency. */
export function clientUnicodeCase(value: string, upper = false): string {
  if (value.length > 320) throw new RangeError("CLIENT_CASE_INPUT_TOO_LONG");
  const chars = Array.from(value), map = upper ? profile.upper : profile.lower;
  return chars.map((ch, i) => {
    if (upper || ch !== "Σ") return map[ch] ?? ch;
    let before = i - 1, after = i + 1;
    while (before >= 0 && contains(chars[before]!.codePointAt(0)!, profile.ignored)) before--;
    while (after < chars.length && contains(chars[after]!.codePointAt(0)!, profile.ignored)) after++;
    return before >= 0 && contains(chars[before]!.codePointAt(0)!, profile.cased)
      && !(after < chars.length && contains(chars[after]!.codePointAt(0)!, profile.cased)) ? "ς" : "σ";
  }).join("");
}
