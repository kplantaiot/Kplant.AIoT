-- ============================================================
-- Migración 004: Bloquear reasignación de owner en devices
-- Una vez que owner_id se asigna, no puede cambiar a otra cuenta.
-- Protege contra bypass directo de la API.
-- ============================================================

-- Trigger que previene cambiar owner_id una vez asignado
create or replace function lock_device_owner()
returns trigger language plpgsql as $$
begin
  -- Si el owner_id ya estaba asignado y se intenta cambiar a otro valor distinto → error
  if OLD.owner_id is not null and NEW.owner_id != OLD.owner_id then
    raise exception 'El dispositivo % ya pertenece a otra cuenta y no puede reasignarse.', OLD.device_id
      using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;

create trigger trg_lock_device_owner
  before update on public.devices
  for each row execute function lock_device_owner();
