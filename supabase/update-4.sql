-- Update 4: só entra quem tiver um código de convite, e podes pausar um hotel que não paga.
-- É seguro correr mais do que uma vez. Corre DEPOIS do update-3.
-- (Instalação nova: o schema.sql já inclui tudo isto.)

-- 1. Hotéis podem ser pausados
alter table public.hotels add column if not exists active boolean not null default true;

create or replace function public.current_hotel() returns uuid
language sql stable security definer set search_path = public as $$
  select m.hotel_id
    from public.managers m join public.hotels h on h.id = m.hotel_id
   where m.user_id = auth.uid() and h.active
$$;

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
                           'full_name', v_staff.full_name, 'hotel_name', v_hotel.name);
end $$;

-- 2. Códigos de convite: sem código não se cria hotel
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

drop function if exists public.create_hotel(text, text);
create or replace function public.create_hotel(p_hotel_name text, p_full_name text, p_invite_code text) returns json
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
revoke execute on function public.create_hotel(text, text, text) from public, anon;
grant  execute on function public.create_hotel(text, text, text) to authenticated;
