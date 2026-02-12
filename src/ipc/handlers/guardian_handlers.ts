import { ipcMain } from "electron";
import net from "net";
import { z } from "zod";
import log from "electron-log";
import { guardianContracts } from "../types/guardian";
import type { GuardianRequest, GuardianResponse } from "../types/guardian_ipc";

const logger = log.scope("guardian-handler");

// Named pipe path for Windows
const PIPE_PATH = "\\\\.\\pipe\\DyadGuardian";

// Connection state
let _ipcClient: net.Socket | null = null;
let _messageQueue: Array<{ request: GuardianRequest; resolve: (value: GuardianResponse) => void; reject: (reason: Error) => void }> = [];
let _pendingRequests = new Map<string, { resolve: (value: GuardianResponse) => void; reject: (reason: Error) => void; timeout: NodeJS.Timeout }>();
let _responseBuffer = "";
let _isConnecting = false;
let _connectionPromise: Promise<void> | null = null;

/**
 * Get or create IPC client connection to Guardian service
 */
async function getIpcClient(): Promise<net.Socket> {
  const clientReadyState = _ipcClient?.readyState as string | undefined;

  if (clientReadyState === "open" || clientReadyState === "readOnly" || clientReadyState === "writeOnly") {
    return _ipcClient;
  }

  if (_connectionPromise) {
    await _connectionPromise;
    const afterConnectReadyState = _ipcClient?.readyState as string | undefined;
    if (afterConnectReadyState === "open" || afterConnectReadyState === "readOnly" || afterConnectReadyState === "writeOnly") {
      return _ipcClient;
    }
  }

  if (_isConnecting) {
    throw new Error("Already connecting to Guardian service");
  }

  _connectionPromise = connectToGuardian();
  await _connectionPromise;
  _connectionPromise = null;

  const finalReadyState = _ipcClient?.readyState as string | undefined;
  if (!_ipcClient || (finalReadyState !== "open" && finalReadyState !== "readOnly" && finalReadyState !== "writeOnly")) {
    throw new Error("Failed to connect to Guardian service");
  }

  return _ipcClient;
}

/**
 * Connect to Guardian named pipe server
 */
async function connectToGuardian(): Promise<void> {
  return new Promise((resolve, reject) => {
    _isConnecting = true;

    const client = net.createConnection(PIPE_PATH, () => {
      logger.log("Connected to Guardian service");
      _ipcClient = client;
      _isConnecting = false;
      resolve();
    });

    client.on("data", (data) => {
      handleIncomingData(data.toString());
    });

    client.on("error", (err) => {
      logger.error("Guardian connection error:", err);
      _isConnecting = false;
      _ipcClient = null;
      reject(err);
    });

    client.on("close", () => {
      logger.log("Guardian connection closed");
      _ipcClient = null;
    });

    // Timeout connection attempt
    setTimeout(() => {
      if (_isConnecting) {
        client.destroy();
        _isConnecting = false;
        reject(new Error("Connection timeout - Guardian service may not be running"));
      }
    }, 5000);
  });
}

/**
 * Handle incoming data from Guardian service
 */
