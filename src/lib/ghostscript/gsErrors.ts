export function gsExitStatus(error: unknown): number | null {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === 'number') return status;
  }
  const msg = String((error as Error)?.message || error);
  const exitMatch = msg.match(/exit(?: code)?[:= ]+(\d+)/i) || msg.match(/ExitStatus[^0-9]*(\d+)/);
  if (exitMatch) return Number(exitMatch[1]);
  return null;
}

export function gsRunSucceeded(error: unknown): boolean {
  if (!error) return true;
  const status = gsExitStatus(error);
  if (status != null) return status === 0;
  const msg = String((error as Error)?.message || error);
  return msg.includes('Program terminated') && !/exit code 1|exit\(1\)/i.test(msg);
}
