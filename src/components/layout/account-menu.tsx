import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { logoutAction } from "@/app/(auth)/actions";

/** Server component: reads the verified session. Streams in; the static header shell shows "Log in" until then. */
export async function AccountMenu() {
  const user = await getCurrentUser();
  if (!user) return <Link href="/login" className="bru-btn h-12 bg-white px-5 text-lg">Log in</Link>;
  const first = user.name.split(" ")[0];
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-12 items-center gap-2 border-4 border-black bg-white pr-3" title={user.email}>
        <span aria-hidden className="grid h-full w-10 place-items-center border-r-4 border-black bg-cc-yellow font-raw text-lg">{first.charAt(0)}</span>
        <span className="max-w-[120px] truncate font-raw text-base"><span className="sr-only">Signed in as </span>{first}</span>
      </span>
      <form action={logoutAction}><button type="submit" className="bru-btn h-12 bg-white px-4 text-base">Log out</button></form>
    </div>
  );
}

/** Account links for the mobile menu. */
export async function MobileAccountLinks() {
  const user = await getCurrentUser();
  return user ? (
    <>
      <Link href="/dashboard" data-close className="block border-b-4 border-black py-3.5 font-raw text-xl">Dashboard</Link>
      <form action={logoutAction}><button type="submit" className="w-full border-b-4 border-black py-3.5 text-left font-raw text-xl">Log out</button></form>
    </>
  ) : (
    <Link href="/login" data-close className="block border-b-4 border-black py-3.5 font-raw text-xl">Log in</Link>
  );
}
