import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

// =====================
// Group assignment DTOs
// =====================

export class CreateAssignmentGroupDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxMembers?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberIds?: string[];
}

export class UpdateAssignmentGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxMembers?: number;

  @IsOptional()
  @IsIn(["ACTIVE", "ARCHIVED"])
  status?: "ACTIVE" | "ARCHIVED";
}

export class AddGroupMemberDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsIn(["member", "leader"])
  role?: "member" | "leader";
}

// =====================
// Peer review DTOs
// =====================

export class CreatePeerReviewConfigDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  reviewsRequired?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  reviewsToReceive?: number;

  @IsOptional()
  @IsDateString()
  openFrom?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsString()
  rubricId?: string;

  @IsOptional()
  @IsBoolean()
  anonymize?: boolean;

  @IsOptional()
  @IsBoolean()
  allowSelfReview?: boolean;
}

export class UpdatePeerReviewConfigDto extends CreatePeerReviewConfigDto {
  @IsOptional()
  @IsIn(["DRAFT", "OPEN", "CLOSED"])
  status?: "DRAFT" | "OPEN" | "CLOSED";
}

export class PeerReviewRubricScoreDto {
  @IsString()
  criterionId!: string;

  @IsOptional()
  @IsString()
  levelId?: string;

  @IsNumber()
  @Min(0)
  points!: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class SubmitPeerReviewDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  overallScore?: number;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PeerReviewRubricScoreDto)
  rubricScores?: PeerReviewRubricScoreDto[];
}

// =====================
// Submission annotation DTOs
// =====================

export class CreateSubmissionAnnotationDto {
  @IsInt()
  @Min(0)
  startOffset!: number;

  @IsInt()
  @Min(0)
  endOffset!: number;

  @IsString()
  @MinLength(1)
  selectedText!: string;

  @IsString()
  @MinLength(1)
  comment!: string;
}

export class UpdateSubmissionAnnotationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  comment?: string;

  @IsOptional()
  @IsBoolean()
  resolved?: boolean;
}

// =====================
// Plagiarism DTOs
// =====================

export class RunPlagiarismCheckDto {
  @IsOptional()
  @IsString()
  provider?: string;
}

// =====================
// Project showcase DTOs
// =====================

export class CreateProjectShowcaseDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  externalUrl?: string;

  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}

export class UpdateProjectShowcaseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  externalUrl?: string;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

// =====================
// Portfolio DTOs
// =====================

export class CreatePortfolioDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdatePortfolioDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class CreatePortfolioEntryDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  submissionId?: string;

  @IsOptional()
  @IsString()
  showcaseId?: string;

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}

export class UpdatePortfolioEntryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}

// =====================
// Assignment DTOs (collaboration)
// =====================

export class UpdateAssignmentCollaborationDto {
  @IsOptional()
  @IsIn(["INDIVIDUAL", "GROUP"])
  collaborationMode?: "INDIVIDUAL" | "GROUP";

  @IsOptional()
  @IsInt()
  @Min(1)
  groupMinMembers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  groupMaxMembers?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxResubmissions?: number;
}
