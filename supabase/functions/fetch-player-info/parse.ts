// Pure helper — no IO, no Deno globals, so it can be unit-tested.

/**
 * Builds the RG id ("MAX7072") from a playerzone link. Older links carry the name ("/players/7072-max-mustermann"),
 * newer ones only the number ("/players/7072") — then there is no name to build the id from, so null.
 */
export const rgIdFromLink = (rgLink: string): string | null => {
  const [id, name] = rgLink.split('/').slice(-1)[0].split('-');
  if (!name) return null;
  return name.slice(0, 3).toUpperCase() + id;
};
