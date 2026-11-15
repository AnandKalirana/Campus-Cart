import { useId } from "react";
import { Field } from "@/components/forms/field";
import { CONDITION_LABEL, CONDITION_VALUES } from "@/lib/listing-format";

function Wrap({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="font-raw mb-2 block text-sm">{label}</label>
      {children}
      {(error || hint) && <p id={`${id}-msg`} className={`mt-2 text-sm font-bold ${error ? "text-cc-red" : ""}`}>{error ? <>Error: {error}</> : hint}</p>}
    </div>
  );
}

export function ListingFields({ v, errors, categories }: { v: Record<string, string>; errors: Record<string, string>; categories: { slug: string; name: string }[] }) {
  const desc = useId(), cat = useId(), cond = useId();
  return (
    <div className="space-y-5">
      <Field label="Title" name="title" error={errors.title} defaultValue={v.title} hint="What is it? Brand, model, edition." />
      <Wrap id={desc} label="Description" error={errors.description} hint="Condition details, what's included, why you're selling. Plain text.">
        <textarea id={desc} name="description" required rows={5} maxLength={2000} defaultValue={v.description} aria-invalid={!!errors.description} aria-describedby={`${desc}-msg`} className="bru-input" />
      </Wrap>
      <div className="grid gap-5 sm:grid-cols-2">
        <Wrap id={cat} label="Category" error={errors.categorySlug}>
          <select id={cat} name="categorySlug" required defaultValue={v.categorySlug ?? ""} aria-invalid={!!errors.categorySlug} aria-describedby={errors.categorySlug ? `${cat}-msg` : undefined} className="bru-input h-14 cursor-pointer py-0">
            <option value="" disabled>Choose…</option>
            {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </Wrap>
        <Wrap id={cond} label="Condition" error={errors.condition}>
          <select id={cond} name="condition" required defaultValue={v.condition ?? ""} aria-invalid={!!errors.condition} aria-describedby={errors.condition ? `${cond}-msg` : undefined} className="bru-input h-14 cursor-pointer py-0">
            <option value="" disabled>Choose…</option>
            {CONDITION_VALUES.map(c => <option key={c} value={c}>{CONDITION_LABEL[c]}</option>)}
          </select>
        </Wrap>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your price (₹)" name="price" type="number" error={errors.price} defaultValue={v.price} hint="Whole rupees." />
        <Field label="Original price (₹)" name="originalPrice" type="number" required={false} error={errors.originalPrice} defaultValue={v.originalPrice} hint="Shown struck through." />
      </div>
      <Field label="Pickup spot on campus" name="pickupLocation" error={errors.pickupLocation} defaultValue={v.pickupLocation} hint="A busy public place, e.g. library entrance." />
    </div>
  );
}
