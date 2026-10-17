import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

const Sandbox = lazy(() => import("@/components/Sandbox"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "5D Gestation — Elemental Sandbox" },
      { name: "description", content: "Explore a living neural universe from macroverse to microverse, with five elemental fields, Powers of Ten and generative sound." },
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
  const loading = <div className="entry-loading" role="status"><h1 className="intro-title">5D GESTATION</h1><p className="text-sm text-muted-foreground">Opening the universe…</p></div>;
  return (
    <main className="sandbox-root">
      {ready ? (
        <Suspense fallback={loading}>
          <Sandbox />
        </Suspense>
      ) : loading}
    </main>
  );
}
