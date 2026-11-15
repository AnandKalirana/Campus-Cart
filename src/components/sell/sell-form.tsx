"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createListingAction, listingStatusAction } from "@/app/sell/actions";
import { FormMessage } from "@/components/forms/field";
import { MAX_IMAGES } from "@/lib/listing-format";
import { uploadPhoto } from "@/lib/client-image";
import { ListingFields } from "./listing-fields";

export function SellForm({ categories }: { categories: { slug: string; name: string }[] }) {
  const router = useRouter();
  const files = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [progress, setProgress] = useState<string>();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const picked = Array.from(files.current?.files ?? []);
    if (picked.length < 1) { setErrors({ photos: "Add at least one photo." }); return; }
    if (picked.length > MAX_IMAGES) { setErrors({ photos: `Up to ${MAX_IMAGES} photos.` }); return; }
    const fd = new FormData(form);
    fd.delete("photos");
    start(async () => {
      setErrors({}); setMessage(undefined); setProgress("Saving your listing…");
      const r = await createListingAction(undefined, fd);
      if (!r.ok || !r.id) { setProgress(undefined); setErrors(r.errors ?? {}); setValues(r.values ?? {}); setMessage(r.message); return; }
      for (const [i, f] of picked.entries()) {
        setProgress(`Uploading photo ${i + 1} of ${picked.length}…`);
        const up = await uploadPhoto(r.id, f);
        if (!up.ok) { router.push(`/sell/${r.id}/edit?notice=photos`); return; } // listing is saved (paused); finish on the edit page
      }
      setProgress("Going live…");
      const pub = await listingStatusAction(r.id, "publish");
      router.push(pub.ok ? `/products/${r.id}` : `/sell/${r.id}/edit?notice=publish`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" aria-busy={pending}>
      <FormMessage message={message} />
      <ListingFields v={values} errors={errors} categories={categories} />
      <div>
        <label htmlFor="photos" className="font-raw mb-2 block text-sm">Photos (1 to {MAX_IMAGES})</label>
        <input ref={files} id="photos" name="photos" type="file" multiple accept="image/jpeg,image/png,image/webp" required
          aria-invalid={!!errors.photos} aria-describedby="photos-msg" className="bru-input h-auto py-3 file:mr-4 file:cursor-pointer file:border-4 file:border-black file:bg-cc-yellow file:px-3 file:py-1 file:font-bold" />
        <p id="photos-msg" className={`mt-2 text-sm font-bold ${errors.photos ? "text-cc-red" : ""}`}>{errors.photos ? <>Error: {errors.photos}</> : "JPEG, PNG or WebP. Location data is removed from your photos."}</p>
      </div>
      <button type="submit" disabled={pending} className="bru-btn h-14 w-full bg-black text-xl text-white hover:!bg-cc-orange hover:!text-black">{pending ? "Please wait…" : "Post it"}</button>
      <p role="status" aria-live="polite" className="min-h-6 text-center text-sm font-bold">{progress}</p>
    </form>
  );
}
