-- Search by the level shown on the head-to-head athlete cards before applying the result limit.
CREATE OR REPLACE FUNCTION public.gt_head_to_head_athletes_v1(
  p_query text DEFAULT '',
  p_level text DEFAULT 'all'
)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
  WITH settings AS (
    SELECT lower(left(btrim(coalesce(p_query, '')), 80)) AS term,
           coalesce(p_level, 'all') AS level_filter
  ), candidates AS (
    SELECT r.go_id, r.full_name, gt_private.rank_label_v1(r.source_rank) AS registered_rank
    FROM gt_private.history_identity_registry_v1 r
    WHERE r.go_id <> 'GO106260826'
    UNION ALL
    SELECT a.go_id, a.full_name, a.current_rank
    FROM public.gt_athletes a
    WHERE a.profile_public
      AND NOT EXISTS (SELECT 1 FROM gt_private.history_identity_registry_v1 r WHERE r.go_id = a.go_id)
  ), mapped_dan AS (
    SELECT x.go_id, min(x.dan_number) AS dan_number
    FROM gt_private.history_dan_crosswalk_v1 x
    GROUP BY x.go_id
  ), unmapped_dan AS (
    SELECT d.dan_number::int AS dan_number, regexp_replace(d.full_name, '[\s​]', '', 'g') AS name_key
    FROM gt_private.legacy_dan_directory_v5 d
    WHERE d.dan_number ~ '^[0-9]+$' AND NOT EXISTS (
      SELECT 1 FROM gt_private.history_dan_crosswalk_v1 x WHERE x.dan_number = d.dan_number::int
    )
  ), people AS (
    SELECT c.*, coalesce(m.dan_number, u.dan_number) AS dan_number
    FROM candidates c
    LEFT JOIN mapped_dan m ON m.go_id = c.go_id
    LEFT JOIN unmapped_dan u ON m.dan_number IS NULL AND u.name_key = regexp_replace(c.full_name, '[\s​]', '', 'g')
  ), matched AS (
    SELECT p.*,
           gt_private.dan_label_v1(d.source_rank, d.diamond) AS official_dan_label,
           (regexp_match(p.registered_rank, '^\s*([1-9])\s*(?:ดั้ง|dan)\M', 'i'))[1]::int AS registered_dan,
           (regexp_match(btrim(d.source_rank), '^([1-9])$'))[1]::int AS official_dan,
           s.term, s.level_filter
    FROM people p
    CROSS JOIN settings s
    LEFT JOIN gt_private.legacy_dan_directory_v5 d ON d.dan_number = p.dan_number::text
    WHERE (length(s.term) >= 2 OR s.level_filter <> 'all')
      AND s.level_filter IN ('all', 'dan5plus', 'dan4', 'dan3', 'dan2', 'dan1', 'kyu')
      AND (s.term = '' OR position(s.term IN lower(p.full_name)) > 0
           OR position(s.term IN lower(p.go_id)) > 0 OR p.dan_number::text = s.term)
  ), ranked AS (
    SELECT m.*,
           coalesce(m.official_dan, m.registered_dan) AS dan_grade,
           coalesce(m.official_dan_label,
                    CASE WHEN m.registered_dan IS NOT NULL THEN m.registered_rank END,
                    recent.label, m.registered_rank) AS rank,
           CASE WHEN m.official_dan_label IS NOT NULL THEN 'association'
                WHEN m.registered_dan IS NOT NULL THEN 'registry'
                WHEN recent.label IS NOT NULL THEN 'competition'
                WHEN m.registered_rank IS NOT NULL THEN 'registry' END AS rank_source,
           recent.event_title AS rank_event, recent.event_date AS rank_event_date, recent.division AS rank_division
    FROM matched m
    LEFT JOIN LATERAL (
      SELECT e.title AS event_title, e.event_date, h.division,
             grade.parts[1] || coalesce('–' || grade.parts[2], '') || ' คิว' AS label
      FROM public.gt_history_people p
      JOIN public.gt_history_matches h ON p.id IN (h.player_a, h.player_b)
      JOIN public.gt_history_events e ON e.id = h.event_id
      CROSS JOIN LATERAL (
        SELECT regexp_match(h.division, '([1-9][0-9]?)\s*(?:[-–—−]\s*([1-9][0-9]?))?\s*(?:kyu\M|คิว|k\M)', 'i') AS parts
      ) grade
      WHERE p.go_id = m.go_id AND h.kind = 'played' AND grade.parts IS NOT NULL
        AND h.division !~* '(friendship|เฟรนชิพ|กระดาน)'
        AND (e.event_date IS NULL OR e.event_date <= (now() AT TIME ZONE 'Asia/Bangkok')::date)
      ORDER BY gt_private.history_event_sort_date_v1(e.id, e.event_date) DESC NULLS LAST,
               e.event_year DESC, e.id DESC, grade.parts[1]::int, h.division, h.id
      LIMIT 1
    ) recent ON m.official_dan_label IS NULL AND m.registered_dan IS NULL
  ), filtered AS (
    SELECT r.* FROM ranked r
    WHERE r.level_filter = 'all'
       OR (r.level_filter = 'kyu' AND r.dan_grade IS NULL AND r.rank ~* '(คิว|kyu)')
       OR (r.level_filter = 'dan5plus' AND r.dan_grade >= 5)
       OR r.level_filter = 'dan' || r.dan_grade::text
  ), selections AS (
    SELECT f.*, row_number() OVER (ORDER BY lower(f.go_id) = f.term DESC, lower(f.full_name) = f.term DESC,
                                        f.full_name, f.go_id) AS ord
    FROM filtered f
    ORDER BY ord
    LIMIT 30
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM filtered),
    'rows', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'go_id', s.go_id, 'full_name', s.full_name, 'rank', s.rank, 'rank_source', s.rank_source,
      'rank_event', s.rank_event, 'rank_event_date', s.rank_event_date, 'rank_division', s.rank_division,
      'photo', coalesce(a.avatar_url, dan_photo.avatar_url), 'institution', a.school_name
    ) ORDER BY s.ord)
    FROM selections s
    LEFT JOIN public.gt_athletes a ON a.go_id = s.go_id AND a.profile_public
    LEFT JOIN public.gt_athletes dan_photo ON dan_photo.go_id = s.go_id
      AND EXISTS (SELECT 1 FROM mapped_dan d WHERE d.go_id = s.go_id)), '[]'::jsonb)
  );
$function$;

REVOKE ALL ON FUNCTION public.gt_head_to_head_athletes_v1(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gt_head_to_head_athletes_v1(text,text) TO anon, authenticated, service_role;
