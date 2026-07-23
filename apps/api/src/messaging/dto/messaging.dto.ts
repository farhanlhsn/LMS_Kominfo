import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested
} from "class-validator";

export const CONVERSATION_TYPES = ["DIRECT", "GROUP"] as const;
export type ConversationTypeValue = (typeof CONVERSATION_TYPES)[number];

export const CONVERSATION_MEMBER_ROLES = ["MEMBER", "ADMIN"] as const;
export type ConversationMemberRoleValue = (typeof CONVERSATION_MEMBER_ROLES)[number];

export class CreateConversationDto {
  @IsIn(CONVERSATION_TYPES)
  type!: ConversationTypeValue;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  memberIds!: string[];
}

export class AddConversationMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  userIds!: string[];
}

export class MessageAttachmentInput {
  @IsString() @MaxLength(200) url!: string;
  @IsOptional() @IsString() @MaxLength(100) mimeType?: string;
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() size?: number;
}

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  content!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentInput)
  attachments?: MessageAttachmentInput[];

  @IsOptional()
  @IsString()
  parentMessageId?: string;
}

export class EditMessageDto {
  @IsString() @MinLength(1) @MaxLength(10_000) content!: string;
}

export class ReactMessageDto {
  @IsString() @MaxLength(16) emoji!: string;
}

export class MarkReadDto {
  @IsOptional() @IsString() messageId?: string;
}

export class ListMessagesQueryDto {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() limit?: number;
}

export class BlockUserDto {
  @IsString() userId!: string;
}
