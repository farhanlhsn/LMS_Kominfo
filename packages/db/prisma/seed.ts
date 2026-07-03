import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client";
import { INTERNAL_PLUGIN_MANIFESTS } from "../../shared/src/plugins";

const envCandidates = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "..", "..", ".env"),
  resolve(__dirname, "..", "..", ".env"),
];
const envPath = envCandidates.find((path) => existsSync(path));
if (envPath) {
  config({ path: envPath });
}

const prisma = new PrismaClient();

const permissions = [
  ["platform:admin", "Manage platform-wide settings and foundation data"],
  ["organizations:manage", "Manage organizations"],
  ["memberships:manage", "Manage organization memberships"],
  ["roles:manage", "Manage roles and permissions"],
  ["audit:read", "Read audit logs"],
  ["users:read", "Read organization users"],
  ["users:update", "Update organization users"],
  ["courses:read", "Read courses"],
  ["courses:create", "Create courses"],
  ["courses:update", "Update courses"],
  ["courses:publish", "Publish courses"],
  ["files:read", "Read files"],
  ["files:create", "Upload and manage files"],
  ["files:delete", "Delete files"],
  ["content-library:manage", "Manage content library"],
  ["content:process", "Process activity content"],
  ["plugins:configure", "Configure plugins"],
] as const;

const organizationRoles = [
  [
    "org_admin",
    "Organization Admin",
    "Administrator for a single organization",
  ],
  ["course_manager", "Course Manager", "Manage course operations"],
  ["instructor", "Instructor", "Teach and manage assigned courses"],
  ["assistant_instructor", "Assistant Instructor", "Assist course instructors"],
  ["reviewer", "Reviewer", "Review course and assessment work"],
  ["mentor", "Mentor", "Mentor learners"],
  ["learner", "Learner", "Default learner role"],
  ["support_admin", "Support Admin", "Support organization users"],
  ["finance_admin", "Finance Admin", "Manage organization finance workflows"],
] as const;

