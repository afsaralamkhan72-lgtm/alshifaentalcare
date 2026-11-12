drop policy if exists scr_prize_del on public.scratch_prizes;
create policy scr_prize_del on public.scratch_prizes for delete to authenticated using ((select public.is_owner()));
