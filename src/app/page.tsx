import ArcadeScene from "@/components/arcade/ArcadeScene";
import { getVisibleLinks } from "@/lib/links";

// Links change from the admin panel, so the screen is always rendered fresh.
export const dynamic = "force-dynamic";

export default async function Home() {
  const links = await getVisibleLinks();
  return <ArcadeScene links={links} />;
}
