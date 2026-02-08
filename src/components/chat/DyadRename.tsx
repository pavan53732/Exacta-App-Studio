import type React from "react";
import type { ReactNode } from "react";
import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { CustomTagState } from "./stateTypes";
import {
  DyadCard,
  DyadCardHeader,
  DyadExpandIcon,
  DyadStateIndicator,
  DyadCardContent,
} from "./DyadCardPrimitives";

interface DyadRenameProps {
  children?: ReactNode;
  node?: any;
  from?: string;
  to?: string;
}

export const DyadRename: React.FC<DyadRenameProps> = ({
  children,
  node,
  from: fromProp,
  to: toProp,
}) => {
  const [isContentVisible, setIsContentVisible] = useState(false);

  const from = fromProp || node?.properties?.from || "";
  const to = toProp || node?.properties?.to || "";
  const state = node?.properties?.state as CustomTagState;

  const aborted = state === "aborted";
  const inProgress = state === "pending";

  const fromFileName = from ? from.split("/").pop() : "";
  const toFileName = to ? to.split("/").pop() : "";

  return (
    <DyadCard
      state={state}
      accentColor="amber"
      onClick={() => setIsContentVisible(!isContentVisible)}
      isExpanded={isContentVisible}
    >
      <DyadCardHeader icon={<ArrowRightLeft size={15} />} accentColor="amber">
        <div className="min-w-0 truncate">
          {fromFileName && toFileName && (
            <span className="font-medium text-sm text-foreground truncate block">
              {fromFileName} → {toFileName}
            </span>
          )}
          {from && (
            <span className="text-[11px] text-muted-foreground truncate block">
              {from} → {to}
            </span>
          )}
        </div>
        {inProgress && (
          <DyadStateIndicator state="pending" pendingLabel="Renaming..." />
        )}
        {aborted && (
          <DyadStateIndicator state="aborted" abortedLabel="Did not finish" />
        )}
        <div className="ml-auto flex items-center gap-1">
          <DyadExpandIcon isExpanded={isContentVisible} />
        </div>
      </DyadCardHeader>
      <DyadCardContent isExpanded={isContentVisible}>
        <div
          className="text-xs cursor-text"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </DyadCardContent>
    </DyadCard>
  );
};
