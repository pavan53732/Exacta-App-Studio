import { type LargeLanguageModel } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { useLocalModels } from "@/hooks/useLocalModels";
import { useLocalLMSModels } from "@/hooks/useLMStudioModels";
import { useLanguageModelsByProviders } from "@/hooks/useLanguageModelsByProviders";

import { LocalModel } from "@/ipc/types";
import { useLanguageModelProviders } from "@/hooks/useLanguageModelProviders";
import { useSettings } from "@/hooks/useSettings";
import { PriceBadge } from "@/components/PriceBadge";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { ChevronDown, Sparkles, Monitor, Loader2 } from "lucide-react";

const ModelMenuItem: React.FC<{
  name: string;
  isSelected: boolean;
  onClick: () => void;
  tag?: string;
  dollarSigns?: number;
  description?: string;
}> = ({ name, isSelected, onClick, tag, dollarSigns, description }) => (
  <DropdownMenuItem
    className={cn(
      "flex items-center justify-between px-2 py-2 text-sm cursor-pointer",
      isSelected && "bg-zinc-100 dark:bg-zinc-800",
    )}
    onClick={onClick}
    title={description}
  >
    <div className="flex justify-between items-start w-full gap-2">
      <span className="truncate">{name}</span>
      <div className="flex items-center gap-1 shrink-0">
        {dollarSigns !== undefined && <PriceBadge dollarSigns={dollarSigns} />}
        {tag && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
            {tag}
          </span>
        )}
      </div>
    </div>
  </DropdownMenuItem>
);

