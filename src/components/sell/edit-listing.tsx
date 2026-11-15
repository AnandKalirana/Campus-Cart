"use client";
import Image from "next/image";
import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteImageAction, listingStatusAction, updateListingAction, type ListingState } from "@/app/sell/actions";
import { FormMessage, SubmitButton } from "@/components/forms/field";
import { MAX_IMAGES, STATUS_LABEL, type StatusValue } from "@/lib/listing-format";
import { uploadPhoto } from "@/lib/client-image";
import { ListingFields } from "./listing-fields";

type Img = { id: string; url: string; alt: string | null };
interface Props { id: string; status: StatusValue; values: Record<string, string>; images: Img[]; categories: { slug: string; name: string }[]; notice?: string }

export function EditListing({ id, status, values, images, categories, notice }: Props) {
  const router = useRouter();
  const [s, action, saving] = useActionState(updateListingAction.bind(null, id), undefined as ListingState | undefined);
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | undefined>(notice === "photos" ? "Your listing is saved, but a photo didn't upload. Add photos below, then publish." : notice === "publish" ? "Your listing is saved but not live yet. Check it has a photo, then publish." : undefined);
  const file = useRef<HTMLInputElement>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, okMsg?: string) => start(async () => {
    const r = await fn(); setMsg(r.ok ? okMsg : r.message); if (r.ok) router.refresh();
  });
  const upload = () => start(async () => {
    const f = Array.from(file.current?.files ?? []);
    for (const [i, one] of f.entries()) {
      setMsg(`Uploading photo ${i + 1} of ${f.length}…`);
      const r = await uploadPhoto(id, one);
      if (!r.ok) { setMsg(r.message); router.refresh(); return; }
    }
    if (file.current) file.current.value = "";
    setMsg("Photos added."); router.refresh();
  });

  const v = s?.values ?? values;
  return (
    <div className="space-y-10" aria-busy={busy || saving}>
      <p role="status" aria-live="polite" className={msg ? "border-4 border-black bg-cc-yellow px-4 py-3 text-base font-bold" : "sr-only"}>{msg}</p>
      <section aria-labelledby="st" className="bru-card p-5 sm:p-6">
        <h2 id="st" className="font-raw text-2xl">Status: {STATUS_LABEL[status]}</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {status === "PAUSED" && <button type="button" disabled={busy} onClick={() => run(() => listingStatusAction(id, "publish"), "You're live.")} className="bru-btn h-12 bg-cc-green px-5 text-base">Publish</button>}
          {status === "ACTIVE" && <button type="button" disabled={busy} onClick={() => run(() => listingStatusAction(id, "pause"), "Paused. Only you can see it.")} className="bru-btn h-12 bg-white px-5 text-base">Pause</button>}
          {status !== "SOLD" && <button type="button" disabled={busy} onClick={() => run(() => listingStatusAction(id, "sold"), "Marked as sold.")} className="bru-btn h-12 bg-cc-pink px-5 text-base">Mark as sold</button>}
          {!confirmRemove ? (
            <button type="button" onClick={() => setConfirmRemove(true)} className="bru-btn h-12 bg-white px-5 text-base text-cc-red">Remove…</button>
          ) : (
            <span className="flex flex-wrap items-center gap-3" role="group" aria-label="Confirm removal">
              <span className="font-bold">Remove this listing for good?</span>
              <button type="button" disabled={busy} onClick={() => start(async () => { const r = await listingStatusAction(id, "remove"); if (r.ok) router.push("/dashboard/listings"); else setMsg(r.message); })} className="bru-btn h-12 bg-cc-red px-5 text-base text-white">Yes, remove</button>
              <button type="button" onClick={() => setConfirmRemove(false)} className="bru-btn h-12 bg-white px-5 text-base">Keep it</button>
            </span>
          )}
        </div>
      </section>

      <section aria-labelledby="ph">
        <h2 id="ph" className="font-raw text-2xl">Photos ({images.length}/{MAX_IMAGES})</h2>
        <ul className="mt-4 flex flex-wrap gap-4">
          {images.map((im, n) => (
            <li key={im.id} className="bru-card w-36 overflow-hidden bg-white">
              <Image src={im.url} alt={im.alt || `Photo ${n + 1}`} width={144} height={108} unoptimized className="h-28 w-full object-cover" />
              <button type="button" disabled={busy} onClick={() => run(() => deleteImageAction(id, im.id), "Photo removed.")} aria-label={`Remove photo ${n + 1}`} className="w-full cursor-pointer border-t-4 border-black bg-white py-2 text-sm font-bold hover:bg-black hover:text-white">Remove</button>
            </li>
          ))}
        </ul>
        {images.length < MAX_IMAGES && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label htmlFor="more" className="sr-only">Add photos</label>
            <input ref={file} id="more" type="file" multiple accept="image/jpeg,image/png,image/webp" className="bru-input h-auto max-w-md py-3 file:mr-4 file:cursor-pointer file:border-4 file:border-black file:bg-cc-yellow file:px-3 file:py-1 file:font-bold" />
            <button type="button" disabled={busy} onClick={upload} className="bru-btn h-12 bg-black px-6 text-base text-white">Upload</button>
          </div>
        )}
      </section>

      <form action={action} className="space-y-6">
        <h2 className="font-raw text-2xl">Details</h2>
        <FormMessage ok={s?.ok} message={s?.message} />
        <ListingFields v={v} errors={s?.errors ?? {}} categories={categories} />
        <SubmitButton pending={saving}>Save changes</SubmitButton>
      </form>
    </div>
  );
}
