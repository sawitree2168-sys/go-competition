-- Organizer-supplied placings and tiebreaks are displayed with verified round results.
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
      'source', organizer.payload->'source',
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

REVOKE ALL ON FUNCTION public.gt_history_walllist_v1(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gt_history_walllist_v1(text, text) TO anon, authenticated, service_role;
