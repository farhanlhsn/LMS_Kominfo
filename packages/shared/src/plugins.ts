export const PLUGIN_CATEGORIES = [
  "ACTIVITY",
  "CONTENT",
  "ASSESSMENT",
  "AI_TOOL",
  "INTEGRATION",
  "PAYMENT_PROVIDER",
  "NOTIFICATION_CHANNEL",
  "STORAGE_PROVIDER",
  "VIDEO_PROVIDER",
  "PROCTORING_PROVIDER",
  "ANALYTICS",
  "CERTIFICATE_REQUIREMENT",
] as const;

export type PluginCategory = (typeof PLUGIN_CATEGORIES)[number];

export const PLUGIN_DISTRIBUTIONS = ["CORE", "MARKETPLACE"] as const;
export type PluginDistribution = (typeof PLUGIN_DISTRIBUTIONS)[number];

export const PLUGIN_RUNTIME_KINDS = [
  "INTERNAL",
  "DECLARATIVE",
  "REMOTE_IFRAME",
] as const;
export type PluginRuntimeKind = (typeof PLUGIN_RUNTIME_KINDS)[number];

export interface PluginActivityType {
  key: string;
  name: string;
  description?: string;
  supportedWorkspaceLayouts?: string[];
  implemented?: boolean;
}

export interface PluginWorkspacePanel {
  key: string;
  name: string;
  defaultSize?: "sm" | "md" | "lg";
  defaultPosition?: "left" | "right" | "bottom" | "floating";
  allowedRoutes?: string[];
  configSchema?: Record<string, unknown>;
}

export interface PluginSecretConfig {
  key: string;
  label: string;
  description?: string;
  required?: boolean;
}

export interface InternalPluginManifest {
  key: string;
  name: string;
  description?: string;
  version: string;
  category: PluginCategory;
  distribution: PluginDistribution;
  runtime: {
    kind: PluginRuntimeKind;
    entrypoint?: string;
  };
  compatibility?: {
    minimumCoreVersion?: string;
    maximumCoreVersion?: string;
  };
  author?: string;
  activityTypes?: PluginActivityType[];
  workspacePanels?: PluginWorkspacePanel[];
  permissions?: string[];
  capabilities?: string[];
  dependencies?: string[];
  configSchema?: Record<string, unknown>;
  secretConfig?: PluginSecretConfig[];
  placeholder?: boolean;
}

type PluginDefinition = Omit<
  InternalPluginManifest,
  "distribution" | "runtime"
>;

const CORE_PLUGIN_DEFINITIONS: PluginDefinition[] = [
  {
    key: "core.text",
    name: "Text Activity",
    description: "Core rich text lesson activity renderer.",
    version: "1.0.0",
    category: "ACTIVITY",
    activityTypes: [
      {
        key: "core.text",
        name: "Text",
        supportedWorkspaceLayouts: ["standard", "side_by_side", "focus"],
        implemented: true,
      },
    ],
    permissions: ["courses:read"],
    capabilities: ["render_activity", "edit_activity", "track_progress"],
  },
  {
    key: "core.video",
    name: "Video Activity",
    description: "Core video activity renderer with progress tracking.",
    version: "1.0.0",
    category: "ACTIVITY",
    activityTypes: [
      {
        key: "core.video",
        name: "Video",
        supportedWorkspaceLayouts: ["standard", "side_by_side", "theatre"],
        implemented: true,
      },
    ],
    permissions: ["courses:read"],
    capabilities: ["render_activity", "edit_activity", "track_progress"],
  },
  {
    key: "core.file",
    name: "File Activity",
    description: "Core file and PDF activity renderer.",
    version: "1.0.0",
    category: "ACTIVITY",
    activityTypes: [
      {
        key: "core.file",
        name: "File",
        supportedWorkspaceLayouts: ["standard", "side_by_side"],
        implemented: true,
      },
    ],
    permissions: ["courses:read", "files:read"],
    capabilities: ["render_activity", "edit_activity"],
  },
  {
    key: "core.link",
    name: "Link Activity",
    description: "Core external link activity renderer.",
    version: "1.0.0",
    category: "ACTIVITY",
    activityTypes: [
      {
        key: "core.link",
        name: "Link",
        supportedWorkspaceLayouts: ["standard"],
        implemented: true,
      },
    ],
    permissions: ["courses:read"],
    capabilities: ["render_activity", "edit_activity"],
  },
  {
    key: "core.quiz",
    name: "Quiz Activity",
    description: "Core quiz assessment activity renderer and grading engine.",
    version: "1.0.0",
    category: "ASSESSMENT",
    activityTypes: [
      {
        key: "core.quiz",
        name: "Quiz",
        supportedWorkspaceLayouts: ["standard", "focus"],
        implemented: true,
      },
    ],
    permissions: ["courses:read", "quiz:manage", "quiz:grade"],
    capabilities: [
      "render_activity",
      "edit_activity",
      "track_progress",
      "grade_assessment",
    ],
  },
  {
    key: "core.assignment",
    name: "Assignment Activity",
    description: "Core assignment submission and grading activity renderer.",
    version: "1.0.0",
    category: "ASSESSMENT",
    activityTypes: [
      {
        key: "core.assignment",
        name: "Assignment",
        supportedWorkspaceLayouts: ["standard", "side_by_side", "focus"],
        implemented: true,
      },
    ],
    permissions: ["courses:read", "assignments:manage", "assignments:grade"],
    capabilities: [
      "render_activity",
      "edit_activity",
      "track_progress",
      "grade_assessment",
    ],
  },
];

