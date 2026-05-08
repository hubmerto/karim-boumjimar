"use client";

/**
 * Reusable scaffold for text-only views (Bio / About / News / Grant).
 * Sits in the same area as the Canvas - fills viewport between the left toolbar
 * (200px on md+) and the right edge, below the top bar.
 */
export function TextView({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="fixed inset-0 top-16 right-0 z-0 overflow-y-auto bg-canvas md:top-12 md:left-[200px]">
      <div className="max-w-[680px] px-6 py-12 md:px-10 md:py-14">
        <h1 className="italic text-meta uppercase tracking-[0.1em] text-mute mb-4">
          {title}
        </h1>
        {children}
      </div>
    </main>
  );
}
