-- English Personal Trainer — permisos base
--
-- Row Level Security decide QUÉ FILAS puede ver/tocar cada usuario, pero
-- antes de eso Postgres exige un permiso general sobre la tabla (GRANT).
-- Sin este GRANT, cualquier consulta falla con "permission denied for
-- table ..." aunque las policies de RLS estén bien escritas.
--
-- Este script es idempotente: los GRANT se pueden repetir sin error.

grant usage on schema public to authenticated, anon, service_role;

grant select, insert, update, delete
  on all tables in schema public
  to authenticated;

grant select, insert, update, delete
  on all tables in schema public
  to service_role;

-- Para que las tablas que creemos en migraciones FUTURAS también reciban
-- estos permisos automáticamente, sin tener que repetir este archivo.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
