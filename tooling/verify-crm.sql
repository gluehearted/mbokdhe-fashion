-- Read-only operational checks. Does not select customer records or credentials.
select count(*) as configured_staff_accounts from crm_private.staff;
select id,public,file_size_limit from storage.buckets where id='product-batches';
select proname,prosecdef as security_definer from pg_proc where pronamespace='public'::regnamespace and proname like 'crm_%' order by proname;
select count(*) as anonymous_rpc_grants from information_schema.routine_privileges
where routine_schema='public' and routine_name like 'crm_%' and grantee in ('PUBLIC','anon');
select c.relname,c.relrowsecurity from pg_class c where c.relnamespace='public'::regnamespace and c.relname like 'crm_%' and c.relkind='r';
select tablename,policyname,qual,with_check from pg_policies where schemaname='public' and tablename in ('users','customers','shops','products','orders');
select count(*) as crm_indexes from pg_indexes where schemaname='public' and indexname in (
  'products_order_id_idx','products_shop_id_idx','orders_customer_id_idx','orders_created_at_idx','products_photo_url_idx','crm_upload_cleanup_idx'
);
