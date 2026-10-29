import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { AppConfig } from '../config/app-config';
import { OutboundQueue } from './outbound-queue';

export class SqsOutboundQueue implements OutboundQueue {
  private readonly client: SQSClient;
  private readonly queueUrl: string;

  constructor(config: Pick<AppConfig, 'awsRegion' | 'sqsQueueUrl'>, client?: SQSClient) {
    if (!config.awsRegion || !config.sqsQueueUrl) {
      throw new Error('SQS exige AWS_REGION e SQS_QUEUE_URL.');
    }
    this.queueUrl = config.sqsQueueUrl;
    this.client = client ?? new SQSClient({ region: config.awsRegion });
  }

  async send(body: string): Promise<void> {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: body,
      }),
    );
  }
}
