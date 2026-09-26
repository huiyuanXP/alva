# Lexie ALVA-048 acceptance handoff

## Coordination
- Lexie originally claimed ALVA-048 in main commit `53fcbbd`.
- During execution main reassigned the ticket to lzy in `e7f632b` and removed the Lexie worktree. Per coordination rules Lexie did not overwrite the newer owner.

## Round 1
- Real layout model run 1: `evidence/20260926T135233881Z-b0b209c8/` => 18 walls / 5 rooms / 9 openings, `calibrated=false`.
- Real layout model run 2: `evidence/20260926T135658528Z-380e7741/` => 5 walls / 2 rooms / 3 openings, `calibrated=false`.
- Real candidate calibration: `evidence/20260926T2150-ALVA048-round1/real-candidate-calibration.json`; known 5m -> 5m and 10m -> 10m, both error 0; independent topology fingerprints; assumptions retain proportional/estimated boundary.
- Group 1–4 deterministic product regressions: 48/48 pass, 0 fail, 0 skip (`round1/tests.log`).
- Real Codex text+image streaming: `evidence/20260926T140254411Z-93536e1c/`; tool_calls=1, delta_count=4, deltas exactly equal final, image response non-empty and refuses unmarked dimensions.
- Real provider WAV transcription: 58,002 bytes -> `How old is the Brooklyn Bridge?` (`round1/real-transcription.log`).
- Browser evidence: `round1/groups-1-4-ui.png`; pain card present, question card present, post-auth console errors 0 (`round1/browser-result.json`).
- Physical microphone remains pending because runner has no physical microphone; not counted as pass or skip.

## Round 2
- `npm run check`: pass after acceptance helper signature fix.
- `npm run build:alva`: pass; only existing >500kB chunk warning.
- Product regressions split to avoid long-process SIGTERM: 31/31 + 17/17 = 48/48 pass, 0 fail, 0 skip (`round2/tests-a.log`, `round2/tests-b.log`).
- Real Codex text+image streaming: `evidence/20260926T141318586Z-7cf41801/`; tool_calls=1, delta_count=3, deltas exactly equal final, image response non-empty and refuses unmarked dimensions.
- Real provider WAV transcription repeated successfully: 58,002 bytes -> `How old is the Brooklyn Bridge?` (`round2/real-transcription.log`).

## Notable non-product interruptions
- First attempt at ad-hoc transcription used top-level await under CJS and never called provider; explicitly not counted.
- Second-round monolithic command was externally SIGTERM'd while still in tsc; explicitly not counted. Re-run as isolated steps passed.
