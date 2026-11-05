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
  active      boolean not null default true,   -- false = hotel pausado (por falta de pagamento, por exemplo)
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
  pin_display text,            -- cópia legível do PIN, só o gerente do hotel a vê
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
  clean_seconds       int not null default 0,   -- tempo de limpeza acumulado
  clean_running_since timestamptz,              -- preenchido enquanto o relógio corre
  clean_started_at    timestamptz,              -- quando a limpeza começou
  kind         text not null default 'room' check (kind in ('room', 'area')),  -- quarto ou parte comum
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
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  assigned_to  uuid references public.staff (id) on delete set null   -- quem da manutenção trata disto
);

create table public.activity (
  id           uuid primary key default gen_random_uuid(),
  hotel_id     uuid not null references public.hotels (id) on delete cascade,
  text         text not null,
  actor        text not null default '',
  created_at   timestamptz not null default now()
);

-- Só acessíveis pelas funções abaixo
create table public.cleaning_log (
  id           uuid primary key default gen_random_uuid(),
  hotel_id     uuid not null references public.hotels (id) on delete cascade,
  room_id      uuid references public.rooms (id) on delete set null,
  label        text not null,                      -- número do quarto ou nome da parte comum
  kind         text not null default 'room',
  type         text not null default '',
  staff_id     uuid references public.staff (id) on delete set null,
  staff_name   text,
  started_at   timestamptz,
  finished_at  timestamptz not null default now(),
  seconds      int not null default 0,             -- tempo efetivo de limpeza (sem pausas)
  approved_at  timestamptz,
  sent_back    boolean not null default false
);
create index cleaning_log_hotel_finished on public.cleaning_log (hotel_id, finished_at desc);

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

create or replace function public.current_hotel() returns uuid
language sql stable security definer set search_path = public as $$
  select m.hotel_id
    from public.managers m join public.hotels h on h.id = m.hotel_id
   where m.user_id = auth.uid() and h.active
$$;

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger rooms_touch before update on public.rooms
  for each row execute function public.touch_updated_at();

-- O relógio de limpeza obedece sempre às mesmas regras, venha a mudança do gerente ou da camareira
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

-- ---------- Segurança por linha (cada hotel só vê o seu) ----------

alter table public.hotels         enable row level security;
alter table public.managers       enable row level security;
alter table public.staff          enable row level security;
alter table public.rooms          enable row level security;
alter table public.issues         enable row level security;
alter table public.activity       enable row level security;
alter table public.staff_sessions enable row level security;
alter table public.cleaning_log   enable row level security;
alter table public.login_attempts enable row level security;

create policy hotels_select   on public.hotels   for select to authenticated using (id = public.current_hotel());
create policy managers_select on public.managers for select to authenticated using (user_id = auth.uid());
create policy staff_select    on public.staff    for select to authenticated using (hotel_id = public.current_hotel());

create policy rooms_all on public.rooms for all to authenticated
  using (hotel_id = public.current_hotel()) with check (hotel_id = public.current_hotel());
create policy issues_all on public.issues for all to authenticated
  using (hotel_id = public.current_hotel())
  with check (
    hotel_id = public.current_hotel()
    and (issues.assigned_to is null or exists (
      select 1 from public.staff s where s.id = issues.assigned_to and s.hotel_id = issues.hotel_id and s.role = 'maintenance'))
  );
create policy cleaning_log_select on public.cleaning_log for select to authenticated using (hotel_id = public.current_hotel());
create policy activity_select on public.activity for select to authenticated using (hotel_id = public.current_hotel());
create policy activity_insert on public.activity for insert to authenticated with check (hotel_id = public.current_hotel());

-- A tabela da equipa nunca expõe a coluna pin_hash, nem ao gerente
revoke all on public.staff          from anon, authenticated;
revoke all on public.staff_sessions from anon, authenticated;
-- O histórico só se lê; quem o escreve é o próprio sistema (trigger), nunca o navegador
revoke all on public.cleaning_log from anon, authenticated;
grant select on public.cleaning_log to authenticated;
revoke all on public.login_attempts from anon, authenticated;
grant select (id, hotel_id, full_name, username, role, active, created_at, pin_display) on public.staff to authenticated;

