export type StandingSourceRow = {
  division: string;
  place: number;
  sourcePlayerId: string;
  playerName: string;
  wins?: number | null;
  losses?: number | null;
  byes?: number | null;
  score?: number | null;
  sos?: number | null;
  sosos?: number | null;
  roundResults: string;
};

export type StandingMatch = {
  round: number;
  division: string;
  playerASourceId: string;
  playerAName: string;
  playerBSourceId: string;
  playerBName: string;
  winnerSourceId: string | null;
  winnerName: string | null;
  loserSourceId: string | null;
  loserName: string | null;
  result: "decided" | "draw";
  sourceNotationA: string;
  sourceNotationB: string;
};

export type StandingIssue = {
  division: string;
  rowPlace: number;
  round: number | null;
  message: string;
};

type ParsedResult = { opponentPlace: number; outcome: "win" | "loss" | "draw"; raw: string };

function splitRounds(value: string): string[] {
  return value.split("|").map((part) => part.trim()).filter(Boolean);
}

function parseRound(value: string): ParsedResult | null {
  const compact = value.replace(/\s+/g, "");
  const match = compact.match(/^(\d+)([+\-=])$/);
  if (!match) return null;
  return {
    opponentPlace: Number(match[1]),
    outcome: match[2] === "+" ? "win" : match[2] === "-" ? "loss" : "draw",
    raw: value.trim(),
  };
}

function pairKey(division: string, round: number, a: string, b: string) {
  return [division, round, ...[a, b].sort()].join(":");
}

/**
 * Converts a final standings table such as "7+ | 2+ | 6+ | 3+" into one
 * canonical record per match. Pairing IDs are source-local IDs, never Dan IDs.
 */
export function convertStandingsToMatches(rows: StandingSourceRow[]): {
  matches: StandingMatch[];
  issues: StandingIssue[];
} {
  const issues: StandingIssue[] = [];
  const matches = new Map<string, StandingMatch>();
  const divisions = new Map<string, StandingSourceRow[]>();

  for (const row of rows) {
    const division = row.division.trim();
    if (!division || !Number.isInteger(row.place) || row.place < 1 || !row.playerName.trim()) {
      issues.push({ division, rowPlace: row.place, round: null, message: "ข้อมูลรุ่น อันดับ หรือชื่อผู้เล่นไม่ครบ" });
      continue;
    }
    const group = divisions.get(division) ?? [];
    group.push({ ...row, division, sourcePlayerId: row.sourcePlayerId.trim(), playerName: row.playerName.trim() });
    divisions.set(division, group);
  }

  for (const [division, players] of divisions) {
    const byPlace = new Map<number, StandingSourceRow>();
    for (const player of players) {
      if (byPlace.has(player.place)) {
        issues.push({ division, rowPlace: player.place, round: null, message: "มีอันดับซ้ำในรุ่นเดียวกัน" });
      }
      byPlace.set(player.place, player);
    }

    for (const player of players) {
      const rounds = splitRounds(player.roundResults);
      rounds.forEach((notation, index) => {
        const round = index + 1;
        const parsed = parseRound(notation);
        if (!parsed) {
          issues.push({ division, rowPlace: player.place, round, message: "อ่านผลรอบไม่ได้: " + notation });
          return;
        }
        const opponent = byPlace.get(parsed.opponentPlace);
        if (!opponent) {
          issues.push({ division, rowPlace: player.place, round, message: "ไม่พบคู่แข่งอันดับ " + parsed.opponentPlace });
          return;
        }
        if (opponent.place === player.place) {
          issues.push({ division, rowPlace: player.place, round, message: "ผู้เล่นพบตัวเอง" });
          return;
        }

        const opponentNotation = splitRounds(opponent.roundResults)[index] ?? "";
        const opponentParsed = parseRound(opponentNotation);
        const reciprocal =
          opponentParsed?.opponentPlace === player.place &&
          ((parsed.outcome === "win" && opponentParsed.outcome === "loss") ||
            (parsed.outcome === "loss" && opponentParsed.outcome === "win") ||
            (parsed.outcome === "draw" && opponentParsed.outcome === "draw"));

        if (!reciprocal) {
          issues.push({
            division,
            rowPlace: player.place,
            round,
            message: "ผลสองฝั่งไม่ตรงกัน: " + player.playerName + " " + notation + " / " + opponent.playerName + " " + (opponentNotation || "ว่าง"),
          });
          return;
        }

        const aFirst = (player.sourcePlayerId || player.playerName).localeCompare(opponent.sourcePlayerId || opponent.playerName) <= 0;
        const a = aFirst ? player : opponent;
        const b = aFirst ? opponent : player;
        const aParsed = aFirst ? parsed : opponentParsed;
        const key = pairKey(division, round, a.sourcePlayerId || a.playerName, b.sourcePlayerId || b.playerName);

        matches.set(key, {
          round,
          division,
          playerASourceId: a.sourcePlayerId,
          playerAName: a.playerName,
          playerBSourceId: b.sourcePlayerId,
          playerBName: b.playerName,
          winnerSourceId: aParsed.outcome === "draw" ? null : aParsed.outcome === "win" ? a.sourcePlayerId : b.sourcePlayerId,
          winnerName: aParsed.outcome === "draw" ? null : aParsed.outcome === "win" ? a.playerName : b.playerName,
          loserSourceId: aParsed.outcome === "draw" ? null : aParsed.outcome === "loss" ? a.sourcePlayerId : b.sourcePlayerId,
          loserName: aParsed.outcome === "draw" ? null : aParsed.outcome === "loss" ? a.playerName : b.playerName,
          result: aParsed.outcome === "draw" ? "draw" : "decided",
          sourceNotationA: aFirst ? notation : opponentNotation,
          sourceNotationB: aFirst ? opponentNotation : notation,
        });
      });
    }
  }

  return { matches: [...matches.values()], issues };
}
