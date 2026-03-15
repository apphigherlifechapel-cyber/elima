"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";

type SortOption = { key: string; label: string };

export function ShopFiltersClient({
  currentSort,
  sortOptions,
}: {
  currentSort: string;
  sortOptions: SortOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const paramsSnapshot = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);

  function navigateWithPatch(patch: Record<string, string | null>) {
    const next = new URLSearchParams(paramsSnapshot.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    });

    const qs = next.toString();
    startTransition(() => {
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Sort</span>
      {sortOptions.map((opt) => (
        <button
          key={opt.key}
          type="button"
          disabled={isPending}
          onClick={() => navigateWithPatch({ sort: opt.key === "newest" ? null : opt.key, page: null })}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
            currentSort === opt.key
              ? "bg-[var(--foreground)] text-white"
              : "bg-[var(--surface)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          } ${isPending ? "opacity-70" : ""}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

