import { LoadingState } from "../components/ui/states";

export default function Loading() {
  return (
    <div
      aria-busy="true"
      className="flex min-h-screen flex-col bg-background text-foreground"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-6">
        <LoadingState
          description="Preparing the latest data for your workspace. This usually takes less than a few seconds."
          title="Loading workspace"
        />
      </div>
    </div>
  );
}
