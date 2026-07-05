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
  ["quiz:manage", "Manage question banks and quizzes"],
  ["quiz:grade", "Grade quiz attempts"],
  ["assignments:manage", "Manage assignments and rubrics"],
  ["assignments:grade", "Grade assignment submissions"],
  ["certificates:manage", "Manage certificate templates"],
  ["certificates:issue", "Issue and revoke certificates"],
  ["goals:manage", "Manage learner goals"],
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
    "quiz:manage",
    "quiz:grade",
    "assignments:manage",
    "assignments:grade",
    "certificates:manage",
    "certificates:issue",
    "goals:manage",
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

  // Phase 10: Seed sample analytics events
  const demoCourse10 = await prisma.course.findFirst({ where: { organizationId: org.id } });
  if (demoCourse10) {
    const learners10 = await prisma.enrollment.findMany({ where: { organizationId: org.id, courseId: demoCourse10.id }, take: 3 });
    const eventTypes = ['activity.started','activity.completed','video.watched','quiz.attempted','resource.viewed'];
    const now10 = new Date();
    for (let day = 0; day < 14; day++) {
      for (const enrollment of learners10) {
        const count = Math.floor(Math.random() * 5) + 1;
        for (let i = 0; i < count; i++) {
          const d = new Date(now10);
          d.setDate(d.getDate() - day); d.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));
          await prisma.learningEvent.create({
            data: { organizationId: org.id, userId: enrollment.userId, courseId: demoCourse10.id,
              eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)], metadata: { source: 'seed' }, createdAt: d },
          });
        }
      }
    }
    console.log('Seeded ' + learners10.length * 14 + ' sample learning events.');
  }

  // Phase 11: Seed skills, learning paths, achievements, XP
  const courses11 = await prisma.course.findMany({ where: { organizationId: org.id, deletedAt: null }, take: 3 });
  if (courses11.length > 0) {
    const skillData = [{name:'JavaScript',category:'Programming'},{name:'Python',category:'Programming'},{name:'Data Analysis',category:'Data Science'},{name:'Machine Learning',category:'Data Science'},{name:'UI Design',category:'Design'},{name:'Project Management',category:'Professional'}];
    for (const s of skillData) {
      await prisma.skill.upsert({ where: { organizationId_slug: { organizationId: org.id, slug: s.name.toLowerCase().replace(/[^a-z0-9]+/g,'-') } }, update: { name: s.name, category: s.category }, create: { organizationId: org.id, name: s.name, slug: s.name.toLowerCase().replace(/[^a-z0-9]+/g,'-'), category: s.category } });
    }
    console.log('Seeded ' + skillData.length + ' skills.');

    await prisma.learningPath.upsert({ where: { organizationId_slug: { organizationId: org.id, slug: 'full-stack-development' } }, update: {}, create: { organizationId: org.id, title: 'Full Stack Development', slug: 'full-stack-development', description: 'Become a full-stack developer with this comprehensive program.', status: 'PUBLISHED', durationHours: 120 } });
    const lp = await prisma.learningPath.findFirst({ where: { organizationId: org.id, slug: 'full-stack-development' } });
    if (lp) { for (let i = 0; i < courses11.length; i++) { await prisma.learningPathCourse.upsert({ where: { learningPathId_courseId: { learningPathId: lp.id, courseId: courses11[i].id } }, update: {}, create: { learningPathId: lp.id, courseId: courses11[i].id, orderIndex: i } }); } }
    console.log('Seeded learning path with ' + courses11.length + ' courses.');

    const aDefs = [{key:'first_course',name:'First Steps',description:'Complete your first course',xpReward:100,criteria:{}},{key:'xp_collector',name:'XP Collector',description:'Earn 500 XP',xpReward:200,criteria:{minXp:500}},{key:'xp_master',name:'XP Master',description:'Earn 2000 XP',xpReward:500,criteria:{minXp:2000}}];
    for (const a of aDefs) {
      await prisma.achievement.upsert({ where: { organizationId_key: { organizationId: org.id, key: a.key } }, update: { name: a.name, xpReward: a.xpReward }, create: { organizationId: org.id, key: a.key, name: a.name, description: a.description, xpReward: a.xpReward, criteria: a.criteria } });
    }
    console.log('Seeded ' + aDefs.length + ' achievements.');

    const eu = await prisma.enrollment.findMany({ where: { organizationId: org.id }, select: { userId: true }, distinct: ['userId'] });
    for (const u of eu.slice(0,5)) { await prisma.xpTransaction.create({ data: { organizationId: org.id, userId: u.userId, amount: Math.floor(Math.random() * 500) + 100, reason: 'Seed XP', sourceType: 'seed' } }); }
    console.log('Seeded XP for ' + Math.min(eu.length, 5) + ' learners.');
  }

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
          Prisma.InputJsonObject | undefined,
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
          Prisma.InputJsonObject | undefined,
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
      "quiz:manage",
      "quiz:grade",
      "assignments:manage",
      "assignments:grade",
      "certificates:manage",
      "certificates:issue",
      "goals:manage",
    ],
    org_admin: permissions
      .map((permission) => permission.key)
      .filter((key) => key !== "platform:admin"),
    instructor: [
      "courses:read",
      "courses:create",
      "courses:update",
      "courses:publish",
      "files:read",
      "files:create",
      "content-library:manage",
      "content:process",
      "quiz:manage",
      "quiz:grade",
      "assignments:manage",
      "assignments:grade",
      "certificates:issue",
    ],
    assistant_instructor: [
      "courses:read",
      "courses:update",
      "files:read",
      "files:create",
      "content-library:manage",
      "quiz:manage",
      "assignments:manage",
    ],
    reviewer: [
      "courses:read",
      "courses:publish",
      "files:read",
      "quiz:grade",
      "assignments:grade",
    ],
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

  await seedNetworkingSimulationCourse({
    organizationId: input.organizationId,
    categoryId: webCategory.id,
    instructorId: instructor.id,
    adminUserId: input.adminUserId,
    learnerIds: [learnerOne.id, learnerTwo.id],
  });

  await seedGptPracticeLabCourse({
    organizationId: input.organizationId,
    categoryId: webCategory.id,
    instructorId: instructor.id,
    adminUserId: input.adminUserId,
    learnerIds: [learnerOne.id, learnerTwo.id],
  });

  await seedContentLibraryDemoData(input.organizationId, input.adminUserId);
  await seedWorkspaceDemoData(input.organizationId, learnerOne.id);
  await seedQuizDemoData(input.organizationId, instructor.id);
  await seedPhase07DemoData(input.organizationId, instructor.id, learnerOne.id);
  await seedPhase08AiDemoData(input.organizationId);
}

