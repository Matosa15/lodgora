-- =====================================================================
-- Lodgora: esquema da base de dados
-- Corre UMA vez no Supabase: SQL Editor -> New query -> colar tudo -> Run.
--
-- Como funciona a segurança:
--  * Os gerentes entram com email e palavra-passe (Supabase Auth).
--    Cada gerente só vê e altera dados do seu hotel (Row Level Security).
--  * A equipa (camareiras) entra com código do hotel + utilizador + PIN.
--    Os PINs ficam guardados com hash (bcrypt) e a equipa só fala com a
--    base de dados através das funções staff_* abaixo, nunca diretamente.
--  * Depois de 5 PINs errados seguidos, o acesso bloqueia 15 minutos.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- Tabelas ----------

create table public.hotels (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null unique,
  created_at  timestamptz not null default now()
);

create table public.managers (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  hotel_id    uuid not null references public.hotels (id) on delete cascade,
  full_name   text not null,
  created_at  timestamptz not null default now()
);

create table public.staff (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references public.hotels (id) on delete cascade,
  full_name   text not null,
  username    text not null,
  role        text not null default 'housekeeper' check (role in ('housekeeper', 'maintenance')),
  pin_hash    text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (hotel_id, username)
);

create table public.rooms (
  id           uuid primary key default gen_random_uuid(),
  hotel_id     uuid not null references public.hotels (id) on delete cascade,
  number       text not null,
  floor        int  not null default 1,
  type         text not null default 'Standard',
  status       text not null default 'Ready'
               check (status in ('Ready', 'Dirty', 'Cleaning', 'Awaiting inspection', 'Occupied', 'Out of service')),
  assigned_to  uuid references public.staff (id) on delete set null,
  note         text not null default '',
  updated_at   timestamptz not null default now(),
  unique (hotel_id, number)
);

create table public.issues (
  id           uuid primary key default gen_random_uuid(),
  hotel_id     uuid not null references public.hotels (id) on delete cascade,
  room_id      uuid references public.rooms (id) on delete set null,
  title        text not null,
  priority     text not null default 'normal' check (priority in ('urgent', 'high', 'normal', 'low')),
  status       text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  reported_by  text not null default '',
  created_at   timestamptz not null default now()
);

create table public.activity (
  id           uuid primary key default gen_random_uuid(),
  hotel_id     uuid not null references public.hotels (id) on delete cascade,
  text         text not null,
  actor        text not null default '',
  created_at   timestamptz not null default now()
);

-- Só acessíveis pelas funções abaixo
create table public.staff_sessions (
  token       uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references public.staff (id) on delete cascade,
  expires_at  timestamptz not null default now() + interval '30 days'
);

create table public.login_attempts (
  key           text primary key,
  failures      int not null default 0,
  locked_until  timestamptz
);

create index rooms_hotel_idx    on public.rooms (hotel_id);
create index issues_hotel_idx   on public.issues (hotel_id, created_at desc);
create index activity_hotel_idx on public.activity (hotel_id, created_at desc);
create index staff_hotel_idx    on public.staff (hotel_id);

-- ---------- Funções auxiliares ----------

create function public.current_hotel() returns uuid
language sql stable security definer set search_path = public as $$
  select hotel_id from public.managers where user_id = auth.uid()
$$;

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger rooms_touch before update on public.rooms
  for each row execute function public.touch_updated_at();

-- ---------- Segurança por linha (cada hotel só vê o seu) ----------

alter table public.hotels         enable row level security;
alter table public.managers       enable row level security;
alter table public.staff          enable row level security;
alter table public.rooms          enable row level security;
alter table public.issues         enable row level security;
alter table public.activity       enable row level security;
alter table public.staff_sessions enable row level security;
alter table public.login_attempts enable row level security;

create policy hotels_select   on public.hotels   for select to authenticated using (id = public.current_hotel());
create policy managers_select on public.managers for select to authenticated using (user_id = auth.uid());
create policy staff_select    on public.staff    for select to authenticated using (hotel_id = public.current_hotel());

create policy rooms_all on public.rooms for all to authenticated
  using (hotel_id = public.current_hotel()) with check (hotel_id = public.current_hotel());
create policy issues_all on public.issues for all to authenticated
  using (hotel_id = public.current_hotel()) with check (hotel_id = public.current_hotel());
