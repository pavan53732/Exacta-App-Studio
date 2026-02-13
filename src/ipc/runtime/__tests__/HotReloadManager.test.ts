// src/ipc/runtime/__tests__/HotReloadManager.test.ts
// Tests for HotReloadManager

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HotReloadManager } from "../HotReloadManager";

// Mock child_process
vi.mock("child_process", () => ({
    spawn: vi.fn(() => ({
        pid: 12345,
        stdout: {
            on: vi.fn(),
        },
        stderr: {
            on: vi.fn(),
        },
        on: vi.fn(),
        kill: vi.fn(),
        killed: false,
    })),
}));

// Mock electron-log
vi.mock("electron-log", () => ({
    default: {
        scope: vi.fn(() => ({
            info: vi.fn(),
            debug: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        })),
    },
}));

// Mock execution_kernel
vi.mock("../../security/execution_kernel", () => ({
    executionKernel: {
        execute: vi.fn().mockResolvedValue({
            exitCode: 0,
            stdout: "",
            stderr: "",
        }),
        terminateJob: vi.fn().mockResolvedValue(true),
    },
}));

// Mock safe_sender
vi.mock("../../utils/safe_sender", () => ({
    safeSend: vi.fn(),
}));

describe("HotReloadManager", () => {
    let manager: HotReloadManager;

    beforeEach(() => {
        vi.clearAllMocks();
        manager = HotReloadManager.getInstance();
        // Clear any existing sessions
        manager.cleanup();
    });

    afterEach(async () => {
        await manager.cleanup();
    });

    describe("getInstance", () => {
        it("should return a singleton instance", () => {
            const instance1 = HotReloadManager.getInstance();
            const instance2 = HotReloadManager.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe("isHotReloadSupported", () => {
        it("should return true for supported stack types", () => {
            expect(manager.isHotReloadSupported("wpf")).toBe(true);
            expect(manager.isHotReloadSupported("winui3")).toBe(true);
            expect(manager.isHotReloadSupported("winforms")).toBe(true);
            expect(manager.isHotReloadSupported("console")).toBe(true);
            expect(manager.isHotReloadSupported("maui")).toBe(true);
        });

        it("should return false for unsupported stack types", () => {
            expect(manager.isHotReloadSupported("node")).toBe(false);
            expect(manager.isHotReloadSupported("react")).toBe(false);
            expect(manager.isHotReloadSupported("python")).toBe(false);
            expect(manager.isHotReloadSupported("")).toBe(false);
        });
    });

    describe("hasActiveSession", () => {
        it("should return false when no session exists", () => {
            expect(manager.hasActiveSession(1)).toBe(false);
        });
    });

    describe("getSession", () => {
        it("should return undefined when no session exists", () => {
            expect(manager.getSession(1)).toBeUndefined();
        });
    });

    describe("getStatus", () => {
        it("should return null when no session exists", () => {
            expect(manager.getStatus(1)).toBeNull();
        });
    });

    describe("getAllSessions", () => {
        it("should return empty array when no sessions exist", () => {
            expect(manager.getAllSessions()).toEqual([]);
        });
    });

    describe("startHotReload", () => {
        it("should create a new session with correct properties", async () => {
            const options = {
                appId: 1,
                appPath: "/test/app",
                configuration: "Debug" as const,
            };

            const session = await manager.startHotReload(options);

            expect(session).toBeDefined();
            expect(session.appId).toBe(1);
            expect(session.appPath).toBe("/test/app");
            expect(session.status).toBe("running");
            expect(session.startedAt).toBeInstanceOf(Date);
            expect(session.reloadCount).toBe(0);
            expect(session.error).toBeNull();
        });

        it("should prevent duplicate sessions for the same app", async () => {
            const options = {
                appId: 1,
                appPath: "/test/app",
            };

            const session1 = await manager.startHotReload(options);
            const session2 = await manager.startHotReload(options);

            expect(session1).toBe(session2);
            expect(manager.getAllSessions().length).toBe(1);
        });
    });

    describe("stopHotReload", () => {
        it("should stop an active session", async () => {
            const options = {
                appId: 1,
                appPath: "/test/app",
            };

            await manager.startHotReload(options);
            expect(manager.hasActiveSession(1)).toBe(true);

            await manager.stopHotReload(1);
            expect(manager.getStatus(1)).toBe("stopped");
        });

        it("should handle stopping non-existent session gracefully", async () => {
            // Should not throw
            await expect(manager.stopHotReload(999)).resolves.not.toThrow();
        });
    });

    describe("cleanup", () => {
        it("should stop all sessions", async () => {
            await manager.startHotReload({ appId: 1, appPath: "/app1" });
            await manager.startHotReload({ appId: 2, appPath: "/app2" });

            expect(manager.getAllSessions().length).toBe(2);

            await manager.cleanup();

            expect(manager.getAllSessions().length).toBe(0);
        });
    });
});
