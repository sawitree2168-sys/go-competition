-- Send visitors to the public wall lists and retain TESUJI as private import provenance.
INSERT INTO gt_private.history_match_evidence_v1 AS evidence (match_id, payload)
SELECT id, jsonb_build_object('organizer_source_url', source_url)
FROM public.gt_history_matches
WHERE event_id IN ('association:151169', 'association:251069')
  AND source_url = 'https://tesuji-reg.vercel.app/'
ON CONFLICT (match_id) DO UPDATE
  SET payload = coalesce(evidence.payload, '{}'::jsonb) || excluded.payload
  WHERE NOT (coalesce(evidence.payload, '{}'::jsonb) ? 'organizer_source_url');

UPDATE public.gt_history_matches
SET source_url = 'https://go-competition.vercel.app/results/history/' || replace(event_id, ':', '%3A')
WHERE event_id IN ('association:151169', 'association:251069')
  AND source_url = 'https://tesuji-reg.vercel.app/';
