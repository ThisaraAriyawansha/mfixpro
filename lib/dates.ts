// "YYYY-MM-DD" in local time, for <input type="date"> values.
export function dateInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function daysAgoInput(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateInputValue(d);
}

export function todayInput() {
  return dateInputValue(new Date());
}

// Default window for history lists — keeps each page open to roughly a
// month of records instead of the whole history.
export const DEFAULT_LIST_DAYS = 30;
