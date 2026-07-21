import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthModule } from "../auth/auth.module";
import { RbacModule } from "../rbac/rbac.module";
import {
  ThreeDAssetController,
  ThreeDSceneController,
} from "./content-3d.controller";
import { Content3DService } from "./content-3d.service";

@Module({
  imports: [AuthModule, RbacModule],
  providers: [PrismaService, Content3DService],
  controllers: [ThreeDAssetController, ThreeDSceneController],
  exports: [Content3DService],
})
export class Content3DModule {}
