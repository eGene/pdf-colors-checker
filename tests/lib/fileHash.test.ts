import { describe, expect, it } from 'vitest';
import { hashFile } from '../../src/lib/fileHash';

describe('fileHash', () => {
  it('returns stable SHA-256 hex for a File', async () => {
    const content = new Uint8Array([72, 101, 108, 108, 111]);
    const file = new File([content], 'hello.bin', { type: 'application/octet-stream' });
    const hash = await hashFile(file);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe('185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969');
  });

  it('produces different hashes for different content', async () => {
    const a = new File([new Uint8Array([1])], 'a.pdf');
    const b = new File([new Uint8Array([2])], 'b.pdf');
    expect(await hashFile(a)).not.toBe(await hashFile(b));
  });
});
