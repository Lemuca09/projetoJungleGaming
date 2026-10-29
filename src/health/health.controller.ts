import { MikroORM } from '@mikro-orm/core';
import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly orm: MikroORM) {}

  @Get()
  async get() {
    try {
      await this.orm.em.fork().getConnection().execute('select 1');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Health check falhou: ${message}`);
      throw new ServiceUnavailableException('PostgreSQL indisponível.');
    }
    return { status: 'ok', service: 'jungle-rounds' };
  }
}
