-- Big Pants -> Aaron (Aaron Wheatcraft); Leonard -> Tim L (Tim Leonard). Ids are from production.
create temp table merge_pairs(keep uuid, dup uuid) on commit drop;
insert into merge_pairs values
  ('ad291c58-dca1-4954-b25b-959bd02148fa', 'f2b47f7f-3313-41bc-9967-5957059b77a6'),
  ('e698b859-86f1-4f94-a5bf-1b1c9b591092', 'e99686fd-b55b-44e1-bcb7-3e550f0ca83f');

delete from roster r using merge_pairs m
  where r.player_id = m.dup and exists (select 1 from roster k where k.player_id = m.keep and k.year = r.year);
update roster r set player_id = m.keep from merge_pairs m where r.player_id = m.dup;

update match_players x set player_id = m.keep from merge_pairs m where x.player_id = m.dup;

delete from photo_tags t using merge_pairs m
  where t.player_id = m.dup and exists (select 1 from photo_tags k where k.player_id = m.keep and k.photo_id = t.photo_id);
update photo_tags t set player_id = m.keep from merge_pairs m where t.player_id = m.dup;

delete from rsvps r using merge_pairs m
  where r.player_id = m.dup and exists (select 1 from rsvps k where k.player_id = m.keep and k.year = r.year);
update rsvps r set player_id = m.keep from merge_pairs m where r.player_id = m.dup;

update profiles p set player_id = m.keep from merge_pairs m where p.player_id = m.dup;

delete from players p using merge_pairs m where p.id = m.dup;
