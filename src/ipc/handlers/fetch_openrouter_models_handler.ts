import { ipcMain } from "electron";
import log from "electron-log";
import { db } from "@/db";
import { language_models } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const logger = log.scope("fetch-openrouter-models");

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
  architecture?: {
    modality: string;
    tokenizer?: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
  supported_parameters?: string[];
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

interface CachedModels {
  models: OpenRouterModel[];
  timestamp: number;
}

// Cache models for 24 hours
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
let cachedModels: CachedModels | null = null;

// Models to exclude (already hardcoded or not suitable)
const EXCLUDED_MODEL_PREFIXES = [
  "openai/", // OpenAI models handled separately
  "anthropic/", // Anthropic models handled separately
  "google/", // Google models handled separately
];

/**
 * Check if a model is suitable for coding tasks
 */
function isCodingModel(model: OpenRouterModel): boolean {
  const modality = model.architecture?.modality?.toLowerCase() || "";

  // Exclude if it's vision-only or audio-only (no text support)
  if (
    modality.includes("audio-only") ||
    modality.includes("image-to-image") ||
    modality.includes("video")
  ) {
    return false;
  }

  // Must support text
  const supportsText =
    modality === "text" ||
    modality === "text+image" ||
    modality.includes("text") ||
    !modality;

  if (!supportsText) {
    return false;
  }

  // Include all text-capable models
  return true;
}

/**
 * Check if a model should be excluded (already handled by other providers)
 */
function shouldExcludeModel(modelId: string): boolean {
  return EXCLUDED_MODEL_PREFIXES.some((prefix) =>
    modelId.toLowerCase().startsWith(prefix.toLowerCase()),
  );
}

/**
 * Save OpenRouter models to the database
 */
async function saveOpenRouterModels(
  models: OpenRouterModel[],
): Promise<{ saved: number; skipped: number; errors: number }> {
  const results = { saved: 0, skipped: 0, errors: 0 };

  for (const model of models) {
    try {
      // Skip excluded models (already handled by other providers)
      if (shouldExcludeModel(model.id)) {
        results.skipped++;
        continue;
      }

      // Check if model already exists
      const existingModel = await db
        .select({ id: language_models.id })
        .from(language_models)
        .where(
          and(
            eq(language_models.apiName, model.id),
            eq(language_models.builtinProviderId, "openrouter"),
          ),
        )
        .get();

      if (existingModel) {
        results.skipped++;
        continue;
      }

      // Determine if it's a free model
      const isFree =
        !model.pricing?.prompt || parseFloat(model.pricing.prompt) === 0;

      // Build description
      let description = model.description || "";
      if (isFree) {
        description = description
          ? `${description} (Free tier available)`
          : "Free tier available";
      }

      // Insert the model
      await db.insert(language_models).values({
        displayName: model.name,
        apiName: model.id,
        builtinProviderId: "openrouter",
        description: description || null,
        max_output_tokens: model.top_provider?.max_completion_tokens || null,
        context_window: model.context_length || null,
      });

      results.saved++;
      logger.debug(`Saved model: ${model.id}`);
    } catch (error) {
      results.errors++;
      logger.error(`Failed to save model ${model.id}:`, error);
    }
  }

  return results;
}

export function registerFetchOpenRouterModelsHandler() {
  ipcMain.handle(
    "fetchOpenRouterModels",
    async (_event, options?: { saveToDatabase?: boolean }) => {
      try {
        const saveToDatabase = options?.saveToDatabase ?? true;

        // Check cache first (only for display, always fetch if saving)
        if (
          !saveToDatabase &&
          cachedModels &&
          Date.now() - cachedModels.timestamp < CACHE_DURATION_MS
        ) {
          logger.info("Returning cached OpenRouter models");
          return {
            success: true,
            models: cachedModels.models,
            cached: true,
            saved: 0,
            skipped: 0,
          };
        }

        logger.info("Fetching models from OpenRouter API");

        const response = await fetch("https://openrouter.ai/api/v1/models");

        if (!response.ok) {
          throw new Error(
            `OpenRouter API returned ${response.status}: ${response.statusText}`,
          );
        }

        const data: OpenRouterModelsResponse = await response.json();

        // Filter to coding-capable models
        const codingModels = data.data.filter(isCodingModel);

        // Cache the results
        cachedModels = {
          models: codingModels,
          timestamp: Date.now(),
        };

        logger.info(
          `Successfully fetched ${codingModels.length} models from OpenRouter`,
        );

        let saveResults = { saved: 0, skipped: 0, errors: 0 };

        // Save to database if requested
        if (saveToDatabase) {
          saveResults = await saveOpenRouterModels(codingModels);
          logger.info(
            `Saved ${saveResults.saved} new models, skipped ${saveResults.skipped} existing, ${saveResults.errors} errors`,
          );
        }

        return {
          success: true,
          models: codingModels,
          cached: false,
          saved: saveResults.saved,
          skipped: saveResults.skipped,
          errors: saveResults.errors,
        };
      } catch (error) {
        logger.error("Failed to fetch OpenRouter models:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          saved: 0,
          skipped: 0,
          errors: 1,
        };
      }
    },
  );

  logger.info("Registered fetchOpenRouterModels IPC handler");
}
