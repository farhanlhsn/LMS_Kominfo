import { LoadingState } from "../components/ui/states";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <LoadingState title="Loading workspace" />
    </div>
  );
}
