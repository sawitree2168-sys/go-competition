export type AthleteRankFamily = 'dan' | 'kyu';

export function athleteGradeLabel(family: AthleteRankFamily, grade: number | null) {
  if (grade === null) return family === 'dan' ? 'ยังไม่ระบุดั้งย่อย' : 'ยังไม่ระบุคิวย่อย';
  if (family === 'kyu') return `${grade} คิว`;
  return grade === 5 ? '5D+' : `${grade}D`;
}

export const ATHLETE_GRADES = {
  dan: [5, 4, 3, 2, 1],
  kyu: Array.from({ length: 15 }, (_, index) => index + 1),
} as const;
