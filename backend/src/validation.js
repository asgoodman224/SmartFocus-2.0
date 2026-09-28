/**
 * Request shapes. Field names match the mobile app's `src/types/models.ts`.
 */
const { z } = require('zod');

const { isValidTimeZone } = require('./time');

/** An error with an HTTP status; the app's error handler turns it into `{ detail }`. */
class HttpError extends Error {
  constructor(status, detail, headers = {}) {
    super(detail);
    this.status = status;
    this.headers = headers;
  }
}

/** Validates `data` against `schema`, or throws a 422 with a readable message. */
function parse(schema, data) {
  const result = schema.safeParse(data ?? {});
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const where = issue.path.length ? `${issue.path.join('.')}: ` : '';
  throw new HttpError(422, `${where}${issue.message}`);
}

const int = (min, max) => {
  let schema = z.number().int().min(min);
  return max === undefined ? schema : schema.max(max);
};
const queryInt = (min, max, fallback) => z.coerce.number().int().min(min).max(max).default(fallback);
const unique = (key) => (items) => new Set(items.map((item) => item[key])).size === items.length;

const timezone = z.string().refine(isValidTimeZone, 'must be an IANA time zone name, e.g. America/New_York');
// Lowercased so "Sam@Example.com" and "sam@example.com" are the same account.
const email = z.string().trim().pipe(z.email('must be a valid email address')).transform((e) => e.toLowerCase());
const rating = int(1, 5);

const schemas = {
  signUp: z.object({ email, password: z.string().min(8).max(128), timezone }),
  signIn: z.object({ email, password: z.string().max(128), timezone: timezone.optional() }),
  accountUpdate: z.object({ timezone }),

  checkInCreate: z.object({
    mood: rating,
    energy: rating,
    focus: rating,
    note: z
      .string()
      .max(280)
      .nullish()
      .transform((note) => note?.trim() || undefined),
  }),
  checkInList: z.object({ limit: queryInt(1, 100, 5) }),

  dataSourceId: z.enum(['appUsage', 'notifications', 'motion']),
  dataSourceUpdate: z.object({ status: z.enum(['connected', 'notConnected', 'unavailable']) }),

  isoDate: z.iso.date(),
  timeRange: z.object({ range: z.enum(['day', 'week', 'month']).optional() }),
  dailyUsage: z.object({ days: queryInt(1, 90, 7) }),

  usageDayUpload: z.object({
    longestFocusMinutes: int(0, 1440),
    hours: z
      .array(
        z.object({
          hour: int(0, 23),
          pickups: int(0),
          notifications: int(0),
          apps: z
            .array(
              z.object({
                appId: z.string().min(1).max(255),
                appName: z.string().min(1).max(255),
                category: z.enum(['productivity', 'communication', 'social', 'entertainment', 'other']),
                seconds: int(0, 3600),
                opens: int(0),
              }),
            )
            .default([])
            .refine(unique('appId'), 'each appId may appear only once per hour'),
        }),
      )
      .max(24)
      .refine(unique('hour'), 'each hour may appear only once'),
  }),
};

module.exports = { HttpError, parse, schemas };
