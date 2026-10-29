import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { SqsOutboundQueue } from './sqs-outbound-queue';

describe('SqsOutboundQueue', () => {
  it('envia o corpo para a URL configurada', async () => {
    const send = jest.fn().mockResolvedValue({});
    const queue = new SqsOutboundQueue(
      {
        awsRegion: 'us-east-1',
        sqsQueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/jungle-rounds',
      },
      { send } as unknown as SQSClient,
    );

    await queue.send('{"ok":true}');

    const command = send.mock.calls[0][0] as SendMessageCommand;
    expect(command).toBeInstanceOf(SendMessageCommand);
    expect(command.input).toEqual({
      QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/jungle-rounds',
      MessageBody: '{"ok":true}',
    });
  });

  it('não instancia cliente sem região e URL', () => {
    expect(() => new SqsOutboundQueue({ awsRegion: 'us-east-1' })).toThrow('SQS_QUEUE_URL');
  });
});
