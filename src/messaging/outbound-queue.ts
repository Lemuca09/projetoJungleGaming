export const OUTBOUND_QUEUE = Symbol('OUTBOUND_QUEUE');

export interface OutboundQueue {
  send(body: string): Promise<void>;
}

export class IgnoringOutboundQueue implements OutboundQueue {
  async send(): Promise<void> {
    return undefined;
  }
}
