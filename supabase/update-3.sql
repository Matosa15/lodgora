-- Lodgora: atualização 3 (partes comuns, estatísticas, histórico de limpezas).
-- Corre UMA vez no SQL Editor do Supabase. Não apaga dados e inclui a atualização 2,
-- por isso serve mesmo que ainda não tenhas corrido o update-2.sql. Podes correr mais de uma vez.

alter table public.staff add column if not exists pin_display text;
alter table public.rooms add column if not exists clean_seconds int not null default 0;
alter table public.rooms add column if not exists clean_running_since timestamptz;
alter table public.rooms add column if not exists clean_started_at timestamptz;
alter table public.rooms add column if not exists kind text not null default 'room';
do $$ begin
  alter table public.rooms add constraint rooms_kind_check check (kind in ('room', 'area'));
exception when duplicate_object then null; end $$;
alter table public.issues add column if not exists resolved_at timestamptz;
update public.issues set resolved_at = created_at where status = 'resolved' and resolved_at is null;

grant select (pin_display) on public.staff to authenticated;

create table if not exists public.cleaning_log (
  id           uuid primary key default gen_random_uuid(),
  hotel_id     uuid not null references public.hotels (id) on delete cascade,
  room_id      uuid references public.rooms (id) on delete set null,
  label        text not null,
  kind         text not null default 'room',
  type         text not null default '',
  staff_id     uuid references public.staff (id) on delete set null,
  staff_name   text,
  started_at   timestamptz,
  finished_at  timestamptz not null default now(),
  seconds      int not null default 0,
  approved_at  timestamptz,
  sent_back    boolean not null default false
);
create index if not exists cleaning_log_hotel_finished on public.cleaning_log (hotel_id, finished_at desc);
alter table public.cleaning_log enable row level security;
drop policy if exists cleaning_log_select on public.cleaning_log;
create policy cleaning_log_select on public.cleaning_log for select to authenticated using (hotel_id = public.current_hotel());
revoke all on public.cleaning_log from anon, authenticated;
grant select on public.cleaning_log to authenticated;

create or replace function public.rooms_timer() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  if new.status = 'Cleaning' and old.status is distinct from 'Cleaning' then
    new.clean_seconds := 0;
    new.clean_running_since := now();
    new.clean_started_at := now();
  elsif old.status = 'Cleaning' and new.status <> 'Cleaning' then
    if old.clean_running_since is not null then
      new.clean_seconds := old.clean_seconds + floor(extract(epoch from now() - old.clean_running_since))::int;
    end if;
    new.clean_running_since := null;
  end if;
  if new.status = 'Dirty' and old.status is distinct from 'Dirty' then
    new.clean_seconds := 0;
    new.clean_running_since := null;
    new.clean_started_at := null;
  end if;

  -- Histórico: uma linha por limpeza terminada, atualizada quando o gerente aprova ou manda refazer
  if old.status = 'Cleaning' and new.status = 'Awaiting inspection' then
    select full_name into v_name from public.staff where id = old.assigned_to;
    insert into public.cleaning_log (hotel_id, room_id, label, kind, type, staff_id, staff_name, started_at, finished_at, seconds)
      values (new.hotel_id, new.id, new.number, new.kind, new.type, old.assigned_to, v_name,
              coalesce(old.clean_started_at, now()), now(), new.clean_seconds);
  elsif old.status = 'Awaiting inspection' and new.status = 'Ready' then
    update public.cleaning_log set approved_at = now()
     where id = (select id from public.cleaning_log
                  where room_id = new.id and approved_at is null and not sent_back
                  order by finished_at desc limit 1);
  elsif old.status = 'Awaiting inspection' and new.status = 'Dirty' then
    update public.cleaning_log set sent_back = true
     where id = (select id from public.cleaning_log
                  where room_id = new.id and approved_at is null and not sent_back
                  order by finished_at desc limit 1);
  end if;
  return new;
end $$;

drop trigger if exists rooms_timer on public.rooms;
create trigger rooms_timer before update of status on public.rooms
  for each row execute function public.rooms_timer();

create or replace function public.issues_resolved() returns trigger
language plpgsql as $$
begin
  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    new.resolved_at := now();
  elsif new.status <> 'resolved' then
    new.resolved_at := null;
  end if;
  return new;
end $$;

drop trigger if exists issues_resolved on public.issues;
create trigger issues_resolved before update of status on public.issues
  for each row execute function public.issues_resolved();

create or replace function public.manager_create_staff(p_full_name text, p_username text, p_pin text, p_role text default 'housekeeper')
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hotel uuid := public.current_hotel();
  v_user  text := lower(trim(coalesce(p_username, '')));
  v_id    uuid;
begin
  if v_hotel is null then raise exception 'Only managers can add staff'; end if;
  if length(trim(coalesce(p_full_name, ''))) < 2 then raise exception 'Enter the full name'; end if;
  if v_user !~ '^[a-z0-9._-]{2,20}$' then
    raise exception 'Username must have 2 to 20 letters, numbers, dots or dashes';
  end if;
  if p_pin !~ '^[0-9]{4}$' then raise exception 'The PIN must have exactly 4 digits'; end if;
  if exists (select 1 from public.staff where hotel_id = v_hotel and username = v_user) then
    raise exception 'That username is already used';
  end if;

  insert into public.staff (hotel_id, full_name, username, role, pin_hash, pin_display)
    values (v_hotel, trim(p_full_name), v_user, coalesce(p_role, 'housekeeper'), crypt(p_pin, gen_salt('bf')), p_pin)
    returning id into v_id;
  return v_id;
