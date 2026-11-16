-- Institutions from the 1go Master sheet (tab สถาบัน_ครู, INS0001–INS0045), imported 16 Nov 2026.
-- Names only (no contacts).
--
-- One institution = one name: the matching key now ignores spaces, invisible characters, dashes, dots,
-- brackets and ฯ ("Think Kub" = Thinkkub, "GoHouse" = Go House, "กอ-โอะ โกะ" = กอ โอะ โกะ), plus the
-- spellings below (the sheet's "ชื่ออื่น" column and the ones ครูเล็ก confirmed on 16 Nov 2026).
-- สาธิตจุฬาฯ stays separate (could be ฝ่ายประถม or ฝ่ายมัธยม).
create or replace function gt_private.norm_inst(p text) returns text
language sql immutable set search_path = pg_catalog as $$
  select case k
    when 'hanping' then 'hanpinggo'
    when 'hanpinggoหานผิงโกะ' then 'hanpinggo'
    when 'ครูเตอร์สอนหมากล้อม' then 'ครูเตอร์หมากล้อม'
    when 'ครูเตอร์สอนหมากล้อมbyครูเบนซ์' then 'ครูเตอร์หมากล้อม'
    when 'โรงเรียนสาธิตมหาวิทยาลัยรามคำแหงฝ่ายประถม' then 'สาธิตรามคำแหงฝ่ายประถม'
    when 'bgsgo' then 'bgs'
    when 'ประชาราษฏร์บำเพ็ญ' then 'ประชาราษฎร์บำเพ็ญ'
    else k end
  from (select lower(regexp_replace(coalesce(p, ''), '[[:space:]\u00a0\u200b-\u200d\ufeff().ฯ-]', '', 'g')) k) s
$$;
reindex index public.gt_academies_norm_name_v1;

insert into public.gt_academies (name, status)
select v.name, 'active' from (values
  ('GO MASTER'),
  ('Thinkkub'),
  ('More Than Go'),
  ('Go Sense'),
  ('Go House'),
  ('Pro Yoon'),
  ('Suali Sensei'),
  ('Happy Genius'),
  ('กอ โอะ โกะ'),
  ('GO KIDS'),
  ('บ้านโกะ by ครูได๋'),
  ('ครูเตอร์หมากล้อม'),
  ('ครูณฐสอนหมากล้อม'),
  ('IQ-UP'),
  ('Mr.Go Academy'),
  ('Go Square'),
  ('BGS'),
  ('Bright Go'),
  ('HAPPY GO'),
  ('Go Family'),
  ('Trinity GO'),
  ('Black Stone Go'),
  ('CP AXTRA'),
  ('Goframe'),
  ('Real Go'),
  ('ตัวกลม'),
  ('ครูข้าวตู'),
  ('ชมรมกีฬาหมากล้อมจังหวัดเพชรบุรี'),
  ('อัสสัมชัญแผนกประถม'),
  ('อันวิดา'),
  ('เทพศิรินทร์'),
  ('นวมินทราชินูทิศ เบญจมราชาลัย'),
  ('ราชินี'),
  ('สาธิตรามคำแหง ฝ่ายประถม'),
  ('สาธิตจุฬา ฝ่ายประถม'),
  ('สาธิต มศว ประสานมิตร'),
  ('สาธิตปัญญาภิวัฒน์'),
  ('Wangmak'),
  ('วิทยาลัยเทคนิคนครปฐม'),
  ('มหาวิทยาลัยเชียงใหม่'),
  ('เซนต์ดอมินิก'),
  ('Vayupak Nara School'),
  ('Homeschool'),
  ('ประชาราษฎร์บำเพ็ญ'),
  ('Hanping Go')
) v(name)
where not exists (select 1 from public.gt_academies a where gt_private.norm_inst(a.name) = gt_private.norm_inst(v.name));
