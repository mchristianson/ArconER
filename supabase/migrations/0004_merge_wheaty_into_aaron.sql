-- "Wheaty" (Arcon 2018-2020, 2023) was Aaron Wheatcraft. Ids are from production.
-- (Applied in prod as a merge that briefly dropped the 2023 Wheaty-vs-Todd singles, then restored it; net effect is this.)
delete from roster r where r.player_id = '207ee7f2-7f23-45a9-b711-d0c74da361a9'
  and exists (select 1 from roster k where k.player_id = 'ad291c58-dca1-4954-b25b-959bd02148fa' and k.year = r.year);
update roster set player_id = 'ad291c58-dca1-4954-b25b-959bd02148fa' where player_id = '207ee7f2-7f23-45a9-b711-d0c74da361a9';
update match_players set player_id = 'ad291c58-dca1-4954-b25b-959bd02148fa' where player_id = '207ee7f2-7f23-45a9-b711-d0c74da361a9';
update photo_tags set player_id = 'ad291c58-dca1-4954-b25b-959bd02148fa' where player_id = '207ee7f2-7f23-45a9-b711-d0c74da361a9';
update rsvps set player_id = 'ad291c58-dca1-4954-b25b-959bd02148fa' where player_id = '207ee7f2-7f23-45a9-b711-d0c74da361a9';
update profiles set player_id = 'ad291c58-dca1-4954-b25b-959bd02148fa' where player_id = '207ee7f2-7f23-45a9-b711-d0c74da361a9';
delete from players where id = '207ee7f2-7f23-45a9-b711-d0c74da361a9';
