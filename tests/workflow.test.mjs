import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { randomUUID, createHash } from 'node:crypto';
const { parseBatch, parseOrder, CrmError, PendingBatchError } = (await import(pathToFileURL(join(process.env.CRM_TEST_BUILD_DIR,'contracts.js')).href)).default;
const { saveBatch, uploadAll } = (await import(pathToFileURL(join(process.env.CRM_TEST_BUILD_DIR,'batch-workflow.js')).href)).default;
const { sanitizePhoto } = (await import(pathToFileURL(join(process.env.CRM_TEST_BUILD_DIR,'image.js')).href)).default;

test('server validation rejects duplicate drafts, malicious amounts and mismatched IDs',()=>{
  const item={draftId:randomUUID(),description:'',hasPhoto:false};
  const p={shopOrigin:'Supplier',capitalPrice:25000,price:50000,items:[item]};
  assert.equal(parseBatch(p).items.length,1);
  for(const price of [-1,1.5,NaN,Infinity,2147483648,'50000']) assert.throws(()=>parseBatch({...p,price}));
  assert.throws(()=>parseBatch({...p,items:[item,item]}));
  const order={customerId:'c',products:[{productId:'p',discount:0}],shippingCost:0,status:'Menunggu',dpAmount:0};
  assert.equal(parseOrder(order).products.length,1);
  assert.throws(()=>parseOrder({...order,productIds:['wrong']}));
  assert.throws(()=>parseOrder({...order,products:[{productId:'p',discount:-1}]}));
});

