export const APP_CONFIG = Symbol('APP_CONFIG');

export type AppConfig = {
  port: number;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    autoMigrate: boolean;
  };
  eventBus: 'local' | 'sqs';
  awsRegion?: string;
  sqsQueueUrl?: string;
};
