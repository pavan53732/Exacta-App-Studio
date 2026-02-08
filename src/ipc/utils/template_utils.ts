import {
  type Template,
  type ApiTemplate,
  localTemplatesData,
} from "../../shared/templates";
import log from "electron-log";
import { apiFetch } from "./api_client";
import { getAvailableScaffolds } from "../handlers/createFromTemplate";

const logger = log.scope("template_utils");

// In-memory cache for API templates
let apiTemplatesCache: Template[] | null = null;
let apiTemplatesFetchPromise: Promise<Template[]> | null = null;

// Convert API template to our Template interface
function convertApiTemplate(apiTemplate: ApiTemplate): Template {
  return {
    id: `${apiTemplate.githubOrg}/${apiTemplate.githubRepo}`,
    title: apiTemplate.title,
    description: apiTemplate.description,
    imageUrl: apiTemplate.imageUrl,
    githubUrl: `https://github.com/${apiTemplate.githubOrg}/${apiTemplate.githubRepo}`,
    isOfficial: false,
  };
}

// Fetch templates from API with caching
export async function fetchApiTemplates(): Promise<Template[]> {
  // Return cached data if available
  if (apiTemplatesCache) {
    return apiTemplatesCache;
  }

  // Return existing promise if fetch is already in progress
  if (apiTemplatesFetchPromise) {
    return apiTemplatesFetchPromise;
  }

  // Start new fetch
  apiTemplatesFetchPromise = (async (): Promise<Template[]> => {
    try {
      const response = await apiFetch(
        "https://api.alifullstack.alitech.io/v1/templates",
      );
      if (!response.ok) {
        throw new Error(
          `Failed to fetch templates: ${response.status} ${response.statusText}`,
        );
      }

      const apiTemplates: ApiTemplate[] = await response.json();
      const convertedTemplates = apiTemplates.map(convertApiTemplate);

      // Cache the result
      apiTemplatesCache = convertedTemplates;
      return convertedTemplates;
    } catch (error) {
      logger.error("Failed to fetch API templates:", error);
      // Reset the promise so we can retry later
      apiTemplatesFetchPromise = null;
      return []; // Return empty array on error
    }
  })();

  return apiTemplatesFetchPromise;
}

// Get all templates (local + API + Scaffolds)
export async function getAllTemplates(): Promise<Template[]> {
  const apiTemplates = await fetchApiTemplates();
  const scaffolds = await getAvailableScaffolds();
  
  // Convert scaffolds to Template interface
  const scaffoldTemplates: Template[] = scaffolds.map(s => ({
    id: s.config.id,
    title: s.config.name,
    description: s.config.description,
    imageUrl: s.config.icon || "https://cdn-icons-png.flaticon.com/512/2621/2621040.png",
    isOfficial: true,
    isFrontend: true // Assume scaffolds are primarily project templates
  }));

  const allTemplates = [...scaffoldTemplates, ...localTemplatesData, ...apiTemplates];
  
  // Deduplicate by ID, preferring the first occurrence (scaffolds > local > api)
  const uniqueTemplates = new Map<string, Template>();
  for (const template of allTemplates) {
    if (!uniqueTemplates.has(template.id)) {
      uniqueTemplates.set(template.id, template);
    }
  }
  
  return Array.from(uniqueTemplates.values());
}

export async function getTemplateOrThrow(
  templateId: string,
): Promise<Template> {
  const allTemplates = await getAllTemplates();
  const template = allTemplates.find((template) => template.id === templateId);
  if (!template) {
    throw new Error(
      `Template ${templateId} not found. Please select a different template.`,
    );
  }
  return template;
}
