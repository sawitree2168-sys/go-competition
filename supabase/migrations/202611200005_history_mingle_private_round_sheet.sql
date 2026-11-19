-- Keep Mingle's round results public without exposing the organizer's round-sheet URL.
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
      'source', CASE WHEN p_event_id = 'association:160569'
        THEN (organizer.payload->'source') - 'rounds'
        ELSE organizer.payload->'source'
      END,
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
