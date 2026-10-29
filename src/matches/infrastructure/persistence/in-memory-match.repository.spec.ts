import { InMemoryMatchRepository } from './in-memory-match.repository';
import { expectStaleWriteToFail } from '../../test-support/expect-stale-write-to-fail';

describe('InMemoryMatchRepository', () => {
  it('recusa uma escrita que partiu de uma versão velha', async () => {
    await expectStaleWriteToFail(new InMemoryMatchRepository());
  });
});
