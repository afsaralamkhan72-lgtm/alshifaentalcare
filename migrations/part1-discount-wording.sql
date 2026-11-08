do $$
declare r record; d text;
begin
  for r in select p.oid from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' and p.prosrc ~* 'riyayat' loop
    d := pg_get_functiondef(r.oid);
    d := replace(replace(d, 'Riyayat', 'Discount'), 'riyayat', 'discount');
    execute d;
  end loop;
end $$;
