import { IsObject } from "class-validator";

export class UpdatePluginConfigDto {
  @IsObject()
  config!: Record<string, unknown>;
}