export function ModelPicker() {
  const { settings, updateSettings } = useSettings();
  const queryClient = useQueryClient();

  const onModelSelect = (model: LargeLanguageModel) => {
    updateSettings({ selectedModel: model });
    queryClient.invalidateQueries({ queryKey: queryKeys.tokenCount.all });
  };

  const [open, setOpen] = useState(false);

  // Cloud models from providers
  const { data: modelsByProviders, isLoading: modelsByProvidersLoading } =
    useLanguageModelsByProviders();

  const { data: providers, isLoading: providersLoading } =
    useLanguageModelProviders();

  const loading = modelsByProvidersLoading || providersLoading;

  const {
    models: ollamaModels,
    loading: ollamaLoading,
    loadModels: loadOllamaModels,
  } = useLocalModels();

  const {
    models: lmStudioModels,
    loading: lmStudioLoading,
    loadModels: loadLMStudioModels,
  } = useLocalLMSModels();

  useEffect(() => {
    if (open) {
      loadOllamaModels();
      loadLMStudioModels();
    }
  }, [open, loadOllamaModels, loadLMStudioModels]);

  if (!settings) return null;
  const selectedModel = settings.selectedModel;

  const getModelDisplayName = () => {
    if (selectedModel.provider === "ollama") {
      return (
        ollamaModels.find((m: LocalModel) => m.modelName === selectedModel.name)
          ?.displayName || selectedModel.name
      );
    }
    if (selectedModel.provider === "lmstudio") {
      return (
        lmStudioModels.find(
          (m: LocalModel) => m.modelName === selectedModel.name,
        )?.displayName || selectedModel.name
      );
    }

    if (modelsByProviders && modelsByProviders[selectedModel.provider]) {
      const found = modelsByProviders[selectedModel.provider].find(
        (m: any) =>
          (m.type === "custom" && m.id === selectedModel.customModelId) ||
          m.apiName === selectedModel.name,
      );
      if (found) return found.displayName;
    }

    return selectedModel.name;
  };

  const modelDisplayName = getModelDisplayName();

  const providerEntries =
    !loading && modelsByProviders
      ? Object.entries(modelsByProviders).filter(([id]) => id !== "auto")
      : [];

  // Split into primary and secondary
  const primaryProviderIds = ["openai", "anthropic", "google", "meta"];
  const primaryProviders = providerEntries.filter(([id]) =>
    primaryProviderIds.includes(id),
  );
  const secondaryProviders = providerEntries.filter(
    ([id]) => !primaryProviderIds.includes(id),
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 h-8 px-3 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-normal shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center gap-2 max-w-[150px]">
            {selectedModel.provider === "ollama" ||
            selectedModel.provider === "lmstudio" ? (
              <Monitor className="h-3.5 w-3.5 text-zinc-500" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            )}
            <span className="truncate text-sm font-medium">
              {modelDisplayName}
            </span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-72 mt-1 border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in duration-200"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Cloud Models
        </DropdownMenuLabel>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          </div>
        ) : (
          <>
            {primaryProviders.map(([providerId, models]) => {
              const provider = providers?.find((p) => p.id === providerId);
              return (
                <DropdownMenuSub key={providerId}>
                  <DropdownMenuSubTrigger className="px-2 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {provider?.name || providerId}
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-64 border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                    {models.map((model: any) => (
                      <ModelMenuItem
                        key={`${providerId}-${model.apiName}`}
                        name={model.displayName}
                        isSelected={
                          selectedModel.provider === providerId &&
                          selectedModel.name === model.apiName
                        }
                        onClick={() => {
                          onModelSelect({
                            name: model.apiName,
                            provider: providerId,
                            customModelId:
                              model.type === "custom" ? model.id : undefined,
                          });
                          setOpen(false);
                        }}
                        tag={model.tag}
                        dollarSigns={model.dollarSigns}
                        description={model.description}
                      />
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              );
            })}

            {secondaryProviders.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="px-2 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer">
                  <span className="font-medium text-zinc-500">
                    Other Providers
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-64 border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                  {secondaryProviders.map(([providerId, models]) => {
                    const provider = providers?.find(
                      (p) => p.id === providerId,
                    );
                    return (
                      <DropdownMenuSub key={providerId}>
                        <DropdownMenuSubTrigger className="px-2 py-2 text-sm">
                          {provider?.name || providerId}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-64 border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                          {models.map((model: any) => (
                            <ModelMenuItem
                              key={`${providerId}-${model.apiName}`}
                              name={model.displayName}
                              isSelected={
                                selectedModel.provider === providerId &&
                                selectedModel.name === model.apiName
                              }
                              onClick={() => {
                                onModelSelect({
                                  name: model.apiName,
                                  provider: providerId,
                                  customModelId:
                                    model.type === "custom"
                                      ? model.id
                                      : undefined,
                                });
                                setOpen(false);
                              }}
                              tag={model.tag}
                              dollarSigns={model.dollarSigns}
                              description={model.description}
                            />
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
          </>
        )}

        <DropdownMenuSeparator className="my-1 bg-zinc-100 dark:bg-zinc-900" />
        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Local Models
        </DropdownMenuLabel>

        {/* Ollama */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="px-2 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer">
            <div className="flex flex-col items-start gap-0.5">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Ollama
              </span>
              <span className="text-[10px] text-zinc-400">
                {ollamaLoading ? "Loading..." : `${ollamaModels.length} models`}
              </span>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64 border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
            {ollamaModels.length === 0 ? (
              <div className="px-2 py-3 text-xs text-center text-zinc-500">
                No Ollama models found
              </div>
            ) : (
              ollamaModels.map((model: LocalModel) => (
                <ModelMenuItem
                  key={`ollama-${model.modelName}`}
                  name={model.displayName}
                  isSelected={
                    selectedModel.provider === "ollama" &&
                    selectedModel.name === model.modelName
                  }
                  onClick={() => {
                    onModelSelect({
                      name: model.modelName,
                      provider: "ollama",
                    });
                    setOpen(false);
                  }}
                  description={model.modelName}
                />
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* LM Studio */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="px-2 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer">
            <div className="flex flex-col items-start gap-0.5">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                LM Studio
              </span>
              <span className="text-[10px] text-zinc-400">
                {lmStudioLoading
                  ? "Loading..."
                  : `${lmStudioModels.length} models`}
              </span>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64 border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
            {lmStudioModels.length === 0 ? (
              <div className="px-2 py-3 text-xs text-center text-zinc-500">
                No LM Studio models found
              </div>
            ) : (
              lmStudioModels.map((model: LocalModel) => (
                <ModelMenuItem
                  key={`lmstudio-${model.modelName}`}
                  name={model.displayName}
                  isSelected={
                    selectedModel.provider === "lmstudio" &&
                    selectedModel.name === model.modelName
                  }
                  onClick={() => {
                    onModelSelect({
                      name: model.modelName,
                      provider: "lmstudio",
                    });
                    setOpen(false);
                  }}
                  description={model.modelName}
                />
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