async function seedPhase08AiDemoData(organizationId: string) {
  const activity = await prisma.activity.findFirst({
    where: {
      organizationId,
      activityTypeKey: "core.text",
      isPublished: true,
      course: { status: "PUBLISHED", deletedAt: null },
    },
    include: { lesson: true, activityContent: true },
    orderBy: { createdAt: "asc" },
  });
  if (!activity) return;
  await prisma.aiDocument.deleteMany({
    where: {
      organizationId,
      metadata: { path: ["seededPhase"], equals: "08" },
    },
  });
  const rawText =
    activity.activityContent?.textContent ??
    "Modern learning platforms use a REST API to connect the learner interface with course data. Tenant isolation keeps courses, enrollments, and progress inside the active organization. Learners can use notes, transcripts, and progress tracking while studying.";
  const document = await prisma.aiDocument.create({
    data: {
      organizationId,
      courseId: activity.courseId,
      lessonId: activity.lessonId,
      activityId: activity.id,
      title: activity.title,
      sourceType: "ACTIVITY_CONTENT",
      rawText,
      contentHash: "seed-phase-08",
      status: "READY",
      indexedAt: new Date(),
      metadata: { seededPhase: "08" },
    },
  });
  const embedding = seedEmbedding(rawText, 384);
  await prisma.aiDocumentChunk.create({
    data: {
      organizationId,
      sourceDocumentId: document.id,
      courseId: activity.courseId,
      lessonId: activity.lessonId,
      activityId: activity.id,
      chunkIndex: 0,
      content: rawText,
      tokenCount: Math.ceil(rawText.length / 4),
      embedding,
      embeddingProvider: "mock",
      embeddingModel: "mock-embedding",
      embeddingDimensions: embedding.length,
      status: "READY",
      metadata: { seededPhase: "08" },
    },
  });
}

function seedEmbedding(text: string, dimensions: number) {
  const vector = new Array<number>(dimensions).fill(0);
  for (const word of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    let hash = 2166136261;
    for (const character of word) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    const index = Math.abs(hash) % dimensions;
    vector[index] = (vector[index] ?? 0) + ((hash & 1) === 0 ? 1 : -1);
  }
  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0),
  );
  return magnitude ? vector.map((value) => value / magnitude) : vector;
}

