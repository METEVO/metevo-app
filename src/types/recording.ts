/**
 * Recording state machine phases (Step 3.4).
 *
 * idle -> recording -> processing -> idle
 * Every stop path (manual re-press or the 3s silence timer) is funnelled
 * through a single guarded transition inside `src/hooks/useAudioRecorder.ts`.
 */
export type RecordingPhase = 'idle' | 'recording' | 'processing';
