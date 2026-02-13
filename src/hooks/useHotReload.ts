// src/hooks/useHotReload.ts
// React Query hooks for .NET Hot Reload functionality

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { hotReloadClient } from "@/ipc/types/hot_reload";
import type {
    StartHotReloadParams,
    HotReloadStatus,
    HotReloadEventPayload,
} from "@/ipc/types/hot_reload";

/**
 * Query keys for Hot Reload cache management
 */
export const hotReloadKeys = {
    all: ["hotReload"] as const,
    status: (appId: number) => [...hotReloadKeys.all, "status", appId] as const,
    session: (appId: number) => [...hotReloadKeys.all, "session", appId] as const,
};

/**
 * Hook for checking if hot reload is supported for a given stack type
 */
export function useHotReloadSupport(stackType: string | undefined) {
    return useQuery({
        queryKey: ["hotReload", "support", stackType],
        queryFn: async () => {
            if (!stackType) return { supported: false, message: "No stack type provided" };
            return hotReloadClient.checkHotReloadSupport({ stackType });
        },
        enabled: !!stackType,
        staleTime: Infinity, // Support info doesn't change
    });
}

/**
 * Hook for getting hot reload status for an app
 */
export function useHotReloadStatus(appId: number | null) {
    return useQuery({
        queryKey: hotReloadKeys.status(appId ?? 0),
        queryFn: async () => {
            if (!appId) return { status: null };
            return hotReloadClient.getHotReloadStatus({ appId });
        },
        enabled: !!appId,
        refetchInterval: 2000, // Refresh status every 2 seconds
    });
}

/**
 * Hook for starting a hot reload session
 */
export function useStartHotReload() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: StartHotReloadParams) => {
            return hotReloadClient.startHotReload(params);
        },
        onSuccess: (_, variables) => {
            // Invalidate status query to refresh
            queryClient.invalidateQueries({
                queryKey: hotReloadKeys.status(variables.appId),
            });
        },
    });
}

/**
 * Hook for stopping a hot reload session
 */
export function useStopHotReload() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (appId: number) => {
            return hotReloadClient.stopHotReload({ appId });
        },
        onSuccess: (_, appId) => {
            // Invalidate status query to refresh
            queryClient.invalidateQueries({
                queryKey: hotReloadKeys.status(appId),
            });
        },
    });
}

/**
 * Hook for listening to hot reload events
 */
export function useHotReloadEvents(
    appId: number | null,
    onEvent?: (payload: HotReloadEventPayload) => void,
) {
    useEffect(() => {
        if (!appId) return;

        const handleEvent = (
            _event: unknown,
            payload: HotReloadEventPayload,
        ) => {
            // Only process events for this app
            if (payload.appId !== appId) return;
            onEvent?.(payload);
        };

        // Subscribe to hot reload events
        const unsubscribe = window.electron?.ipcRenderer?.on?.(
            "hot-reload:event",
            handleEvent,
        );

        return () => {
            unsubscribe?.();
        };
    }, [appId, onEvent]);
}

/**
 * Combined hook for managing hot reload for an app
 */
export function useHotReload(appId: number | null, stackType?: string) {
    const queryClient = useQueryClient();

    // Check support
    const supportQuery = useHotReloadSupport(stackType);

    // Get current status
    const statusQuery = useHotReloadStatus(appId);

    // Start mutation
    const startMutation = useStartHotReload();

    // Stop mutation
    const stopMutation = useStopHotReload();

    // Start hot reload
    const startHotReload = useCallback(
        async (options?: { configuration?: "Debug" | "Release"; framework?: string }) => {
            if (!appId) return null;

            const result = await startMutation.mutateAsync({
                appId,
                configuration: options?.configuration ?? "Debug",
                framework: options?.framework,
            });

            return result;
        },
        [appId, startMutation],
    );

    // Stop hot reload
    const stopHotReload = useCallback(async () => {
        if (!appId) return null;
        return stopMutation.mutateAsync(appId);
    }, [appId, stopMutation]);

    // Refresh status
    const refreshStatus = useCallback(() => {
        if (appId) {
            queryClient.invalidateQueries({
                queryKey: hotReloadKeys.status(appId),
            });
        }
    }, [appId, queryClient]);

    return {
        // Support
        isSupported: supportQuery.data?.supported ?? false,
        supportMessage: supportQuery.data?.message,
        isCheckingSupport: supportQuery.isLoading,

        // Status
        status: statusQuery.data?.status as HotReloadStatus | null,
        session: statusQuery.data?.session,
        isLoadingStatus: statusQuery.isLoading,

        // Actions
        startHotReload,
        stopHotReload,
        refreshStatus,

        // Loading states
        isStarting: startMutation.isPending,
        isStopping: stopMutation.isPending,

        // Errors
        startError: startMutation.error,
        stopError: stopMutation.error,
    };
}