async function main() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL ?? "super.admin@example.com";
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD ?? "ChangeMe123!";
  const organizationName =
    process.env.SEED_DEMO_ORG_NAME ?? "Demo Learning Organization";
  const organizationSlug = process.env.SEED_DEMO_ORG_SLUG ?? "demo-learning";

  const passwordHash = await bcrypt.hash(password, 12);

  const permissionRecords = await Promise.all(
    permissions.map(([key, description]) =>
      prisma.permission.upsert({
        where: { key },
        update: { description },
        create: { key, description },
      }),
    ),
  );

  const existingSuperAdminRole = await prisma.role.findFirst({
    where: {
      organizationId: null,
      key: "super_admin",
    },
  });

  const superAdminRole = existingSuperAdminRole
    ? await prisma.role.update({
        where: { id: existingSuperAdminRole.id },
        data: {
          name: "Super Admin",
          description: "Platform-wide administrator",
          isSystem: true,
        },
      })
    : await prisma.role.create({
        data: {
          key: "super_admin",
          name: "Super Admin",
          description: "Platform-wide administrator",
          isSystem: true,
        },
      });

  await Promise.all(
    permissionRecords.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      }),
    ),
  );

  const organization = await prisma.organization.upsert({
    where: { slug: organizationSlug },
    update: {
      name: organizationName,
      timezone: "UTC",
      status: "ACTIVE",
    },
    create: {
      name: organizationName,
      slug: organizationSlug,
      timezone: "UTC",
      status: "ACTIVE",
    },
  });

  await prisma.organizationLoginPolicy.upsert({
    where: { organizationId: organization.id },
    update: {
      allowPasswordLogin: true,
      allowSocialLogin: false,
      allowSsoLogin: false,
      requireSsoForVerifiedDomains: false,
      jitProvisioningEnabled: false,
      inviteOnly: false,
      mfaRequired: false,
      sessionTtlMinutes: 43_200,
    },
    create: {
      organizationId: organization.id,
      allowPasswordLogin: true,
      allowSocialLogin: false,
      allowSsoLogin: false,
      requireSsoForVerifiedDomains: false,
      jitProvisioningEnabled: false,
      inviteOnly: false,
      mfaRequired: false,
      sessionTtlMinutes: 43_200,
    },
  });

  const roleRecords = await Promise.all(
    organizationRoles.map(([key, name, description]) =>
      prisma.role.upsert({
        where: {
          organizationId_key: {
            organizationId: organization.id,
            key,
          },
        },
        update: {
          name,
          description,
          isSystem: true,
        },
        create: {
          organizationId: organization.id,
          key,
          name,
          description,
          isSystem: true,
        },
      }),
    ),
  );

  const orgAdminRole = roleRecords.find((role) => role.key === "org_admin");
  const learnerRole = roleRecords.find((role) => role.key === "learner");

  if (!orgAdminRole || !learnerRole) {
    throw new Error("Required seed roles were not created.");
  }

  const orgAdminPermissionKeys = [
    "organizations:manage",
    "memberships:manage",
    "roles:manage",
    "audit:read",
    "users:read",
    "users:update",
    "courses:read",
    "courses:create",
    "courses:update",
    "courses:publish",
    "files:read",
    "files:create",
    "files:delete",
    "content-library:manage",
    "content:process",
    "plugins:configure",
  ];

  await Promise.all(
    permissionRecords
      .filter((permission) => orgAdminPermissionKeys.includes(permission.key))
      .map((permission) =>
        prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: orgAdminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: orgAdminRole.id,
            permissionId: permission.id,
          },
        }),
      ),
  );

  const coursesRead = permissionRecords.find(
    (permission) => permission.key === "courses:read",
  );

  if (coursesRead) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: learnerRole.id,
          permissionId: coursesRead.id,
        },
      },
      update: {},
      create: {
        roleId: learnerRole.id,
        permissionId: coursesRead.id,
      },
    });
  }

  await seedRolePermissions(roleRecords, permissionRecords);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Platform Super Admin",
      passwordHash,
      timezone: "UTC",
      status: "ACTIVE",
    },
    create: {
      email,
      name: "Platform Super Admin",
      passwordHash,
      timezone: "UTC",
      status: "ACTIVE",
    },
  });

  const existingPasswordIdentity = await prisma.userIdentity.findFirst({
    where: {
      providerType: "PASSWORD",
      organizationId: null,
      providerSubject: email,
    },
  });

  if (existingPasswordIdentity) {
    await prisma.userIdentity.update({
      where: { id: existingPasswordIdentity.id },
      data: {
        userId: user.id,
        providerEmail: email,
        providerEmailVerified: true,
        lastLoginAt: new Date(),
      },
    });
  } else {
    await prisma.userIdentity.create({
      data: {
        userId: user.id,
        providerType: "PASSWORD",
        providerSubject: email,
        providerEmail: email,
        providerEmailVerified: true,
        lastLoginAt: new Date(),
      },
    });
  }

  const member = await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: {
      status: "ACTIVE",
      joinedAt: new Date(),
    },
    create: {
      organizationId: organization.id,
      userId: user.id,
      status: "ACTIVE",
      joinedAt: new Date(),
    },
  });

  await Promise.all(
    [superAdminRole, orgAdminRole].map((role) =>
      prisma.memberRole.upsert({
        where: {
          memberId_roleId: {
            memberId: member.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          memberId: member.id,
          roleId: role.id,
        },
      }),
    ),
  );

  await seedLmsDemoData({
    organizationId: organization.id,
    adminUserId: user.id,
  });

  await seedPluginFoundation({
    organizationId: organization.id,
    installedById: user.id,
  });

  await prisma.auditLog.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      action: "system.seed_completed",
      entityType: "Organization",
      entityId: organization.id,
      severity: "INFO",
      metadata: {
        phase: "00",
        seededRoles: ["super_admin", ...organizationRoles.map(([key]) => key)],
        seededPermissions: permissions.map(([key]) => key),
      },
    },
  });

  console.log(`Seeded ${email} and organization ${organizationSlug}.`);
}

