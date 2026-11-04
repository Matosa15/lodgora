-- Update 5: planeamento de limpezas para os próximos dias (o gerente marca quartos e pessoas, e o plano entra na lista de cada dia).
-- É seguro correr mais do que uma vez. Corre DEPOIS do update-4.
-- (Instalação nova: o schema.sql já inclui tudo isto.)

-- ---------- Planeamento: limpezas marcadas para os próximos dias ----------
-- Cada linha diz "este quarto deve ser limpo neste dia" e, se quiseres, por quem.
-- Quando o dia chega, o plano passa para a lista de limpeza (ver apply_plan).
create table if not exists public.plan (
  id         uuid primary key default gen_random_uuid(),
  hotel_id   uuid not null references public.hotels (id) on delete cascade,
  room_id    uuid not null references public.rooms (id) on delete cascade,
  day        date not null,
  staff_id   uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (room_id, day)
);
create index if not exists plan_hotel_day on public.plan (hotel_id, day);

alter table public.plan enable row level security;
drop policy if exists plan_all on public.plan;
create policy plan_all on public.plan for all to authenticated
  using (hotel_id = public.current_hotel())
  with check (
    hotel_id = public.current_hotel()
    and exists (select 1 from public.rooms r where r.id = plan.room_id and r.hotel_id = plan.hotel_id)
    and (plan.staff_id is null or exists (select 1 from public.staff s where s.id = plan.staff_id and s.hotel_id = plan.hotel_id))
  );
revoke all on public.plan from anon;

-- Interna: passa para a lista de hoje tudo o que estava planeado até p_day.
-- Quartos "Ready", "Occupied" ou "Dirty" ficam "Needs cleaning" e, se o plano tem alguém, ficam atribuídos a essa pessoa.
-- Quartos em limpeza, à espera de inspeção ou fora de serviço não são mexidos. Depois, o plano usado é apagado.
create or replace function public.apply_plan(p_hotel uuid, p_day date) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_n int;
begin
  update public.rooms r
     set status = 'Dirty',
         assigned_to = coalesce(
           (select s.id
              from public.plan p join public.staff s on s.id = p.staff_id
             where p.room_id = r.id and p.hotel_id = p_hotel and p.day <= p_day
               and s.hotel_id = p_hotel and s.active
             order by p.day desc limit 1),
           r.assigned_to)
   where r.hotel_id = p_hotel
     and r.status in ('Ready', 'Occupied', 'Dirty')
     and exists (select 1 from public.plan p where p.room_id = r.id and p.hotel_id = p_hotel and p.day <= p_day);
  get diagnostics v_n = row_count;
  delete from public.plan where hotel_id = p_hotel and day <= p_day;
  if v_n > 0 then
    insert into public.activity (hotel_id, text, actor)
      values (p_hotel, v_n || ' planned cleaning' || case when v_n > 1 then 's' else '' end || ' added to today''s list', 'Lodgora');
  end if;
  return v_n;
end $$;
revoke all on function public.apply_plan(uuid, date) from public, anon, authenticated;

create or replace function public.manager_apply_plan(p_day date) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_hotel uuid := public.current_hotel();
begin
  if v_hotel is null then raise exception 'Not allowed'; end if;
  if p_day is null or abs(p_day - current_date) > 1 then raise exception 'Invalid day'; end if;
  return public.apply_plan(v_hotel, p_day);
end $$;
revoke execute on function public.manager_apply_plan(date) from public, anon;
grant  execute on function public.manager_apply_plan(date) to authenticated;

create or replace function public.staff_apply_plan(p_token uuid, p_day date) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_staff public.staff := public.staff_from_token(p_token);
begin
  if p_day is null or abs(p_day - current_date) > 1 then raise exception 'Invalid day'; end if;
  return public.apply_plan(v_staff.hotel_id, p_day);
end $$;

do $$
begin
  alter publication supabase_realtime add table public.plan;
exception when others then
  null; -- já estava ativo
end $$;