const MARKETPLACE_PLUGIN_DEFINITIONS: PluginDefinition[] = [
  {
    key: "plugin.ai_provider",
    name: "AI Provider",
    description:
      "Organization-scoped AI provider, model, endpoint, and encrypted API key configuration shared by optional AI plugins.",
    version: "1.0.0",
    category: "INTEGRATION",
    permissions: ["plugins:configure"],
    capabilities: ["manage_ai_provider", "use_ai_provider"],
    configSchema: {
      type: "object",
      properties: {
        chatProvider: {
          type: "string",
          enum: [
            "mock",
            "openai",
            "openai_compatible",
            "gemini_openai_compatible",
          ],
        },
        embeddingProvider: {
          type: "string",
          enum: [
            "mock",
            "local",
            "openai",
            "openai_compatible",
            "gemini_openai_compatible",
          ],
        },
        baseUrl: { type: "string" },
        chatModel: { type: "string" },
        embeddingModel: { type: "string" },
        providerOrganizationId: { type: "string" },
      },
      additionalProperties: false,
    },
    secretConfig: [
      {
        key: "apiKey",
        label: "API key",
        description:
          "Encrypted per organization. Leave empty when using mock or local providers.",
      },
    ],
  },
  {
    key: "plugin.ai_course_indexer",
    name: "AI Course Knowledge Indexer",
    description:
      "Extracts published course content, transcripts, and supported files into an organization-isolated retrieval index.",
    version: "1.0.0",
    category: "AI_TOOL",
    permissions: ["courses:read", "courses:update"],
    capabilities: ["index_course_content", "view_index_status"],
    dependencies: ["plugin.ai_provider"],
  },
  {
    key: "plugin.ai_tutor",
    name: "AI Learning Tutor",
    description:
      "Course-grounded learner tutor with citations, assessment boundaries, tenant rate limits, and usage logs.",
    version: "1.0.0",
    category: "AI_TOOL",
    permissions: ["courses:read"],
    capabilities: ["view_ai_tutor", "ask_ai_tutor"],
    dependencies: ["plugin.ai_provider", "plugin.ai_course_indexer"],
    workspacePanels: [
      {
        key: "ai",
        name: "AI Tutor",
        defaultSize: "md",
        defaultPosition: "right",
        allowedRoutes: ["/learn"],
      },
    ],
  },
  {
    key: "plugin.ai_content_studio",
    name: "AI Content Studio",
    description:
      "Creates reviewable summaries and reusable learning-content drafts without publishing automatically.",
    version: "1.0.0",
    category: "AI_TOOL",
    permissions: ["courses:read", "courses:update"],
    capabilities: ["generate_summaries", "manage_ai_drafts"],
    dependencies: ["plugin.ai_provider"],
  },
  {
    key: "plugin.ai_question_generator",
    name: "AI Question Generator",
    description:
      "Generates reviewable question-bank drafts from indexed course material or video transcripts.",
    version: "1.0.0",
    category: "AI_TOOL",
    permissions: ["courses:read", "courses:update", "quiz:manage"],
    capabilities: ["generate_questions", "manage_ai_drafts"],
    dependencies: ["plugin.ai_provider", "plugin.ai_course_indexer"],
  },
  {
    key: "plugin.ai_grading_assistant",
    name: "AI Grading Assistant",
    description:
      "Suggests scores and feedback for written quiz answers while keeping instructor approval mandatory.",
    version: "1.0.0",
    category: "AI_TOOL",
    permissions: ["quiz:grade"],
    capabilities: ["suggest_grades", "view_grading_rationale"],
    dependencies: ["plugin.ai_provider"],
    configSchema: {
      type: "object",
      properties: {
        confidenceThreshold: {
          type: "number",
          minimum: 0,
          maximum: 1,
          default: 0.7,
        },
      },
      additionalProperties: false,
    },
  },
  {
    key: "plugin.3d_viewer",
    name: "3D Viewer Activity",
    description:
      "Internal 3D asset viewer with GLB/GLTF metadata, scene configuration, interactions, and workspace preview support.",
    version: "1.0.0",
    category: "ACTIVITY",
    activityTypes: [
      {
        key: "plugin.3d_viewer",
        name: "3D Viewer",
        supportedWorkspaceLayouts: ["standard", "side_by_side", "focus"],
        implemented: true,
      },
    ],
    permissions: ["courses:read", "files:read"],
    capabilities: [
      "render_activity",
      "edit_activity",
      "track_progress",
      "manage_3d_assets",
      "manage_3d_scenes",
      "track_interactions",
      "popout_preview",
    ],
    workspacePanels: [
      {
        key: "3d-inspector",
        name: "3D Inspector",
        defaultSize: "md",
        defaultPosition: "right",
        allowedRoutes: ["/learn"],
      },
    ],
  },
  {
    key: "plugin.code_runner",
    name: "Code Runner Activity",
    description:
      "Internal code exercise runner with sandbox adapter, execution history, test cases, and grading support.",
    version: "1.0.0",
    category: "ASSESSMENT",
    activityTypes: [
      {
        key: "plugin.code_runner",
        name: "Code Runner",
        supportedWorkspaceLayouts: ["standard", "side_by_side", "focus"],
        implemented: true,
      },
    ],
    permissions: ["courses:read", "assignments:manage", "assignments:grade"],
    capabilities: [
      "render_activity",
      "edit_activity",
      "track_progress",
      "execute_code",
      "grade_assessment",
      "sandboxed_execution",
    ],
  },
  {
    key: "plugin.h5p",
    name: "H5P Activity",
    description:
      "Plugin-ready H5P content activity with metadata, learner result tracking, and xAPI-compatible reporting hooks.",
    version: "1.0.0",
    category: "CONTENT",
    activityTypes: [
      {
        key: "plugin.h5p",
        name: "H5P",
        supportedWorkspaceLayouts: ["standard", "focus"],
        implemented: true,
      },
    ],
    permissions: ["courses:read", "courses:update"],
    capabilities: [
      "render_activity",
      "edit_activity",
      "track_progress",
      "h5p_results",
      "xapi_reporting",
      "runtime_bridge",
    ],
  },
  {
    key: "plugin.scorm",
    name: "SCORM Activity",
    description:
      "Plugin-ready SCORM package activity with attempt state, score commits, and REST runtime bridge support.",
    version: "1.0.0",
    category: "CONTENT",
    activityTypes: [
      {
        key: "plugin.scorm",
        name: "SCORM",
        supportedWorkspaceLayouts: ["standard", "focus"],
        implemented: true,
      },
    ],
    permissions: ["courses:read", "courses:update"],
    capabilities: [
      "render_activity",
      "edit_activity",
      "track_progress",
      "scorm_attempts",
      "runtime_bridge",
      "xapi_reporting",
    ],
  },
];

