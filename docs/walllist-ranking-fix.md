# Historical walllist ranking fix — 19 Nov 2026

Audited all 40 imported events and 118 divisions. Source ranks absent for at least one player in 86 divisions (32 divisions mix populated and missing ranks). Old ordering put every missing source rank after every present rank, even if points were higher.

New rule: use source order only if every player has a distinct non-null source rank. Otherwise compute the entire division using points DESC, SOS DESC, SOSOS DESC, then stable name/person ID. Never mix the two ranking systems in one table. All opponent-number tokens use the exact same placed CTE. Raw source observations remain unchanged.

Source-complete divisions retain official order, including any organiser-specific criteria. Two source-complete divisions show score/order inconsistencies in the imported games: IQ-UP Championship (association:070869 / DAN) and CP ALL CUP (association:110769 / 1 Dan). UI flags this and asks readers to check the source; no official placing is silently rewritten. Imported games may not cover organiser adjustments. This check does not certify the original tournament results or data completeness.

LOTUS’S association:151169 / 1–2 Dan now places GO1155250826 at27 (1 point, SOS10, SOSOS61) and GO1179181126 at32 (0 points). Refresh derived history_standings_v1 after changing the wall function so athlete profile placings agree.

Also fixed division game counts to count distinct match IDs before participant expansion (previously doubled); table round columns use actual round labels, not 1..N array positions, so rounds7–14 remain labelled7–14.

Regression audit tests/history-walllist-audit.sql: all118 divisions, contiguous displayed places, no ascending points in computed mode, every numeric opponent token resolves to the displayed player's name. No source data, game outcome, athlete identity or score is edited by this change.
