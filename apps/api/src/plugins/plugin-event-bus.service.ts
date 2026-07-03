import { Injectable } from "@nestjs/common";

type PluginEventHandler<TPayload = unknown> = (
  payload: TPayload,
) => void | Promise<void>;

@Injectable()
export class PluginEventBus {
  private readonly handlers = new Map<string, Set<PluginEventHandler>>();

  subscribe<TPayload>(
    eventType: string,
    handler: PluginEventHandler<TPayload>,
  ) {
    const handlers = this.handlers.get(eventType) ?? new Set();
    handlers.add(handler as PluginEventHandler);
    this.handlers.set(eventType, handlers);

    return () => {
      handlers.delete(handler as PluginEventHandler);
    };
  }

  async publish<TPayload>(eventType: string, payload: TPayload) {
    const handlers = this.handlers.get(eventType) ?? new Set();
    const results = [];
    for (const handler of handlers) {
      results.push(await handler(payload));
    }
    return results;
  }
}
