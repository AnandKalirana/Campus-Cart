/** Different copy per breakpoint (from the separate mobile and desktop Superdesign drafts). The hidden variant is display:none, so assistive tech only sees one. */
export function Resp({ mobile, desktop }: { mobile: React.ReactNode; desktop: React.ReactNode }) {
  return (
    <>
      <span className="md:hidden">{mobile}</span>
      <span className="hidden md:inline">{desktop}</span>
    </>
  );
}