end $$;

create or replace function public.manager_set_staff_pin(p_staff_id uuid, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hotel uuid := public.current_hotel();
begin
  if v_hotel is null then raise exception 'Only managers can change PINs'; end if;
  if p_pin !~ '^[0-9]{4}$' then raise exception 'The PIN must have exactly 4 digits'; end if;
  update public.staff set pin_hash = crypt(p_pin, gen_salt('bf')), pin_display = p_pin
    where id = p_staff_id and hotel_id = v_hotel;
  if not found then raise exception 'Staff member not found'; end if;
  delete from public.staff_sessions where staff_id = p_staff_id;
  delete from public.login_attempts
    where key = (select upper(h.code) || ':' || s.username from public.staff s join public.hotels h on h.id = s.hotel_id where s.id = p_staff_id);
end $$;

create or replace function public.staff_rooms(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_staff public.staff := public.staff_from_token(p_token);
  v_rooms json;
begin
  select coalesce(json_agg(json_build_object(
           'id', r.id, 'kind', r.kind, 'number', r.number, 'floor', r.floor, 'type', r.type,
           'status', r.status, 'note', r.note,
           'cleanSeconds', r.clean_seconds, 'cleanRunningSince', r.clean_running_since) order by r.number), '[]'::json)
    into v_rooms
    from public.rooms r
   where r.assigned_to = v_staff.id and r.hotel_id = v_staff.hotel_id;
  return v_rooms;
end $$;

create or replace function public.staff_set_room_status(p_token uuid, p_room_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_staff public.staff := public.staff_from_token(p_token);
  v_room  public.rooms;
  v_name  text;
  v_cap   text;
  v_text  text;
begin
  select * into v_room from public.rooms
   where id = p_room_id and hotel_id = v_staff.hotel_id and assigned_to = v_staff.id;
  if not found then raise exception 'Room not found'; end if;

  if not ((v_room.status = 'Dirty'    and p_status = 'Cleaning')
       or (v_room.status = 'Cleaning' and p_status in ('Awaiting inspection', 'Dirty'))) then
    raise exception 'That change is not allowed';
  end if;

  update public.rooms set status = p_status where id = v_room.id returning * into v_room;

  v_name := case when v_room.kind = 'area' then v_room.number else 'room ' || v_room.number end;
  v_cap  := upper(left(v_name, 1)) || substr(v_name, 2);
  v_text := case p_status
    when 'Cleaning'            then 'Cleaning started in ' || v_name
    when 'Awaiting inspection' then v_cap || ' cleaned in '
                                    || case when v_room.clean_seconds < 60 then 'under 1 min' else round(v_room.clean_seconds / 60.0)::int || ' min' end
                                    || ', waiting for inspection'
    else v_cap || ' put back on the cleaning list'
  end;
  insert into public.activity (hotel_id, text, actor) values (v_staff.hotel_id, v_text, v_staff.full_name);
end $$;

create or replace function public.staff_clean_timer(p_token uuid, p_room_id uuid, p_action text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_staff public.staff := public.staff_from_token(p_token);
  v_room  public.rooms;
begin
  select * into v_room from public.rooms
   where id = p_room_id and hotel_id = v_staff.hotel_id and assigned_to = v_staff.id;
  if not found then raise exception 'Room not found'; end if;
  if v_room.status <> 'Cleaning' then raise exception 'That change is not allowed'; end if;

  if p_action = 'pause' then
    if v_room.clean_running_since is not null then
      update public.rooms
         set clean_seconds = clean_seconds + floor(extract(epoch from now() - clean_running_since))::int,
             clean_running_since = null
       where id = v_room.id;
    end if;
  elsif p_action = 'resume' then
    if v_room.clean_running_since is null then
      update public.rooms set clean_running_since = now() where id = v_room.id;
    end if;
  else
    raise exception 'Unknown action';
  end if;
end $$;

create or replace function public.staff_report_issue(p_token uuid, p_room_id uuid, p_title text, p_priority text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_staff public.staff := public.staff_from_token(p_token);
  v_room  public.rooms;
begin
  if length(trim(coalesce(p_title, ''))) < 3 then raise exception 'Describe the problem'; end if;
  if p_priority not in ('urgent', 'high', 'normal', 'low') then raise exception 'Invalid priority'; end if;
  if p_room_id is not null then
    select * into v_room from public.rooms where id = p_room_id and hotel_id = v_staff.hotel_id;
    if not found then raise exception 'Room not found'; end if;
  end if;

  insert into public.issues (hotel_id, room_id, title, priority, reported_by)
    values (v_staff.hotel_id, p_room_id, trim(p_title), p_priority, v_staff.full_name);
  insert into public.activity (hotel_id, text, actor)
    values (v_staff.hotel_id,
            'Issue reported' || case when v_room.id is not null then ' in ' || case when v_room.kind = 'area' then v_room.number else 'room ' || v_room.number end else '' end || ': ' || trim(p_title),
            v_staff.full_name);
end $$;

