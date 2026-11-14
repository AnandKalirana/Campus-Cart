import { getCurrentUser } from "@/lib/session";
import { NavLinks } from "./nav-links";

/** Server component: shows the Dashboard link only to signed-in students. Streams in behind the static shell. */
export async function PrimaryNav() {
  const user = await getCurrentUser();
  return <NavLinks signedIn={!!user} />;
}
