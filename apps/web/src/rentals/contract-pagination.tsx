"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./contract-studio.module.css";

export function exceedsA4(width: number, height: number, availableWidth: number, availableHeight: number) {
  return width > availableWidth + 1 || height > availableHeight + 1;
}

/** Measures an inert copy at the same width and typography as the printed sheet.
 * This is a conservative layout check, not a certified PDF page count. */
export function ContractPagination({ children, className, style }: { children: ReactNode; className: string; style: CSSProperties }) {
  const root = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState<boolean | null>(null);
  useEffect(() => {
    const element = root.current;
    const sheet = element?.querySelector<HTMLElement>("[data-contract-sheet]");
    if (!element || !sheet) return;
    let active = true;
    const measure = () => {
      if (!active) return;
      const copy = element.cloneNode(false) as HTMLDivElement;
      copy.dataset.printMeasure = "true";
      copy.classList.add(styles.measurement!);
      copy.inert = true;
      copy.setAttribute("aria-hidden", "true");
      const content = sheet.cloneNode(true) as HTMLElement;
      copy.append(content);
      const gauge = document.createElement("div");
      gauge.style.cssText = "width:190mm;height:277mm;position:absolute;";
      copy.append(gauge);
      element.parentElement!.append(copy);
      const bounds = gauge.getBoundingClientRect();
      setOverflow(exceedsA4(content.scrollWidth, content.getBoundingClientRect().height, bounds.width, bounds.height));
      copy.remove();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(sheet);
    element.addEventListener("load", measure, true);
    document.fonts.addEventListener("loadingdone", measure);
    void document.fonts.ready.then(measure);
    measure();
    return () => { active = false; observer.disconnect(); element.removeEventListener("load", measure, true); document.fonts.removeEventListener("loadingdone", measure); };
  }, [children, className, style]);
  return <div ref={root} className={className} style={style} data-pagination={overflow === null ? "unverified" : overflow ? "overflow" : "fits"}>
    <p className={styles.paginationStatus} role={overflow ? "alert" : "status"}>
      {overflow === null ? "Pagination A4 non vérifiée — aucune préparation monopage attestée." : overflow
        ? "NEEDS REVISION — dépassement A4. Le contenu intégral est conservé ; document non prêt sur une page."
        : "Mesure A4 compatible avec une page — confirmer le nombre de pages dans l’aperçu avant impression."}
    </p>
    {children}
  </div>;
}
