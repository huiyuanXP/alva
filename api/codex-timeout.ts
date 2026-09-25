/** Calls remain bounded. Vision may need longer than an interactive chat turn. */
export const VISION_TIMEOUT_MS = 600_000;
export function codexTimeoutMs(value?:number):number {
 const timeout=value??120_000;
 if(!Number.isSafeInteger(timeout)||timeout<1_000||timeout>600_000)
  throw new Error('Codex timeoutMs必须是1000到600000之间的整数');
 return timeout;
}
