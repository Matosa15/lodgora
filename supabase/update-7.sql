-- Update 7: notas nas avarias. A manutenção escreve ao gerente (e pode dizer que não consegue resolver); o gerente responde.
-- É seguro correr mais do que uma vez. Corre DEPOIS do update-6.
-- (Instalação nova: o schema.sql já inclui tudo isto.)

alter table public.issues add column if not exists needs_help boolean not null default false;

-- Notas numa avaria: a manutenção escreve ao gerente (e o gerente responde)
create table if not exists public.issue_notes (
  id         uuid primary key default gen_random_uuid(),
  hotel_id   uuid not null references public.hotels (id) on delete cascade,
  issue_id   uuid not null references public.issues (id) on delete cascade,
  author     text not null default '',
  by_staff   boolean not null default false,
  body       text not null check (length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists issue_notes_issue on public.issue_notes (issue_id, created_at);
alter table public.issue_notes enable row level security;
drop policy if exists issue_notes_all on public.issue_notes;
create policy issue_notes_all on public.issue_notes for all to authenticated
  using (hotel_id = public.current_hotel())
  with check (
    hotel_id = public.current_hotel()
    and exists (select 1 from public.issues i where i.id = issue_notes.issue_id and i.hotel_id = issue_notes.hotel_id)
  );
revoke all on public.issue_notes from anon;

create or replace function public.issues_resolved() returns trigger
language plpgsql as $$
begin
  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    new.resolved_at := now();
    new.needs_help := false;
  elsif new.status <> 'resolved' then
    new.resolved_at := null;
  end if;
  return new;
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
           'roomId', i.room_id, 'needsHelp', i.needs_help,
           'roomLabel', case when r.id is null then '' when r.kind = 'area' then r.number else 'Room ' || r.number end,
           'notes', (select coalesce(json_agg(json_build_object('id', n.id, 'author', n.author, 'byStaff', n.by_staff, 'body', n.body, 'createdAt', n.created_at)
                                             order by n.created_at), '[]'::json)
                       from (select * from public.issue_notes x where x.issue_id = i.id order by x.created_at desc limit 20) n))
         order by (i.status = 'resolved'),
                  case i.priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,
                  i.created_at), '[]'::json)
    into v_out
    from public.issues i left join public.rooms r on r.id = i.room_id
   where i.assigned_to = v_staff.id and i.hotel_id = v_staff.hotel_id
     and (i.status <> 'resolved' or i.resolved_at > now() - interval '3 days');
  return v_out;
end $$;

create or replace function public.staff_add_issue_note(p_token uuid, p_issue_id uuid, p_text text, p_cannot_fix boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_staff public.staff := public.staff_from_token(p_token);
  v_issue public.issues;
  v_room  public.rooms;
  v_text  text := trim(coalesce(p_text, ''));
begin
  if length(v_text) < 1 then raise exception 'Write a short note'; end if;
  if length(v_text) > 500 then raise exception 'Use 500 characters or fewer'; end if;
  select * into v_issue from public.issues where id = p_issue_id and assigned_to = v_staff.id and hotel_id = v_staff.hotel_id;
  if not found then raise exception 'Issue not found'; end if;
  insert into public.issue_notes (hotel_id, issue_id, author, by_staff, body)
    values (v_staff.hotel_id, v_issue.id, v_staff.full_name, true, v_text);
  if p_cannot_fix and v_issue.status <> 'resolved' then
    update public.issues set needs_help = true where id = v_issue.id;
  end if;
  select * into v_room from public.rooms where id = v_issue.room_id;
  insert into public.activity (hotel_id, text, actor)
    values (v_staff.hotel_id,
            case when p_cannot_fix then 'Needs help' else 'Note added' end
              || case when v_room.id is not null then ' in ' || case when v_room.kind = 'area' then v_room.number else 'room ' || v_room.number end else '' end
              || ': ' || v_issue.title,
            v_staff.full_name);
end $$;

do $$
begin
  alter publication supabase_realtime add table public.issue_notes;
exception when others then
  null; -- já estava ativo
end $$;
