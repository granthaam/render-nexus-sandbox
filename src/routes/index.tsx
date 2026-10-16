import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

const Sandbox = lazy(() => import("@/components/Sandbox"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "5D Gestation — Elemental Sandbox" },
      { name: "description", content: "An interactive 5D cosmic sandbox with five elemental pillars, a tesseract, a living wavepool and generative sound." },
      { property: "og:title", content: "5D Gestation — Elemental Sandbox" },
      { property: "og:description", content: "Shift between Water, Earth, Plasma, Air and Fire inside a living 5D firmament." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <main className="sandbox-root">
      {ready && (
        <Suspense fallback={null}>
          <Sandbox />
        </Suspense>
      )}
    </main>
  );
}
