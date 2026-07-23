import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import type {
  PanelEntryDto,
  RegisterPluginPanelDto,
  SavePanelLayoutDto,
} from "./dto/plugin-panels.dto";

@Injectable()
export class PluginPanelService {
  // The Prisma client is cast to `any` to remain forward-compatible with the
  // regenerated prisma types for the new plugin-panels models.
  private readonly db: any;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    this.db = prisma as unknown as any;
  }

  async listAvailable(organizationId: string) {
    const enabledPlugins = await this.db.pluginInstallation.findMany({
      where: { organizationId, status: "ACTIVE" },
      select: { listing: { select: { pluginId: true } } },
    });
    return this.db.pluginPanel.findMany({
      where: {
        organizationId,
        pluginId: {
          in: enabledPlugins.map(
            (installation: { listing: { pluginId: string } }) =>
              installation.listing.pluginId,
          ),
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async registerPanel(
    organization: OrganizationContext,
    dto: RegisterPluginPanelDto,
  ) {
    return this.db.pluginPanel.upsert({
      where: {
        organizationId_pluginId_panelKey: {
          organizationId: organization.id,
          pluginId: dto.pluginId,
          panelKey: dto.panelKey,
        },
      },
      create: {
        organizationId: organization.id,
        pluginId: dto.pluginId,
        panelKey: dto.panelKey,
        name: dto.name,
        defaultSize: dto.defaultSize ?? "md",
        defaultPosition: dto.defaultPosition ?? "right",
        allowedRoutes: (dto.allowedRoutes ?? []) as Prisma.InputJsonValue,
        configSchema: (dto.configSchema ?? {}) as Prisma.InputJsonValue,
      },
      update: {
        name: dto.name,
        defaultSize: dto.defaultSize ?? "md",
        defaultPosition: dto.defaultPosition ?? "right",
        allowedRoutes: (dto.allowedRoutes ?? []) as Prisma.InputJsonValue,
        configSchema: (dto.configSchema ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async getLayout(organizationId: string, userId: string, layoutKey: string) {
    const layout = await this.db.userPanelLayout.findUnique({
      where: { userId_layoutKey: { userId, layoutKey } },
    });
    if (layout) {
      return {
        layoutKey,
        panels: (layout.panels as Array<Record<string, unknown>>) ?? [],
        updatedAt: layout.updatedAt,
      };
    }
    return { layoutKey, panels: [], updatedAt: null };
  }

  async saveLayout(
    organization: OrganizationContext,
    userId: string,
    layoutKey: string,
    dto: SavePanelLayoutDto,
  ) {
    // Validate that referenced panels exist for this org.
    const panelKeys = dto.panels.map((p) => p.panelKey);
    if (panelKeys.length) {
      const known = await this.db.pluginPanel.findMany({
        where: { organizationId: organization.id, panelKey: { in: panelKeys } },
        select: { panelKey: true },
      });
      const knownKeys = new Set<string>(
        known.map((k: { panelKey: string }) => k.panelKey),
      );
      for (const entry of dto.panels as PanelEntryDto[]) {
        if (!knownKeys.has(entry.panelKey)) {
          throw new NotFoundException(
            `Panel "${entry.panelKey}" is not registered for this organization`,
          );
        }
      }
    }
    const layout = await this.db.userPanelLayout.upsert({
      where: { userId_layoutKey: { userId, layoutKey } },
      create: {
        organizationId: organization.id,
        userId,
        layoutKey,
        panels: dto.panels as unknown as Prisma.InputJsonValue,
      },
      update: {
        panels: dto.panels as unknown as Prisma.InputJsonValue,
      },
    });
    return {
      layoutKey,
      panels: (layout.panels as Array<Record<string, unknown>>) ?? [],
      updatedAt: layout.updatedAt,
    };
  }
}
