select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname in ('public','storage');
select c.relname,c.relrowsecurity,c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r';
select tablename,indexdef from pg_indexes where schemaname='public';
select conrelid::regclass,conname,pg_get_constraintdef(oid) from pg_constraint where connamespace='public'::regnamespace;
select event_object_table,trigger_name,action_statement from information_schema.triggers where trigger_schema='public';
select id,public,file_size_limit,allowed_mime_types from storage.buckets;
select grantee,table_name,privilege_type from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated') order by table_name,grantee;
-- Aggregate role inventories only; no email, customer, or token data.
select role,count(*) from public.users group by role;
select raw_app_meta_data->>'role' as app_role,raw_user_meta_data->>'role' as display_role,count(*) from auth.users
group by raw_app_meta_data->>'role',raw_user_meta_data->>'role';
