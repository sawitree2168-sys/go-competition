-- Publish standings and round results without exposing the organizer's spreadsheet URLs.
CREATE OR REPLACE FUNCTION public.gt_history_walllist_v1(p_event_id text, p_division text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  WITH base AS MATERIALIZED (
    SELECT gt_private.history_walllist_v1(p_event_id, p_division) AS wall
  ), organizer AS (
    SELECT s.payload
    FROM base
    JOIN gt_private.history_source_snapshots_v1 s
      ON s.source_key = 'organizer-wall:' || p_event_id || ':' || (base.wall->>'division')
    WHERE p_event_id IN ('association:160569', 'association:240769')
    ORDER BY s.batch_id DESC
    LIMIT 1
  )
  SELECT CASE WHEN organizer.payload IS NULL THEN base.wall
    ELSE base.wall || jsonb_build_object(
      'rows', organizer.payload->'rows',
      'rounds', organizer.payload->'rounds',
      'ranking_mode', 'source',
      'organizer_standings', true,
      'divisions', (
        SELECT jsonb_agg(
          CASE WHEN division.item->>'name' = organizer.payload->>'division'
            THEN division.item || jsonb_build_object('players', jsonb_array_length(organizer.payload->'rows'))
            ELSE division.item END
          ORDER BY division.ordinality
        )
        FROM jsonb_array_elements(base.wall->'divisions') WITH ORDINALITY AS division(item, ordinality)
      )
    )
  END
  FROM base
  LEFT JOIN organizer ON true;
$function$;

-- Keep original organizer sheet references in the private evidence.
INSERT INTO gt_private.history_match_evidence_v1 AS e (match_id, payload)
SELECT id, jsonb_build_object('organizer_source_url',source_url)
FROM public.gt_history_matches
WHERE event_id IN ('association:160569', 'association:240769')
  AND source_url ~ '^https://docs\.google\.com/spreadsheets/d/(17EAh751b4nORfxgfk4cpPj5YqivUX_fX9rIuQPVjqmw|1KqFMntWKqVBESNLVONq0V3VMBfwkN3R2h9vVMAOc3k0|1codNaWmu4qamgzNO_oUkkmqu59ORoSTvYpowniRQ6Sw)/'
ON CONFLICT (match_id) DO UPDATE
  SET payload = coalesce(e.payload, '{}'::jsonb) || excluded.payload
  WHERE NOT (coalesce(e.payload, '{}'::jsonb) ? 'organizer_source_url');

UPDATE public.gt_history_matches
SET source_url = 'https://go-competition.vercel.app/results/history/' || replace(event_id, ':', '%3A')
WHERE event_id IN ('association:160569', 'association:240769')
  AND source_url ~ '^https://docs\.google\.com/spreadsheets/d/(17EAh751b4nORfxgfk4cpPj5YqivUX_fX9rIuQPVjqmw|1KqFMntWKqVBESNLVONq0V3VMBfwkN3R2h9vVMAOc3k0|1codNaWmu4qamgzNO_oUkkmqu59ORoSTvYpowniRQ6Sw)/';
