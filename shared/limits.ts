// What visitors see when a Google daily quota runs out (rings, searches, or address lookups).

export const DAILY_LIMIT_MESSAGE = 'Ambit’s had a busy day! Today’s searches are used up. They reset at midnight Pacific.';

export function isDailyLimit(message: string | undefined): boolean {
  return message === DAILY_LIMIT_MESSAGE;
}

/** Google's quota errors (Places, Geocoding, Isochrones) in their various spellings. */
export function looksLikeQuotaError(text: string): boolean {
  return /RESOURCE_EXHAUSTED|Quota exceeded|OVER_QUERY_LIMIT|rate limit exceeded/i.test(text);
}