async function seedPluginFoundation(input: {
  organizationId: string;
  installedById: string;
}) {
  for (const manifest of INTERNAL_PLUGIN_MANIFESTS) {
    const plugin = await prisma.plugin.upsert({
      where: { key: manifest.key },
      update: {
        name: manifest.name,
        description: manifest.description,
        version: manifest.version,
        category: manifest.category,
        status: manifest.placeholder ? "DISABLED" : "ACTIVE",
        author: manifest.author,
        manifest: manifest as unknown as Prisma.InputJsonObject,
        configSchema: manifest.configSchema as
          | Prisma.InputJsonObject
          | undefined,
        permissions: (manifest.permissions ?? []) as Prisma.InputJsonArray,
        capabilities: (manifest.capabilities ?? []) as Prisma.InputJsonArray,
      },
      create: {
        key: manifest.key,
        name: manifest.name,
        description: manifest.description,
        version: manifest.version,
        category: manifest.category,
        status: manifest.placeholder ? "DISABLED" : "ACTIVE",
        author: manifest.author,
        manifest: manifest as unknown as Prisma.InputJsonObject,
        configSchema: manifest.configSchema as
          | Prisma.InputJsonObject
          | undefined,
        permissions: (manifest.permissions ?? []) as Prisma.InputJsonArray,
        capabilities: (manifest.capabilities ?? []) as Prisma.InputJsonArray,
      },
    });

    await prisma.organizationPlugin.upsert({
      where: {
        organizationId_pluginId: {
          organizationId: input.organizationId,
          pluginId: plugin.id,
        },
      },
      update: {
        enabled: !manifest.placeholder,
        config: {},
      },
      create: {
        organizationId: input.organizationId,
        pluginId: plugin.id,
        enabled: !manifest.placeholder,
        config: {},
        installedById: input.installedById,
      },
    });

    await prisma.pluginPermission.deleteMany({
      where: { pluginId: plugin.id },
    });
    await Promise.all(
      (manifest.permissions ?? []).map((permissionKey) =>
        prisma.pluginPermission.create({
          data: {
            pluginId: plugin.id,
            permissionKey,
            description: `Requested by ${manifest.name}`,
          },
        }),
      ),
    );
  }
}

async function seedRolePermissions(
  roles: Array<{ id: string; key: string }>,
  permissions: Array<{ id: string; key: string }>,
) {
  const permissionByKey = new Map(
    permissions.map((permission) => [permission.key, permission]),
  );

  const rolePermissionMap: Record<string, string[]> = {
    course_manager: [
      "courses:read",
      "courses:create",
      "courses:update",
      "courses:publish",
      "files:read",
      "files:create",
      "files:delete",
      "content-library:manage",
      "content:process",
    ],
    org_admin: permissions
      .map((permission) => permission.key)
      .filter((key) => key !== "platform:admin"),
    instructor: [
      "courses:read",
      "courses:create",
      "courses:update",
      "files:read",
      "files:create",
      "content-library:manage",
      "content:process",
    ],
    assistant_instructor: [
      "courses:read",
      "courses:update",
      "files:read",
      "files:create",
      "content-library:manage",
    ],
    reviewer: ["courses:read", "courses:publish", "files:read"],
    mentor: ["courses:read"],
    learner: ["courses:read"],
    support_admin: ["users:read", "audit:read", "files:read"],
    finance_admin: ["audit:read"],
  };

  await Promise.all(
    roles.flatMap((role) =>
      (rolePermissionMap[role.key] ?? [])
        .map((permissionKey) => permissionByKey.get(permissionKey))
        .filter((permission): permission is { id: string; key: string } =>
          Boolean(permission),
        )
        .map((permission) =>
          prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permission.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permission.id,
            },
          }),
        ),
    ),
  );
}

