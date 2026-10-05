/** Splits an ISO date (yyyy-mm-dd) into the pieces printed on a ticket stub. */
export function stubDate(iso: string) {
  const date = new Date(`${iso}T00:00`);
  return {
    day: date.toLocaleDateString(undefined, { day: '2-digit' }),
    month: date.toLocaleDateString(undefined, { month: 'short' }),
    full: date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
  };
}
