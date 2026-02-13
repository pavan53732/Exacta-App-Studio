// src/ipc/handlers/__tests__/hot_reload_handlers.test.ts
// Tests for hot reload IPC handlers

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database
vi.mock("../../../db", () => ({
    db: {
        select: vi.fn(() => ({
            from: vi.fn(() => ({
                where: vi.fn(() => []),
            })),
        })),
    },
}));

// Mock the schema
vi.mock("../../../db/schema", () => ({
    apps: {},
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
    eq: vi.fn(),
}));

// Mock paths
vi.mock("../../../paths/paths", () => ({
    getDyadAppPath: vi.fn((name: string) => `/test/apps/${name}`),
}));

// Mock HotReloadManager
vi.mock("../../runtime/HotReloadManager", () => ({
    hotReloadManager: {
        isHotReloadSupported: vi.fn((stackType: string) =>
            ["wpf", "winui3", "winforms", "console", "maui"].includes(stackType.toLowerCase()),
        ),
        hasActiveSession: vi.fn(() => false),
        getSession: vi.fn(),
        startHotReload: vi.fn(),
        stopHotReload: vi.fn(),
        getStatus: vi.fn(),
    },
}));

// Mock electron-log
vi.mock("electron-log", () => ({
    default: {
        scope: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
        })),
    },
}));

describe("Hot Reload Handlers", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe("registerHotReloadHandlers", () => {
        it("should be a function", async () => {
            const { registerHotReloadHandlers } = await import("../hot_reload_handlers");
            expect(registerHotReloadHandlers).toBeInstanceOf(Function);
        });
    });
});
