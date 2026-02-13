import { Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ipc } from "@/ipc/types";

interface AnnotatorOnlyForProProps {
  onGoBack: () => void;
}

export const AnnotatorOnlyForPro = ({ onGoBack }: AnnotatorOnlyForProProps) => {
  const handleEnableEnhancedMode = () => {
    ipc.system.openExternalUrl("https://dyad.sh/pro");
  };

  return (
    <div className="w-full h-full bg-background relative">
      {/* Go Back Button */}
      <button
        onClick={onGoBack}
        className="absolute top-4 left-4 p-2 hover:bg-accent rounded-md transition-all z-10 group"
        aria-label="Go back"
      >
        <ArrowLeft
          size={20}
          className="text-foreground/70 group-hover:text-foreground transition-colors"
        />
      </button>

      {/* Centered Content */}
      <div className="flex flex-col items-center justify-center h-full px-8">
        {/* Lock Icon */}
        <Lock size={72} className="text-primary/60 dark:text-primary/70 mb-8" />

        {/* Message */}
        <h2 className="text-3xl font-semibold text-foreground mb-4 text-center">
          Enhanced Mode Feature
        </h2>
        <p className="text-muted-foreground mb-10 text-center max-w-md text-base leading-relaxed">
          Advanced element detection and attribute editing is available with
          Enhanced Mode.
        </p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={onGoBack}>
            Go Back
          </Button>
          <Button onClick={handleEnableEnhancedMode}>
            Enable Enhanced Mode
          </Button>
        </div>
      </div>
    </div>
  );
};