function handleIncomingData(data: string): void {
  _responseBuffer += data;

  // Try to parse complete JSON messages
  let messages: GuardianResponse[] = [];
  let startIndex = 0;

  while (startIndex < _responseBuffer.length) {
    try {
      // Try to find a complete JSON object
      const result = tryParseJsonAt(_responseBuffer, startIndex);
      if (result.parsed) {
        messages.push(result.parsed);
        startIndex = result.endIndex;
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  // Keep remaining incomplete data
  _responseBuffer = _responseBuffer.slice(startIndex);

  // Process complete messages
  for (const message of messages) {
    const pending = _pendingRequests.get(message.RequestId);
    if (pending) {
      clearTimeout(pending.timeout);
      _pendingRequests.delete(message.RequestId);
      pending.resolve(message);
    }
  }
}

/**
 * Try to parse JSON at specific position
 */
function tryParseJsonAt(str: string, startIndex: number): { parsed: GuardianResponse | null; endIndex: number } {
  // Simple brace counting to find complete JSON object
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let i = startIndex;

  for (; i < str.length; i++) {
    const char = str[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !inString) {
      inString = true;
      continue;
    }

    if (char === '"' && inString) {
      inString = false;
      continue;
    }

    if (inString) continue;

    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        // Found complete object
        const jsonStr = str.slice(startIndex, i + 1);
        try {
          const parsed = JSON.parse(jsonStr) as GuardianResponse;
          return { parsed, endIndex: i + 1 };
        } catch {
          return { parsed: null, endIndex: startIndex };
        }
      }
    }
  }

  return { parsed: null, endIndex: startIndex };
}

/**
 * Send request to Guardian service and wait for response
 */
async function sendToGuardian(action: string, payload?: Record<string, unknown>): Promise<GuardianResponse> {
  const client = await getIpcClient();

  const request: GuardianRequest = {
    MessageId: crypto.randomUUID(),
    MessageType: "request",
    Timestamp: Date.now(),
    Action: action,
    Payload: payload,
  };

  return new Promise((resolve, reject) => {
    // Set timeout
    const timeout = setTimeout(() => {
      _pendingRequests.delete(request.MessageId);
      reject(new Error("Request timeout"));
    }, 30000);

    // Store pending request
    _pendingRequests.set(request.MessageId, { resolve, reject, timeout });

    // Send request
    const json = JSON.stringify(request);
    client.write(json, (err) => {
      if (err) {
        clearTimeout(timeout);
        _pendingRequests.delete(request.MessageId);
        reject(err);
      }
    });
  });
}

/**
 * Register all Guardian IPC handlers
 */
export function registerGuardianHandlers(): void {
  logger.log("Registering Guardian IPC handlers");

  // Job Object handlers
  ipcMain.handle(guardianContracts.createJob.channel, async (_, data) => {
    try {
      const validated = guardianContracts.createJob.input.parse(data);
      const response = await sendToGuardian("job:create", validated as Record<string, unknown>);
      return response.Data;
    } catch (error) {
      logger.error("Error in createJob:", error);
      throw error;
    }
  });

  ipcMain.handle(guardianContracts.assignProcessToJob.channel, async (_, data) => {
    try {
      const validated = guardianContracts.assignProcessToJob.input.parse(data);
      const response = await sendToGuardian("job:assign", validated as Record<string, unknown>);
      return response.Data;
    } catch (error) {
      logger.error("Error in assignProcessToJob:", error);
      throw error;
    }
  });

  ipcMain.handle(guardianContracts.terminateJob.channel, async (_, data) => {
    try {
      const validated = guardianContracts.terminateJob.input.parse(data);
      const response = await sendToGuardian("job:terminate", validated as Record<string, unknown>);
      return response.Data;
    } catch (error) {
      logger.error("Error in terminateJob:", error);
      throw error;
    }
  });

  ipcMain.handle(guardianContracts.getJobStats.channel, async (_, data) => {
    try {
      const validated = guardianContracts.getJobStats.input.parse(data);
      const response = await sendToGuardian("job:stats", validated as Record<string, unknown>);
      return response.Data;
    } catch (error) {
      logger.error("Error in getJobStats:", error);
      throw error;
    }
  });

  ipcMain.handle(guardianContracts.listJobs.channel, async () => {
    try {
      const response = await sendToGuardian("job:list");
      return response.Data;
    } catch (error) {
      logger.error("Error in listJobs:", error);
      throw error;
    }
  });

  // Capability Token handlers
  ipcMain.handle(guardianContracts.requestCapability.channel, async (_, data) => {
    try {
      const validated = guardianContracts.requestCapability.input.parse(data);
      const response = await sendToGuardian("capability:request", validated as Record<string, unknown>);
      return response.Data;
    } catch (error) {
      logger.error("Error in requestCapability:", error);
      throw error;
    }
  });

  ipcMain.handle(guardianContracts.validateCapability.channel, async (_, data) => {
    try {
      const validated = guardianContracts.validateCapability.input.parse(data);
      const response = await sendToGuardian("capability:validate", validated as Record<string, unknown>);
      return response.Data;
    } catch (error) {
      logger.error("Error in validateCapability:", error);
      throw error;
    }
  });

  ipcMain.handle(guardianContracts.revokeCapability.channel, async (_, data) => {
    try {
      const validated = guardianContracts.revokeCapability.input.parse(data);
      const response = await sendToGuardian("capability:revoke", validated as Record<string, unknown>);
      return response.Data;
    } catch (error) {
      logger.error("Error in revokeCapability:", error);
      throw error;
    }
  });

  ipcMain.handle(guardianContracts.listCapabilities.channel, async () => {
    try {
      const response = await sendToGuardian("capability:list");
      return response.Data;
    } catch (error) {
      logger.error("Error in listCapabilities:", error);
      throw error;
    }
  });

  // WFP handlers
  ipcMain.handle(guardianContracts.createWfpRule.channel, async (_, data) => {
    try {
      const validated = guardianContracts.createWfpRule.input.parse(data);
      const response = await sendToGuardian("wfp:create-rule", validated as Record<string, unknown>);
      return response.Data;
    } catch (error) {
      logger.error("Error in createWfpRule:", error);
      throw error;
    }
  });

  ipcMain.handle(guardianContracts.deleteWfpRule.channel, async (_, data) => {
    try {
      const validated = guardianContracts.deleteWfpRule.input.parse(data);
      const response = await sendToGuardian("wfp:delete-rule", validated as Record<string, unknown>);
      return response.Data;
    } catch (error) {
      logger.error("Error in deleteWfpRule:", error);
      throw error;
    }
  });

  ipcMain.handle(guardianContracts.listWfpRules.channel, async () => {
    try {
      const response = await sendToGuardian("wfp:list-rules");
      return response.Data;
    } catch (error) {
      logger.error("Error in listWfpRules:", error);
      throw error;
    }
  });

  // Health check
  ipcMain.handle(guardianContracts.pingGuardian.channel, async () => {
    try {
      const response = await sendToGuardian("ping");
      return response.Data;
    } catch (error) {
      return { status: "disconnected", timestamp: Date.now() };
    }
  });

  logger.log("Guardian IPC handlers registered");
}

/**
 * Disconnect from Guardian service (cleanup)
 */
export function disconnectFromGuardian(): void {
  logger.log("Disconnecting from Guardian service");

  // Reject all pending requests
  for (const [id, pending] of _pendingRequests) {
    clearTimeout(pending.timeout);
    pending.reject(new Error("Guardian connection closed"));
  }
  _pendingRequests.clear();

  // Close connection
  _ipcClient?.destroy();
  _ipcClient = null;
}