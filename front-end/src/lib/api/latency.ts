import { connection } from "next/server";

/**
 * Stands in for a network call to the real API. `connection()` marks the data as
 * request-time, so Next never runs it while prerendering (the fake backend reads
 * the clock and an in-memory store). Set FAKE_LATENCY=0 to drop the simulated delay.
 */
export async function fakeLatency(ms: number) {
  await connection();
  if (process.env.FAKE_LATENCY === "0") return;
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}
