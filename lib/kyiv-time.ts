const KYIV_TIME_ZONE = "Europe/Kyiv";

function getKyivDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: KYIV_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

function getKyivOffsetMinutes(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: KYIV_TIME_ZONE,
    timeZoneName: "shortOffset",
  });

  const offsetValue = formatter
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")
    ?.value.replace("GMT", "");

  if (!offsetValue) return 0;

  const match = offsetValue.match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);

  return sign * (hours * 60 + minutes);
}

export function getKyivDayRangeUtc(referenceDate = new Date()) {
  const { year, month, day } = getKyivDateParts(referenceDate);

  const utcMidnightForKyivDate = Date.UTC(year, month - 1, day, 0, 0, 0);
  const utcMidnightForNextKyivDate = Date.UTC(year, month - 1, day + 1, 0, 0, 0);

  const startOffsetMinutes = getKyivOffsetMinutes(new Date(utcMidnightForKyivDate));
  const endOffsetMinutes = getKyivOffsetMinutes(new Date(utcMidnightForNextKyivDate));

  const start = new Date(utcMidnightForKyivDate - startOffsetMinutes * 60_000).toISOString();
  const end = new Date(utcMidnightForNextKyivDate - endOffsetMinutes * 60_000).toISOString();

  return { start, end };
}
