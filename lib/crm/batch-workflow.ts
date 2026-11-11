import { CrmError, PendingBatchError } from "./contracts";

export interface PreparedBatch<T> { status: "pending" | "committed"; attemptId?: string; paths?: string[]; result?: T }
export interface BatchAdapter<T> {
  prepare(): Promise<PreparedBatch<T>>;
  upload(attemptId: string): Promise<void>;
  commit(attemptId: string): Promise<T>;
  fail(attemptId: string): Promise<"committed" | "failed">;
  recover(): Promise<T>;
  cleanup(attemptId: string): Promise<void>;
}

// The database arbitrates commit vs abort. Never delete objects on an ambiguous network failure.
export async function saveBatch<T>(adapter: BatchAdapter<T>): Promise<T> {
  let prepared: PreparedBatch<T>;
  try { prepared = await adapter.prepare(); }
  catch (error) {
    if (!(error instanceof CrmError) || error.status >= 500 || error.status === 409) throw new PendingBatchError();
    throw error;
  }
  if (prepared.status === "committed") return prepared.result as T;
  const attemptId = prepared.attemptId!;
  try {
    await adapter.upload(attemptId);
    return await adapter.commit(attemptId);
  } catch (error) {
    let state: "committed" | "failed";
    try { state = await adapter.fail(attemptId); }
    catch { throw new PendingBatchError(); }
    if (state === "committed") {
      try { return await adapter.recover(); } catch { throw new PendingBatchError(); }
    }
    // Cleanup is durable: failed attempts stay registered for a later sweep.
    try { await adapter.cleanup(attemptId); } catch {}
    throw error;
  }
}

export async function uploadAll<T>(items: T[], upload: (item: T) => Promise<void>, concurrency = 3): Promise<void> {
  let next = 0;
  let failed = false;
  let failure: unknown;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (!failed && next < items.length) {
      const item = items[next++];
      try { await upload(item); } catch (error) { failed = true; failure = error; }
    }
  }));
  if (failed) throw failure;
}
