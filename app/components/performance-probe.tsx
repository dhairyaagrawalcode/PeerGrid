"use client";

import { useEffect } from "react";

/** Opt-in local audit only. Exposes timings, never content, cookies or URL queries. */
export default function PerformanceProbe() {
  useEffect(() => {
    let lcp: number | null = null;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) lcp = entry.startTime;
    });
    observer.observe({ type: "largest-contentful-paint", buffered: true });
    const round = (value: number) => Math.round(value);
    const safeName = (name: string) => {
      const url = new URL(name, location.href);
      // Storage filenames may contain personal information. No signed query strings.
      return url.pathname.includes("/storage/") ? `${url.origin}/storage/[media]` : url.pathname;
    };
    const update = () => {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (!navigation) return;
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const entries = [navigation, ...resources];
      const largest = entries.reduce((a, b) => a.encodedBodySize > b.encodedBodySize ? a : b);
      const slowest = entries.reduce((a, b) => a.duration > b.duration ? a : b);
      const output = document.getElementById("peergrid-performance");
      if (output) output.textContent = JSON.stringify({
        path: location.pathname, measuredAtMs: round(performance.now()),
        ttfbMs: round(navigation.responseStart), documentMs: round(navigation.responseEnd),
        domContentLoadedMs: round(navigation.domContentLoadedEventEnd), lcpMs: lcp === null ? null : round(lcp),
        requests: entries.length, transferBytes: entries.reduce((n, e) => n + e.transferSize, 0),
        encodedBytes: entries.reduce((n, e) => n + e.encodedBodySize, 0),
        opaqueResources: resources.filter((e) => e.responseStart === 0 && new URL(e.name).origin !== location.origin).length,
        largest: { path: safeName(largest.name), bytes: largest.encodedBodySize },
        slowest: { path: safeName(slowest.name), ms: round(slowest.duration) },
        resources: entries.map((e) => ({ path: safeName(e.name), ms: round(e.duration), bytes: e.encodedBodySize,
          originalBytes: e.serverTiming?.find((timing) => timing.name === "original")?.description,
        })),
      });
    };
    update();
    const timer = setInterval(update, 500);
    return () => { clearInterval(timer); observer.disconnect(); };
  }, []);
  return <output hidden id="peergrid-performance" />;
}
