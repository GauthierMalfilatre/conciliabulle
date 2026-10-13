export type SearchParams = Record<string, string | string[] | undefined>;

/** First value of a query parameter, or undefined when empty. */
export function param(sp: SearchParams, key: string) {
  const v = sp[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() ? s.trim() : undefined;
}

/** Builds `path?…`, dropping empty values. */
export function withParams(path: string, params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}
