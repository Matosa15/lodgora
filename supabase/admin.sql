-- Comandos só para ti. Cola UM de cada vez no SQL Editor do Supabase e carrega em Run.
-- Ninguém mais os consegue correr: o site não tem acesso a isto.

-- 1. Criar um convite para um hotel novo. Troca o nome. Devolve um código tipo "A1B2C-D3E4F".
select public.new_invite('Hotel Aurora');

-- 2. Ver os convites (quais já foram usados)
select code, note, created_at, used_at from public.invites order by created_at desc;

-- 3. Ver os hotéis (e se estão ativos)
select name, code, active, created_at from public.hotels order by created_at desc;

-- 4. PAUSAR um hotel que não pagou (troca ABC123 pelo código do hotel, da lista acima).
--    O gerente e as camareiras deixam de conseguir entrar. Os dados ficam guardados.
update public.hotels set active = false where code = 'ABC123';

-- 5. REATIVAR o hotel
update public.hotels set active = true where code = 'ABC123';
