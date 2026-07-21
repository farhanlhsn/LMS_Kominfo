import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthModule } from "../auth/auth.module";
import { RbacModule } from "../rbac/rbac.module";
import { TranscriptNoteController } from "./notes.controller";
import { TranscriptNoteService } from "./notes.service";
import { MockNoteContextProvider, NOTE_CONTEXT_PROVIDER } from "./notes.provider";

@Module({
  imports: [AuthModule, RbacModule],
  providers: [
    TranscriptNoteService,
    MockNoteContextProvider,
    {
      provide: NOTE_CONTEXT_PROVIDER,
      useExisting: MockNoteContextProvider,
    },
  ],
  controllers: [TranscriptNoteController],
  exports: [TranscriptNoteService],
})
export class TranscriptNotesModule {}