async function seedLmsDemoData(input: {
  organizationId: string;
  adminUserId: string;
}) {
  const instructor = await upsertDemoUser(
    "instructor@example.com",
    "Demo Instructor",
    "instructor",
  );
  const learnerOne = await upsertDemoUser(
    "learner.one@example.com",
    "Demo Learner One",
    "learner",
  );
  const learnerTwo = await upsertDemoUser(
    "learner.two@example.com",
    "Demo Learner Two",
    "learner",
  );

  const categoryInputs: Array<[string, string, string]> = [
    ["web-development", "Web Development", "Frontend and backend web skills"],
    ["data-skills", "Data Skills", "Analytics and data foundations"],
    ["leadership", "Leadership", "Team and professional growth"],
  ];
  const categories = await Promise.all(
    categoryInputs.map(([slug, name, description], orderIndex) =>
      prisma.courseCategory.upsert({
        where: {
          organizationId_slug: {
            organizationId: input.organizationId,
            slug,
          },
        },
        update: {
          name,
          description,
          orderIndex,
        },
        create: {
          organizationId: input.organizationId,
          slug,
          name,
          description,
          orderIndex,
        },
      }),
    ),
  );

  const webCategory = categories.find(
    (category) => category.slug === "web-development",
  );
  const dataCategory = categories.find(
    (category) => category.slug === "data-skills",
  );
  const leadershipCategory = categories.find(
    (category) => category.slug === "leadership",
  );

  if (!webCategory || !dataCategory || !leadershipCategory) {
    throw new Error("Demo categories were not created.");
  }

  const courses = [
    {
      categoryId: webCategory.id,
      title: "Foundations of Modern Web Apps",
      slug: "foundations-modern-web-apps",
      subtitle: "Build accessible, maintainable web application foundations.",
      status: "PUBLISHED" as const,
      visibility: "ORGANIZATION_ONLY" as const,
      level: "BEGINNER" as const,
      tags: ["web", "frontend", "backend"],
      objectives: [
        "Explain the structure of modern web applications",
        "Create a basic accessible UI",
        "Understand API-driven learning products",
      ],
    },
    {
      categoryId: dataCategory.id,
      title: "Data Literacy for Teams",
      slug: "data-literacy-for-teams",
      subtitle: "Read, question, and communicate with data confidently.",
      status: "PUBLISHED" as const,
      visibility: "ORGANIZATION_ONLY" as const,
      level: "ALL_LEVELS" as const,
      tags: ["data", "analytics"],
      objectives: [
        "Identify useful data questions",
        "Interpret charts responsibly",
        "Communicate insight with context",
      ],
    },
    {
      categoryId: leadershipCategory.id,
      title: "Instructor-Led Leadership Draft",
      slug: "instructor-led-leadership-draft",
      subtitle: "Draft course for instructor builder validation.",
      status: "DRAFT" as const,
      visibility: "PRIVATE" as const,
      level: "INTERMEDIATE" as const,
      tags: ["leadership", "draft"],
      objectives: ["Draft a leadership learning journey"],
    },
  ];

  for (const courseInput of courses) {
    await prisma.course.deleteMany({
      where: {
        organizationId: input.organizationId,
        slug: courseInput.slug,
      },
    });

    const course = await prisma.course.create({
      data: {
        organizationId: input.organizationId,
        categoryId: courseInput.categoryId,
        title: courseInput.title,
        slug: courseInput.slug,
        subtitle: courseInput.subtitle,
        description:
          "A demo course created by the Phase 02 seed to exercise catalog, builder, enrollment, and progress flows.",
        level: courseInput.level,
        language: "en",
        durationMinutes: courseInput.status === "DRAFT" ? 45 : 120,
        status: courseInput.status,
        visibility: courseInput.visibility,
        learningObjectives: courseInput.objectives,
        requirements: ["A web browser", "Curiosity"],
        targetAudience: ["Learners", "Instructors"],
        tags: courseInput.tags,
        publishedAt: courseInput.status === "PUBLISHED" ? new Date() : null,
        instructors: {
          create: [
            {
              organizationId: input.organizationId,
              userId: instructor.id,
              role: "OWNER",
            },
            {
              organizationId: input.organizationId,
              userId: input.adminUserId,
              role: "REVIEWER",
            },
          ],
        },
      },
    });

    await seedCourseCurriculum(input.organizationId, course.id);

    if (course.status === "PUBLISHED") {
      await enrollDemoLearner(input.organizationId, course.id, learnerOne.id);
      await enrollDemoLearner(input.organizationId, course.id, learnerTwo.id);
    }
  }

  await seedContentLibraryDemoData(input.organizationId, input.adminUserId);
  await seedWorkspaceDemoData(input.organizationId, learnerOne.id);
}

