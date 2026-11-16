import { TournamentList } from "./TournamentList";

// Rebuilt from the database at most every 30 s, so new posters and events appear without a redeploy.
export const revalidate = 30;

export default function TournamentsPage() {
  return <TournamentList current="/tournaments" />;
}
