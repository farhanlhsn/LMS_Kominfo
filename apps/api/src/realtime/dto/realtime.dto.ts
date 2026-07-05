import { IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export const REALTIME_TRANSPORTS = ["polling", "sse", "websocket"] as const;
export type RealtimeTransport = (typeof REALTIME_TRANSPORTS)[number];

export class PollRealtimeDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  channel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  since?: string;

  @IsOptional()
  @IsIn(["asc", "desc"])
  order?: "asc" | "desc";

  @IsOptional()
  limit?: number;
}

export class PublishRealtimeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  channel!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  type!: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class SubscribeRealtimeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  channel!: string;
}

export class AckRealtimeDto {
  @IsString()
  channel!: string;

  @IsString()
  eventId!: string;
}
