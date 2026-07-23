import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RbacModule } from "../rbac/rbac.module";
import { TranscriptNoteController } from "./notes.controller";
import { MockNoteContextProvider,NOTE_CONTEXT_PROVIDER } from "./notes.provider";
import { TranscriptNoteService } from "./notes.service";

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