create policy activity_select on public.activity for select to authenticated using (hotel_id = public.current_hotel());
create policy activity_insert on public.activity for insert to authenticated with check (hotel_id = public.current_hotel());

-- A tabela da equipa nunca expõe a coluna pin_hash, nem ao gerente
revoke all on public.staff          from anon, authenticated;
revoke all on public.staff_sessions from anon, authenticated;
revoke all on public.login_attempts from anon, authenticated;
grant select (id, hotel_id, full_name, username, role, active, created_at) on public.staff to authenticated;

revoke all on public.hotels, public.managers, public.rooms, public.issues, public.activity from anon;

-- ---------- Funções do gerente ----------

create function public.create_hotel(p_hotel_name text, p_full_name text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hotel public.hotels;
  v_code  text;
begin
  if auth.uid() is null then raise exception 'You must be signed in'; end if;
  if exists (select 1 from public.managers where user_id = auth.uid()) then
    raise exception 'This account already has a hotel';
  end if;
  if length(trim(coalesce(p_hotel_name, ''))) < 2 then raise exception 'Enter the hotel name'; end if;

  loop
    v_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.hotels where code = v_code);
  end loop;

  insert into public.hotels (name, code) values (trim(p_hotel_name), v_code) returning * into v_hotel;
  insert into public.managers (user_id, hotel_id, full_name)
    values (auth.uid(), v_hotel.id, coalesce(nullif(trim(p_full_name), ''), 'Manager'));

  return json_build_object('id', v_hotel.id, 'name', v_hotel.name, 'code', v_hotel.code);
end $$;

create function public.manager_create_staff(p_full_name text, p_username text, p_pin text, p_role text default 'housekeeper')
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

  insert into public.staff (hotel_id, full_name, username, role, pin_hash)
    values (v_hotel, trim(p_full_name), v_user, coalesce(p_role, 'housekeeper'), crypt(p_pin, gen_salt('bf')))
    returning id into v_id;
  return v_id;
end $$;

