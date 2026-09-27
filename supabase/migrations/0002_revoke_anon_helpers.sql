-- RLS helpers are only referenced by policies scoped to authenticated; anon never needs them.
revoke execute on function is_admin(), is_member(), my_player_id() from public, anon;
