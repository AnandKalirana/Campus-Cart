import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { logoutAction } from "@/app/(auth)/actions";

/** Server component: reads the verified session. Streams in; the static header shell shows "Log in" until then. */
export async function AccountMenu() {
  const user = await getCurrentUser();
  if (!user) return <Link href="/login" className="text-[15px] font-medium transition-colors hover:text-cc-blue">Log in</Link>;
  return (
    <div className="flex items-center gap-4">
      <Link href="/dashboard" className="max-w-[140px] truncate text-[15px] font-medium hover:text-cc-blue" title={user.email}>{user.name.split(" ")[0]}</Link>
      <form action={logoutAction}><button type="submit" className="text-[15px] text-cc-muted transition-colors hover:text-cc-ink">Log out</button></form>
    </div>
  );
}
