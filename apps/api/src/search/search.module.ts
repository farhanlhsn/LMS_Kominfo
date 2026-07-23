import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RbacModule } from "../rbac/rbac.module";
import { AdminSearchController,SearchController } from "./search.controller";
import { MockSearchProvider,SEARCH_PROVIDER } from "./search.provider";
import { SearchService } from "./search.service";

@Module({
  imports: [AuthModule, RbacModule],
  providers: [
    SearchService,
    MockSearchProvider,
    {
      provide: SEARCH_PROVIDER,
      useExisting: MockSearchProvider,
    },
  ],
  controllers: [SearchController, AdminSearchController],
  exports: [SearchService],
})
export class SearchModule {}
