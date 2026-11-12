import {
  decodeContactLink,
  encodeContactLink,
  isContactLinkCandidate,
  MAX_CONTACT_LINK_BYTES,
} from './contactLink';

interface LinkingPort {
  getInitialURL(): Promise<string | null>;
  addEventListener(type: 'url', listener: (event: { url: string }) => void): { remove(): void };
}

function linkKey(link: string): string {
  try { return encodeContactLink(decodeContactLink(link)); }
  catch { return link.slice(0, MAX_CONTACT_LINK_BYTES + 1).trim(); }
}

/** Subscribe before reading the initial URL: Android can deliver both.
 * Late initial results and callbacks after cleanup never reopen a card. */
export function listenForContactLinks(port: LinkingPort, enqueue: (link: string) => unknown): () => void {
  let mounted = true;
  const liveKeys = new Set<string>();
  const receive = (link: string | null, initial: boolean) => {
    if (!mounted || link === null || !isContactLinkCandidate(link)) return;
    const key = linkKey(link);
    if (initial && liveKeys.has(key)) return;
    if (!initial) {
      liveKeys.add(key);
      if (liveKeys.size > 32) liveKeys.delete(liveKeys.values().next().value!);
    }
    enqueue(link);
  };
  const subscription = port.addEventListener('url', ({ url }) => receive(url, false));
  void port.getInitialURL().then((url) => receive(url, true)).catch(() => {
    // Warm links remain usable if the platform cannot recover a launch URL.
    // Do not log URLs, which contain names and node identifiers.
  });
  return () => { mounted = false; subscription.remove(); };
}
