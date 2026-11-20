/** What the Android Back key does on the active card. */
export type BackAction = () => void;

/** Swallows the Back key: used while money is moving. */
export const IGNORE_BACK: BackAction = () => undefined;

/**
 * Back actions registered by the visible card, newest last.
 *
 * The newest registration wins; when none is registered the caller's
 * fallback runs (closing the card). Registrations are tracked by id so an
 * unmounting card removes only its own entry, whatever the mount order.
 */
export class BackActionStack {
  private entries: { id: number; action: BackAction }[] = [];
  private nextId = 0;

  push(action: BackAction): number {
    const id = this.nextId;
    this.nextId += 1;
    this.entries.push({ id, action });
    return id;
  }

  remove(id: number): void {
    this.entries = this.entries.filter((entry) => entry.id !== id);
  }

  get size(): number {
    return this.entries.length;
  }

  handle(fallback: BackAction): void {
    const newest = this.entries[this.entries.length - 1];
    (newest?.action ?? fallback)();
  }
}
