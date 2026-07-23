import { SetMetadata } from "@nestjs/common";

export const REQUIRED_PLUGIN_KEY = "requiredPluginKey";

export const RequiresPlugin = (pluginKey: string) =>
  SetMetadata(REQUIRED_PLUGIN_KEY, pluginKey);
