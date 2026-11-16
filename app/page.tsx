import { TournamentList } from "./tournaments/TournamentList";

// Home page = the competition list (การแข่งขันทั้งหมด). Rebuilt from the database at most every 30 s.
export const revalidate = 30;

export default function Home() {
  return <TournamentList current="/" />;
}
