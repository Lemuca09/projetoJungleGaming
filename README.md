# Jungle Rounds

Serviço de rodadas de um jogo original. Ele abre uma rodada, acumula pontos e encerra. Não processa aposta, pagamento ou saldo.

É a peça que eu levaria para a conversa de Backend Developer Júnior da Jungle Gaming: uma mudança pequena, com API, domínio, PostgreSQL, teste e um caminho claro para revisar.

## Como eu explico em um minuto

1. Jungle Rounds é um serviço de rodada de jogo: abre, acumula pontos e encerra. Não processa aposta nem pagamento.
2. O controller só traduz HTTP. A regra mora no agregado `Match`.
3. O PostgreSQL guarda a rodada e o placar. Se duas escritas partem da mesma versão, a segunda responde 409.
4. Depois do commit, o evento `match.updated` chega no WebSocket. Com `EVENT_BUS=sqs`, o mesmo JSON segue para a fila.
5. A suíte padrão cobre domínio, conflito e HTTP sem Docker. O teste de banco é separado.
6. Outbox, SNS e um segundo serviço de verdade eu não faria sozinho — pediria revisão antes de o risco crescer.

A mesma lista aparece em `GET /api/guide` e na página inicial.

## Mapa da vaga

| O que a vaga pede | Onde está |
| --- | --- |
| Base de TypeScript | `src/matches/domain/match.ts` |
| REST e NestJS | `src/matches/infrastructure/http/matches.controller.ts` |
| SQL e persistência | `db/init.sql` e `src/matches/infrastructure/persistence/mikro-match.repository.ts` |
| DDD, microsserviços, WebSocket, AWS | agregado `Match`, evento `match.updated`, `src/messaging/` |
| Investigar, pedir contexto, aplicar feedback | `x-request-id` no log e o 409 de versão |
| Mudança pequena | um caso de uso por ação em `src/matches/application/` |
| Acompanhar a requisição | comentário no topo de `record-score.ts` e a trilha na página |
| Testes da regra | `npm test` |
| Dizer o limite | seção abaixo e o painel "O que eu não fingi" |

## Como rodar

Pré-requisitos: Node 22+ e Docker.

```powershell
docker compose up postgres -d
npm install
npm test
npm run start:dev
```

Abra http://localhost:3000.

A senha local do Postgres é `jungle`. Ela está no compose e nos defaults de `loadConfig`. Em produção eu não deixaria default: o ambiente viria do Secrets Manager e a aplicação só leria a variável.

Para subir API e banco juntos:

```powershell
docker compose up --build
```

Dentro do compose a API fala com o host `postgres` na porta `5432`. Na máquina, o banco é publicado em `localhost:5433` para não disputar um Postgres que já esteja na 5432. O default de `loadConfig` usa essa porta.

## Caminho de uma pontuação

`POST /api/matches/:id/scores`

1. `MatchesController` valida o JSON.
2. `RecordScore` carrega a rodada.
3. `Match.record` aplica a regra: rodada aberta, jogador válido, inteiro de 1 a 100, soma no total.
4. `MikroMatchRepository` trava a linha, compara a versão e grava `matches` e `match_scores` na mesma transação.
5. `LocalMatchEvents` emite `match.updated`.
6. `MatchLiveGateway` entrega o fato para quem assinou a rodada.

O log sai assim: `<request-id> POST /api/matches/.../scores -> 200 12ms`.

## API

| Método | Caminho | Sucesso |
| --- | --- | --- |
| `POST` | `/api/matches` | 201 |
| `GET` | `/api/matches/:id` | 200 |
| `POST` | `/api/matches/:id/scores` | 200 |
| `POST` | `/api/matches/:id/finish` | 200 |
| `GET` | `/api/health` | 200 |
| `GET` | `/api/guide` | 200 |

Corpo de uma pontuação: `{ "playerId": "luna", "points": 10 }`.

WebSocket no namespace `/live`. O cliente emite `match.subscribe` com `{ "matchId" }` e recebe `match.updated`.

```powershell
$match = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/matches
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/matches/$($match.id)/scores" -ContentType 'application/json' -Body '{"playerId":"luna","points":10}'
node scripts/watch-match.mjs $match.id
```

## Testes

```powershell
npm test
npm run test:db
```

`npm test` não precisa do Docker. Cobre a regra do agregado, o 409 da versão, a config, o adaptador de fila e o fluxo HTTP com WebSocket.

`npm run test:db` usa o Postgres do compose e **apaga as rodadas do banco local** `jungle_rounds`. Ele só roda se o nome do banco for esse.

Para olhar as tabelas:

```powershell
docker compose exec postgres psql -U jungle -d jungle_rounds -c "\dt"
```

## O que está no stack — e o que eu não fingi

- **DDD.** `Match` é o agregado. `PlayerId` e `ScorePoints` são valores. O repositório é uma porta. O MikroORM fica na infraestrutura.
- **Microsserviço.** Ainda é um processo. O contrato do próximo serviço é o evento `match.updated`. Separar deploy antes de ter um segundo consumidor só espalharia a mesma regra.
- **WebSocket.** O placar ao vivo é o consumidor de hoje.
- **SQS.** `EVENT_BUS=sqs` com `AWS_REGION` e `SQS_QUEUE_URL` manda o mesmo JSON. O padrão é `local`, então o projeto sobe sem credencial da AWS.
- **SNS.** Seria o fan-out desse JSON para mais de um consumidor. Não implementei um cliente parado.
- **S3.** Esta rodada não guarda arquivo. Não criei um upload para parecer stack.
- **Secrets Manager.** A aplicação não chama a API. Ela lê o ambiente, que é o formato em que o secret costuma ser injetado.

Se a SQS falha depois do commit, a pontuação fica e o evento pode se perder. Desfazer a resposta HTTP faria o cliente tentar de novo e somar duas vezes. O próximo passo seria uma outbox. Eu pediria revisão antes de construir isso.

## Concorrência

Duas requisições podem ler a versão 1. A primeira grava e passa a versão para 2. A segunda ainda carrega a versão 1, toma `409` e não mistura os placares. O repositório segura a linha com `FOR UPDATE` para a segunda transação esperar e enxergar a versão nova.

Na página, "Simular duas escritas" manda o jogador e os pontos do formulário duas vezes. As duas leem a mesma versão. Uma grava o valor inteiro. A outra responde 409 e não altera o placar.

## Árvore

```text
db/init.sql
public/index.html
src/matches/domain/match.ts
src/matches/application/
src/matches/infrastructure/http/
src/matches/infrastructure/persistence/
src/matches/infrastructure/ws/
src/messaging/
src/config/load-config.ts
```