async function upsertDemoUser(email: string, name: string, roleKey: string) {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      status: "ACTIVE",
    },
    create: {
      email,
      name,
      passwordHash,
      status: "ACTIVE",
    },
  });

  const organization = await prisma.organization.findUniqueOrThrow({
    where: { slug: process.env.SEED_DEMO_ORG_SLUG ?? "demo-learning" },
  });
  const role = await prisma.role.findUniqueOrThrow({
    where: {
      organizationId_key: {
        organizationId: organization.id,
        key: roleKey,
      },
    },
  });
  const member = await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: {
      status: "ACTIVE",
      joinedAt: new Date(),
    },
    create: {
      organizationId: organization.id,
      userId: user.id,
      status: "ACTIVE",
      joinedAt: new Date(),
    },
  });

  await prisma.memberRole.upsert({
    where: {
      memberId_roleId: {
        memberId: member.id,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      memberId: member.id,
      roleId: role.id,
    },
  });

  const existingIdentity = await prisma.userIdentity.findFirst({
    where: {
      providerType: "PASSWORD",
      organizationId: null,
      providerSubject: email,
    },
  });

  if (existingIdentity) {
    await prisma.userIdentity.update({
      where: { id: existingIdentity.id },
      data: {
        userId: user.id,
        providerEmail: email,
        providerEmailVerified: true,
      },
    });
  } else {
    await prisma.userIdentity.create({
      data: {
        userId: user.id,
        providerType: "PASSWORD",
        providerSubject: email,
        providerEmail: email,
        providerEmailVerified: true,
      },
    });
  }

  return user;
}

async function seedCourseCurriculum(organizationId: string, courseId: string) {
  const moduleInputs: Array<{
    title: string;
    lessons: Array<{
      title: string;
      activities: Array<[string, string]>;
    }>;
  }> = [
    {
      title: "Orientation",
      lessons: [
        {
          title: "Welcome and Outcomes",
          activities: [
            ["core.text", "Read the course overview"],
            ["core.video", "Watch the welcome video"],
          ],
        },
        {
          title: "Learning Resources",
          activities: [
            ["core.link", "Open the resource list"],
            ["core.file", "Download the starter worksheet"],
          ],
        },
      ],
    },
    {
      title: "Core Practice",
      lessons: [
        {
          title: "Guided Practice",
          activities: [
            ["core.text", "Study the worked example"],
            ["core.video", "Watch the walkthrough"],
          ],
        },
        {
          title: "Reflection",
          activities: [
            ["core.text", "Write a short reflection"],
            ["core.link", "Review optional references"],
          ],
        },
      ],
    },
  ];

  for (const [moduleIndex, moduleInput] of moduleInputs.entries()) {
    const courseModule = await prisma.courseModule.create({
      data: {
        organizationId,
        courseId,
        title: moduleInput.title,
        description: `Demo module ${moduleIndex + 1}`,
        orderIndex: moduleIndex,
        isPublished: true,
      },
    });

    for (const [lessonIndex, lessonInput] of moduleInput.lessons.entries()) {
      const lesson = await prisma.lesson.create({
        data: {
          organizationId,
          courseId,
          moduleId: courseModule.id,
          title: lessonInput.title,
          slug: slugify(`${moduleInput.title}-${lessonInput.title}`),
          summary: "Demo lesson for Phase 02.",
          orderIndex: lessonIndex,
          isPublished: true,
          estimatedMinutes: 15,
        },
      });

      for (const [
        activityIndex,
        [activityTypeKey, title],
      ] of lessonInput.activities.entries()) {
        const contentFields = demoActivityContentFields(activityTypeKey, title);
        await prisma.activity.create({
          data: {
            organizationId,
            courseId,
            lessonId: lesson.id,
            title,
            activityTypeKey,
            orderIndex: activityIndex,
            isRequired: true,
            isPublished: true,
            estimatedMinutes: activityTypeKey === "core.video" ? 8 : 5,
            config: {
              placeholder: true,
            },
            content: contentFields.content,
            completionRule: {
              type: "manual",
            },
            activityContent: {
              create: {
                organizationId,
                body: contentFields.content,
                content: contentFields.content,
                textContent: contentFields.textContent,
                externalUrl: contentFields.externalUrl,
                resources: contentFields.resources,
                metadata: contentFields.metadata,
              },
            },
          },
        });
      }
    }
  }
}