create function public.manager_set_staff_pin(p_staff_id uuid, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hotel uuid := public.current_hotel();
begin
  if v_hotel is null then raise exception 'Only managers can change PINs'; end if;
  if p_pin !~ '^[0-9]{4}$' then raise exception 'The PIN must have exactly 4 digits'; end if;
  update public.staff set pin_hash = crypt(p_pin, gen_salt('bf'))
    where id = p_staff_id and hotel_id = v_hotel;
  if not found then raise exception 'Staff member not found'; end if;
  delete from public.staff_sessions where staff_id = p_staff_id;
  delete from public.login_attempts
    where key = (select upper(h.code) || ':' || s.username from public.staff s join public.hotels h on h.id = s.hotel_id where s.id = p_staff_id);
end $$;

create function public.manager_set_staff_active(p_staff_id uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_hotel uuid := public.current_hotel();
begin
  if v_hotel is null then raise exception 'Only managers can change staff'; end if;
  update public.staff set active = p_active where id = p_staff_id and hotel_id = v_hotel;
  if not found then raise exception 'Staff member not found'; end if;
  if not p_active then
    delete from public.staff_sessions where staff_id = p_staff_id;
    update public.rooms set assigned_to = null where assigned_to = p_staff_id;
  end if;
end $$;

revoke execute on function public.create_hotel(text, text)                      from public, anon;
revoke execute on function public.manager_create_staff(text, text, text, text)  from public, anon;
revoke execute on function public.manager_set_staff_pin(uuid, text)             from public, anon;
revoke execute on function public.manager_set_staff_active(uuid, boolean)       from public, anon;
grant  execute on function public.create_hotel(text, text)                      to authenticated;
grant  execute on function public.manager_create_staff(text, text, text, text)  to authenticated;
grant  execute on function public.manager_set_staff_pin(uuid, text)             to authenticated;
grant  execute on function public.manager_set_staff_active(uuid, boolean)       to authenticated;

-- ---------- Funções da equipa (entram sem conta, só com PIN) ----------

-- Interna: descobre quem é a pessoa a partir do token. Ninguém de fora a pode chamar.
create function public.staff_from_token(p_token uuid) returns public.staff
language plpgsql security definer set search_path = public as $$
declare
  v_staff public.staff;
begin
  select s.* into v_staff
    from public.staff s join public.staff_sessions t on t.staff_id = s.id
   where t.token = p_token and t.expires_at > now() and s.active;
  if not found then raise exception 'Session expired. Please sign in again.'; end if;
  return v_staff;
end $$;
revoke all on function public.staff_from_token(uuid) from public, anon, authenticated;

-- Devolve {error: "..."} em vez de lançar erro, para que as tentativas falhadas fiquem guardadas.
create function public.staff_login(p_hotel_code text, p_username text, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_key    text := upper(trim(coalesce(p_hotel_code, ''))) || ':' || lower(trim(coalesce(p_username, '')));
  v_att    public.login_attempts;
  v_staff  public.staff;
  v_hotel  public.hotels;
  v_token  uuid;
  v_fail   int;
begin
  select * into v_att from public.login_attempts where key = v_key;
  if v_att.locked_until is not null and v_att.locked_until > now() then
    return json_build_object('error', 'Too many attempts. Try again in 15 minutes.');
  end if;

  select s.* into v_staff
    from public.staff s join public.hotels h on h.id = s.hotel_id
   where h.code = upper(trim(coalesce(p_hotel_code, '')))
     and s.username = lower(trim(coalesce(p_username, '')))
     and s.active;

  if not found or v_staff.pin_hash <> crypt(coalesce(p_pin, ''), v_staff.pin_hash) then
    v_fail := case when v_att.locked_until is not null and v_att.locked_until <= now() then 0
                   else coalesce(v_att.failures, 0) end + 1;
    insert into public.login_attempts (key, failures, locked_until)
      values (v_key, v_fail, case when v_fail >= 5 then now() + interval '15 minutes' end)
      on conflict (key) do update set failures = excluded.failures, locked_until = excluded.locked_until;
    return json_build_object('error', 'Wrong hotel code, username or PIN');
  end if;

  delete from public.login_attempts where key = v_key;
  delete from public.staff_sessions where expires_at < now();
  insert into public.staff_sessions (staff_id) values (v_staff.id) returning token into v_token;
  select * into v_hotel from public.hotels where id = v_staff.hotel_id;

  return json_build_object('token', v_token, 'staff_id', v_staff.id,
                           'full_name', v_staff.full_name, 'hotel_name', v_hotel.name);
end $$;

create function public.staff_me(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_staff public.staff := public.staff_from_token(p_token);
  v_hotel public.hotels;
begin
  select * into v_hotel from public.hotels where id = v_staff.hotel_id;
  return json_build_object('staff_id', v_staff.id, 'full_name', v_staff.full_name, 'hotel_name', v_hotel.name);
end $$;

create function public.staff_rooms(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_staff public.staff := public.staff_from_token(p_token);
  v_rooms json;
begin
  select coalesce(json_agg(json_build_object(
           'id', r.id, 'number', r.number, 'floor', r.floor, 'type', r.type,
           'status', r.status, 'note', r.note) order by r.number), '[]'::json)
    into v_rooms
    from public.rooms r
   where r.assigned_to = v_staff.id and r.hotel_id = v_staff.hotel_id;
  return v_rooms;
end $$;

create function public.staff_set_room_status(p_token uuid, p_room_id uuid, p_status text) returns void
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

  update public.rooms set status = p_status where id = v_room.id;

  v_text := case p_status
    when 'Cleaning'            then 'Cleaning started in room ' || v_room.number
    when 'Awaiting inspection' then 'Room ' || v_room.number || ' cleaned, waiting for inspection'
    else 'Room ' || v_room.number || ' put back on the cleaning list'
  end;
  insert into public.activity (hotel_id, text, actor) values (v_staff.hotel_id, v_text, v_staff.full_name);
end $$;

create function public.staff_report_issue(p_token uuid, p_room_id uuid, p_title text, p_priority text) returns void
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
            'Issue reported' || case when v_room.id is not null then ' in room ' || v_room.number else '' end || ': ' || trim(p_title),
            v_staff.full_name);
end $$;

-- ---------- Atualizações em tempo real para o painel do gerente ----------
do $$
begin
  alter publication supabase_realtime add table public.rooms, public.issues, public.activity;
exception when others then
  null; -- já estava ativo
end $$;
