/**
 * Insertion seams for the on-device spoken processes.
 *
 * Every UI surface that needs a spoken process calls through this module,
 * so the later audio/AI integration (QVAC read-back, spoken option
 * highlighting, voice-to-intent hand-off) lands in one place instead of
 * scattering hooks through the components. Until that phase lands, the
 * functions are observable no-ops: they log and change nothing.
 */

export type SpokenHighlightListener = (optionIndex: number) => void;

/** Read one announcement out loud in the current language. */
export function speakAnnouncement(text: string): void {
  logSeam('speakAnnouncement', text);
}

/**
 * Read the visible options out loud, highlighting each option while it is
 * spoken. Per the design interaction rules, a spoken highlight never
 * selects; only an explicit touch or a recognized spoken choice selects.
 */
export function startSpokenOptionHighlight(
  optionCount: number,
  onHighlight: SpokenHighlightListener,
): void {
  logSeam('startSpokenOptionHighlight', `${optionCount} options`);
}

/** Stop the spoken option reading. */
export function stopSpokenOptionHighlight(): void {
  logSeam('stopSpokenOptionHighlight', 'stopped');
}

function logSeam(process: string, detail: string): void {
  console.log(`[metevo] spoken seam ${process}: ${detail}`);
}
