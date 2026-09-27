export type AthleteEvent = {
  date: string;
  tournament: string;
  division: string;
  rank: string;
  wins: number;
  losses: number;
  bye: number;
  score: number;
  sos?: number;
};

export type Athlete = {
  id: string;
  displayName: string;
  institute: string;
  level: string;
  rankType: "DAN" | "KYU" | "BEGINNER";
  events: AthleteEvent[];
  bestResult: string;
  ratingLabel: string;
  ratingValue: string | null;
  ratingNote: string;
};

export const athletes: Athlete[] = [
  {
    id: "GT-0001",
    displayName: "นักกีฬา A",
    institute: "สถาบันตัวอย่าง 1",
    level: "1 Dan",
    rankType: "DAN",
    bestResult: "อันดับ 1",
    ratingLabel: "GP ล่าสุด",
    ratingValue: "1,161",
    ratingNote: "ตัวอย่างรูปแบบการแสดงผล คะแนนจริงจะอ่านจาก Score History",
    events: [
      { date: "18 ก.ค. 2569", tournament: "รายการแข่งขันตัวอย่าง", division: "Open Dan", rank: "อันดับ 1", wins: 5, losses: 0, bye: 0, score: 5, sos: 16 },
      { date: "25 พ.ค. 2569", tournament: "รายการทดสอบระบบ", division: "1–2 Dan", rank: "อันดับ 3", wins: 4, losses: 1, bye: 0, score: 4, sos: 14 },
    ],
  },
  {
    id: "GT-0002",
    displayName: "นักกีฬา B",
    institute: "สถาบันตัวอย่าง 2",
    level: "3 Kyu",
    rankType: "KYU",
    bestResult: "อันดับ 3",
    ratingLabel: "คะแนนสะสมระดับคิว",
    ratingValue: null,
    ratingNote: "ยังไม่กำหนดคะแนนเริ่มต้น ระบบแสดงเฉพาะคะแนนและผลของแต่ละรายการ",
    events: [
      { date: "18 ก.ค. 2569", tournament: "ธรรมศาสตร์ โอเพ่น 2026", division: "3–4 KYU", rank: "อันดับ 3", wins: 4, losses: 1, bye: 0, score: 4, sos: 12 },
    ],
  },
  {
    id: "GT-0003",
    displayName: "นักกีฬา C",
    institute: "สถาบันตัวอย่าง 1",
    level: "5 Kyu",
    rankType: "KYU",
    bestResult: "Top 8",
    ratingLabel: "คะแนนสะสมระดับคิว",
    ratingValue: null,
    ratingNote: "ยังไม่กำหนดคะแนนเริ่มต้น ระบบแสดงเฉพาะคะแนนและผลของแต่ละรายการ",
    events: [
      { date: "18 ก.ค. 2569", tournament: "ธรรมศาสตร์ โอเพ่น 2026", division: "5–6 KYU", rank: "อันดับ 8", wins: 3, losses: 2, bye: 0, score: 3, sos: 10 },
    ],
  },
  {
    id: "GT-0004",
    displayName: "นักกีฬา D",
    institute: "อิสระ",
    level: "2 Dan",
    rankType: "DAN",
    bestResult: "อันดับ 2",
    ratingLabel: "GP ล่าสุด",
    ratingValue: "832",
    ratingNote: "ตัวอย่างรูปแบบการแสดงผล คะแนนจริงจะอ่านจาก Score History",
    events: [
      { date: "18 ก.ค. 2569", tournament: "รายการแข่งขันตัวอย่าง", division: "Open Dan", rank: "อันดับ 2", wins: 4, losses: 1, bye: 0, score: 4, sos: 15 },
    ],
  },
];

export function getAthlete(id: string) {
  return athletes.find((athlete) => athlete.id === id);
}