async function enrollDemoLearner(
  organizationId: string,
  courseId: string,
  userId: string,
) {
  await prisma.enrollment.upsert({
    where: {
      organizationId_courseId_userId: {
        organizationId,
        courseId,
        userId,
      },
    },
    update: {
      status: "ACTIVE",
    },
    create: {
      organizationId,
      courseId,
      userId,
      status: "ACTIVE",
    },
  });
}

async function seedContentLibraryDemoData(
  organizationId: string,
  createdById: string,
) {
  await prisma.contentLibraryItem.deleteMany({
    where: {
      organizationId,
      title: {
        in: [
          "Welcome Video Placeholder",
          "Starter Worksheet Placeholder",
          "Course Overview Text",
        ],
      },
    },
  });
  await prisma.file.deleteMany({
    where: {
      organizationId,
      key: {
        startsWith: `organizations/${organizationId}/seed/`,
      },
    },
  });
  await prisma.folder.deleteMany({
    where: {
      organizationId,
      name: "Seed Library",
    },
  });

  const folder = await prisma.folder.create({
    data: {
      organizationId,
      name: "Seed Library",
      createdById,
    },
  });

  const worksheetFile = await prisma.file.create({
    data: {
      organizationId,
      ownerId: createdById,
      folderId: folder.id,
      bucket: process.env.S3_BUCKET ?? process.env.STORAGE_BUCKET ?? "lms-local",
      key: `organizations/${organizationId}/seed/starter-worksheet.pdf`,
      filename: "starter-worksheet.pdf",
      originalFilename: "starter-worksheet.pdf",
      mimeType: "application/pdf",
      extension: "pdf",
      size: 1024,
      checksum: "seed-placeholder",
      visibility: "ORGANIZATION",
      accessLevel: "ENROLLED_LEARNERS",
      purpose: "DOCUMENT",
      processingStatus: "READY",
      metadata: {
        seeded: true,
        description: "Metadata-only seed file for local development.",
      },
      processedMetadata: {
        pages: 1,
        extractedTextAvailable: false,
      },
    },
  });

  await prisma.activityContent.updateMany({
    where: {
      organizationId,
      activity: {
        activityTypeKey: "core.file",
      },
    },
    data: {
      fileId: worksheetFile.id,
      metadata: {
        processingStatus: "READY",
        seededFileAttached: true,
      },
    },
  });

  await prisma.contentLibraryItem.createMany({
    data: [
      {
        organizationId,
        createdById,
        title: "Welcome Video Placeholder",
        description: "Reusable video activity content for course orientation.",
        type: "VIDEO",
        tags: ["orientation", "video"],
        metadata: {
          externalUrl:
            "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
          provider: "external-url",
          durationSeconds: 12,
        },
      },
      {
        organizationId,
        createdById,
        fileId: worksheetFile.id,
        title: "Starter Worksheet Placeholder",
        description: "Reusable downloadable worksheet metadata.",
        type: "PDF",
        tags: ["worksheet", "pdf"],
        metadata: {
          textContent: "Starter worksheet for learner practice.",
          source: "seed",
        },
      },
      {
        organizationId,
        createdById,
        title: "Course Overview Text",
        description: "Reusable rich text block for introductory lessons.",
        type: "RICH_TEXT",
        tags: ["overview", "rich-text"],
        metadata: {
          textContent:
            "This course overview introduces outcomes, expectations, and next steps.",
          blocks: [
            {
              type: "paragraph",
              text: "This course overview introduces outcomes, expectations, and next steps.",
            },
          ],
        },
      },
    ],
  });
}

