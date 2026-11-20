import Gate from "@/app/organizer/_lib/Gate";
import CompetitionDaySimulation from "@/app/organizer/_lib/division/CompetitionDaySimulation";
export default async function SimulationPage({params}:{params:Promise<{id:string;divisionId:string}>}){
  const {id,divisionId}=await params;
  return <Gate><CompetitionDaySimulation eventId={id} divisionId={divisionId}/></Gate>;
}
