-- Atomic product batches, private media, staff access, and order creation.
create schema if not exists crm_private;
revoke all on schema crm_private from public;
grant usage on schema crm_private to authenticated;

create table crm_private.staff (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table crm_private.staff enable row level security;
grant select on crm_private.staff to authenticated;
create policy staff_self on crm_private.staff for select to authenticated using (user_id = (select auth.uid()));
-- Only explicitly configured existing admin/staff accounts are bootstrapped by tooling/database.mjs.
insert into crm_private.staff(user_id)
select id from auth.users where lower(email) in (
  select lower(value) from jsonb_array_elements_text(coalesce(nullif(current_setting('crm.bootstrap_emails', true), ''), '[]')::jsonb)
);

create function public.crm_has_access() returns boolean language sql stable security invoker
set search_path = '' as $$ select exists(select 1 from crm_private.staff where user_id = (select auth.uid())) $$;
revoke all on function public.crm_has_access() from public, anon;
grant execute on function public.crm_has_access() to authenticated;

-- Preserve the existing staff's access while preventing newly registered accounts from reading CRM data.
alter policy "Admin Full Access Users" on public.users using ((select public.crm_has_access())) with check ((select public.crm_has_access()));
alter policy "Admin Full Access Customers" on public.customers using ((select public.crm_has_access())) with check ((select public.crm_has_access()));
alter policy "Admin Full Access Shops" on public.shops using ((select public.crm_has_access())) with check ((select public.crm_has_access()));
alter policy "Admin Full Access Products" on public.products using ((select public.crm_has_access())) with check ((select public.crm_has_access()));
alter policy "Admin Full Access Orders" on public.orders using ((select public.crm_has_access())) with check ((select public.crm_has_access()));

create table public.crm_product_batches (
  actor_id uuid not null default auth.uid() references auth.users(id),
  request_id uuid not null,
  fingerprint text not null,
  payload jsonb not null,
  status text not null check (status in ('pending','failed','committed')),
  attempt_id uuid,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key(actor_id, request_id)
);
create table public.crm_upload_attempts (
  id uuid primary key,
  actor_id uuid not null default auth.uid() references auth.users(id),
  request_id uuid not null,
  paths text[] not null,
  state text not null check (state in ('pending','committed','cleanup','cleaned')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key(actor_id,request_id) references public.crm_product_batches(actor_id,request_id)
);
create table public.crm_order_requests (
  actor_id uuid not null default auth.uid() references auth.users(id),
  request_id uuid not null,
  fingerprint text not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key(actor_id,request_id)
);
create table public.crm_product_counters (prefix text primary key, value bigint not null check(value >= 0));

alter table public.crm_product_batches enable row level security;
alter table public.crm_upload_attempts enable row level security;
alter table public.crm_order_requests enable row level security;
alter table public.crm_product_counters enable row level security;
grant select,insert,update on public.crm_product_batches,public.crm_upload_attempts,public.crm_order_requests,public.crm_product_counters to authenticated;
create policy batch_owner on public.crm_product_batches for all to authenticated
  using (actor_id = (select auth.uid()) and (select public.crm_has_access()))
  with check (actor_id = (select auth.uid()) and (select public.crm_has_access()));
create policy attempt_owner on public.crm_upload_attempts for all to authenticated
  using (actor_id = (select auth.uid()) and (select public.crm_has_access()))
  with check (actor_id = (select auth.uid()) and (select public.crm_has_access()));
create policy order_request_owner on public.crm_order_requests for all to authenticated
  using (actor_id = (select auth.uid()) and (select public.crm_has_access()))
  with check (actor_id = (select auth.uid()) and (select public.crm_has_access()));
create policy counter_staff on public.crm_product_counters for all to authenticated
  using ((select public.crm_has_access())) with check ((select public.crm_has_access()));

-- Private staging remains private after commit. Authenticated image proxy serves committed products only.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('product-batches','product-batches',false,163840,array['image/webp']);
create policy batch_photo_insert on storage.objects for insert to authenticated with check (
  bucket_id='product-batches' and (select public.crm_has_access()) and exists (
    select 1 from public.crm_upload_attempts a where a.actor_id=(select auth.uid())
      and a.state='pending' and a.expires_at>now() and name=any(a.paths)
  )
);
create policy batch_photo_read on storage.objects for select to authenticated using (
  bucket_id='product-batches' and (select public.crm_has_access()) and (
    exists(select 1 from public.products p where p."photoUrl"='/api/product-photos/' || name)
    or exists(select 1 from public.crm_upload_attempts a where a.actor_id=(select auth.uid()) and name=any(a.paths))
  )
);
create policy batch_photo_delete on storage.objects for delete to authenticated using (
  bucket_id='product-batches' and (select public.crm_has_access())
  and not exists(select 1 from public.products p where p."photoUrl"='/api/product-photos/' || name)
  and exists(select 1 from public.crm_upload_attempts a where a.actor_id=(select auth.uid()) and a.state='cleanup' and name=any(a.paths))
);

create function crm_private.money(v jsonb, minimum bigint default 0) returns bigint language plpgsql immutable security invoker
set search_path='' as $$
declare n numeric;
begin
  if jsonb_typeof(v) is distinct from 'number' then raise exception 'Nominal rupiah tidak valid.'; end if;
  n := v::text::numeric;
  if n<>trunc(n) or n<minimum or n>2147483647 then raise exception 'Nominal rupiah di luar batas.'; end if;
  return n::bigint;
end $$;

create function crm_private.validate_batch(p jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare i jsonb; n int;
begin
  if jsonb_typeof(p->'items') is distinct from 'array' then raise exception 'Daftar draft tidak valid.'; end if;
  n := jsonb_array_length(p->'items');
  if n<1 or n>20 or length(coalesce(p->>'shopOrigin','')) not between 1 and 120 then raise exception 'Batch tidak valid.'; end if;
  if p ? 'editProductId' and (jsonb_typeof(p->'editProductId') is distinct from 'string' or length(p->>'editProductId') not between 1 and 200) then raise exception 'ID produk tidak valid.'; end if;
  perform crm_private.money(p->'capitalPrice'); perform crm_private.money(p->'price',1);
  if (select count(distinct x->>'draftId') from jsonb_array_elements(p->'items') x)<>n then raise exception 'Draft duplikat.'; end if;
  for i in select * from jsonb_array_elements(p->'items') loop
    if coalesce(i->>'draftId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or jsonb_typeof(i->'description') is distinct from 'string' or length(i->>'description')>2000
      or jsonb_typeof(i->'hasPhoto') is distinct from 'boolean'
      or ((i->>'hasPhoto')::boolean and coalesce(i->>'fileHash','') !~ '^[0-9a-f]{64}$')
    then raise exception 'Data draft tidak valid.'; end if;
  end loop;
end $$;

create function public.crm_prepare_product_batch(p_key uuid,p_payload jsonb,p_fingerprint text) returns jsonb
language plpgsql security invoker set search_path='' set statement_timeout='10s' as $$
declare b public.crm_product_batches; a uuid; paths text[];
begin
  if not public.crm_has_access() then raise insufficient_privilege; end if;
  perform crm_private.validate_batch(p_payload);
  if p_key is null or coalesce(p_fingerprint,'') !~ '^[0-9a-f]{64}$' then raise exception 'Identitas batch tidak valid.'; end if;
  insert into public.crm_product_batches(actor_id,request_id,fingerprint,payload,status)
    values(auth.uid(),p_key,p_fingerprint,p_payload,'failed') on conflict do nothing;
  select * into b from public.crm_product_batches where actor_id=auth.uid() and request_id=p_key for update;
  if b.fingerprint<>p_fingerprint or b.payload<>p_payload then raise exception 'Identitas penyimpanan sudah dipakai untuk data berbeda.'; end if;
  if b.status='committed' then return jsonb_build_object('status','committed','result',b.result); end if;
  if b.status='pending' and exists(select 1 from public.crm_upload_attempts where id=b.attempt_id and expires_at>now() and state='pending')
    then raise exception 'Batch masih diproses. Coba kembali sebentar lagi.'; end if;
  update public.crm_upload_attempts set state='cleanup' where id=b.attempt_id and state='pending';
  a := gen_random_uuid();
  select coalesce(array_agg(auth.uid()::text || '/' || a::text || '/' || (i->>'draftId') || '.webp'),array[]::text[])
    into paths from jsonb_array_elements(p_payload->'items') i where (i->>'hasPhoto')::boolean;
  insert into public.crm_upload_attempts(id,actor_id,request_id,paths,state,expires_at)
    values(a,auth.uid(),p_key,paths,'pending',now()+interval '5 minutes');
  update public.crm_product_batches set status='pending',attempt_id=a where actor_id=auth.uid() and request_id=p_key;
  return jsonb_build_object('status','pending','attemptId',a,'paths',paths);
end $$;

create function public.crm_commit_product_batch(p_key uuid,p_attempt uuid) returns jsonb language plpgsql security invoker
set search_path='' set statement_timeout='10s' as $$
declare b public.crm_product_batches; s public.shops; v_prefix text; clean text; words text[]; last_no bigint; first_no bigint;
  v_result jsonb; n int; edited public.products;
begin
  if not public.crm_has_access() then raise insufficient_privilege; end if;
  select * into b from public.crm_product_batches where actor_id=auth.uid() and request_id=p_key for update;
  if not found then raise exception 'Batch tidak ditemukan.'; end if;
  if b.status='committed' then return b.result; end if;
  if b.status<>'pending' or b.attempt_id<>p_attempt or not exists(
    select 1 from public.crm_upload_attempts where id=p_attempt and state='pending' and expires_at>now()
  ) then raise exception 'Sesi batch berakhir. Coba simpan kembali.'; end if;
  if exists(select 1 from public.crm_upload_attempts a cross join lateral unnest(a.paths) f(path)
    where a.id=p_attempt and not exists(select 1 from storage.objects o where o.bucket_id='product-batches' and o.name=f.path))
  then raise exception 'Foto belum lengkap. Seluruh batch dibatalkan.'; end if;
  perform crm_private.validate_batch(b.payload);
  insert into public.shops(name) values(b.payload->>'shopOrigin') on conflict(name) do update set name=excluded.name returning * into s;
  if b.payload ? 'editProductId' then
    if jsonb_array_length(b.payload->'items')<>1 then raise exception 'Edit hanya untuk satu tas.'; end if;
    select * into edited from public.products where id=b.payload->>'editProductId' for update;
    if not found then raise exception 'Produk tidak ditemukan.'; end if;
    if edited.status in ('Sold','Terjual') then raise exception 'Produk terjual tidak dapat diubah.'; end if;
    update public.products set "shopId"=s.id,"capitalPrice"=(b.payload->>'capitalPrice')::integer,price=(b.payload->>'price')::integer,
      description=b.payload->'items'->0->>'description',"updatedAt"=now(),
      "photoUrl"=case when (b.payload->'items'->0->>'hasPhoto')::boolean
        then '/api/product-photos/' || auth.uid()::text || '/' || p_attempt::text || '/' || (b.payload->'items'->0->>'draftId') || '.webp'
        else edited."photoUrl" end
      where id=edited.id returning * into edited;
    v_result:=jsonb_build_array(to_jsonb(edited) || jsonb_build_object('shop',jsonb_build_object('id',s.id,'name',s.name)));
    update public.crm_product_batches set status='committed',result=v_result where actor_id=auth.uid() and request_id=p_key;
    update public.crm_upload_attempts set state='committed' where id=p_attempt;
    return v_result;
  end if;

  clean := regexp_replace(upper(trim(s.name)), '[^A-Z0-9 ]', '', 'g');
  words := regexp_split_to_array(clean,'\s+');
  if array_length(words,1)>1 then select string_agg(left(w,1),'') into v_prefix from unnest(words) w;
  else v_prefix := left(clean,3); end if;
  v_prefix := coalesce(nullif(left(v_prefix,4),''),'TAS') || '-' || to_char(now() at time zone 'Asia/Jakarta','YYMMDD') || '-';
  -- Serialize allocation for this business prefix/date, including IDs created by earlier versions.
  perform pg_advisory_xact_lock(hashtextextended(v_prefix,0));
  select coalesce(max(substring(id from length(v_prefix)+1)::bigint),0) into last_no from public.products
    where starts_with(id,v_prefix) and substring(id from length(v_prefix)+1) ~ '^[0-9]{1,12}$';
  n := jsonb_array_length(b.payload->'items');
  insert into public.crm_product_counters as c(prefix,value) values(v_prefix,last_no+n)
    on conflict(prefix) do update set value=greatest(c.value,last_no)+n returning value-n+1 into first_no;
  with inserted as (
    insert into public.products(id,"shopId","capitalPrice",price,description,status,"photoUrl","updatedAt")
    select v_prefix || lpad((first_no+ord-1)::text,greatest(2,length((first_no+ord-1)::text)),'0'),s.id,
      (b.payload->>'capitalPrice')::integer,(b.payload->>'price')::integer,i->>'description','Tersedia',
      case when (i->>'hasPhoto')::boolean then '/api/product-photos/' || auth.uid()::text || '/' || p_attempt::text || '/' || (i->>'draftId') || '.webp'
        else '/uploads/placeholder.jpg' end,now()
    from jsonb_array_elements(b.payload->'items') with ordinality as x(i,ord) returning *
  ) select jsonb_agg(to_jsonb(inserted) || jsonb_build_object('shop',jsonb_build_object('id',s.id,'name',s.name))) into v_result from inserted;
  update public.crm_product_batches set status='committed',result=v_result where actor_id=auth.uid() and request_id=p_key;
  update public.crm_upload_attempts set state='committed' where id=p_attempt;
  return v_result;
end $$;

create function public.crm_fail_product_batch(p_key uuid,p_attempt uuid) returns text language plpgsql security invoker
set search_path='' as $$
declare b public.crm_product_batches;
begin
  if not public.crm_has_access() then raise insufficient_privilege; end if;
  select * into b from public.crm_product_batches where actor_id=auth.uid() and request_id=p_key for update;
  if not found then raise exception 'Batch tidak ditemukan.'; end if;
  if b.status='committed' then return 'committed'; end if;
  if b.attempt_id=p_attempt then
    update public.crm_product_batches set status='failed' where actor_id=auth.uid() and request_id=p_key;
    update public.crm_upload_attempts set state='cleanup' where id=p_attempt and state='pending';
  end if;
  return 'failed';
end $$;

create function public.crm_claim_expired_uploads() returns void language plpgsql security invoker set search_path='' as $$
begin
  if not public.crm_has_access() then raise insufficient_privilege; end if;
  -- Lock batches before attempts, matching commit/fail to avoid deadlocks.
  perform 1 from public.crm_product_batches b where b.actor_id=auth.uid() and b.status='pending'
    and exists(select 1 from public.crm_upload_attempts a where a.id=b.attempt_id and a.expires_at<now()-interval '1 minute') for update;
  update public.crm_upload_attempts set state='cleanup' where actor_id=auth.uid() and state='pending' and expires_at<now()-interval '1 minute';
  update public.crm_product_batches b set status='failed' where b.actor_id=auth.uid() and b.status='pending'
    and exists(select 1 from public.crm_upload_attempts a where a.id=b.attempt_id and a.state='cleanup');
end $$;

create function public.crm_create_order(p_key uuid,p_payload jsonb) returns jsonb language plpgsql security invoker
set search_path='' set statement_timeout='10s' as $$
declare saved public.crm_order_requests; i jsonb; n int; actual int; total bigint:=0; shipping bigint; dp bigint; st text; new_order public.orders; v_result jsonb;
begin
  if not public.crm_has_access() then raise insufficient_privilege; end if;
  if p_key is null then raise exception 'Identitas penyimpanan wajib diisi.'; end if;
  insert into public.crm_order_requests(actor_id,request_id,fingerprint) values(auth.uid(),p_key,encode(sha256(convert_to(p_payload::text,'UTF8')),'hex')) on conflict do nothing;
  select * into saved from public.crm_order_requests where actor_id=auth.uid() and request_id=p_key for update;
  if saved.fingerprint<>encode(sha256(convert_to(p_payload::text,'UTF8')),'hex') then raise exception 'Identitas penyimpanan sudah dipakai untuk data berbeda.'; end if;
  if saved.result is not null then return saved.result; end if;
  if jsonb_typeof(p_payload->'products') is distinct from 'array' then raise exception 'Daftar tas tidak valid.'; end if;
  n:=jsonb_array_length(p_payload->'products'); st:=p_payload->>'status';
  if n<1 or n>100 or st is null or st not in ('Menunggu','Keep (Belum Bayar)','Keep (Lunas)','DP','Siap Kirim','Dikirim','Dibatalkan')
    or length(coalesce(p_payload->>'courier','')) not between 1 and 80 or length(coalesce(p_payload->>'notes',''))>2000
    then raise exception 'Data pesanan tidak valid.'; end if;
  if (select count(distinct x->>'productId') from jsonb_array_elements(p_payload->'products') x)<>n then raise exception 'ID tas duplikat.'; end if;
  shipping:=crm_private.money(p_payload->'shippingCost'); dp:=crm_private.money(p_payload->'dpAmount');
  perform 1 from public.customers where id=p_payload->>'customerId' for key share;
  if not found then raise exception 'Pelanggan tidak ditemukan.'; end if;
  -- Deterministic lock order protects two admins ordering the same bag.
  perform 1 from public.products p where p.id in (select x->>'productId' from jsonb_array_elements(p_payload->'products') x) order by p.id for update;
  get diagnostics actual=row_count;
  if actual<>n then raise exception 'Sebagian tas tidak ditemukan.'; end if;
  if exists(select 1 from public.products p where p.id in (select x->>'productId' from jsonb_array_elements(p_payload->'products') x)
    and (p.status not in ('Tersedia','Available') or p."orderId" is not null)) then raise exception 'Sebagian tas sudah tidak tersedia.'; end if;
  -- Validate and calculate prices using authoritative catalog prices when no override was supplied.
  total:=0;
  for i in select * from jsonb_array_elements(p_payload->'products') loop
    total:=total+greatest(0,
      case when i ? 'customPrice' then crm_private.money(i->'customPrice') else (select price from public.products where id=i->>'productId') end
      -crm_private.money(i->'discount'));
  end loop;
  total:=total+shipping;
  if total>2147483647 then raise exception 'Total pesanan melebihi batas.'; end if;
  if st in ('Keep (Lunas)','Siap Kirim','Dikirim') then dp:=total;
  elsif st in ('Menunggu','Keep (Belum Bayar)','Dibatalkan') then dp:=0;
  elsif dp<=0 or dp>total then raise exception 'DP harus positif dan tidak melebihi total tagihan.'; end if;
  insert into public.orders("customerId",status,"shippingCourier","shippingCost","totalPrice","dpAmount","dpDate",notes,"updatedAt")
    values(p_payload->>'customerId',st,p_payload->>'courier',shipping::integer,total::integer,dp::integer,
      case when dp>0 then now() at time zone 'UTC' else null end,nullif(p_payload->>'notes',''),now() at time zone 'UTC') returning * into new_order;
  if st<>'Dibatalkan' then
    update public.products p set "orderId"=new_order.id,status=case when st='Dikirim' then 'Terjual' else 'Dibooking' end,
      price=case when x.i ? 'customPrice' then (x.i->>'customPrice')::integer else p.price end,
      discount=(x.i->>'discount')::integer,"updatedAt"=now()
    from jsonb_array_elements(p_payload->'products') x(i) where p.id=x.i->>'productId';
  end if;
  v_result:=jsonb_build_object('id',new_order.id,'totalPrice',total);
  update public.crm_order_requests set result=v_result where actor_id=auth.uid() and request_id=p_key;
  return v_result;
end $$;

-- New functions are never executable by PUBLIC/anon. Invoker functions retain RLS.
revoke all on all functions in schema crm_private from public,anon;
grant execute on all functions in schema crm_private to authenticated;
revoke all on function public.crm_prepare_product_batch(uuid,jsonb,text),public.crm_commit_product_batch(uuid,uuid),
  public.crm_fail_product_batch(uuid,uuid),public.crm_claim_expired_uploads(),public.crm_create_order(uuid,jsonb) from public,anon;
grant execute on function public.crm_prepare_product_batch(uuid,jsonb,text),public.crm_commit_product_batch(uuid,uuid),
  public.crm_fail_product_batch(uuid,uuid),public.crm_claim_expired_uploads(),public.crm_create_order(uuid,jsonb) to authenticated;

create index products_order_id_idx on public.products("orderId");
create index products_shop_id_idx on public.products("shopId");
create index orders_customer_id_idx on public.orders("customerId");
create index orders_created_at_idx on public.orders("createdAt" desc);
create index products_photo_url_idx on public.products("photoUrl");
create index crm_upload_cleanup_idx on public.crm_upload_attempts(actor_id,state,expires_at);

-- Maintenance runs with a server-only service key, never via an authenticated browser RPC.
create function public.crm_claim_upload_cleanup_admin() returns void language plpgsql security invoker set search_path='' as $$
begin
  perform 1 from public.crm_product_batches b where b.status='pending'
    and exists(select 1 from public.crm_upload_attempts a where a.id=b.attempt_id and a.expires_at<now()-interval '1 minute') for update;
  update public.crm_upload_attempts set state='cleanup' where state='pending' and expires_at<now()-interval '1 minute';
  update public.crm_product_batches b set status='failed' where b.status='pending'
    and exists(select 1 from public.crm_upload_attempts a where a.id=b.attempt_id and a.state='cleanup');
end $$;
revoke all on function public.crm_claim_upload_cleanup_admin() from public,anon,authenticated;
grant execute on function public.crm_claim_upload_cleanup_admin() to service_role;
grant select,update on public.crm_product_batches,public.crm_upload_attempts to service_role;
notify pgrst,'reload schema';
