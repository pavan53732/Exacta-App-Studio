// src/ipc/types/hot_reload.ts
// Type definitions and IPC contracts for .NET Hot Reload

import { z } from "zod";
import { defineContract, createClient, defineEvent } from "../contracts/core";

// =============================================================================
// Hot Reload Schemas
// =============================================================================

/**
 * Status of a hot reload session
 */
export const HotReloadStatusSchema = z.enum([
  "starting",
  "running",
  "reloading",
  "stopped",
  "error",
]);

export type HotReloadStatus = z.infer<typeof HotReloadStatusSchema>;

/**
 * Schema for start hot reload params
 */
export const StartHotReloadParamsSchema = z.object({
  appId: z.number(),
  configuration: z.enum(["Debug", "Release"]).optional().default("Debug"),
  framework: z.string().optional(),
  noRestore: z.boolean().optional().default(false),
  env: z.record(z.string()).optional(),
});

/**
 * Schema for stop hot reload params
 */
export const StopHotReloadParamsSchema = z.object({
  appId: z.number(),
});

/**
 * Schema for get hot reload status params
 */
export const GetHotReloadStatusParamsSchema = z.object({
  appId: z.number(),
});

/**
 * Schema for hot reload session info
 */
export const HotReloadSessionInfoSchema = z.object({
  appId: z.number(),
  appPath: z.string(),
  processId: z.number().nullable(),
  status: HotReloadStatusSchema,
  startedAt: z.date(),
  lastReloadAt: z.date().nullable(),
  error: z.string().nullable(),
  reloadCount: z.number(),
});

/**
 * Schema for hot reload event payload
 */
export const HotReloadEventPayloadSchema = z.object({
  appId: z.number(),
  status: HotReloadStatusSchema,
  message: z.string(),
  timestamp: z.number(),
  reloadCount: z.number().optional(),
  error: z.string().optional(),
});

/**
 * Schema for start hot reload result
 */
export const StartHotReloadResultSchema = z.object({
  success: z.boolean(),
  session: HotReloadSessionInfoSchema.optional(),
  error: z.string().optional(),
});

/**
 * Schema for stop hot reload result
 */
export const StopHotReloadResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

/**
 * Schema for get hot reload status result
 */
export const GetHotReloadStatusResultSchema = z.object({
  status: HotReloadStatusSchema.nullable(),
  session: HotReloadSessionInfoSchema.optional(),
});

/**
 * Schema for check hot reload support params
 */
export const CheckHotReloadSupportParamsSchema = z.object({
  stackType: z.string(),
});

/**
 * Schema for check hot reload support result
 */
export const CheckHotReloadSupportResultSchema = z.object({
  supported: z.boolean(),
  message: z.string().optional(),
});

// =============================================================================
// Hot Reload Contracts
// =============================================================================

export const hotReloadContracts = {
  startHotReload: defineContract({
    channel: "hot-reload:start",
    input: StartHotReloadParamsSchema,
    output: StartHotReloadResultSchema,
  }),

  stopHotReload: defineContract({
    channel: "hot-reload:stop",
    input: StopHotReloadParamsSchema,
    output: StopHotReloadResultSchema,
  }),

  getHotReloadStatus: defineContract({
    channel: "hot-reload:status",
    input: GetHotReloadStatusParamsSchema,
    output: GetHotReloadStatusResultSchema,
  }),

  checkHotReloadSupport: defineContract({
    channel: "hot-reload:check-support",
    input: CheckHotReloadSupportParamsSchema,
    output: CheckHotReloadSupportResultSchema,
  }),
} as const;

// =============================================================================
// Hot Reload Events
// =============================================================================

export const hotReloadEvents = {
  hotReloadEvent: defineEvent({
    channel: "hot-reload:event",
    payload: HotReloadEventPayloadSchema,
  }),
} as const;

// =============================================================================
// Hot Reload Client
// =============================================================================

/**
 * Type-safe client for hot reload IPC operations.
 * Auto-generated from contracts.
 *
 * @example
 * const result = await hotReloadClient.startHotReload({ appId: 1 });
 * await hotReloadClient.stopHotReload({ appId: 1 });
 */
export const hotReloadClient = createClient(hotReloadContracts);

// =============================================================================
// Type Exports
// =============================================================================

export type StartHotReloadParams = z.infer<typeof StartHotReloadParamsSchema>;
export type StopHotReloadParams = z.infer<typeof StopHotReloadParamsSchema>;
export type GetHotReloadStatusParams = z.infer<
  typeof GetHotReloadStatusParamsSchema
>;
export type HotReloadSessionInfo = z.infer<typeof HotReloadSessionInfoSchema>;
export type HotReloadEventPayload = z.infer<typeof HotReloadEventPayloadSchema>;
export type StartHotReloadResult = z.infer<typeof StartHotReloadResultSchema>;
export type StopHotReloadResult = z.infer<typeof StopHotReloadResultSchema>;
export type GetHotReloadStatusResult = z.infer<
  typeof GetHotReloadStatusResultSchema
>;
export type CheckHotReloadSupportParams = z.infer<
  typeof CheckHotReloadSupportParamsSchema
>;
export type CheckHotReloadSupportResult = z.infer<
  typeof CheckHotReloadSupportResultSchema
>;
