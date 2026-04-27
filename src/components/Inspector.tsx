"use client";

import { useSelection } from "@/lib/store";
import { WORKS } from "@/data/works";
import { DefaultView, SelectedView } from "@/components/InspectorContent";

export function Inspector() {
  const selectedId = useSelection((s) => s.selectedId);
  const selected = selectedId
    ? WORKS.find((w) => w.id === selectedId) ?? null
    : null;

  return (
    <aside className="h-full w-[300px] overflow-y-auto border-l border-line bg-canvas">
      <div className="px-5 py-6">
        {selected ? <SelectedView work={selected} /> : <DefaultView />}
      </div>
    </aside>
  );
}
