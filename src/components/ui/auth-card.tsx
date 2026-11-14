export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="mx-auto flex max-w-[1312px] justify-center px-5 py-14 lg:px-0 lg:py-20">
      <div className="w-full max-w-[440px] rounded-[28px] bg-cc-surface p-7 sm:p-9">
        <h1 className="text-[28px] font-semibold tracking-[-0.03em]">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] text-cc-muted">{subtitle}</p>}
        <div className="mt-7">{children}</div>
        {footer && <div className="mt-6 border-t border-cc-line pt-5 text-center text-sm text-cc-muted">{footer}</div>}
      </div>
    </section>
  );
}
