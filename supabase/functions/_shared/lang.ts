// The web app sends its language ("de" | "en") in the Accept-Language header of the calls it makes itself.
// German is the default for everything else (database triggers, curl, ...).
export const localized = (req: Request, de: string, en: string) =>
  (req.headers.get('accept-language') ?? '').toLowerCase().startsWith('en') ? en : de;
