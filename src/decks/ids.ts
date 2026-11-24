/** A new deck entry's ID, made by whoever sends the edit so a resent addition can't land twice. */
export function newEntryId(): string {
  return crypto.randomUUID();
}
