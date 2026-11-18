import { redirect } from "next/navigation";

/** Keep saved standings links on the same public, live competition interface. */
export default async function Standings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/tournaments/${id}/competition?tab=standings`);
}
