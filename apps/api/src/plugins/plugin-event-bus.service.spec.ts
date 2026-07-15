import { describe, expect, it, vi } from "vitest";
import { PluginEventBus } from "./plugin-event-bus.service";

describe("PluginEventBus", () => {
  it("subscribes publishes and unsubscribes", async () => {
    const bus = new PluginEventBus();
    const handler = vi.fn().mockResolvedValue("ok");
    const unsubscribe = bus.subscribe("test.event", handler);
    await expect(bus.publish("test.event", { a: 1 })).resolves.toEqual(["ok"]);
    expect(handler).toHaveBeenCalledWith({ a: 1 });
    unsubscribe();
    await expect(bus.publish("test.event", { a: 2 })).resolves.toEqual([]);
    await expect(bus.publish("missing", {})).resolves.toEqual([]);
  });
});
