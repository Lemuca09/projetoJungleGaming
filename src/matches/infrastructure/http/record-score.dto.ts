import { IsInt, IsString, Matches, Max, Min } from 'class-validator';

/** A mesma regra vive no domínio. Aqui ela falha antes de carregar a rodada. */
export class RecordScoreDto {
  @IsString({ message: 'playerId deve ser texto.' })
  @Matches(/^[a-zA-Z0-9_-]{2,32}$/, {
    message: 'playerId deve ter 2 a 32 caracteres (letras, números, _ ou -).',
  })
  playerId!: string;

  @IsInt({ message: 'points deve ser um inteiro.' })
  @Min(1, { message: 'points deve ser um inteiro de 1 a 100.' })
  @Max(100, { message: 'points deve ser um inteiro de 1 a 100.' })
  points!: number;
}
