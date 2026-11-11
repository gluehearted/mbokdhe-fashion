-- Per-item prices with unchanged legacy payloads, ledger fingerprints, RLS, and commit protocol.
create or replace function crm_private.validate_batch(p jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare i jsonb; n int;
begin
  if jsonb_typeof(p->'items') is distinct from 'array' then raise exception 'Daftar draft tidak valid.'; end if;
  n := jsonb_array_length(p->'items');
  if n<1 or n>20 or length(coalesce(p->>'shopOrigin','')) not between 1 and 120 then raise exception 'Batch tidak valid.'; end if;
  if p ? 'editProductId' and (jsonb_typeof(p->'editProductId') is distinct from 'string' or length(p->>'editProductId') not between 1 and 200) then raise exception 'ID produk tidak valid.'; end if;
  if p ? 'version' and p->'version' <> '2'::jsonb then raise exception 'Versi batch tidak didukung.'; end if;
  if not (p ? 'version') then
    perform crm_private.money(p->'capitalPrice'); perform crm_private.money(p->'price',1);
  end if;
  if (select count(distinct x->>'draftId') from jsonb_array_elements(p->'items') x)<>n then raise exception 'Draft duplikat.'; end if;
  for i in select * from jsonb_array_elements(p->'items') loop
    if p->'version' = '2'::jsonb then
      perform crm_private.money(i->'capitalPrice'); perform crm_private.money(i->'price',1);
    end if;
    if coalesce(i->>'draftId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or jsonb_typeof(i->'description') is distinct from 'string' or length(i->>'description')>2000
      or jsonb_typeof(i->'hasPhoto') is distinct from 'boolean'
      or ((i->>'hasPhoto')::boolean and coalesce(i->>'fileHash','') !~ '^[0-9a-f]{64}$')
    then raise exception 'Data draft tidak valid.'; end if;
  end loop;
end $$;

create or replace function public.crm_commit_product_batch(p_key uuid,p_attempt uuid) returns jsonb language plpgsql security invoker
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
    update public.products set "shopId"=s.id,"capitalPrice"=(case when b.payload->'version' = '2'::jsonb then b.payload->'items'->0->>'capitalPrice' else b.payload->>'capitalPrice' end)::integer,price=(case when b.payload->'version' = '2'::jsonb then b.payload->'items'->0->>'price' else b.payload->>'price' end)::integer,
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
      (case when b.payload->'version' = '2'::jsonb then i->>'capitalPrice' else b.payload->>'capitalPrice' end)::integer,(case when b.payload->'version' = '2'::jsonb then i->>'price' else b.payload->>'price' end)::integer,i->>'description','Tersedia',
      case when (i->>'hasPhoto')::boolean then '/api/product-photos/' || auth.uid()::text || '/' || p_attempt::text || '/' || (i->>'draftId') || '.webp'
        else '/uploads/placeholder.jpg' end,now()
    from jsonb_array_elements(b.payload->'items') with ordinality as x(i,ord) returning *
  ) select jsonb_agg(to_jsonb(inserted) || jsonb_build_object('shop',jsonb_build_object('id',s.id,'name',s.name))) into v_result from inserted;
  update public.crm_product_batches set status='committed',result=v_result where actor_id=auth.uid() and request_id=p_key;
  update public.crm_upload_attempts set state='committed' where id=p_attempt;
  return v_result;
end $$;

