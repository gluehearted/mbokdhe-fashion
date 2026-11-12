import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

// Deliberately fixed to the disposable local fixture: never loads .env or hosted credentials.
const STAFF = '11111111-1111-4111-8111-111111111111';
const SECOND = '22222222-2222-4222-8222-222222222222';
const OUTSIDER = '33333333-3333-4333-8333-333333333333';
const quote = s => `'${String(s).replaceAll("'", "''")}'`;
const json = value => `${quote(JSON.stringify(value))}::jsonb`;
function sql(query, actor = STAFF) {
  return new Promise((resolve, reject) => {
    const child = spawn('psql', ['-X', '-h', '127.0.0.1', '-p', '55439', '-d', 'crm_verification', '-v', 'ON_ERROR_STOP=1', '-A', '-t', '-q'], { env: { ...process.env, PGOPTIONS: '-c statement_timeout=10000' } });
    let out = '', err = '';
    child.stdout.on('data', b => out += b); child.stderr.on('data', b => err += b);
    child.on('error', reject);
    child.on('close', code => code ? reject(new Error(err)) : resolve(out.trim()));
    child.stdin.end(`${actor ? `set role authenticated; set request.jwt.claim.sub=${quote(actor)};` : ''}\n${query}`);
  });
}
async function rpc(name, args, actor) {
  const out = await sql(`select to_jsonb(public.${name}(${args.join(',')}));`, actor);
  return JSON.parse(out);
}
function payload(items = 3, shopOrigin = `Test ${randomUUID()}`) {
  return { shopOrigin, capitalPrice: 25000, price: 50000, items: Array.from({ length: items }, (_, i) => ({ draftId: randomUUID(), description: `Bag ${i}`, hasPhoto: false })) };
}
async function prepare(p, key = randomUUID(), actor = STAFF) {
  const b = await rpc('crm_prepare_product_batch', [quote(key), json(p), quote('a'.repeat(64))], actor);
  return { ...b, key, payload: p };
}
const commit = (b, actor = STAFF) => rpc('crm_commit_product_batch', [quote(b.key), quote(b.attemptId)], actor);
const order = (ids, extra = {}) => ({ customerId: 'test-customer', products: ids.map(productId => ({ productId, discount: 0 })), shippingCost: 10000, courier: 'JNE', status: 'Menunggu', dpAmount: 0, notes: '', ...extra });
const createOrder = (p, key = randomUUID(), actor = STAFF) => rpc('crm_create_order', [quote(key), json(p)], actor);

