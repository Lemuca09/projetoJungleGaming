import { guide } from './guide.content';

describe('guia da vaga', () => {
  it('cobre os cinco requisitos e o que é sucesso na função', () => {
    expect(guide.requirements.map((item) => item.id)).toEqual([
      'typescript',
      'rest',
      'sql',
      'curiosity',
      'feedback',
    ]);
    expect(guide.success.map((item) => item.id)).toEqual([
      'small-changes',
      'follow-request',
      'tests',
      'explain',
      'ask-for-help',
    ]);
    expect(guide.pitch).toHaveLength(6);
    expect(guide.flows.map((flow) => flow.id)).toEqual(['start', 'score', 'finish', 'read']);

    for (const item of [...guide.requirements, ...guide.success]) {
      expect(item.summary.length).toBeGreaterThan(20);
      expect(item.where).toMatch(/^(src|db|README)/);
    }
  });

  it('diz com clareza o que não foi fingido no stack', () => {
    const text = [...guide.limits, ...guide.pitch].join(' ');
    expect(text).toContain('SQS');
    expect(text).toContain('S3');
    expect(text).toContain('Secrets Manager');
    expect(text).toContain('SNS');
    expect(text).toContain('WebSocket');
    expect(text).toContain('aposta');
  });
});
