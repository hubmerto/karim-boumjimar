"use client";

import { useEffect } from "react";
import { CrashOverlay } from "@/components/CrashOverlay";
import { GroupViewControls } from "@/components/GroupViewControls";
import { Index } from "@/components/Index";
import { InspectorSheet } from "@/components/InspectorSheet";
import { JsonLd } from "@/components/JsonLd";
import { LeftToolbar } from "@/components/LeftToolbar";
import { PreloadGalleryImages } from "@/components/PreloadGalleryImages";
import { Splash } from "@/components/Splash";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { PERSON_JSONLD } from "@/lib/person-jsonld";
import { useSelection } from "@/lib/store";

type Props = {
  /** "${title}|${year}" — the same key the store uses for
   *  selectedGroupKey. Resolved from the URL slug by the server page
   *  before this component mounts. */
  projectKey: string;
  /** VisualArtwork JSON-LD payload pre-built on the server. Lives
   *  next to the matching Person JSON-LD in the rendered tree so
   *  both are visible to crawlers in the initial HTML. */
  artworkJsonLd: object;
};

/** Mirror of the home page tree (TopBar / LeftToolbar / ViewSwitcher /
 * etc.) plus a one-shot effect that opens the requested project on
 * mount. The Index drawer and tile clicks still go through the
 * Zustand store as before — this component only handles the
 * "URL deep-link → in-app project view" transition. Closing the
 * project (wordmark click) leaves the URL unchanged: the user is
 * still on /works/<slug> but the canvas is back at fitAll. That's
 * acceptable for now; in-app navigation back to overview would need
 * to call router.push("/"), which is an extra coordination layer we
 * intentionally skip to keep this addition non-invasive. */
export function WorkRouteClient({ projectKey, artworkJsonLd }: Props) {
  const setView = useSelection((s) => s.setView);
  const selectGroup = useSelection((s) => s.selectGroup);
  const indexOpen = useSelection((s) => s.indexOpen);
  const setIndexOpen = useSelection((s) => s.setIndexOpen);

  useEffect(() => {
    setView("exhibitions");
    selectGroup(projectKey);
    // Don't run on every projectKey change after mount — selectGroup
    // re-fires navTargetGroupKey which would replay the camera
    // animation every render. Mount-once behaviour is correct: this
    // is a deep-link, not a live binding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey]);

  return (
    <>
      <TopBar />
      <LeftToolbar />
      <ViewSwitcher />
      <GroupViewControls />
      <InspectorSheet />
      <Index open={indexOpen} onClose={() => setIndexOpen(false)} />
      <Splash />
      <CrashOverlay />
      <PreloadGalleryImages />
      {/* Person + VisualArtwork JSON-LD pair. Person reinforces the
          knowledge-graph identity; VisualArtwork advertises the
          specific project's metadata (name, dateCreated, medium,
          creator → Person via @id reference). */}
      <JsonLd data={PERSON_JSONLD} />
      <JsonLd data={artworkJsonLd} />
    </>
  );
}
