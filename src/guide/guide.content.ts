export type GuideItem = {
  id: string;
  title: string;
  summary: string;
  where: string;
};

export type GuideFlow = {
  id: 'start' | 'score' | 'finish' | 'read';
  label: string;
  steps: string[];
};

export const guide = {
  service: 'Jungle Rounds',
  role: 'Backend Developer Júnior',
  team: 'Jungle Gaming',
  summary:
    'Serviço de rodadas de um jogo original. Mostra TypeScript, API REST, persistência relacional e o formato do stack da vaga, sem fingir domínio de tudo.',
  pitch: [
    'Jungle Rounds é um serviço de rodada de jogo: abre, acumula pontos e encerra. Não processa aposta nem pagamento.',
    'O controller só traduz HTTP. A regra mora no agregado Match.',
    'O PostgreSQL guarda a rodada e o placar. Se duas escritas partem da mesma versão, a segunda responde 409.',
    'Depois do commit, o evento match.updated chega no WebSocket. Com EVENT_BUS=sqs, o mesmo JSON segue para a fila.',
    'A suíte padrão cobre domínio, conflito e HTTP sem Docker. O teste de banco é separado.',
    'Outbox, SNS e um segundo serviço de verdade eu não faria sozinho — pediria revisão antes de o risco crescer.',
  ],
  requirements: [
    {
      id: 'typescript',
      title: 'Boa base de TypeScript',
      summary: 'O serviço inteiro é TypeScript estrito: agregado, DTOs, config e o contrato do evento.',
      where: 'src/matches/domain/match.ts',
    },
    {
      id: 'rest',
      title: 'Backend, REST e NestJS',
      summary: 'O controller é fino. A validação do corpo falha cedo e a regra de negócio fica no caso de uso.',
      where: 'src/matches/infrastructure/http/matches.controller.ts',
    },
    {
      id: 'sql',
      title: 'SQL e persistência',
      summary:
        'PostgreSQL com rodada e placar, chave estrangeira, unicidade e uma transação. O MikroORM é o adaptador, não o domínio.',
      where: 'db/init.sql',
    },
    {
      id: 'curiosity',
      title: 'DDD, microsserviços, WebSockets e AWS',
      summary:
        'Match é o agregado. O evento match.updated é o contrato: hoje o WebSocket consome no mesmo processo e, se ligado, a SQS leva o mesmo JSON. Segredos entram pelo ambiente.',
      where: 'src/messaging/local-match-events.ts',
    },
    {
      id: 'feedback',
      title: 'Investigar, pedir contexto e aplicar feedback',
      summary:
        'Cada resposta leva x-request-id. Escrita concorrente responde 409 em vez de perder ponto em silêncio. O limite do exemplo está escrito.',
      where: 'src/matches/infrastructure/persistence/mikro-match.repository.ts',
    },
  ] satisfies GuideItem[],
  success: [
    {
      id: 'small-changes',
      title: 'Mudança pequena e fácil de revisar',
      summary: 'Cada ação tem um caso de uso. Dá para revisar um arquivo sem ler o sistema inteiro.',
      where: 'src/matches/application',
    },
    {
      id: 'follow-request',
      title: 'Acompanhar a requisição',
      summary: 'Pontuar passa pelo HTTP, pelo agregado, pelo repositório e pelo PostgreSQL. O log imprime o request id.',
      where: 'src/matches/application/record-score.ts',
    },
    {
      id: 'tests',
      title: 'Testes da regra que importa',
      summary: 'O agregado, o conflito de versão e o fluxo HTTP com WebSocket têm teste. A suíte padrão não sobe o banco.',
      where: 'src/matches/domain/match.spec.ts',
    },
    {
      id: 'explain',
      title: 'Explicar o que mudou',
      summary: 'Esta página e o README descrevem o caminho e o que ficou de fora de propósito.',
      where: 'README.md',
    },
    {
      id: 'ask-for-help',
      title: 'Pedir ajuda antes do risco crescer',
      summary:
        'Se a fila falha depois do commit, o ponto permanece e o evento pode se perder. Outbox seria o próximo passo, com revisão.',
      where: 'src/messaging/local-match-events.ts',
    },
  ] satisfies GuideItem[],
  stack: ['TypeScript', 'NestJS', 'PostgreSQL', 'MikroORM', 'Docker', 'WebSocket', 'SQS opcional'],
  flows: [
    {
      id: 'start',
      label: 'Abrir rodada',
      steps: [
        'POST /api/matches',
        'StartMatch',
        'Match.open',
        'MatchRepository.save',
        'INSERT em matches',
        'evento started no WebSocket',
      ],
    },
    {
      id: 'score',
      label: 'Registrar pontos',
      steps: [
        'POST /api/matches/:id/scores',
        'RecordScore',
        'Match.record',
        'transação em matches e match_scores',
        'evento score_recorded',
        'WebSocket match.updated',
      ],
    },
    {
      id: 'finish',
      label: 'Encerrar rodada',
      steps: [
        'POST /api/matches/:id/finish',
        'FinishMatch',
        'Match.finish',
        'MatchRepository.save',
        'evento finished no WebSocket',
      ],
    },
    {
      id: 'read',
      label: 'Ler do banco',
      steps: ['GET /api/matches/:id', 'GetMatch', 'MatchRepository.findById', 'SELECT matches e match_scores'],
    },
  ] satisfies GuideFlow[],
  limits: [
    'Um serviço só. O segundo serviço ainda não existe: o contrato é o evento.',
    'SQS fica desligada até EVENT_BUS=sqs. Sem fila configurada, nada chama a AWS.',
    'Não há S3 porque esta rodada não guarda arquivo.',
    'Secrets Manager não é chamado daqui. A config lê o ambiente, que em produção viria do secret.',
    'SNS seria o fan-out do mesmo JSON para mais de um consumidor. Hoje quem consome é o WebSocket.',
    'Se a fila falhar depois do commit, o evento pode se perder. Eu pediria ajuda antes de montar uma outbox.',
  ],
};
