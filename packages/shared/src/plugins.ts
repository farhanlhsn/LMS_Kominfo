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

export interface PluginActivityType {
  key: string;
  name: string;
  description?: string;
  supportedWorkspaceLayouts?: string[];
  implemented?: boolean;
}

export interface InternalPluginManifest {
  key: string;
  name: string;
  description?: string;
  version: string;
  category: PluginCategory;
  author?: string;
  activityTypes?: PluginActivityType[];
  permissions?: string[];
  capabilities?: string[];
  configSchema?: Record<string, unknown>;
  placeholder?: boolean;
}

export const INTERNAL_PLUGIN_MANIFESTS: InternalPluginManifest[] = [
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
    permissions: [
      "courses:read",
      "assignments:manage",
      "assignments:grade",
    ],
    capabilities: [
      "render_activity",
      "edit_activity",
      "track_progress",
      "grade_assessment",
    ],
  },
  {
    key: "plugin.3d_viewer",
    name: "3D Viewer Placeholder",
    description: "Manifest placeholder only. The 3D plugin is implemented later.",
    version: "0.1.0",
    category: "ACTIVITY",
    capabilities: ["placeholder"],
    placeholder: true,
  },
  {
    key: "plugin.code_runner",
    name: "Code Runner Placeholder",
    description: "Manifest placeholder only. Code execution is implemented later.",
    version: "0.1.0",
    category: "ACTIVITY",
    capabilities: ["placeholder"],
    placeholder: true,
  },
  {
    key: "plugin.h5p",
    name: "H5P Placeholder",
    description: "Manifest placeholder only. H5P support is implemented later.",
    version: "0.1.0",
    category: "CONTENT",
    capabilities: ["placeholder"],
    placeholder: true,
  },
  {
    key: "plugin.scorm",
    name: "SCORM Placeholder",
    description: "Manifest placeholder only. SCORM support is implemented later.",
    version: "0.1.0",
    category: "CONTENT",
    capabilities: ["placeholder"],
    placeholder: true,
  },
];

export function isValidPluginCategory(value: string): value is PluginCategory {
  return PLUGIN_CATEGORIES.includes(value as PluginCategory);
}
