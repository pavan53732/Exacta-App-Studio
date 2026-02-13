// src/components/RuntimeSelector.tsx
// UI component for selecting runtime provider when creating a new app

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Code2,
  AppWindow,
  Monitor,
  Terminal,
  Layers,
  Check,
  Cpu,
} from "lucide-react";

interface RuntimeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (runtimeId: string, stackType: string) => void;
}

interface RuntimeOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  stackTypes: StackTypeOption[];
  color: string;
}

interface StackTypeOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const RUNTIME_OPTIONS: RuntimeOption[] = [
  {
    id: "node",
    name: "Node.js",
    description: "Web applications with React",
    icon: <Code2 className="h-6 w-6" />,
    color: "bg-green-500/10 text-green-600",
    stackTypes: [
      {
        id: "react",
        name: "React",
        description: "Modern React SPA with Vite",
        icon: <Layers className="h-4 w-4" />,
      },
      {
        id: "nextjs",
        name: "Next.js",
        description: "Full-stack React with SSR",
        icon: <AppWindow className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "dotnet",
    name: ".NET",
    description: "Native Windows desktop apps",
    icon: <Monitor className="h-6 w-6" />,
    color: "bg-purple-500/10 text-purple-600",
    stackTypes: [
      {
        id: "wpf",
        name: "WPF",
        description: "Windows Presentation Foundation",
        icon: <AppWindow className="h-4 w-4" />,
      },
      {
        id: "winui3",
        name: "WinUI 3",
        description: "Modern Windows App SDK",
        icon: <Layers className="h-4 w-4" />,
      },
      {
        id: "winforms",
        name: "WinForms",
        description: "Classic Windows Forms",
        icon: <Terminal className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "tauri",
    name: "Tauri",
    description: "Cross-platform desktop with web frontend",
    icon: <Cpu className="h-6 w-6" />,
    color: "bg-orange-500/10 text-orange-600",
    stackTypes: [
      {
        id: "tauri-react",
        name: "React + Tauri",
        description: "React frontend with Rust backend",
        icon: <Layers className="h-4 w-4" />,
      },
      {
        id: "tauri-vue",
        name: "Vue + Tauri",
        description: "Vue frontend with Rust backend",
        icon: <AppWindow className="h-4 w-4" />,
      },
    ],
  },
];

export function RuntimeSelector({
  isOpen,
  onClose,
  onSelect,
}: RuntimeSelectorProps) {
  const [selectedRuntime, setSelectedRuntime] = useState<string | null>(null);
  const [selectedStack, setSelectedStack] = useState<string | null>(null);

  const handleRuntimeSelect = (runtimeId: string) => {
    setSelectedRuntime(runtimeId);
    setSelectedStack(null);
  };

  const handleStackSelect = (stackId: string) => {
    setSelectedStack(stackId);
  };

  const handleConfirm = () => {
    if (selectedRuntime && selectedStack) {
      onSelect(selectedRuntime, selectedStack);
      onClose();
    }
  };

  const selectedRuntimeData = RUNTIME_OPTIONS.find(
    (r) => r.id === selectedRuntime,
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New App</DialogTitle>
          <DialogDescription>
            Choose the runtime and technology stack for your application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Select Runtime */}
          <div>
            <h3 className="text-sm font-medium mb-3">1. Select Runtime</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {RUNTIME_OPTIONS.map((runtime) => (
                <Card
                  key={runtime.id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    selectedRuntime === runtime.id
                      ? "border-primary ring-1 ring-primary"
                      : ""
                  }`}
                  onClick={() => handleRuntimeSelect(runtime.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${runtime.color}`}>
                        {runtime.icon}
                      </div>
                      {selectedRuntime === runtime.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <CardTitle className="text-lg">{runtime.name}</CardTitle>
                    <CardDescription>{runtime.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Step 2: Select Stack Type */}
          {selectedRuntimeData && (
            <div>
              <h3 className="text-sm font-medium mb-3">2. Select Stack Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedRuntimeData.stackTypes.map((stack) => (
                  <Card
                    key={stack.id}
                    className={`cursor-pointer transition-all hover:border-primary ${
                      selectedStack === stack.id
                        ? "border-primary ring-1 ring-primary"
                        : ""
                    }`}
                    onClick={() => handleStackSelect(stack.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="text-muted-foreground">
                          {stack.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{stack.name}</span>
                            {selectedStack === stack.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {stack.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Selection Summary */}
          {selectedRuntime && selectedStack && (
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Selection Summary</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{selectedRuntimeData?.name}</Badge>
                <Badge variant="outline">
                  {
                    selectedRuntimeData?.stackTypes.find(
                      (s) => s.id === selectedStack,
                    )?.name
                  }
                </Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedRuntime || !selectedStack}
          >
            Create App
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for using runtime selector
export function useRuntimeSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selection, setSelection] = useState<{
    runtimeId: string;
    stackType: string;
  } | null>(null);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  const handleSelect = (runtimeId: string, stackType: string) => {
    setSelection({ runtimeId, stackType });
  };

  return {
    isOpen,
    open,
    close,
    selection,
    RuntimeSelector: (
      <RuntimeSelector
        isOpen={isOpen}
        onClose={close}
        onSelect={handleSelect}
      />
    ),
  };
}