function adapter(overrides={}){
  const events=[];
  const a={prepare:async()=>({status:'pending',attemptId:'attempt'}),upload:async()=>{events.push('upload')},commit:async()=>{events.push('commit');return ['product']},fail:async()=>{events.push('abort');return 'failed'},recover:async()=>['existing'],cleanup:async()=>{events.push('cleanup')},...overrides};
  return {a,events};
}
test('one failed concurrent upload waits for active workers before abort/cleanup',async()=>{
  let finished=false; const {a,events}=adapter({upload:async()=>uploadAll([1,2,3],async item=>{
    if(item===1) throw new Error('upload failed');
    await new Promise(resolve=>setTimeout(resolve,15)); finished=true;
  }),cleanup:async()=>{assert(finished);events.push('cleanup')}});
  await assert.rejects(saveBatch(a),/upload failed/);
  assert.deepEqual(events,['abort','cleanup']);
});
test('database failure aborts batch and preserves durable cleanup when removal fails',async()=>{
  const {a,events}=adapter({commit:async()=>{throw new Error('db failed')},cleanup:async()=>{events.push('cleanup');throw new Error('offline')}});
  await assert.rejects(saveBatch(a),/db failed/);assert.deepEqual(events,['upload','abort','cleanup']);
});
test('lost response after commit recovers original products and never removes photos',async()=>{
  const {a,events}=adapter({commit:async()=>{throw new Error('response lost')},fail:async()=>{events.push('abort-check');return 'committed'}});
  assert.deepEqual(await saveBatch(a),['existing']);assert(!events.includes('cleanup'));
});
test('unknown abort result locks retry and never deletes potentially committed photos',async()=>{
  const {a,events}=adapter({commit:async()=>{throw new Error('offline')},fail:async()=>{throw new Error('offline')}});
  await assert.rejects(saveBatch(a),PendingBatchError);assert(!events.includes('cleanup'));
});
test('idempotent replay does not upload again; ambiguous prepare is retained for retry',async()=>{
  const {a,events}=adapter({prepare:async()=>({status:'committed',result:['existing']})});
  assert.deepEqual(await saveBatch(a),['existing']);assert.equal(events.length,0);
  await assert.rejects(saveBatch(adapter({prepare:async()=>{throw new CrmError('offline',503)}}).a),PendingBatchError);
});
test('image decoder rejects disguised files and strips source metadata',async()=>{
  await assert.rejects(sanitizePhoto(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')));
  await assert.rejects(sanitizePhoto(Buffer.from('not an image')));
  const jpeg=await sharp({create:{width:1500,height:1000,channels:3,background:'red'}}).jpeg().withMetadata().toBuffer();
  const output=await sanitizePhoto(jpeg);const metadata=await sharp(output).metadata();
  assert.equal(metadata.format,'webp');assert(metadata.width<=1000);assert.equal(metadata.exif,undefined);assert.equal(metadata.icc,undefined);
});

test('v2 prices belong to each item; legacy canonical bytes and hash remain unchanged', () => {
  const first = { draftId: '11111111-1111-4111-8111-111111111111', description: '', hasPhoto: false };
  const legacy = { shopOrigin: 'b', capitalPrice: 35000, price: 50000, items: [first] };
  const canonical = '{"shopOrigin":"b","capitalPrice":35000,"price":50000,"items":[{"draftId":"11111111-1111-4111-8111-111111111111","description":"","hasPhoto":false}]}';
  assert.equal(JSON.stringify(parseBatch(legacy)), canonical);
  assert.equal(createHash('sha256').update(JSON.stringify(parseBatch(legacy))).digest('hex'), createHash('sha256').update(canonical).digest('hex'));
  const input = { version: 2, shopOrigin: 'b', items: [
    { ...first, capitalPrice: 35000, price: 50000 },
    { ...first, draftId: randomUUID(), capitalPrice: 40000, price: 60000 },
  ] };
  const parsed = parseBatch(input);
  assert.deepEqual(parsed.items.map(i => [i.capitalPrice, i.price]), [[35000,50000],[40000,60000]]);
  assert.equal(parsed.capitalPrice, undefined);
  for (const price of [-1, 0, 1.5, NaN, Infinity, 2147483648, '60000', undefined]) {
    assert.throws(() => parseBatch({ ...input, items: [input.items[0], { ...input.items[1], price }] }));
  }
  assert.throws(() => parseBatch({ ...input, items: [{ ...input.items[0], capitalPrice: -1 }] }));
  for (const version of [1, 3, '2', null]) assert.throws(() => parseBatch({ ...input, version }));
});

test('origin guard accepts bound preview host while rejecting cross-site and forwarded-host spoofing', async () => {
  const { isSameOrigin } = (await import(pathToFileURL(join(process.env.CRM_TEST_BUILD_DIR,'origin.js')).href)).default;
  const req = (origin, extra = {}) => new Request('http://localhost:3301/api/products/batch', { headers: { ...(origin ? {origin} : {}), host:'127.0.0.1:3301', ...extra } });
  assert(isSameOrigin(req('http://127.0.0.1:3301')));
  for (const origin of [undefined,'null','http://evil.test','http://127.0.0.1:3302','https://127.0.0.1:3301','http://127.0.0.1:3301/path']) assert(!isSameOrigin(req(origin)));
  assert(!isSameOrigin(req('http://127.0.0.1:3301', {'sec-fetch-site':'cross-site'})));
  assert(!isSameOrigin(req('http://evil.test', {'x-forwarded-host':'evil.test'})));
  assert(isSameOrigin(new Request('https://crm.example.test/api/orders', {headers:{origin:'https://crm.example.test',host:'crm.example.test'}})));
});

test('inline classification accepts only known fields/options and explicit legacy compare values', async () => {
  const { parseClassificationChange } = (await import(pathToFileURL(join(process.env.CRM_TEST_BUILD_DIR,'customer-classification.js')).href)).default;
  const change = {field:'behavioral',value:'Price Sensitive',expectedValue:'Loyal'};
  assert.deepEqual(parseClassificationChange(change), change);
  assert.deepEqual(parseClassificationChange({field:'relationshipStatus',value:null,expectedValue:'Active'}),{field:'relationshipStatus',value:null,expectedValue:'Active'});
  for (const invalid of [
    {...change,field:'name'}, {...change,value:'Unknown'}, {...change,value:3}, {...change,value:''},
    {...change,expectedValue:undefined}, {...change,expectedValue:123}, {...change,name:'Overwrite'},
    {field:'relationshipStatus',value:'Price Sensitive',expectedValue:null}, null, [],
  ]) assert.throws(() => parseClassificationChange(invalid));
});
test('typed customer statistics retain settled status, discount clamp and legacy total fallback', async () => {
  const { customerStatistics } = (await import(pathToFileURL(join(process.env.CRM_TEST_BUILD_DIR,'customer-statistics.js')).href)).default;
  assert.deepEqual(customerStatistics(null),{totalTransactions:0,totalSpending:0});
  assert.deepEqual(customerStatistics([
    {status:'Dikirim',products:[{price:70000,discount:5000},{price:10000,discount:20000}],shippingCost:10000,totalPrice:999},
    {status:'Siap_Kirim',products:[],totalPrice:45000},
    {status:'Menunggu',totalPrice:900000}, {status:'Dibatalkan',totalPrice:800000},
  ]),{totalTransactions:2,totalSpending:120000});
});
