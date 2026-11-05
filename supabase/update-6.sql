-- Update 6: equipa de manutenção. Cada avaria pode ser atribuída a uma pessoa da manutenção, que entra com o seu PIN e vê só as suas avarias.
-- É seguro correr mais do que uma vez. Corre DEPOIS do update-5.
-- (Instalação nova: o schema.sql já inclui tudo isto.)

alter table public.issues add column if not exists assigned_to uuid references public.staff (id) on delete set null;

drop policy if exists issues_all on public.issues;
create policy issues_all on public.issues for all to authenticated
  using (hotel_id = public.current_hotel())
  with check (
    hotel_id = public.current_hotel()
    and (issues.assigned_to is null or exists (
      select 1 from public.staff s where s.id = issues.assigned_to and s.hotel_id = issues.hotel_id and s.role = 'maintenance'))
  );

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

create or replace function public.staff_room_list(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_staff public.staff := public.staff_from_token(p_token);
begin
  return (select coalesce(json_agg(json_build_object('id', r.id, 'kind', r.kind, 'number', r.number) order by r.number), '[]'::json)
            from public.rooms r where r.hotel_id = v_staff.hotel_id);
end $$;
