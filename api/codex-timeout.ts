/** Calls remain bounded. Vision may need longer than an interactive chat turn. */
export const VISION_TIMEOUT_MS = 240_000;
export function codexTimeoutMs(value?:number):number {
 const timeout=value??120_000;
 if(!Number.isSafeInteger(timeout)||timeout<1_000||timeout>300_000)
  throw new Error('Codex timeoutMs必须是1000到300000之间的整数');
 return timeout;
}
