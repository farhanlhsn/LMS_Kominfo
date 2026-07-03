import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export const workspaceLayouts = [
  "standard",
  "side_by_side",
  "focus",
  "theatre",
  "split_video_transcript",
  "split_content_notes",
  "split_content_ai",
  "dual_window",
  "popout_panel",
  "picture_in_picture_video",
] as const;

export const workspacePanels = [
  "notes",
  "transcript",
  "resources",
  "ai",
  "discussion",
  "flashcards",
  "bookmarks",
  "activity_info",
] as const;

export class UpdateWorkspacePreferencesDto {
  @IsOptional()
  @IsIn(workspaceLayouts)
  preferredLayout?: (typeof workspaceLayouts)[number];

  @IsOptional()
  @IsIn(workspacePanels)
  rightPanelMode?: (typeof workspacePanels)[number];

  @IsOptional()
  @IsBoolean()
  sidebarCollapsed?: boolean;

  @IsOptional()
  @IsBoolean()
  rightPanelCollapsed?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.25)
  playbackSpeed?: number;

  @IsOptional()
  @IsBoolean()
  captionsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  transcriptEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  notesPanelOpen?: boolean;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class WorkspaceStateQueryDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  activityId?: string;
}

export class UpdateWorkspaceStateDto {
  @IsString()
  courseId!: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  activityId?: string;

  @IsOptional()
  @IsIn(workspaceLayouts)
  layout?: (typeof workspaceLayouts)[number];

  @IsOptional()
  @IsIn(workspacePanels)
  rightPanelMode?: (typeof workspacePanels)[number];

  @IsOptional()
  @IsBoolean()
  sidebarCollapsed?: boolean;

  @IsOptional()
  @IsBoolean()
  rightPanelCollapsed?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lastVideoTimeSeconds?: number;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class ListWorkspaceItemsDto extends WorkspaceStateQueryDto {}

export class CreateLearnerNoteDto {
  @IsString()
  courseId!: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  activityId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  videoTimeSeconds?: number;

  @IsOptional()
  @IsString()
  selectedText?: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateLearnerNoteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsString()
  selectedText?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  videoTimeSeconds?: number;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class CreateLearnerBookmarkDto {
  @IsString()
  courseId!: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  activityId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  videoTimeSeconds?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateLearnerBookmarkDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  videoTimeSeconds?: number;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpsertTranscriptDto {
  @IsArray()
  segments!: TranscriptSegmentInputDto[];
}

export class TranscriptSegmentInputDto {
  @IsNumber()
  @Min(0)
  startSeconds!: number;

  @IsNumber()
  @Min(0)
  endSeconds!: number;

  @IsString()
  @MinLength(1)
  text!: string;

  @IsOptional()
  @IsString()
  speaker?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateTranscriptSegmentDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  startSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  endSeconds?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  text?: string;

  @IsOptional()
  @IsString()
  speaker?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
