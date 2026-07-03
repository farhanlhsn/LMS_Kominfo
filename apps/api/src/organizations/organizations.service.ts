import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OrganizationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listMembers(organizationId: string): Promise<
    Array<{
      id: string;
      status: string;
      user: {
        id: string;
        email: string;
        name: string | null;
      };
      roles: string[];
    }>
  > {
    const members = await this.prisma.organizationMember.findMany({
      where: {
        organizationId
      },
      include: {
        user: true,
        memberRoles: {
          include: {
            role: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return members.map((member) => ({
      id: member.id,
      status: member.status,
      user: {
        id: member.user.id,
        email: member.user.email,
        name: member.user.name
      },
      roles: member.memberRoles.map((memberRole) => memberRole.role.key)
    }));
  }
}