export const CORE_PLUGIN_MANIFESTS: InternalPluginManifest[] =
  CORE_PLUGIN_DEFINITIONS.map((manifest) => ({
    ...manifest,
    distribution: "CORE",
    runtime: { kind: "INTERNAL" },
  }));

export const MARKETPLACE_PLUGIN_MANIFESTS: InternalPluginManifest[] =
  MARKETPLACE_PLUGIN_DEFINITIONS.map((manifest) => ({
    ...manifest,
    distribution: "MARKETPLACE",
    runtime: { kind: "INTERNAL" },
    compatibility: { minimumCoreVersion: "1.0.0" },
  }));

export const PLUGIN_CATALOG_MANIFESTS: InternalPluginManifest[] = [
  ...CORE_PLUGIN_MANIFESTS,
  ...MARKETPLACE_PLUGIN_MANIFESTS,
];

/**
 * Backward-compatible alias for older seed and registry imports.
 * New code should select CORE_PLUGIN_MANIFESTS or MARKETPLACE_PLUGIN_MANIFESTS.
 */
export const INTERNAL_PLUGIN_MANIFESTS = PLUGIN_CATALOG_MANIFESTS;

export function isValidPluginCategory(value: string): value is PluginCategory {
  return PLUGIN_CATEGORIES.includes(value as PluginCategory);
}
