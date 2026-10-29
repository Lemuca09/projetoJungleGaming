import { MikroORM } from '@mikro-orm/core';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { ensureSchema } from './ensure-schema';

@Injectable()
export class SchemaInitializer implements OnModuleInit {
  private readonly logger = new Logger(SchemaInitializer.name);

  constructor(
    private readonly orm: MikroORM,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.database.autoMigrate) {
      this.logger.log('DB_AUTO_MIGRATE=false. O schema não será alterado na subida.');
      return;
    }
    await ensureSchema(this.orm);
    this.logger.log('Schema conferido em db/init.sql.');
  }
}
