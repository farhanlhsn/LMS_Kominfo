import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { AccessContext, AccessContextType } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";

export interface AccessContextReference {
  type: AccessContextType;
  instanceId: string;
}

@Injectable()
export class AccessContextService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async ensureOrganizationContext(
    organizationId: string,
  ): Promise<AccessContext> {
    return this.ensureContext(organizationId, {
      type: "ORGANIZATION",
      instanceId: organizationId,
    });
  }

  async ensureContext(
    organizationId: string,
    reference: AccessContextReference,
  ): Promise<AccessContext> {
    if (reference.type === "SYSTEM") {
      return this.upsertContext({
        organizationId: null,
        type: "SYSTEM",
        instanceId: "system",
        key: "system:system",
        parent: null,
        component: "core",
        isActive: true,
        missingReason: null,
        locked: true,
      });
    }

    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    if (reference.type === "ORGANIZATION") {
      if (reference.instanceId !== organizationId) {
        throw new BadRequestException(
          "Organization context does not match active organization",
        );
      }
      const system = await this.ensureContext(organizationId, {
        type: "SYSTEM",
        instanceId: "system",
      });
      return this.upsertContext({
        organizationId,
        type: reference.type,
        instanceId: organizationId,
        key: this.contextKey(reference.type, organizationId),
        parent: system,
        component: "core",
        isActive: true,
        missingReason: null,
        locked: true,
      });
    }

    if (reference.type === "USER") {
      const member = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: reference.instanceId,
          },
        },
        select: { id: true },
      });
      if (!member) throw new NotFoundException("Organization user not found");
      const parent = await this.ensureOrganizationContext(organizationId);
      return this.upsertContext({
        organizationId,
        type: reference.type,
        instanceId: reference.instanceId,
        key: this.contextKey(reference.type, reference.instanceId),
        parent,
        component: "core",
        isActive: true,
        missingReason: null,
        locked: false,
      });
    }

    if (reference.type === "COURSE_CATEGORY") {
      const category = await this.prisma.courseCategory.findFirst({
        where: { id: reference.instanceId, organizationId },
        select: { id: true },
      });
      if (!category) throw new NotFoundException("Course category not found");
      const parent = await this.ensureOrganizationContext(organizationId);
      return this.upsertContext({
        organizationId,
        type: reference.type,
        instanceId: category.id,
        key: this.contextKey(reference.type, category.id),
        parent,
        component: "core",
        isActive: true,
        missingReason: null,
        locked: false,
      });
    }

    if (reference.type === "COURSE") {
      const course = await this.prisma.course.findFirst({
        where: {
          id: reference.instanceId,
          organizationId,
          deletedAt: null,
        },
        select: { id: true, categoryId: true },
      });
      if (!course) throw new NotFoundException("Course not found");
      const parent = course.categoryId
        ? await this.ensureContext(organizationId, {
            type: "COURSE_CATEGORY",
            instanceId: course.categoryId,
          })
        : await this.ensureOrganizationContext(organizationId);
      return this.upsertContext({
        organizationId,
        type: reference.type,
        instanceId: course.id,
        key: this.contextKey(reference.type, course.id),
        parent,
        component: "core",
        isActive: true,
        missingReason: null,
        locked: false,
      });
    }

    if (reference.type === "MODULE") {
      const module = await this.prisma.courseModule.findFirst({
        where: { id: reference.instanceId, organizationId },
        select: { id: true, courseId: true },
      });
      if (!module) throw new NotFoundException("Course module not found");
      const parent = await this.ensureContext(organizationId, {
        type: "COURSE",
        instanceId: module.courseId,
      });
      return this.upsertContext({
        organizationId,
        type: reference.type,
        instanceId: module.id,
        key: this.contextKey(reference.type, module.id),
        parent,
        component: "core",
        isActive: true,
        missingReason: null,
        locked: false,
      });
    }

    if (reference.type === "ACTIVITY") {
      const activity = await this.prisma.activity.findFirst({
        where: { id: reference.instanceId, organizationId },
        select: {
          id: true,
          pluginKey: true,
          activityTypeKey: true,
          lesson: { select: { moduleId: true } },
        },
      });
      if (!activity) throw new NotFoundException("Activity not found");
      const parent = await this.ensureContext(organizationId, {
        type: "MODULE",
        instanceId: activity.lesson.moduleId,
      });
      return this.upsertContext({
        organizationId,
        type: reference.type,
        instanceId: activity.id,
        key: this.contextKey(reference.type, activity.id),
        parent,
        component:
          activity.pluginKey ?? this.componentFromActivity(activity.activityTypeKey),
        isActive: true,
        missingReason: null,
        locked: false,
      });
    }

    const plugin = await this.prisma.plugin.findUnique({
      where: { key: reference.instanceId },
      include: {
        organizationPlugins: {
          where: { organizationId },
          select: { enabled: true },
        },
      },
    });
    if (!plugin) {
      throw new NotFoundException("Plugin is missing from registry");
    }
    const enabled =
      plugin.status === "ACTIVE" &&
      Boolean(plugin.organizationPlugins[0]?.enabled);
    const parent = await this.ensureOrganizationContext(organizationId);
    return this.upsertContext({
      organizationId,
      type: "PLUGIN",
      instanceId: plugin.key,
      key: this.contextKey("PLUGIN", plugin.key),
      parent,
      component: plugin.key,
      isActive: enabled,
      missingReason: enabled ? null : "PLUGIN_DISABLED",
      locked: false,
    });
  }

  async listOptions(organizationId: string) {
    await this.ensureOrganizationContext(organizationId);
    const [organization, members, categories, courses, modules, activities, plugins] =
      await Promise.all([
        this.prisma.organization.findUniqueOrThrow({
          where: { id: organizationId },
          select: { id: true, name: true },
        }),
        this.prisma.organizationMember.findMany({
          where: { organizationId },
          select: { user: { select: { id: true, email: true, name: true } } },
          orderBy: { user: { email: "asc" } },
        }),
        this.prisma.courseCategory.findMany({
          where: { organizationId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        this.prisma.course.findMany({
          where: { organizationId, deletedAt: null },
          select: { id: true, title: true, categoryId: true },
          orderBy: { title: "asc" },
        }),
        this.prisma.courseModule.findMany({
          where: { organizationId },
          select: { id: true, title: true, courseId: true },
          orderBy: [{ courseId: "asc" }, { orderIndex: "asc" }],
        }),
        this.prisma.activity.findMany({
          where: { organizationId },
          select: {
            id: true,
            title: true,
            activityTypeKey: true,
            pluginKey: true,
            lesson: { select: { moduleId: true } },
          },
          orderBy: [{ courseId: "asc" }, { orderIndex: "asc" }],
        }),
        this.prisma.plugin.findMany({
          include: {
            organizationPlugins: {
              where: { organizationId },
              select: { enabled: true },
            },
          },
          orderBy: { name: "asc" },
        }),
      ]);

    return [
      this.option("ORGANIZATION", organization.id, organization.name, null),
      ...members.map(({ user }) =>
        this.option(
          "USER",
          user.id,
          user.name ? `${user.name} (${user.email})` : user.email,
          this.contextKey("ORGANIZATION", organizationId),
        ),
      ),
      ...categories.map((category) =>
        this.option(
          "COURSE_CATEGORY",
          category.id,
          category.name,
          this.contextKey("ORGANIZATION", organizationId),
        ),
      ),
      ...courses.map((course) =>
        this.option(
          "COURSE",
          course.id,
          course.title,
          course.categoryId
            ? this.contextKey("COURSE_CATEGORY", course.categoryId)
            : this.contextKey("ORGANIZATION", organizationId),
        ),
      ),
      ...modules.map((module) =>
        this.option(
          "MODULE",
          module.id,
          module.title,
          this.contextKey("COURSE", module.courseId),
        ),
      ),
      ...activities.map((activity) => ({
        ...this.option(
          "ACTIVITY",
          activity.id,
          activity.title,
          this.contextKey("MODULE", activity.lesson.moduleId),
        ),
        component:
          activity.pluginKey ?? this.componentFromActivity(activity.activityTypeKey),
      })),
      ...plugins.map((plugin) => ({
        ...this.option(
          "PLUGIN",
          plugin.key,
          plugin.name,
          this.contextKey("ORGANIZATION", organizationId),
        ),
        component: plugin.key,
        available:
          plugin.status === "ACTIVE" &&
          Boolean(plugin.organizationPlugins[0]?.enabled),
        missingReason:
          plugin.status === "ACTIVE" &&
          Boolean(plugin.organizationPlugins[0]?.enabled)
            ? null
            : "PLUGIN_DISABLED",
      })),
    ];
  }

  ancestorIds(context: { path: string }) {
    return context.path.split("/").filter(Boolean);
  }

  private async upsertContext(input: {
    organizationId: string | null;
    type: AccessContextType;
    instanceId: string;
    key: string;
    parent: { id: string; path: string; depth: number } | null;
    component: string;
    isActive: boolean;
    missingReason: string | null;
    locked: boolean;
  }) {
    const id = randomUUID();
    const path = input.parent ? `${input.parent.path}/${id}` : `/${id}`;
    return this.prisma.accessContext.upsert({
      where: { key: input.key },
      update: {
        parentId: input.parent?.id ?? null,
        component: input.component,
        isActive: input.isActive,
        missingReason: input.missingReason,
        locked: input.locked,
      },
      create: {
        id,
        organizationId: input.organizationId,
        type: input.type,
        instanceId: input.instanceId,
        key: input.key,
        parentId: input.parent?.id ?? null,
        path,
        depth: (input.parent?.depth ?? -1) + 1,
        component: input.component,
        isActive: input.isActive,
        missingReason: input.missingReason,
        locked: input.locked,
      },
    });
  }

  private contextKey(type: AccessContextType, instanceId: string) {
    return `${type.toLowerCase()}:${instanceId}`;
  }

  private componentFromActivity(activityTypeKey: string) {
    const separator = activityTypeKey.lastIndexOf(".");
    return separator > 0 ? activityTypeKey.slice(0, separator) : "core";
  }

  private option(
    type: AccessContextType,
    instanceId: string,
    label: string,
    parentKey: string | null,
  ) {
    return {
      type,
      instanceId,
      key: this.contextKey(type, instanceId),
      label,
      parentKey,
      component: "core",
      available: true,
      missingReason: null,
    };
  }
}
