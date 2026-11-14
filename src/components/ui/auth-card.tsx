export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="mx-auto flex max-w-[1400px] justify-center px-5 py-12 lg:px-6 lg:py-20">
      <div className="bru-card w-full max-w-[480px] p-6 sm:p-9">
        <h1 className="font-raw text-[clamp(2rem,6vw,2.75rem)] leading-[0.95]">{title}</h1>
        {subtitle && <p className="mt-3 text-lg font-bold">{subtitle}</p>}
        <div className="mt-7">{children}</div>
        {footer && <div className="mt-7 border-t-4 border-black pt-5 text-center text-base font-bold">{footer}</div>}
      </div>
    </section>
  );
}
