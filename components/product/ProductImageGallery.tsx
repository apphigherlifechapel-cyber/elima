"use client";

import Image from "next/image";
import { useState } from "react";

type GalleryImage = {
  id: string;
  url: string;
  altText?: string | null;
};

type ProductImageGalleryProps = {
  title: string;
  images: GalleryImage[];
};

export default function ProductImageGallery({ title, images }: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  if (!images.length) {
    return <div className="flex h-[430px] items-center justify-center rounded-3xl bg-[var(--surface-2)] text-sm text-[var(--muted-foreground)] sm:h-[540px]">No image</div>;
  }

  return (
    <div>
      <div className="relative h-[430px] overflow-hidden rounded-3xl bg-[var(--surface-2)] sm:h-[540px]">
        <Image src={active.url} alt={active.altText ?? title} fill className="object-cover" priority unoptimized />
      </div>

      {images.length > 1 ? (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`relative h-24 overflow-hidden rounded-xl border bg-[var(--surface-2)] transition ${
                idx === activeIndex ? "border-[var(--primary)] ring-2 ring-[var(--ring)]" : "border-[var(--border-soft)] hover:border-[var(--primary)]/40"
              }`}
              aria-label={`View image ${idx + 1}`}
            >
              <Image src={img.url} alt={img.altText ?? title} fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

