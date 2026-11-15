"use client";
import Image from "next/image";
import { useState } from "react";

export function Gallery({ images, title }: { images: { id: string; url: string; alt: string | null }[]; title: string }) {
  const [i, setI] = useState(0);
  if (images.length === 0) return <div role="img" aria-label="No photo for this listing" className="bru-card font-raw flex aspect-[4/3] items-center justify-center bg-white text-3xl">NO_PIC</div>;
  const cur = images[Math.min(i, images.length - 1)];
  return (
    <div>
      <div className="bru-card overflow-hidden bg-white">
        <Image src={cur.url} alt={cur.alt || title} width={1200} height={900} unoptimized priority className="aspect-[4/3] w-full object-contain" />
      </div>
      {images.length > 1 && (
        <ul className="mt-4 flex flex-wrap gap-3" aria-label="Photos">
          {images.map((im, n) => (
            <li key={im.id}>
              <button type="button" onClick={() => setI(n)} aria-label={`Show photo ${n + 1} of ${images.length}`} aria-pressed={n === i}
                className={`block h-16 w-16 overflow-hidden border-4 border-black ${n === i ? "bg-black" : "bg-white"} cursor-pointer`}>
                <Image src={im.url} alt="" width={64} height={64} unoptimized className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