revoke all on public.hotels, public.managers, public.rooms, public.issues, public.activity from anon;

-- ---------- Códigos de convite ----------
--: sem código não se cria hotel
create table if not exists public.invites (
  code        text primary key,
  note        text not null default '',
  created_at  timestamptz not null default now(),
  used_at     timestamptz,
  used_by     uuid
);
alter table public.invites enable row level security;
revoke all on public.invites from anon, authenticated;

-- Cria um código novo (só tu, no SQL Editor). Exemplo: select public.new_invite('Hotel Aurora');
create or replace function public.new_invite(p_note text default '') returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (select 1 from public.invites where code = v_code);
  end loop;
  insert into public.invites (code, note) values (v_code, coalesce(p_note, ''));
  return substr(v_code, 1, 5) || '-' || substr(v_code, 6, 5);
end $$;
revoke execute on function public.new_invite(text) from public, anon, authenticated;

-- A página pergunta se o código existe e está por usar, antes de criar a conta
create or replace function public.check_invite(p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.invites
                  where code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')) and used_at is null)
$$;
revoke execute on function public.check_invite(text) from public;
grant  execute on function public.check_invite(text) to anon, authenticated;


-- ---------- Funções do gerente ----------

create function public.create_hotel(p_hotel_name text, p_full_name text, p_invite_code text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hotel public.hotels;
  v_code  text;
  v_inv   text := upper(regexp_replace(coalesce(p_invite_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if auth.uid() is null then raise exception 'You must be signed in'; end if;
  if exists (select 1 from public.managers where user_id = auth.uid()) then
    raise exception 'This account already has a hotel';
  end if;
  if length(trim(coalesce(p_hotel_name, ''))) < 2 then raise exception 'Enter the hotel name'; end if;
  perform 1 from public.invites where code = v_inv and used_at is null for update;
  if not found then raise exception 'That invitation code is not valid or was already used'; end if;

  loop
    v_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.hotels where code = v_code);
  end loop;

  insert into public.hotels (name, code) values (trim(p_hotel_name), v_code) returning * into v_hotel;
  insert into public.managers (user_id, hotel_id, full_name)
    values (auth.uid(), v_hotel.id, coalesce(nullif(trim(p_full_name), ''), 'Manager'));
  update public.invites set used_at = now(), used_by = auth.uid() where code = v_inv;

  return json_build_object('id', v_hotel.id, 'name', v_hotel.name, 'code', v_hotel.code);
end $$;

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
  if coalesce(p_role, 'housekeeper') not in ('housekeeper', 'maintenance') then raise exception 'Invalid role'; end if;
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

create or replace function public.manager_set_staff_active(p_staff_id uuid, p_active boolean) returns void
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
    update public.issues set assigned_to = null where assigned_to = p_staff_id and status <> 'resolved';
  end if;
end $$;

revoke execute on function public.create_hotel(text, text, text)                from public, anon;
revoke execute on function public.manager_create_staff(text, text, text, text)  from public, anon;
revoke execute on function public.manager_set_staff_pin(uuid, text)             from public, anon;
revoke execute on function public.manager_set_staff_active(uuid, boolean)       from public, anon;
grant  execute on function public.create_hotel(text, text, text)                to authenticated;
grant  execute on function public.manager_create_staff(text, text, text, text)  to authenticated;
grant  execute on function public.manager_set_staff_pin(uuid, text)             to authenticated;
grant  execute on function public.manager_set_staff_active(uuid, boolean)       to authenticated;

-- ---------- Funções da equipa (entram sem conta, só com PIN) ----------

-- Interna: descobre quem é a pessoa a partir do token. Ninguém de fora a pode chamar.
create or replace function public.staff_from_token(p_token uuid) returns public.staff
language plpgsql security definer set search_path = public as $$
declare
  v_staff public.staff;
begin
  select s.* into v_staff
    from public.staff s
    join public.staff_sessions t on t.staff_id = s.id
    join public.hotels h on h.id = s.hotel_id
   where t.token = p_token and t.expires_at > now() and s.active and h.active;
  if not found then raise exception 'Session expired. Please sign in again.'; end if;
  return v_staff;
end $$;
revoke all on function public.staff_from_token(uuid) from public, anon, authenticated;

-- Devolve {error: "..."} em vez de lançar erro, para que as tentativas falhadas fiquem guardadas.
create or replace function public.staff_login(p_hotel_code text, p_username text, p_pin text) returns json
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

  if exists (select 1 from public.hotels h where h.code = upper(trim(coalesce(p_hotel_code, ''))) and not h.active) then
    return json_build_object('error', 'This hotel account is paused. Please ask your manager.');
  end if;

  select s.* into v_staff
    from public.staff s join public.hotels h on h.id = s.hotel_id
   where h.code = upper(trim(coalesce(p_hotel_code, '')))
     and s.username = lower(trim(coalesce(p_username, '')))
     and s.active and h.active;

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
                           'full_name', v_staff.full_name, 'hotel_name', v_hotel.name, 'role', v_staff.role);
end $$;

create or replace function public.staff_me(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_staff public.staff := public.staff_from_token(p_token);
  v_hotel public.hotels;
begin
  select * into v_hotel from public.hotels where id = v_staff.hotel_id;
  return json_build_object('staff_id', v_staff.id, 'full_name', v_staff.full_name, 'hotel_name', v_hotel.name, 'role', v_staff.role);
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

-- Manutenção: as avarias atribuídas à pessoa que entrou (as resolvidas ficam 3 dias à vista)
create or replace function public.staff_issues(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_staff public.staff := public.staff_from_token(p_token);
  v_out json;
begin
  select coalesce(json_agg(json_build_object(
           'id', i.id, 'title', i.title, 'priority', i.priority, 'status', i.status,
           'reportedBy', i.reported_by, 'createdAt', i.created_at, 'resolvedAt', i.resolved_at,
           'roomId', i.room_id,
           'roomLabel', case when r.id is null then '' when r.kind = 'area' then r.number else 'Room ' || r.number end)
         order by (i.status = 'resolved'),
                  case i.priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,
                  i.created_at), '[]'::json)
    into v_out
    from public.issues i left join public.rooms r on r.id = i.room_id
   where i.assigned_to = v_staff.id and i.hotel_id = v_staff.hotel_id
     and (i.status <> 'resolved' or i.resolved_at > now() - interval '3 days');
  return v_out;
end $$;

-- Manutenção: começar, resolver ou reabrir uma avaria que é sua
create or replace function public.staff_set_issue_status(p_token uuid, p_issue_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_staff public.staff := public.staff_from_token(p_token);
  v_issue public.issues;
  v_room  public.rooms;
begin
  if p_status not in ('open', 'in_progress', 'resolved') then raise exception 'That change is not allowed'; end if;
  select * into v_issue from public.issues where id = p_issue_id and assigned_to = v_staff.id and hotel_id = v_staff.hotel_id;
  if not found then raise exception 'Issue not found'; end if;
  update public.issues set status = p_status where id = v_issue.id;
  select * into v_room from public.rooms where id = v_issue.room_id;
  insert into public.activity (hotel_id, text, actor)
    values (v_staff.hotel_id,
            case p_status when 'resolved' then 'Issue resolved' when 'in_progress' then 'Work started' else 'Issue reopened' end
              || case when v_room.id is not null then ' in ' || case when v_room.kind = 'area' then v_room.number else 'room ' || v_room.number end else '' end
              || ': ' || v_issue.title,
            v_staff.full_name);
end $$;

-- Todos os quartos e áreas (para quem reporta uma avaria fora da sua lista)
create or replace function public.staff_room_list(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_staff public.staff := public.staff_from_token(p_token);
begin
  return (select coalesce(json_agg(json_build_object('id', r.id, 'kind', r.kind, 'number', r.number) order by r.number), '[]'::json)
            from public.rooms r where r.hotel_id = v_staff.hotel_id);
end $$;

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

-- ---------- Atualizações em tempo real para o painel do gerente ----------
do $$
begin
  alter publication supabase_realtime add table public.rooms, public.issues, public.activity, public.plan;
exception when others then
  null; -- já estava ativo
end $$;
