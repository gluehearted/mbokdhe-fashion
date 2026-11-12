-- Sensitive text and compare values travel in RPC POST bodies, never query-string filters.
create function public.crm_update_customer_text(p_id text, p_field text, p_value text, p_expected text)
returns jsonb language plpgsql security invoker set search_path='' set statement_timeout='5s' as $$
declare saved jsonb; current_row jsonb; max_length integer;
begin
  if not public.crm_has_access() then raise insufficient_privilege; end if;
  if p_id is null or length(p_id) not between 1 and 200 or p_field is null or p_field not in ('consumerType','crisisStatus')
    then raise exception 'Kolom pelanggan tidak valid.'; end if;
  max_length := case when p_field='consumerType' then 120 else 2000 end;
  if (p_value is not null and (length(p_value)>max_length
      or translate(p_value,chr(9)||chr(10)||chr(13),'') ~ '[[:cntrl:]]'
      or (p_field='consumerType' and (strpos(p_value,chr(10))>0 or strpos(p_value,chr(13))>0))))
    or (p_expected is not null and length(p_expected)>8000)
    then raise exception 'Data teks pelanggan tidak valid atau melebihi batas panjang.'; end if;

  if p_field='consumerType' then
    update public.customers set "consumerType"=p_value
      where id=p_id and "consumerType" is not distinct from p_expected
      returning jsonb_build_object('id',id,'consumerType',"consumerType") into saved;
  else
    update public.customers set "crisisStatus"=p_value
      where id=p_id and "crisisStatus" is not distinct from p_expected
      returning jsonb_build_object('id',id,'crisisStatus',"crisisStatus") into saved;
  end if;
  if saved is not null then return jsonb_build_object('status','saved','data',saved); end if;

  select jsonb_build_object('id',id,p_field,case when p_field='consumerType' then "consumerType" else "crisisStatus" end)
    into current_row from public.customers where id=p_id;
  if not found then return jsonb_build_object('status','missing'); end if;
  -- Safe replay after a lost response; a different current value is a conflict.
  if (current_row->>p_field) is not distinct from p_value then
    return jsonb_build_object('status','saved','data',current_row);
  end if;
  return jsonb_build_object('status','conflict','data',current_row);
end $$;
revoke all on function public.crm_update_customer_text(text,text,text,text) from public,anon;
grant execute on function public.crm_update_customer_text(text,text,text,text) to authenticated;
notify pgrst, 'reload schema';
