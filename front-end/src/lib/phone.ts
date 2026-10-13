/** "+33 6 12 34 56 78", "06.12.34.56.78" → "0612345678"; null if not a French number. */
export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "").replace(/^33(?=\d{9}$)/, "0");
  return /^0\d{9}$/.test(digits) ? digits : null;
}