async function seedWorkspaceDemoData(organizationId: string, learnerId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { organizationId, userId: learnerId, status: "ACTIVE" },
    include: {
      course: {
        include: {
          modules: {
            orderBy: { orderIndex: "asc" },
            include: {
              lessons: {
                orderBy: { orderIndex: "asc" },
                include: {
                  activities: {
                    orderBy: { orderIndex: "asc" },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: "asc" },
  });
  let selected:
    | {
        enrollment: (typeof enrollments)[number];
        lesson: (typeof enrollments)[number]["course"]["modules"][number]["lessons"][number];
        videoActivity: (typeof enrollments)[number]["course"]["modules"][number]["lessons"][number]["activities"][number];
        textActivity?: (typeof enrollments)[number]["course"]["modules"][number]["lessons"][number]["activities"][number];
      }
    | undefined;
  for (const enrollment of enrollments) {
    for (const module of enrollment.course.modules) {
      for (const lesson of module.lessons) {
        const videoActivity = lesson.activities.find(
          (activity) => activity.activityTypeKey === "core.video",
        );
        if (videoActivity) {
          selected = {
            enrollment,
            lesson,
            videoActivity,
            textActivity: lesson.activities.find(
              (activity) => activity.activityTypeKey === "core.text",
            ),
          };
          break;
        }
      }
      if (selected) break;
    }
    if (selected) break;
  }
  if (!selected) return;
  const { enrollment, lesson, videoActivity, textActivity } = selected;

  await prisma.learningWorkspacePreference.upsert({
    where: {
      organizationId_userId: {
        organizationId,
        userId: learnerId,
      },
    },
    update: {
      preferredLayout: "side_by_side",
      rightPanelMode: "notes",
      transcriptEnabled: true,
      notesPanelOpen: true,
    },
    create: {
      organizationId,
      userId: learnerId,
      preferredLayout: "side_by_side",
      rightPanelMode: "notes",
      transcriptEnabled: true,
      notesPanelOpen: true,
    },
  });

  const state = await prisma.lessonWorkspaceState.findFirst({
    where: {
      organizationId,
      userId: learnerId,
      courseId: enrollment.courseId,
      lessonId: lesson.id,
      activityId: videoActivity.id,
    },
  });
  if (state) {
    await prisma.lessonWorkspaceState.update({
      where: { id: state.id },
      data: {
        layout: "split_video_transcript",
        rightPanelMode: "transcript",
        lastVideoTimeSeconds: 4,
        lastOpenedAt: new Date(),
      },
    });
  } else {
    await prisma.lessonWorkspaceState.create({
      data: {
        organizationId,
        userId: learnerId,
        courseId: enrollment.courseId,
        lessonId: lesson.id,
        activityId: videoActivity.id,
        layout: "split_video_transcript",
        rightPanelMode: "transcript",
        lastVideoTimeSeconds: 4,
      },
    });
  }

  await prisma.learnerNote.deleteMany({
    where: {
      organizationId,
      userId: learnerId,
      metadata: { path: ["seededPhase"], equals: "05" },
    },
  });
  await prisma.learnerBookmark.deleteMany({
    where: {
      organizationId,
      userId: learnerId,
      metadata: { path: ["seededPhase"], equals: "05" },
    },
  });
  await prisma.transcriptSegment.deleteMany({
    where: {
      organizationId,
      activityId: videoActivity.id,
      metadata: { path: ["seededPhase"], equals: "05" },
    },
  });

  await prisma.learnerNote.create({
    data: {
      organizationId,
      userId: learnerId,
      courseId: enrollment.courseId,
      lessonId: lesson.id,
      activityId: videoActivity.id,
      videoTimeSeconds: 4,
      content: "Pay attention to the workspace controls and transcript sync.",
      metadata: { seededPhase: "05" },
    },
  });
  await prisma.learnerBookmark.create({
    data: {
      organizationId,
      userId: learnerId,
      courseId: enrollment.courseId,
      lessonId: lesson.id,
      activityId: videoActivity.id,
      videoTimeSeconds: 6,
      title: "Replay welcome example",
      note: "Useful timestamp for orientation.",
      metadata: { seededPhase: "05" },
    },
  });
  await prisma.transcriptSegment.createMany({
    data: [
      {
        organizationId,
        courseId: enrollment.courseId,
        lessonId: lesson.id,
        activityId: videoActivity.id,
        startSeconds: 0,
        endSeconds: 4,
        text: "Welcome to the lesson workspace.",
        language: "en",
        orderIndex: 0,
        metadata: { seededPhase: "05" },
      },
      {
        organizationId,
        courseId: enrollment.courseId,
        lessonId: lesson.id,
        activityId: videoActivity.id,
        startSeconds: 4,
        endSeconds: 9,
        text: "Use notes, bookmarks, and transcripts while learning.",
        language: "en",
        orderIndex: 1,
        metadata: { seededPhase: "05" },
      },
      {
        organizationId,
        courseId: enrollment.courseId,
        lessonId: lesson.id,
        activityId: videoActivity.id,
        startSeconds: 9,
        endSeconds: 12,
        text: "Your progress and workspace state are saved.",
        language: "en",
        orderIndex: 2,
        metadata: { seededPhase: "05" },
      },
    ],
  });
  await prisma.activity.update({
    where: { id: videoActivity.id },
    data: {
      assessmentDisplayPolicy: {
        allowPopout: true,
        allowDualWindow: true,
        allowAIAssistant: true,
        allowNotes: true,
        allowTranscript: true,
        requireFocusMode: false,
        detectTabSwitch: false,
      },
    },
  });
  if (textActivity) {
    await prisma.activity.update({
      where: { id: textActivity.id },
      data: {
        assessmentDisplayPolicy: {
          allowPopout: true,
          allowDualWindow: true,
          allowAIAssistant: true,
          allowNotes: true,
          allowTranscript: false,
          requireFocusMode: false,
          detectTabSwitch: false,
        },
      },
    });
  }
}

function demoActivityContentFields(activityTypeKey: string, title: string) {
  if (activityTypeKey === "core.video") {
    return {
      content: {
        videoUrl:
          "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        provider: "external-url",
        title,
      },
      textContent: `Video overview for ${title}.`,
      externalUrl:
        "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      resources: [],
      metadata: {
        provider: "external-url",
        durationSeconds: 12,
      },
    };
  }

  if (activityTypeKey === "core.file") {
    return {
      content: {
        title,
        filePlaceholder: true,
      },
      textContent: `Downloadable resource for ${title}.`,
      externalUrl: undefined,
      resources: [],
      metadata: {
        processingStatus: "READY",
      },
    };
  }

  if (activityTypeKey === "core.link") {
    return {
      content: {
        url: "https://example.com/resources",
        title,
      },
      textContent: `External resource for ${title}.`,
      externalUrl: "https://example.com/resources",
      resources: [],
      metadata: {
        opensInNewTab: true,
      },
    };
  }

  return {
    content: {
      body: `Demo text content for ${title}.`,
      format: "plain_text",
    },
    textContent: `Demo text content for ${title}.`,
    externalUrl: undefined,
    resources: [],
    metadata: {
      format: "plain_text",
    },
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
