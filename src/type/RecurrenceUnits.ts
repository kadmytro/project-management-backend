export enum RecurrenceUnit {
  DAYS = "days",
  WEEKS = "weeks",
  MONTHS = "months",
  YEARS = "years",
}

export enum RecurrenceType {
  INTERVAL = "interval",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

export function isValidRecurrenceUnit(value: any): value is RecurrenceUnit {
  return Object.values(RecurrenceUnit).includes(value);
}

export function isValidRecurrenceType(value: any): value is RecurrenceType {
  return Object.values(RecurrenceType).includes(value);
}
