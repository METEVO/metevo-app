/**
 * Transcript hygiene (design phase 3): the pure layer that keeps phantom
 * transcripts out of the intent tier — silence hallucinations like
 * "[BLANK_AUDIO]", clips with no real speech, and the spoken number words
 * Whisper writes where the schema wants digits. The Whisper call itself
 * lives in the orchestrator's ports, so this module stays dependency-free
 * and runs in plain Node tests.
 */

/** Marker-style hallucinations Whisper emits on silence: the whole
 * transcript is just the marker, optionally wrapped in brackets. */
const HALLUCINATION_CONTENT =
  /^(?:blank[ _-]?audio|silence|noise|music|applause|you|thank you|bye)\.?$/i;

/** A transcript must carry at least this many letters or digits to be real. */
const MIN_ALNUM_CHARS = 3;

export function filterTranscript(raw: string): string | null {
  const transcript = raw.trim().replace(/\s+/g, ' ');
  if (transcript.length === 0) {
    return null;
  }
  const bare = transcript.replace(/[[\]()]/g, '').trim();
  if (HALLUCINATION_CONTENT.test(bare)) {
    return null;
  }
  const alnumCount = (transcript.match(/[a-z0-9]/gi) ?? []).length;
  if (alnumCount < MIN_ALNUM_CHARS) {
    return null;
  }
  return transcript;
}

/** Unambiguous number words: these start a number anywhere in the sentence. */
const NUMBER_STARTS = new Map<string, number>([
  ['zero', 0], ['one', 1], ['two', 2], ['three', 3], ['four', 4],
  ['five', 5], ['six', 6], ['seven', 7], ['eight', 8], ['nine', 9],
  ['ten', 10], ['eleven', 11], ['twelve', 12], ['thirteen', 13],
  ['fourteen', 14], ['fifteen', 15], ['sixteen', 16], ['seventeen', 17],
  ['eighteen', 18], ['nineteen', 19],
  ['twenty', 20], ['thirty', 30], ['forty', 40], ['fifty', 50],
  ['sixty', 60], ['seventy', 70], ['eighty', 80], ['ninety', 90],
]);

/** Homophones Whisper may write, but only inside a number already in
 * progress ("five oh five", "won hundred"): outside one they are ordinary
 * words ("send five dollars TO Maria") and must pass through untouched. */
const NUMBER_MID = new Map<string, number>([
  ['oh', 0], ['won', 1], ['to', 2], ['too', 2], ['for', 4], ['ate', 8],
]);

const DECIMAL_MARKERS = new Set(['point', 'dot']);

/**
 * Spoken number words -> digits, in place. Handles the forms a payment
 * command produces: "five", "twenty five", "one hundred and twenty five",
 * "one thousand five hundred", "five point five", "zero point two five".
 * Words outside a number in progress pass through untouched.
 */
export function normalizeNumberWords(text: string): string {
  const tokens = text.split(/\s+/);
  const out: string[] = [];

  let collecting = false;
  /** The low group being built ("twenty", "five hundred" -> 500). */
  let current = 0;
  /** Completed thousands to the left ("one thousand five hundred" -> 1000). */
  let thousands = 0;
  let decimals: string | null = null;

  const flush = () => {
    if (!collecting) {
      return;
    }
    let value = thousands + current;
    if (decimals !== null) {
      value = Number(`${value}.${decimals}`);
    }
    out.push(String(value));
    collecting = false;
    current = 0;
    thousands = 0;
    decimals = null;
  };

  for (const raw of tokens) {
    const token = raw.toLowerCase().replace(/[^a-z0-9.]/g, '');
    if (token.length === 0) {
      continue;
    }

    if (DECIMAL_MARKERS.has(token) && collecting) {
      decimals = '';
      continue;
    }
    if (decimals !== null) {
      // Decimal digits arrive as words too ("five point two five"); each
      // word contributes one digit.
      const digit = NUMBER_STARTS.get(token);
      if (digit !== undefined && digit <= 9) {
        decimals += String(digit);
        continue;
      }
    }
    if (decimals !== null && /^[0-9]$/.test(token)) {
      decimals += token;
      continue;
    }

    const startValue = NUMBER_STARTS.get(token);
    const midValue = NUMBER_MID.get(token);

    if (startValue !== undefined || (collecting && midValue !== undefined)) {
      if (!collecting) {
        collecting = true;
        current = 0;
        thousands = 0;
      }
      current += startValue ?? midValue ?? 0;
      continue;
    }
    if (collecting && token === 'and') {
      continue; // "one hundred and five"
    }
    if (collecting && token === 'hundred') {
      current = (current || 1) * 100;
      continue;
    }
    if (collecting && (token === 'thousand' || token === 'k')) {
      thousands += (current || 1) * 1000;
      current = 0;
      continue;
    }

    flush();
    out.push(raw);
  }

  flush();
  return out.join(' ');
}

/**
 * Cleans one raw Whisper transcription, or null when nothing usable was
 * spoken.
 */
export function cleanTranscript(raw: string): string | null {
  const filtered = filterTranscript(raw);
  if (filtered === null) {
    return null;
  }
  return normalizeNumberWords(filtered);
}
