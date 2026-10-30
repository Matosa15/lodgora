-- Lodgora: atualização 2 (PIN visível ao gerente + relógio de limpeza).
-- Corre UMA vez no SQL Editor do Supabase. Não apaga dados.

alter table public.staff add column if not exists pin_display text;
alter table public.rooms add column if not exists clean_seconds int not null default 0;
alter table public.rooms add column if not exists clean_running_since timestamptz;

grant select (pin_display) on public.staff to authenticated;

create or replace function public.rooms_timer() returns trigger
language plpgsql as $$
begin
  if new.status = 'Cleaning' and old.status is distinct from 'Cleaning' then
    new.clean_seconds := 0;
    new.clean_running_since := now();
  elsif old.status = 'Cleaning' and new.status <> 'Cleaning' then
    if old.clean_running_since is not null then
      new.clean_seconds := old.clean_seconds + floor(extract(epoch from now() - old.clean_running_since))::int;
    end if;
    new.clean_running_since := null;
  end if;
  if new.status = 'Dirty' and old.status is distinct from 'Dirty' then
    new.clean_seconds := 0;
    new.clean_running_since := null;
  end if;
  return new;
end $$;

drop trigger if exists rooms_timer on public.rooms;
create trigger rooms_timer before update of status on public.rooms
  for each row execute function public.rooms_timer();

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
           'id', r.id, 'number', r.number, 'floor', r.floor, 'type', r.type,
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

  v_text := case p_status
    when 'Cleaning'            then 'Cleaning started in room ' || v_room.number
    when 'Awaiting inspection' then 'Room ' || v_room.number || ' cleaned in '
                                    || case when v_room.clean_seconds < 60 then 'under 1 min' else round(v_room.clean_seconds / 60.0)::int || ' min' end
                                    || ', waiting for inspection'
    else 'Room ' || v_room.number || ' put back on the cleaning list'
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

