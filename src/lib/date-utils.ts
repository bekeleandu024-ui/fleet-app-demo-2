export function startOfWeek(date: Date, weekStartsOn = 1) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day < weekStartsOn ? day + 7 : day) - weekStartsOn;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export function subDays(date: Date, amount: number) {
  return addDays(date, -amount);
}

export function differenceInMinutes(later: Date, earlier: Date) {
  return Math.round((later.getTime() - earlier.getTime()) / (1000 * 60));
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
