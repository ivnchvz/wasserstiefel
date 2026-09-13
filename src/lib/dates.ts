/** Crouwel's exhibition dates read 30.03-03.07.11; dates here follow suit. */
export function formatDate(date: string | null): string | null {
  if (!date) return null;
  // A bare YYYY-MM-DD parses as UTC midnight, which renders as the previous
  // day anywhere west of Greenwich - pin those to local time instead.
  const local = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;

  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
}
