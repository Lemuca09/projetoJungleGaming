import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { FinishMatch } from '../../application/finish-match';
import { GetMatch } from '../../application/get-match';
import { RecordScore } from '../../application/record-score';
import { StartMatch } from '../../application/start-match';
import { RecordScoreDto } from './record-score.dto';

const idPipe = new ParseUUIDPipe({
  version: '4',
  exceptionFactory: () => new BadRequestException('id deve ser um UUID.'),
});

@Controller('matches')
export class MatchesController {
  constructor(
    private readonly startMatch: StartMatch,
    private readonly recordScore: RecordScore,
    private readonly finishMatch: FinishMatch,
    private readonly getMatch: GetMatch,
  ) {}

  @Post()
  @HttpCode(201)
  start() {
    return this.startMatch.execute();
  }

  @Get(':id')
  get(@Param('id', idPipe) id: string) {
    return this.getMatch.execute(id);
  }

  @Post(':id/scores')
  @HttpCode(200)
  score(
    @Param('id', idPipe) id: string,
    @Body() body: RecordScoreDto,
    @Headers('x-conflict-demo') conflictDemo?: string,
  ) {
    return this.recordScore.execute({
      matchId: id,
      playerId: body.playerId,
      points: body.points,
      conflictDemo: conflictDemo === '1',
    });
  }

  @Post(':id/finish')
  @HttpCode(200)
  finish(@Param('id', idPipe) id: string) {
    return this.finishMatch.execute(id);
  }
}
