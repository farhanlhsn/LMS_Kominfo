import type { LucideIcon } from 'lucide-react';

export type UUID = string;
export type ISODateString = string;
export type DateTime = string;

export enum Role {
  STUDENT = 'STUDENT',
  INSTRUCTOR = 'INSTRUCTOR',
  REGIONAL_ADMIN = 'REGIONAL_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum Difficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum LessonType {
  TEXT = 'TEXT',
  VIDEO = 'VIDEO',
  PDF = 'PDF',
  LINK = 'LINK',
  QUIZ = 'QUIZ',
  ASSIGNMENT = 'ASSIGNMENT',
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  MULTIPLE_SELECT = 'MULTIPLE_SELECT',
  TRUE_FALSE = 'TRUE_FALSE',
  ESSAY = 'ESSAY',
  MATCHING = 'MATCHING',
}

export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DROPPED = 'DROPPED',
}

export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export enum ChatRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

export enum StorageProvider {
  R2 = 'R2',
  S3 = 'S3',
  MINIO = 'MINIO',
  LOCAL = 'LOCAL',
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NavItem {
  title: string;
  href: string;
  icon?: LucideIcon;
  children?: NavItem[];
  badge?: number;
}

export interface User {
  id: UUID;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  regionId: UUID;
  region?: Region;
  isActive: boolean;
  lastLoginAt: DateTime | null;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface Region {
  id: UUID;
  name: string;
  slug: string;
  themeColor: string;
  logoUrl: string;
  bannerUrl: string;
  description: string | null;
  isActive: boolean;
}

export interface Course {
  id: UUID;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  thumbnailUrl: string;
  instructorId: UUID;
  instructor?: User;
  regionId: UUID;
  region?: Region;
  difficulty: Difficulty;
  estimatedDuration: number;
  category: string;
  tags: string[];
  totalModules: number;
  totalLessons: number;
  totalStudents: number;
  rating: number;
  status: CourseStatus;
  modules?: Module[];
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface Module {
  id: UUID;
  courseId: UUID;
  title: string;
  description: string;
  order: number;
  estimatedDuration: number;
  isPublished: boolean;
  lessons?: Lesson[];
}

export interface Lesson {
  id: UUID;
  moduleId: UUID;
  title: string;
  order: number;
  type: LessonType;
  duration: number;
  isPreview: boolean;
  isPublished: boolean;
  content?: LessonContent;
}

export interface LessonContent {
  id: UUID;
  lessonId: UUID;
  markdown: string | null;
  html: string | null;
  videoUrl: string | null;
  youtubeUrl: string | null;
  pdfUrl: string | null;
  externalUrl: string | null;
  transcript: string | null;
}

export interface Quiz {
  id: UUID;
  lessonId: UUID;
  title: string;
  description: string;
  passingScore: number;
  durationMinutes: number;
  maxAttempt: number;
  shuffleQuestion: boolean;
  shuffleChoice: boolean;
  questions?: Question[];
}

export interface Question {
  id: UUID;
  quizId: UUID;
  type: QuestionType;
  question: string;
  explanation: string | null;
  score: number;
  order: number;
  choices?: Choice[];
}

export interface Choice {
  id: UUID;
  questionId: UUID;
  label: string;
  value: string;
  isCorrect: boolean;
}

export interface QuizAttempt {
  id: UUID;
  quizId: UUID;
  userId: UUID;
  startedAt: DateTime;
  submittedAt: DateTime | null;
  score: number;
  passed: boolean;
  answers?: QuizAnswer[];
}

export interface QuizAnswer {
  id: UUID;
  attemptId: UUID;
  questionId: UUID;
  answer: unknown;
  score: number;
}