test('transactional CRM with synthetic PostgreSQL fixture', async t => {
  assert.equal(await sql(`select email from auth.users where id=${quote(OUTSIDER)}`, null), 'outsider@example.test');
  // Create records using the actual previous function definitions before upgrading.
  const previous = readFileSync('supabase/migrations/20261110165507_crm_product_batches_atomic_orders.sql', 'utf8');
  const oldValidate = previous.slice(previous.indexOf('create function crm_private.validate_batch'), previous.indexOf('create function public.crm_prepare_product_batch')).replace('create function', 'create or replace function');
  const oldCommit = previous.slice(previous.indexOf('create function public.crm_commit_product_batch'), previous.indexOf('create function public.crm_fail_product_batch')).replace('create function', 'create or replace function');
  const upgrade = readFileSync('supabase/migrations/20261111112528_product_batch_item_prices.sql', 'utf8');
  let legacyPending, legacyCommitted, legacyResult;
  try {
    await sql(oldValidate + oldCommit, null);
    legacyPending = await prepare(payload(2));
    legacyCommitted = await prepare(payload(1));
    legacyResult = await commit(legacyCommitted);
  } finally { await sql(upgrade, null); }
  await t.test('pre-upgrade pending and committed batches preserve payload, fingerprint and replay', async () => {
    const saved = await commit(legacyPending);
    assert(saved.every(p => p.capitalPrice === 25000 && p.price === 50000));
    assert.deepEqual((await prepare(legacyCommitted.payload, legacyCommitted.key)).result, legacyResult);
    assert.deepEqual(await commit(legacyCommitted), legacyResult);
  });
  await t.test('v2 stores independent item prices and rejects an invalid item atomically', async () => {
    const legacy = payload(2);
    const p = { version: 2, shopOrigin: legacy.shopOrigin, items: legacy.items.map((i, n) => ({ ...i, description: '', capitalPrice: n ? 40000 : 35000, price: n ? 60000 : 50000 })) };
    const b = await prepare(p), saved = await commit(b);
    assert.deepEqual(saved.map(i => [i.capitalPrice, i.price]), [[35000,50000],[40000,60000]]);
    assert.deepEqual(await commit(b), saved);
    await assert.rejects(prepare({ ...p, items: [p.items[0], { ...p.items[1], price: -1 }] }), /Nominal/);
    await assert.rejects(prepare({ ...p, version: 3 }), /Versi/);
    const edit = { ...p, editProductId: saved[0].id, items: [{ ...p.items[0], price: 52000, capitalPrice: 36000 }] };
    const updated = await commit(await prepare(edit));
    assert.equal(updated[0].price, 52000); assert.equal(updated[0].capitalPrice, 36000);
    assert.equal(await sql(`select price from public.products where id=${quote(saved[1].id)}`), '60000');
  });
  await t.test('customer classification conditional updates detect conflicts and isolate fields under staff RLS', async () => {
    // Also supports older disposable fixtures without rebuilding unrelated test data.
    await sql('alter table public.customers add column if not exists behavioral text; alter table public.customers add column if not exists "relationshipStatus" text;', null);
    const id = `classification-${randomUUID()}`;
    await sql(`insert into public.customers(id,name,whatsapp,"addressDetail",behavioral,"relationshipStatus") values(${quote(id)},'Synthetic Classification','000','Synthetic Address','Value Seeker','New Customer')`);
    try {
      const results = await Promise.all([
        sql(`update public.customers set behavioral='Price Sensitive' where id=${quote(id)} and behavioral='Value Seeker' returning behavioral`, STAFF),
        sql(`update public.customers set behavioral='Design Oriented' where id=${quote(id)} and behavioral='Value Seeker' returning behavioral`, SECOND),
      ]);
      assert.equal(results.filter(Boolean).length, 1);
      const winner = results.find(Boolean);
      assert.equal(await sql(`select name||'|'||whatsapp||'|'||"addressDetail"||'|'||"relationshipStatus" from public.customers where id=${quote(id)}`), 'Synthetic Classification|000|Synthetic Address|New Customer');
      const independent = await Promise.all([
        sql(`update public.customers set behavioral='Convenience Seeker' where id=${quote(id)} and behavioral=${quote(winner)} returning id`, STAFF),
        sql(`update public.customers set "relationshipStatus"='Repeat Buyer' where id=${quote(id)} and "relationshipStatus"='New Customer' returning id`, SECOND),
      ]);
      assert(independent.every(Boolean));
      assert.equal(await sql(`update public.customers set behavioral='Price Sensitive' where id=${quote(id)} returning id`, OUTSIDER),'');
      await sql(`update public.customers set behavioral=null where id=${quote(id)} and behavioral='Convenience Seeker'`);
      assert.equal(await sql(`select count(*) from public.customers where id=${quote(id)} and behavioral is null and "relationshipStatus"='Repeat Buyer'`),'1');
    } finally { await sql(`delete from public.customers where id=${quote(id)}`); }
  });
  await t.test('inline consumer type and crisis text stay isolated and reject concurrent stale writes', async () => {
    await sql('alter table public.customers add column if not exists "consumerType" text; alter table public.customers add column if not exists "crisisStatus" text;', null);
    await sql(readFileSync('supabase/migrations/20261112080922_customer_inline_text.sql','utf8').replace('create function','create or replace function'),null);
    const id = `inline-text-${randomUUID()}`;
    const update = (field,value,expected,actor=STAFF) => rpc('crm_update_customer_text',[quote(id),quote(field),value===null?'null':quote(value),expected===null?'null':quote(expected)],actor);
    await sql(`insert into public.customers(id,name,whatsapp,"addressDetail","consumerType","crisisStatus") values(${quote(id)},'Synthetic Text','000','Synthetic Address','Retail','Normal')`);
    try {
      const independent = await Promise.all([update('consumerType','Reseller','Retail'), update('crisisStatus','Synthetic note','Normal',SECOND)]);
      assert(independent.every(result=>result.status==='saved'));
      assert.deepEqual(Object.keys(independent[0].data).sort(),['consumerType','id']);
      const races = await Promise.all([update('crisisStatus','Admin A','Synthetic note'),update('crisisStatus','Admin B','Synthetic note',SECOND)]);
      assert.deepEqual(races.map(r=>r.status).sort(),['conflict','saved']);
      const winner = races.find(r=>r.status==='saved').data.crisisStatus;
      assert.equal((await update('crisisStatus',winner,'Synthetic note')).status,'saved');
      const unicode='漢'.repeat(2000);
      assert.equal((await update('crisisStatus',unicode,winner)).data.crisisStatus,unicode);
      assert.equal((await update('crisisStatus',null,unicode)).data.crisisStatus,null);
      await assert.rejects(update('name','Overwrite',null),/Kolom/);
      await assert.rejects(update('consumerType','x'.repeat(121),'Reseller'),/batas/);
      await assert.rejects(update('crisisStatus','x'.repeat(2001),null),/batas/);
      await assert.rejects(update('crisisStatus','note',null,OUTSIDER),/permission|insufficient/i);
      assert.equal(await sql(`select name||'|'||whatsapp||'|'||"addressDetail"||'|'||"consumerType" from public.customers where id=${quote(id)}`),'Synthetic Text|000|Synthetic Address|Reseller');
      assert.equal(await sql(`select count(*) from information_schema.routine_privileges where routine_name='crm_update_customer_text' and grantee in ('PUBLIC','anon')`,null),'0');
      assert.equal(await sql(`select prosecdef from pg_proc where oid='public.crm_update_customer_text(text,text,text,text)'::regprocedure`,null),'f');
    } finally { await sql(`delete from public.customers where id=${quote(id)}`); }
  });
  let bags;
  await t.test('batch with shared prices and independent optional fields; replay returns same products', async () => {
    const p = payload(); p.items[1].description = '';
    const b = await prepare(p); bags = await commit(b);
    assert.equal(bags.length, 3); assert.equal(new Set(bags.map(p => p.id)).size, 3);
    assert(bags.every(p => p.capitalPrice === 25000 && p.price === 50000 && p.shop.name === b.payload.shopOrigin));
    assert.equal(bags.filter(p => p.description === '').length, 1);
    assert.deepEqual(await commit(b), bags);
    assert.equal((await prepare(p, b.key)).status, 'committed');
    await assert.rejects(prepare({ ...p, price: 50001 }, b.key), /data berbeda/);
  });
  await t.test('partial upload prevents every product and abort is durable', async () => {
    const p = { version: 2, shopOrigin: `Test ${randomUUID()}`, items: payload(2).items.map(i => ({ ...i, capitalPrice: 35000, price: 50000 })) }; p.items.forEach(i => { i.hasPhoto = true; i.fileHash = 'b'.repeat(64); });
    const b = await prepare(p);
    await sql(`insert into storage.objects(bucket_id,name) values ('product-batches',${quote(b.paths[0])});`);
    await assert.rejects(commit(b), /Foto belum lengkap/);
    assert.equal(await sql(`select count(*) from public.shops where name=${quote(p.shopOrigin)}`), '0');
    assert.equal(await sql(`select count(*) from storage.objects where name=${quote(b.paths[0])}`, SECOND), '0');
    assert.equal(await rpc('crm_fail_product_batch', [quote(b.key),quote(b.attemptId)]), 'failed');
    await sql(`delete from storage.objects where name=${quote(b.paths[0])};`);
    assert.equal(await sql(`select state from public.crm_upload_attempts where id=${quote(b.attemptId)}`), 'cleanup');
  });
  await t.test('committed photo readable by staff, cannot be deleted by failed-batch cleanup', async () => {
    const p = payload(1); p.items[0].hasPhoto = true; p.items[0].fileHash = 'b'.repeat(64);
    const b = await prepare(p);
    await sql(`insert into storage.objects(bucket_id,name) values ('product-batches',${quote(b.paths[0])});`);
    const created = await commit(b);
    assert.equal(created[0].photoUrl, '/api/product-photos/' + b.paths[0]);
    assert.equal(await sql(`select count(*) from storage.objects where name=${quote(b.paths[0])}`, SECOND), '1');
    assert.equal(await rpc('crm_fail_product_batch', [quote(b.key),quote(b.attemptId)]), 'committed');
    await sql(`delete from storage.objects where name=${quote(b.paths[0])};`);
    assert.equal(await sql(`select count(*) from storage.objects where name=${quote(b.paths[0])}`), '1');
  });
  await t.test('single-product edit preserves photo without a new file and stays atomic', async()=>{
    const p=payload(1);p.editProductId=bags[2].id;p.items[0].description='Updated';p.price=55000;
    const b=await prepare(p),edited=await commit(b);
    assert.equal(edited.length,1);assert.equal(edited[0].id,bags[2].id);assert.equal(edited[0].price,55000);
    assert.equal(edited[0].photoUrl,bags[2].photoUrl);
  });
  await t.test('insert failure rolls back all products and newly created supplier', async () => {
    await sql(`create function public.test_fail_product() returns trigger language plpgsql as $$ begin if new.description='INJECT_FAILURE' then raise exception 'injected'; end if; return new; end $$; create trigger test_fail_product before insert on public.products for each row execute function public.test_fail_product();`, null);
    const p = payload(2); p.items[1].description = 'INJECT_FAILURE'; const b = await prepare(p);
    await assert.rejects(commit(b), /injected/);
    assert.equal(await sql(`select count(*) from public.shops where name=${quote(p.shopOrigin)}`), '0');
    await sql('drop trigger test_fail_product on public.products; drop function public.test_fail_product();', null);
  });
  await t.test('ID allocation above 99 and concurrent batches remains unique', async () => {
    const shop = `Counter ${randomUUID()}`;
    const results = await Promise.all(Array.from({ length: 6 }, async () => commit(await prepare(payload(20, shop)))));
    const ids = results.flat().map(p => p.id);
    assert.equal(new Set(ids).size, 120);
    const numbers=ids.map(id=>Number(id.split('-').at(-1)));
    assert.equal(Math.max(...numbers)-Math.min(...numbers),119); assert(Math.max(...numbers)>=120);
  });
  await t.test('order calculates authoritative total and retry is idempotent', async () => {
    const p = order([bags[0].id], { status: 'Siap Kirim', products: [{ productId: bags[0].id, customPrice: 60000, discount: 5000 }], totalPrice: 1 });
    const key = randomUUID(), result = await createOrder(p,key);
    assert.equal(result.totalPrice,65000); assert.deepEqual(await createOrder(p,key), result);
    assert.equal(await sql(`select "dpAmount" from public.orders where id=${quote(result.id)}`), '65000');
    assert.equal(await sql(`select status from public.products where id=${quote(bags[0].id)}`), 'Dibooking');
    await assert.rejects(createOrder({ ...p, notes: 'different' },key), /data berbeda/);
  });
  await t.test('missing/duplicate IDs and invalid DP leave no order', async () => {
    const before = await sql('select count(*) from public.orders');
    await assert.rejects(createOrder(order([bags[1].id,'missing'])), /tidak ditemukan/);
    await assert.rejects(createOrder(order([bags[1].id,bags[1].id])), /duplikat/);
    await assert.rejects(createOrder(order([bags[1].id],{ status:'DP',dpAmount: 999999 })), /DP harus/);
    assert.equal(await sql('select count(*) from public.orders'),before);
  });
  await t.test('simultaneous orders cannot take the same bag', async () => {
    const results = await Promise.allSettled([createOrder(order([bags[1].id])),createOrder(order([bags[1].id]),randomUUID(),SECOND)]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.filter(r=>r.status==='rejected').length,1);
  });
  await t.test('product-update failure rolls back new order and request ledger', async () => {
    await sql(`create function public.test_fail_update() returns trigger language plpgsql as $$ begin if new.id=${quote(bags[2].id)} and new."orderId" is not null then raise exception 'injected update'; end if; return new; end $$; create trigger test_fail_update before update on public.products for each row execute function public.test_fail_update();`,null);
    const before=await sql('select count(*) from public.orders'), key=randomUUID();
    await assert.rejects(createOrder(order([bags[2].id]),key),/injected update/);
    assert.equal(await sql('select count(*) from public.orders'),before);
    assert.equal(await sql(`select count(*) from public.crm_order_requests where request_id=${quote(key)}`),'0');
    await sql('drop trigger test_fail_update on public.products; drop function public.test_fail_update();',null);
  });
  await t.test('cancelled order leaves bag available and outsider cannot access CRM', async () => {
    await createOrder(order([bags[2].id],{status:'Dibatalkan'}));
    assert.equal(await sql(`select status from public.products where id=${quote(bags[2].id)}`),'Tersedia');
    assert.equal(await rpc('crm_has_access',[],OUTSIDER),false);
    assert.equal(await sql('select count(*) from public.products',OUTSIDER),'0');
    await assert.rejects(createOrder(order([bags[2].id]),randomUUID(),OUTSIDER),/permission denied|insufficient_privilege/);
    await assert.rejects(sql('set role anon; select public.crm_has_access();',null),/permission denied/);
  });
  await t.test('expired staging is claimed before cleanup and cannot commit afterwards',async()=>{
    const b=await prepare(payload(1));
    await sql(`update public.crm_upload_attempts set expires_at=now()-interval '10 minutes' where id=${quote(b.attemptId)}`,null);
    await sql('select public.crm_claim_expired_uploads()');
    assert.equal(await sql(`select state from public.crm_upload_attempts where id=${quote(b.attemptId)}`),'cleanup');
    await assert.rejects(commit(b),/Sesi batch berakhir/);
  });
});
