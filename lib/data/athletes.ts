import { cache } from "react";
import { athletes as fixtureAthletes, type Athlete } from "@/lib/athletes";

/**
 * Single read boundary for public athlete data.
 *
 * Today this returns the safe fixture dataset. When Supabase is activated,
 * replace only this module with queries against published public tables;
 * pages and components should not query fixtures or Supabase directly.
 */
export async function listPublicAthletes(): Promise<Athlete[]> {
  return fixtureAthletes;
}

export const getPublicAthlete = cache(async (athleteCode: string) => {
  const athletes = await listPublicAthletes();
  return athletes.find((athlete) => athlete.id === athleteCode);
});
