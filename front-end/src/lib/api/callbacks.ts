import { fakeLatency } from "./latency";
import { db, newId } from "./store";
import type { CallbackRequest } from "./types";

// Fake backend: swap for `fetch` calls to the real API.

/** POST /callbacks */
export async function createCallbackRequest(input: Omit<CallbackRequest, "id" | "createdAt">) {
  await fakeLatency(400);
  const request: CallbackRequest = { ...input, id: newId("cb"), createdAt: new Date().toISOString() };
  db().callbacks.push(request);
  return request;
}