async function seedNetworkingSimulationCourse(input: {
  organizationId: string;
  categoryId: string;
  instructorId: string;
  adminUserId: string;
  learnerIds: string[];
}) {
  const slug = "dasar-jaringan-tcp-ip-untuk-pemula";
  await prisma.course.deleteMany({
    where: {
      organizationId: input.organizationId,
      slug,
    },
  });

  const course = await prisma.course.create({
    data: {
      organizationId: input.organizationId,
      categoryId: input.categoryId,
      title: "Dasar Jaringan TCP/IP untuk Pemula",
      slug,
      subtitle:
        "Pahami cara data bergerak di internet melalui TCP, UDP, DNS, HTTP, dan HTTPS.",
      description:
        "Course simulasi dengan materi nyata tentang konsep jaringan komputer sehari-hari. Materi ditulis untuk learner non-spesialis agar bisa bertanya ke AI Tutor dan mendapatkan jawaban berbasis course material.",
      level: "BEGINNER",
      language: "id",
      durationMinutes: 95,
      status: "PUBLISHED",
      visibility: "ORGANIZATION_ONLY",
      learningObjectives: [
        "Menjelaskan peran IP address, port, dan protokol transport.",
        "Membedakan TCP dan UDP berdasarkan reliability, ordering, dan latency.",
        "Mengikuti alur sederhana saat browser membuka website HTTPS.",
        "Menggunakan langkah dasar troubleshooting jaringan.",
        "Mengenali risiko keamanan dasar seperti DNS spoofing dan koneksi tanpa TLS.",
      ],
      requirements: [
        "Bisa menggunakan browser",
        "Tidak perlu pengalaman jaringan sebelumnya",
      ],
      targetAudience: [
        "Learner pemula",
        "Helpdesk junior",
        "Developer yang ingin memahami jaringan dasar",
      ],
      tags: ["networking", "tcp-ip", "dns", "http", "security"],
      metadata: {
        seededSimulation: true,
        materialLanguage: "id",
        references: [
          "RFC 768 - User Datagram Protocol",
          "RFC 9293 - Transmission Control Protocol",
          "RFC 9110 - HTTP Semantics",
          "RFC 8446 - TLS 1.3",
        ],
      },
      publishedAt: new Date(),
      instructors: {
        create: [
          {
            organizationId: input.organizationId,
            userId: input.instructorId,
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

  const modules: Array<{
    title: string;
    description: string;
    lessons: Array<{
      title: string;
      summary: string;
      activities: Array<{
        type: "core.text" | "core.link";
        title: string;
        minutes: number;
        text: string;
        url?: string;
      }>;
    }>;
  }> = [
    {
      title: "Fondasi Internet",
      description: "Konsep alamat, port, dan paket data.",
      lessons: [
        {
          title: "Cara data bergerak di internet",
          summary:
            "Gambaran sederhana tentang perangkat, router, IP address, port, dan packet switching.",
          activities: [
            {
              type: "core.text",
              title: "Apa yang terjadi saat membuka website?",
              minutes: 10,
              text: [
                "Saat learner mengetik alamat website, perangkat tidak langsung mengirim satu file besar. Data dipecah menjadi paket-paket kecil. Setiap paket membawa alamat tujuan, alamat sumber, dan informasi protokol agar perangkat lain tahu cara meneruskannya.",
                "IP address berfungsi seperti alamat lokasi perangkat di jaringan. Port berfungsi seperti nomor pintu aplikasi di perangkat tersebut. Contohnya, browser biasanya mengakses HTTPS di port 443. Server yang sama bisa menjalankan beberapa layanan berbeda karena masing-masing layanan memakai port berbeda.",
                "Router membaca alamat tujuan pada paket dan meneruskannya ke jalur berikutnya. Router tidak harus mengetahui seluruh isi komunikasi; tugas utamanya adalah memilih arah berikutnya sampai paket tiba di jaringan tujuan.",
                "Karena jaringan bisa padat atau berubah, paket dapat menempuh jalur berbeda. Protokol di atas IP, seperti TCP atau UDP, menentukan apakah paket perlu dicek ulang, diurutkan, atau dikirim secepat mungkin.",
              ].join("\n\n"),
            },
            {
              type: "core.text",
              title: "IP address, port, dan protokol",
              minutes: 8,
              text: [
                "IP adalah lapisan alamat. IPv4 memakai format seperti 192.0.2.10, sedangkan IPv6 memakai format lebih panjang seperti 2001:db8::10. Di jaringan lokal, perangkat sering mendapat alamat dari DHCP agar pengguna tidak perlu mengatur alamat manual.",
                "Port adalah angka 0 sampai 65535 yang membantu sistem operasi mengirim data ke aplikasi yang benar. Port 53 umum dipakai DNS, port 80 untuk HTTP, dan port 443 untuk HTTPS. Nomor port bukan jaminan keamanan; ia hanya menunjukkan endpoint layanan.",
                "Protokol adalah kesepakatan format dan aturan komunikasi. Dua perangkat dapat saling memahami karena memakai protokol yang sama. Jika protokolnya berbeda, data mungkin sampai ke tujuan tetapi tidak dapat ditafsirkan dengan benar.",
                "Dalam troubleshooting, tiga pertanyaan awal yang berguna adalah: apakah alamat tujuan benar, apakah port layanan terbuka, dan apakah protokol yang digunakan sesuai dengan layanan tujuan.",
              ].join("\n\n"),
            },
          ],
        },
      ],
    },
    {
      title: "TCP, UDP, DNS, dan Web",
      description: "Protokol yang paling sering ditemui saat menggunakan web.",
      lessons: [
        {
          title: "TCP dan UDP",
          summary:
            "Perbedaan reliability, ordering, retransmission, dan latency.",
          activities: [
            {
              type: "core.text",
              title: "Perbedaan TCP dan UDP",
              minutes: 12,
              text: [
                "TCP atau Transmission Control Protocol dirancang untuk komunikasi yang andal. Sebelum data utama dikirim, client dan server membuat koneksi. TCP memberi nomor urut pada byte data, meminta pengiriman ulang jika ada data hilang, dan menyusun kembali data agar aplikasi menerima aliran yang rapi.",
                "Keunggulan TCP adalah reliability dan ordering. Jika sebuah paket hilang, TCP berusaha mengirim ulang. Ini cocok untuk web, email, transfer file, login, dan transaksi yang membutuhkan data lengkap dan urut. Kekurangannya, mekanisme pengecekan dan pengiriman ulang dapat menambah latensi.",
                "UDP atau User Datagram Protocol lebih sederhana. UDP mengirim datagram tanpa membuat koneksi dan tanpa jaminan paket sampai, urut, atau tidak duplikat. Karena overhead kecil, UDP cocok untuk kebutuhan yang lebih sensitif terhadap waktu seperti voice call, video call, game online, DNS query, dan streaming tertentu.",
                "UDP bukan berarti selalu tidak andal. Aplikasi dapat menambahkan mekanisme sendiri di atas UDP jika dibutuhkan. Contoh modern adalah QUIC, protokol transport yang berjalan di atas UDP dan dipakai HTTP/3 untuk menggabungkan kecepatan koneksi dengan fitur reliability pada level aplikasi.",
                "Cara mengingatnya: TCP seperti jasa pengiriman yang meminta tanda terima dan mengurutkan paket; UDP seperti mengirim kartu pos cepat tanpa meminta konfirmasi. Pilihan terbaik bergantung pada kebutuhan aplikasi: kelengkapan data atau respons cepat.",
              ].join("\n\n"),
            },
            {
              type: "core.link",
              title: "Referensi resmi TCP",
              minutes: 5,
              url: "https://www.rfc-editor.org/rfc/rfc9293",
              text: [
                "Referensi lanjutan: RFC 9293 menjelaskan TCP sebagai protokol transport andal. Untuk simulasi belajar, cukup pahami bahwa TCP menangani koneksi, urutan, acknowledgement, dan retransmission.",
                "Bandingkan dengan UDP pada RFC 768: UDP meminimalkan overhead dan menyerahkan reliability tambahan ke aplikasi jika diperlukan.",
              ].join("\n\n"),
            },
          ],
        },
        {
          title: "DNS, HTTP, dan HTTPS",
          summary:
            "Alur dari nama domain sampai browser menerima halaman aman.",
          activities: [
            {
              type: "core.text",
              title: "DNS mengubah nama menjadi alamat",
              minutes: 10,
              text: [
                "DNS atau Domain Name System menerjemahkan nama seperti example.com menjadi alamat IP. Tanpa DNS, pengguna harus mengingat alamat IP server, bukan nama yang mudah dibaca.",
                "Saat browser membutuhkan alamat, sistem mengecek cache lokal terlebih dahulu. Jika belum ada, pertanyaan dikirim ke resolver DNS. Resolver dapat bertanya ke root server, TLD server, lalu authoritative name server sampai menemukan record yang sesuai.",
                "Record A mengarah ke alamat IPv4, AAAA ke IPv6, CNAME ke alias domain, MX ke server email, dan TXT sering dipakai untuk verifikasi domain atau kebijakan email. TTL menentukan berapa lama jawaban DNS boleh disimpan di cache.",
                "DNS tradisional tidak mengenkripsi isi query. Karena itu, beberapa lingkungan memakai DNS over HTTPS atau DNS over TLS untuk meningkatkan privasi dan mengurangi risiko manipulasi di jaringan yang tidak tepercaya.",
              ].join("\n\n"),
            },
            {
              type: "core.text",
              title: "HTTP, HTTPS, dan TLS",
              minutes: 12,
              text: [
                "HTTP adalah protokol aplikasi untuk pertukaran request dan response. Browser mengirim request seperti GET /index.html, lalu server mengirim response berisi status code, header, dan body. Status 200 berarti berhasil, 301 atau 302 berarti redirect, 404 berarti tidak ditemukan, dan 500 berarti server error.",
                "HTTPS adalah HTTP yang berjalan di atas TLS. TLS memberi tiga perlindungan utama: confidentiality agar isi data tidak mudah dibaca pihak lain, integrity agar perubahan data bisa terdeteksi, dan authentication agar browser dapat memverifikasi identitas server melalui sertifikat.",
                "Saat membuka website HTTPS, browser melakukan DNS lookup, membuka koneksi transport, melakukan TLS handshake, memverifikasi sertifikat, lalu mengirim HTTP request di dalam koneksi terenkripsi. Setelah itu server mengirim response yang ditampilkan sebagai halaman.",
                "Ikon gembok di browser bukan berarti website pasti aman dari penipuan. Gembok terutama berarti koneksi ke domain tersebut terenkripsi dan sertifikatnya valid. Pengguna tetap perlu memeriksa domain, konteks, dan data yang diminta website.",
              ].join("\n\n"),
            },
          ],
        },
      ],
    },
    {
      title: "Troubleshooting dan Keamanan Dasar",
      description: "Langkah praktis mendiagnosis masalah koneksi.",
      lessons: [
        {
          title: "Mendiagnosis masalah jaringan",
          summary:
            "Urutan berpikir saat website atau aplikasi tidak bisa diakses.",
          activities: [
            {
              type: "core.text",
              title: "Checklist troubleshooting jaringan",
              minutes: 14,
              text: [
                "Troubleshooting jaringan sebaiknya dimulai dari gejala yang paling spesifik. Apakah hanya satu website yang gagal, semua website gagal, hanya Wi-Fi tertentu yang bermasalah, atau hanya satu aplikasi yang tidak bisa konek?",
                "Langkah pertama adalah memeriksa konektivitas lokal: apakah perangkat mendapat IP address, gateway, dan DNS resolver. Jika perangkat tidak mendapat alamat, masalah mungkin ada pada Wi-Fi, kabel, DHCP, atau konfigurasi adapter.",
                "Langkah kedua adalah memeriksa resolusi nama. Jika domain tidak berubah menjadi IP, masalah bisa ada pada DNS cache, resolver, salah ketik domain, atau record DNS yang belum menyebar. Mengganti resolver sementara dapat membantu isolasi masalah.",
                "Langkah ketiga adalah memeriksa jalur dan port. Jika IP bisa dijangkau tetapi aplikasi gagal, port tujuan mungkin tertutup, firewall memblokir, service mati, atau TLS handshake gagal. Untuk aplikasi web, cek juga status code HTTP dan pesan error browser.",
                "Catatan penting: ping yang gagal tidak selalu berarti server mati. Banyak server memblokir ICMP. Sebaliknya, ping yang berhasil tidak menjamin aplikasi berjalan, karena aplikasi mungkin memakai TCP port tertentu yang berbeda dari ICMP.",
              ].join("\n\n"),
            },
            {
              type: "core.text",
              title: "Keamanan dasar saat memakai jaringan publik",
              minutes: 10,
              text: [
                "Jaringan publik seperti Wi-Fi kafe atau bandara sebaiknya dianggap tidak sepenuhnya tepercaya. Pengguna lain di jaringan yang sama mungkin dapat mencoba mengamati traffic, membuat hotspot palsu, atau mengarahkan pengguna ke halaman login tiruan.",
                "HTTPS membantu melindungi isi komunikasi, tetapi pengguna tetap perlu waspada terhadap domain palsu. Jangan memasukkan password jika domain terlihat aneh, sertifikat bermasalah, atau browser memberi peringatan keamanan.",
                "Gunakan update sistem operasi dan browser, aktifkan MFA untuk akun penting, hindari mengirim data sensitif melalui website tanpa HTTPS, dan gunakan VPN tepercaya jika organisasi mengharuskannya untuk akses internal.",
                "Di sisi organisasi, keamanan jaringan dasar mencakup segmentasi jaringan, firewall, logging, patch rutin, sertifikat TLS yang dikelola benar, dan pelatihan pengguna untuk mengenali phishing serta captive portal palsu.",
              ].join("\n\n"),
            },
          ],
        },
      ],
    },
  ];

  for (const [moduleIndex, moduleInput] of modules.entries()) {
    const courseModule = await prisma.courseModule.create({
      data: {
        organizationId: input.organizationId,
        courseId: course.id,
        title: moduleInput.title,
        description: moduleInput.description,
        orderIndex: moduleIndex,
        isPublished: true,
      },
    });

    for (const [lessonIndex, lessonInput] of moduleInput.lessons.entries()) {
      const lesson = await prisma.lesson.create({
        data: {
          organizationId: input.organizationId,
          courseId: course.id,
          moduleId: courseModule.id,
          title: lessonInput.title,
          slug: slugify(`${moduleInput.title}-${lessonInput.title}`),
          summary: lessonInput.summary,
          orderIndex: lessonIndex,
          isPublished: true,
          estimatedMinutes: lessonInput.activities.reduce(
            (sum, activity) => sum + activity.minutes,
            0,
          ),
        },
      });

      for (const [activityIndex, activityInput] of lessonInput.activities.entries()) {
        const html = `<article>${activityInput.text
          .split("\n\n")
          .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
          .join("")}</article>`;
        await prisma.activity.create({
          data: {
            organizationId: input.organizationId,
            courseId: course.id,
            lessonId: lesson.id,
            title: activityInput.title,
            activityTypeKey: activityInput.type,
            orderIndex: activityIndex,
            isRequired: true,
            isPublished: true,
            estimatedMinutes: activityInput.minutes,
            config: { seededSimulation: true },
            content: {
              format: "rich_text_html",
              html,
              url: activityInput.url,
            },
            completionRule: { type: "manual" },
            activityContent: {
              create: {
                organizationId: input.organizationId,
                body: {
                  format: "rich_text_html",
                  html,
                  url: activityInput.url,
                },
                content: {
                  format: "rich_text_html",
                  html,
                  url: activityInput.url,
                },
                textContent: activityInput.text,
                externalUrl: activityInput.url,
                resources: activityInput.url
                  ? [{ label: activityInput.title, url: activityInput.url }]
                  : [],
                metadata: {
                  seededSimulation: true,
                  sourceQuality: "authored-from-standard-networking-concepts",
                },
              },
            },
          },
        });
      }
    }
  }

  for (const learnerId of input.learnerIds) {
    await enrollDemoLearner(input.organizationId, course.id, learnerId);
  }
}

async function seedGptPracticeLabCourse(input: {
  organizationId: string;
  categoryId: string;
  instructorId: string;
  adminUserId: string;
  learnerIds: string[];
}) {
  const slug = "praktik-produktif-dengan-gpt";
  const companionVideoUrl =
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
  await prisma.course.deleteMany({
    where: {
      organizationId: input.organizationId,
      slug,
    },
  });

  const course = await prisma.course.create({
    data: {
      organizationId: input.organizationId,
      categoryId: input.categoryId,
      title: "Praktik Produktif dengan GPT",
      slug,
      subtitle:
        "Belajar menyusun prompt, menguji jawaban, dan memakai lab eksternal tanpa meninggalkan konteks lesson.",
      description:
        "Course simulasi lab dengan materi asli tentang penggunaan GPT untuk belajar dan bekerja. Learner dapat menonton panduan, membuka ChatGPT, dan memilih mode belajar sesuai perangkat.",
      level: "BEGINNER",
      language: "id",
      durationMinutes: 50,
      status: "PUBLISHED",
      visibility: "ORGANIZATION_ONLY",
      learningObjectives: [
        "Membedakan prompt tujuan, konteks, batasan, dan format output.",
        "Menggunakan GPT sebagai partner latihan tanpa menyalin jawaban mentah.",
        "Memilih mode lab yang nyaman untuk single monitor, dual monitor, atau mobile.",
      ],
      requirements: ["Browser modern", "Akun pada lab eksternal jika diperlukan"],
      targetAudience: [
        "Learner pemula",
        "Instruktur yang ingin membuat lab berbasis tool eksternal",
      ],
      tags: ["gpt", "prompting", "practice-lab", "productivity"],
      metadata: {
        seededSimulation: true,
        materialLanguage: "id",
        externalLab: "https://chatgpt.com/",
      },
      publishedAt: new Date(),
      instructors: {
        create: [
          {
            organizationId: input.organizationId,
            userId: input.instructorId,
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

  const module = await prisma.courseModule.create({
    data: {
      organizationId: input.organizationId,
      courseId: course.id,
      title: "Lab 1",
      description: "Belajar prompt sambil membuka tool eksternal.",
      orderIndex: 0,
      isPublished: true,
    },
  });

  const lesson = await prisma.lesson.create({
    data: {
      organizationId: input.organizationId,
      courseId: course.id,
      moduleId: module.id,
      title: "Membuat prompt belajar dengan GPT",
      slug: "membuat-prompt-belajar-dengan-gpt",
      summary:
        "Tonton panduan singkat, baca pola prompt, lalu praktik di ChatGPT dengan mode belajar pilihan.",
      orderIndex: 0,
      isPublished: true,
      estimatedMinutes: 25,
    },
  });

  await prisma.activity.create({
    data: {
      organizationId: input.organizationId,
      courseId: course.id,
      lessonId: lesson.id,
      title: "Tonton panduan lab prompt",
      description:
        "Video pendamping untuk menguji pengalaman PiP dan alur praktik eksternal.",
      activityTypeKey: "core.video",
      orderIndex: 0,
      isRequired: true,
      isPublished: true,
      estimatedMinutes: 5,
      config: { seededSimulation: true },
      content: {
        videoUrl: companionVideoUrl,
        provider: "external-url",
        title: "Panduan lab prompt",
      },
      completionRule: { type: "manual" },
      activityContent: {
        create: {
          organizationId: input.organizationId,
          body: {
            videoUrl: companionVideoUrl,
            provider: "external-url",
            title: "Panduan lab prompt",
          },
          content: {
            videoUrl: companionVideoUrl,
            provider: "external-url",
            title: "Panduan lab prompt",
          },
          textContent:
            "Video pendamping menunjukkan cara menjaga konteks lesson tetap terbuka saat praktik di lab eksternal.",
          externalUrl: companionVideoUrl,
          resources: [],
          metadata: {
            provider: "external-url",
            durationSeconds: 12,
            seededSimulation: true,
          },
        },
      },
    },
  });

  const promptGuideText = [
    "Prompt yang baik biasanya punya empat bagian: tujuan, konteks, batasan, dan format output. Tujuan menjelaskan apa yang ingin dicapai. Konteks memberi latar belakang agar GPT tidak menebak terlalu jauh. Batasan menjelaskan gaya, panjang, bahasa, atau hal yang tidak boleh dilakukan. Format output membuat hasil mudah dipakai.",
    "Contoh prompt belajar: Saya sedang belajar jaringan komputer dasar. Jelaskan perbedaan TCP dan UDP untuk pemula, gunakan analogi sederhana, lalu buat tiga pertanyaan latihan tanpa memberikan jawabannya dulu.",
    "Saat memakai GPT untuk belajar, jangan langsung meminta jawaban akhir untuk tugas atau kuis. Gunakan sebagai partner berpikir: minta penjelasan bertahap, contoh tambahan, pengecekan miskonsepsi, atau latihan soal. Untuk materi yang punya sumber course, bandingkan jawaban GPT dengan materi resmi di lesson.",
    "Jika jawaban terasa terlalu umum, tambahkan konteks. Jika jawaban terlalu panjang, minta ringkasan dengan struktur tertentu. Jika jawaban meragukan, minta GPT menyebutkan asumsi dan bagian yang perlu diverifikasi.",
  ].join("\n\n");
  const promptGuideHtml = `<article>${promptGuideText
    .split("\n\n")
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("")}</article>`;

  await prisma.activity.create({
    data: {
      organizationId: input.organizationId,
      courseId: course.id,
      lessonId: lesson.id,
      title: "Baca pola prompt yang aman",
      activityTypeKey: "core.text",
      orderIndex: 1,
      isRequired: true,
      isPublished: true,
      estimatedMinutes: 8,
      config: { seededSimulation: true },
      content: {
        format: "rich_text_html",
        html: promptGuideHtml,
      },
      completionRule: { type: "manual" },
      activityContent: {
        create: {
          organizationId: input.organizationId,
          body: {
            format: "rich_text_html",
            html: promptGuideHtml,
          },
          content: {
            format: "rich_text_html",
            html: promptGuideHtml,
          },
          textContent: promptGuideText,
          resources: [],
          metadata: {
            seededSimulation: true,
            sourceQuality: "authored-prompting-guidance",
          },
        },
      },
    },
  });

  const labText = [
    "Buka ChatGPT dan praktikkan prompt dari materi sebelumnya. Tujuan lab ini adalah mencoba iterasi prompt: mulai dari prompt sederhana, baca hasilnya, lalu perbaiki dengan konteks, batasan, dan format output.",
    "Gunakan mode Side by side jika hanya punya satu layar desktop dan ingin lesson tetap terlihat. Gunakan New tab + PiP jika ingin video pendamping tetap mengambang saat lab dibuka. Gunakan Dual monitor jika punya layar kedua dan ingin memindahkan lab ke monitor lain.",
    "Untuk mobile, buka lab di tab baru atau recent apps, lalu kembali ke lesson untuk mengecek instruksi. Jika browser mendukung PiP, aktifkan PiP dari video pendamping sebelum membuka lab.",
  ].join("\n\n");

  await prisma.activity.create({
    data: {
      organizationId: input.organizationId,
      courseId: course.id,
      lessonId: lesson.id,
      title: "Lab: Praktik prompt di ChatGPT",
      description:
        "Pilih cara belajar yang paling nyaman sebelum membuka lab eksternal.",
      activityTypeKey: "core.link",
      orderIndex: 2,
      isRequired: true,
      isPublished: true,
      estimatedMinutes: 12,
      config: {
        seededSimulation: true,
        supportedWorkspaceLayouts: [
          "side_by_side",
          "dual_window",
          "picture_in_picture_video",
        ],
      },
      content: {
        url: "https://chatgpt.com/",
        title: "ChatGPT practice lab",
        lab: {
          enabled: true,
          providerName: "ChatGPT",
          url: "https://chatgpt.com/",
          videoUrl: companionVideoUrl,
          videoTitle: "Video pendamping lab prompt",
          instructions: [
            "Baca pola prompt di aktivitas sebelumnya.",
            "Pilih mode belajar sesuai perangkat dan jumlah layar.",
            "Coba satu prompt, evaluasi hasilnya, lalu revisi prompt dengan konteks tambahan.",
          ],
          sideBySideNote:
            "Membuka lab di jendela kecil agar lesson tetap terlihat di layar yang sama.",
          pipNote:
            "Menyalakan PiP video jika tersedia, lalu membuka ChatGPT di tab baru.",
          dualMonitorNote:
            "Membuka lab di tab baru agar bisa dipindah ke monitor kedua.",
        },
      },
      completionRule: { type: "manual" },
      activityContent: {
        create: {
          organizationId: input.organizationId,
          body: {
            url: "https://chatgpt.com/",
            title: "ChatGPT practice lab",
          },
          content: {
            url: "https://chatgpt.com/",
            title: "ChatGPT practice lab",
            lab: {
              enabled: true,
              providerName: "ChatGPT",
              url: "https://chatgpt.com/",
              videoUrl: companionVideoUrl,
              videoTitle: "Video pendamping lab prompt",
              instructions: [
                "Baca pola prompt di aktivitas sebelumnya.",
                "Pilih mode belajar sesuai perangkat dan jumlah layar.",
                "Coba satu prompt, evaluasi hasilnya, lalu revisi prompt dengan konteks tambahan.",
              ],
              sideBySideNote:
                "Membuka lab di jendela kecil agar lesson tetap terlihat di layar yang sama.",
              pipNote:
                "Menyalakan PiP video jika tersedia, lalu membuka ChatGPT di tab baru.",
              dualMonitorNote:
                "Membuka lab di tab baru agar bisa dipindah ke monitor kedua.",
            },
          },
          textContent: labText,
          externalUrl: "https://chatgpt.com/",
          resources: [{ label: "ChatGPT", url: "https://chatgpt.com/" }],
          metadata: {
            seededSimulation: true,
            opensInNewTab: true,
            lab: {
              enabled: true,
              providerName: "ChatGPT",
              url: "https://chatgpt.com/",
              videoUrl: companionVideoUrl,
              videoTitle: "Video pendamping lab prompt",
              instructions: [
                "Baca pola prompt di aktivitas sebelumnya.",
                "Pilih mode belajar sesuai perangkat dan jumlah layar.",
                "Coba satu prompt, evaluasi hasilnya, lalu revisi prompt dengan konteks tambahan.",
              ],
              sideBySideNote:
                "Membuka lab di jendela kecil agar lesson tetap terlihat di layar yang sama.",
              pipNote:
                "Menyalakan PiP video jika tersedia, lalu membuka ChatGPT di tab baru.",
              dualMonitorNote:
                "Membuka lab di tab baru agar bisa dipindah ke monitor kedua.",
            },
          },
        },
      },
    },
  });

  for (const learnerId of input.learnerIds) {
    await enrollDemoLearner(input.organizationId, course.id, learnerId);
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
      bucket:
        process.env.S3_BUCKET ?? process.env.STORAGE_BUCKET ?? "lms-local",
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

async function seedWorkspaceDemoData(
  organizationId: string,
  learnerId: string,
) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId,
      userId: learnerId,
      status: "ACTIVE",
      course: {
        deletedAt: null,
      },
    },
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

async function seedQuizDemoData(organizationId: string, instructorId: string) {
  const course = await prisma.course.findFirst({
    where: {
      organizationId,
      slug: "foundations-modern-web-apps",
      deletedAt: null,
    },
    include: {
      modules: {
        orderBy: { orderIndex: "asc" },
        include: {
          lessons: {
            orderBy: { orderIndex: "asc" },
            include: { activities: true },
          },
        },
      },
    },
  });
  if (!course) return;
  const lesson = course.modules[0]?.lessons[0];
  if (!lesson) return;

  await prisma.quiz.deleteMany({
    where: {
      organizationId,
      metadata: { path: ["seededPhase"], equals: "06" },
    },
  });
  await prisma.questionBank.deleteMany({
    where: {
      organizationId,
      metadata: { path: ["seededPhase"], equals: "06" },
    },
  });
  await prisma.activity.deleteMany({
    where: {
      organizationId,
      lessonId: lesson.id,
      activityTypeKey: "core.quiz",
      metadata: { path: ["seededPhase"], equals: "06" },
    },
  });

  const bank = await prisma.questionBank.create({
    data: {
      organizationId,
      ownerId: instructorId,
      courseId: course.id,
      title: "Modern Web Foundations Question Bank",
      description: "Seeded question bank covering core LMS demo concepts.",
      metadata: { seededPhase: "06" },
    },
  });

  const questionInputs: Array<{
    type: Prisma.QuestionCreateInput["type"];
    prompt: string;
    points?: number;
    acceptedAnswers?: string[];
    numericTolerance?: number;
    options?: Array<{ text: string; isCorrect: boolean }>;
  }> = [
    {
      type: "MULTIPLE_CHOICE",
      prompt: "Which layer usually exposes LMS data to the frontend?",
      options: [
        { text: "REST API", isCorrect: true },
        { text: "Local browser cache only", isCorrect: false },
        { text: "Static screenshots", isCorrect: false },
      ],
    },
    {
      type: "MULTIPLE_ANSWER",
      prompt: "Which items are tenant-scoped in this LMS?",
      options: [
        { text: "Courses", isCorrect: true },
        { text: "Enrollments", isCorrect: true },
        { text: "A public JavaScript language keyword", isCorrect: false },
      ],
    },
    {
      type: "TRUE_FALSE",
      prompt: "Published course activities can contribute to course progress.",
      options: [
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false },
      ],
    },
    {
      type: "SHORT_ANSWER",
      prompt: "What HTTP style does this LMS API use?",
      acceptedAnswers: ["REST", "REST API"],
    },
    {
      type: "NUMERIC",
      prompt: "How many points is a 70 percent passing threshold out of 100?",
      acceptedAnswers: ["70"],
      numericTolerance: 0,
    },
    {
      type: "ESSAY",
      prompt: "Explain why tenant isolation matters in a learning platform.",
      points: 3,
    },
    {
      type: "MULTIPLE_CHOICE",
      prompt: "What activity key is used for quiz activities?",
      options: [
        { text: "core.quiz", isCorrect: true },
        { text: "phase.quiz", isCorrect: false },
        { text: "demo.quiz", isCorrect: false },
      ],
    },
    {
      type: "TRUE_FALSE",
      prompt:
        "A failed required quiz should automatically complete the activity.",
      options: [
        { text: "True", isCorrect: false },
        { text: "False", isCorrect: true },
      ],
    },
    {
      type: "MULTIPLE_ANSWER",
      prompt: "Which question types can be auto-graded here?",
      options: [
        { text: "Multiple choice", isCorrect: true },
        { text: "Numeric with accepted answer", isCorrect: true },
        { text: "Essay without rubric", isCorrect: false },
      ],
    },
    {
      type: "SHORT_ANSWER",
      prompt: "Name the active organization header.",
      acceptedAnswers: ["x-organization-id"],
    },
    ...Array.from({ length: 10 }, (_, index) => ({
      type: "MULTIPLE_CHOICE" as const,
      prompt: `Practice check ${index + 1}: Which option is correct?`,
      options: [
        { text: "Correct option", isCorrect: true },
        { text: "Distractor option", isCorrect: false },
        { text: "Another distractor", isCorrect: false },
      ],
    })),
  ];

  const questions = [];
  for (const [index, input] of questionInputs.entries()) {
    const question = await prisma.question.create({
      data: {
        organizationId,
        questionBankId: bank.id,
        createdById: instructorId,
        type: input.type,
        prompt: input.prompt,
        points: input.points ?? 1,
        acceptedAnswers: input.acceptedAnswers ?? [],
        numericTolerance: input.numericTolerance,
        metadata: { seededPhase: "06" },
        options: input.options
          ? {
              create: input.options.map((option, optionIndex) => ({
                text: option.text,
                isCorrect: option.isCorrect,
                orderIndex: optionIndex,
              })),
            }
          : undefined,
      },
    });
    questions.push({ question, orderIndex: index, points: input.points ?? 1 });
  }

  const orderIndex = lesson.activities.length;
  const activity = await prisma.activity.create({
    data: {
      organizationId,
      courseId: course.id,
      lessonId: lesson.id,
      title: "Check your understanding",
      description: "Seeded quiz activity for the quiz engine.",
      activityTypeKey: "core.quiz",
      pluginKey: "core.quiz",
      pluginVersion: "1.0.0",
      orderIndex,
      isRequired: true,
      isPublished: true,
      estimatedMinutes: 10,
      completionRule: { type: "quiz", passingRequired: true },
      gradingRule: { type: "quiz", passingScorePercent: 70 },
      assessmentDisplayPolicy: {
        allowPopout: false,
        allowDualWindow: false,
        allowAIAssistant: false,
        allowNotes: true,
        allowTranscript: false,
        requireFocusMode: false,
        detectTabSwitch: false,
      },
      metadata: { seededPhase: "06" },
      activityContent: {
        create: {
          organizationId,
          body: { quiz: true },
          content: { quiz: true },
          textContent: "Answer the quiz to complete this activity.",
          resources: [],
          metadata: { seededPhase: "06" },
        },
      },
    },
  });

  const quiz = await prisma.quiz.create({
    data: {
      organizationId,
      courseId: course.id,
      activityId: activity.id,
      createdById: instructorId,
      title: "Modern Web Foundations Quiz",
      description: "A seeded published quiz attached to the demo course.",
      status: "PUBLISHED",
      passingScorePercent: 70,
      attemptLimit: 3,
      timeLimitMinutes: 20,
      showCorrectAnswers: true,
      showFeedback: true,
      publishedAt: new Date(),
      metadata: { seededPhase: "06" },
      questions: {
        create: questions.map((item) => ({
          questionId: item.question.id,
          orderIndex: item.orderIndex,
          points: item.points,
        })),
      },
    },
  });

  await prisma.activity.update({
    where: { id: activity.id },
    data: {
      completionRule: { type: "quiz", quizId: quiz.id, passingRequired: true },
      gradingRule: { type: "quiz", quizId: quiz.id, passingScorePercent: 70 },
    },
  });
}

async function seedPhase07DemoData(
  organizationId: string,
  instructorId: string,
  learnerId: string,
) {
  const course = await prisma.course.findFirst({
    where: {
      organizationId,
      slug: "foundations-modern-web-apps",
      deletedAt: null,
    },
    include: {
      modules: {
        orderBy: { orderIndex: "asc" },
        include: {
          lessons: {
            orderBy: { orderIndex: "asc" },
            include: { activities: true },
          },
        },
      },
    },
  });
  if (!course) return;
  const lesson = course.modules[0]?.lessons[0];
  if (!lesson) return;

  await prisma.certificate.deleteMany({
    where: {
      organizationId,
      metadata: { path: ["seededPhase"], equals: "07" },
    },
  });
  await prisma.certificateTemplate.deleteMany({
    where: {
      organizationId,
      metadata: { path: ["seededPhase"], equals: "07" },
    },
  });
  await prisma.assignment.deleteMany({
    where: {
      organizationId,
      metadata: { path: ["seededPhase"], equals: "07" },
    },
  });
  await prisma.rubric.deleteMany({
    where: {
      organizationId,
      metadata: { path: ["seededPhase"], equals: "07" },
    },
  });
  await prisma.learningGoal.deleteMany({
    where: {
      organizationId,
      metadata: { path: ["seededPhase"], equals: "07" },
    },
  });
  await prisma.activity.deleteMany({
    where: {
      organizationId,
      lessonId: lesson.id,
      activityTypeKey: "core.assignment",
      metadata: { path: ["seededPhase"], equals: "07" },
    },
  });

  const rubric = await prisma.rubric.create({
    data: {
      organizationId,
      courseId: course.id,
      createdById: instructorId,
      title: "Project Submission Rubric",
      description: "Seeded rubric for assignment grading.",
      totalPoints: 100,
      status: "ACTIVE",
      metadata: { seededPhase: "07" },
      criteria: {
        create: [
          {
            title: "Completeness",
            maxPoints: 50,
            orderIndex: 0,
            levels: {
              create: [
                { title: "Complete", points: 50, orderIndex: 0 },
                { title: "Partial", points: 25, orderIndex: 1 },
              ],
            },
          },
          {
            title: "Reflection quality",
            maxPoints: 50,
            orderIndex: 1,
            levels: {
              create: [
                { title: "Insightful", points: 50, orderIndex: 0 },
                { title: "Needs more detail", points: 20, orderIndex: 1 },
              ],
            },
          },
        ],
      },
    },
    include: { criteria: { include: { levels: true } } },
  });

  const activity = await prisma.activity.create({
    data: {
      organizationId,
      courseId: course.id,
      lessonId: lesson.id,
      title: "Submit your learning reflection",
      description: "Seeded assignment activity for Phase 07.",
      activityTypeKey: "core.assignment",
      pluginKey: "core.assignment",
      pluginVersion: "1.0.0",
      orderIndex: lesson.activities.length,
      isRequired: true,
      isPublished: true,
      estimatedMinutes: 20,
      completionRule: {
        type: "assignment",
        completeWhen: "graded",
        passingScorePercent: 70,
      },
      gradingRule: { type: "assignment", rubricId: rubric.id },
      assessmentDisplayPolicy: {
        allowPopout: false,
        allowDualWindow: false,
        allowAIAssistant: false,
        allowNotes: true,
        allowTranscript: false,
        requireFocusMode: false,
        detectTabSwitch: false,
      },
      metadata: { seededPhase: "07" },
      activityContent: {
        create: {
          organizationId,
          body: { assignment: true },
          content: { assignment: true },
          textContent:
            "Submit a short reflection and optional supporting link.",
          resources: [],
          metadata: { seededPhase: "07" },
        },
      },
    },
  });

  const assignment = await prisma.assignment.create({
    data: {
      organizationId,
      courseId: course.id,
      activityId: activity.id,
      createdById: instructorId,
      rubricId: rubric.id,
      title: "Learning Reflection Project",
      description:
        "Write a short reflection about how the lesson applies to your work.",
      instructions:
        "Submit 2-3 paragraphs and optionally include a link to supporting material.",
      submissionType: "TEXT_AND_FILE",
      allowLateSubmission: true,
      latePenaltyPercent: 10,
      maxAttempts: 2,
      allowResubmission: true,
      status: "PUBLISHED",
      metadata: { seededPhase: "07" },
    },
  });

  await prisma.activity.update({
    where: { id: activity.id },
    data: {
      completionRule: {
        type: "assignment",
        assignmentId: assignment.id,
        completeWhen: "graded",
        passingScorePercent: 70,
      },
      gradingRule: {
        type: "assignment",
        assignmentId: assignment.id,
        rubricId: rubric.id,
      },
      activityContent: {
        update: {
          content: { assignmentId: assignment.id },
          body: { assignmentId: assignment.id },
        },
      },
    },
  });

  const draftSubmission = await prisma.assignmentSubmission.create({
    data: {
      organizationId,
      assignmentId: assignment.id,
      courseId: course.id,
      activityId: activity.id,
      userId: learnerId,
      attemptNumber: 1,
      status: "SUBMITTED",
      textAnswer:
        "This reflection connects the lesson to practical course design.",
      submittedAt: new Date(),
      metadata: { seededPhase: "07", kind: "submitted" },
    },
  });

  const criterionOne = rubric.criteria[0];
  const criterionTwo = rubric.criteria[1];
  if (!criterionOne || !criterionTwo) {
    throw new Error("Phase 07 seeded rubric criteria were not created.");
  }
  await prisma.assignmentSubmission.update({
    where: { id: draftSubmission.id },
    data: {
      status: "GRADED",
      gradedAt: new Date(),
      gradedById: instructorId,
      score: 90,
      maxScore: 100,
      feedback: "Strong reflection with clear practical application.",
      rubricScores: {
        create: [
          {
            criterionId: criterionOne.id,
            levelId: criterionOne.levels[0]?.id,
            points: 45,
            feedback: "Complete and well scoped.",
          },
          {
            criterionId: criterionTwo.id,
            levelId: criterionTwo.levels[0]?.id,
            points: 45,
            feedback: "Insightful examples.",
          },
        ],
      },
    },
  });

  await prisma.activityProgress.upsert({
    where: {
      organizationId_userId_activityId: {
        organizationId,
        userId: learnerId,
        activityId: activity.id,
      },
    },
    update: {
      status: "COMPLETED",
      progressPercent: 100,
      completedAt: new Date(),
    },
    create: {
      organizationId,
      courseId: course.id,
      lessonId: lesson.id,
      activityId: activity.id,
      userId: learnerId,
      status: "COMPLETED",
      progressPercent: 100,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  const requiredActivities = await prisma.activity.count({
    where: {
      organizationId,
      courseId: course.id,
      isRequired: true,
      isPublished: true,
    },
  });
  const completedActivities = await prisma.activityProgress.count({
    where: {
      organizationId,
      courseId: course.id,
      userId: learnerId,
      status: "COMPLETED",
    },
  });
  const progressPercent = requiredActivities
    ? Math.round((completedActivities / requiredActivities) * 100)
    : 100;
  await prisma.enrollment.update({
    where: {
      organizationId_courseId_userId: {
        organizationId,
        courseId: course.id,
        userId: learnerId,
      },
    },
    data: {
      progressPercent,
      completedAt: progressPercent >= 100 ? new Date() : null,
    },
  });

  const template = await prisma.certificateTemplate.create({
    data: {
      organizationId,
      createdById: instructorId,
      name: "Default Course Completion Certificate",
      description: "Seeded certificate template for completed courses.",
      status: "ACTIVE",
      design: {
        layout: "classic",
        title: "Certificate of Completion",
        accent: "primary",
      },
      metadata: { seededPhase: "07" },
    },
  });

  await prisma.certificate.create({
    data: {
      organizationId,
      courseId: course.id,
      userId: learnerId,
      templateId: template.id,
      certificateNumber: `CERT-SEEDED-${learnerId.slice(-6).toUpperCase()}`,
      verificationCode: `VERIFY${learnerId.slice(-8).toUpperCase()}`,
      metadata: {
        seededPhase: "07",
        pdfGeneration:
          "TODO: generate PDF when certificate PDF utility is implemented",
      },
    },
  });

  await prisma.learningGoal.create({
    data: {
      organizationId,
      userId: learnerId,
      courseId: course.id,
      title: "Complete the modern web app foundations course",
      description: "Seeded learner goal for Phase 07 progress tracking.",
      targetType: "COURSE_COMPLETION",
      targetValue: { percent: 100 },
      progressValue: { percent: progressPercent },
      status: progressPercent >= 100 ? "COMPLETED" : "ACTIVE",
      completedAt: progressPercent >= 100 ? new Date() : null,
      metadata: { seededPhase: "07" },
    },
  });
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
