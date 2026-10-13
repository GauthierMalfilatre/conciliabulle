import { connection } from "next/server";

/**
 * Stands in for a network call, for the demo parts the API does not cover yet.
 * `connection()` marks the data as request-time, so Next never runs it while
 * prerendering (the demo backend reads the clock and an in-memory store). Set FAKE_LATENCY=0 to drop the simulated delay.
 */
export async function fakeLatency(ms: number) {
  await connection();
  if (process.env.FAKE_LATENCY === "0") return;
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}
