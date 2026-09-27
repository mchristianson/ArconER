-- Admin-arranged order within a year; the first photo is the year's cover. Null = not arranged (falls after, by taken_at).
alter table photos add column sort int;
create index on photos (year, sort);
