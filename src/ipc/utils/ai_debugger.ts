import log from "electron-log";
import { EventEmitter } from "events";

const logger = log.scope("ai-debugger");

export interface DebugEvent {
  id: string;
  timestamp: number;
  type: "prompt" | "response" | "tool_call" | "error" | "processing_step";
  content: any;
  metadata?: Record<string, any>;
  duration?: number;
}

export interface ConversationTurn {
  id: string;
  timestamp: number;
  userInput: string;
  aiResponse: string;
  toolsUsed: string[];
  processingTime: number;
  success: boolean;
  errors?: string[];
}

export class AIDebugger extends EventEmitter {
  private static instance: AIDebugger;
  private debugEvents: DebugEvent[] = [];
  private conversationHistory: ConversationTurn[] = [];
  private readonly MAX_EVENTS = 1000;
  private readonly MAX_CONVERSATIONS = 100;
  private isRecording = false;

  private constructor() {
    super();
  }

  static getInstance(): AIDebugger {
    if (!AIDebugger.instance) {
      AIDebugger.instance = new AIDebugger();
    }
    return AIDebugger.instance;
  }

  startRecording(): void {
    this.isRecording = true;
    logger.info("AI debugging recording started");
  }

  stopRecording(): void {
    this.isRecording = false;
    logger.info("AI debugging recording stopped");
  }

  recordEvent(
    type: DebugEvent["type"],
    content: any,
    metadata?: Record<string, any>,
  ): string {
    if (!this.isRecording) return "";

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const event: DebugEvent = {
      id: eventId,
      timestamp: Date.now(),
      type,
      content,
      metadata,
    };

    this.debugEvents.push(event);

    // Trim old events
    if (this.debugEvents.length > this.MAX_EVENTS) {
      this.debugEvents.shift();
    }

    this.emit("newEvent", event);
    logger.debug(`Recorded ${type} event: ${eventId}`);

    return eventId;
  }

  recordConversationTurn(
    turn: Omit<ConversationTurn, "id" | "timestamp">,
  ): string {
    const turnId = `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const conversationTurn: ConversationTurn = {
      id: turnId,
      timestamp: Date.now(),
      ...turn,
    };

    this.conversationHistory.push(conversationTurn);

    // Trim old conversations
    if (this.conversationHistory.length > this.MAX_CONVERSATIONS) {
      this.conversationHistory.shift();
    }

    this.emit("newConversation", conversationTurn);
    logger.info(
      `Recorded conversation turn: ${turnId} (${turn.success ? "success" : "failed"})`,
    );

    return turnId;
  }

  getRecentEvents(count: number = 50): DebugEvent[] {
    return this.debugEvents.slice(-count);
  }

  getConversationHistory(count: number = 20): ConversationTurn[] {
    return this.conversationHistory.slice(-count);
  }

  getEventsByType(type: DebugEvent["type"]): DebugEvent[] {
    return this.debugEvents.filter((event) => event.type === type);
  }

  getEventsByTimeRange(startTime: number, endTime: number): DebugEvent[] {
    return this.debugEvents.filter(
      (event) => event.timestamp >= startTime && event.timestamp <= endTime,
    );
  }

  searchEvents(query: string): DebugEvent[] {
    return this.debugEvents.filter(
      (event) =>
        JSON.stringify(event.content)
          .toLowerCase()
          .includes(query.toLowerCase()) ||
        JSON.stringify(event.metadata)
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
  }

  getStatistics(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    totalConversations: number;
    successfulConversations: number;
    averageProcessingTime: number;
    commonErrors: string[];
  } {
    const eventsByType: Record<string, number> = {};
    this.debugEvents.forEach((event) => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    });

    const successfulConversations = this.conversationHistory.filter(
      (c) => c.success,
    ).length;
    const totalProcessingTime = this.conversationHistory.reduce(
      (sum, c) => sum + c.processingTime,
      0,
    );
    const averageProcessingTime =
      this.conversationHistory.length > 0
        ? totalProcessingTime / this.conversationHistory.length
        : 0;

    // Extract common errors
    const allErrors: string[] = [];
    this.conversationHistory.forEach((conv) => {
      if (conv.errors) {
        allErrors.push(...conv.errors);
      }
    });

    const commonErrors = [...new Set(allErrors)].slice(0, 10);

    return {
      totalEvents: this.debugEvents.length,
      eventsByType,
      totalConversations: this.conversationHistory.length,
      successfulConversations,
      averageProcessingTime,
      commonErrors,
    };
  }

  exportSession(): string {
    return JSON.stringify(
      {
        events: this.debugEvents,
        conversations: this.conversationHistory,
        statistics: this.getStatistics(),
        exportTime: new Date().toISOString(),
      },
      null,
      2,
    );
  }

  clearHistory(): void {
    this.debugEvents = [];
    this.conversationHistory = [];
    this.emit("cleared");
    logger.info("AI debug history cleared");
  }

  // Helper methods for specific debugging scenarios
  debugPromptGeneration(prompt: string, context: any): string {
    return this.recordEvent("prompt", prompt, {
      context,
      promptLength: prompt.length,
      timestamp: Date.now(),
    });
  }

  debugResponseProcessing(response: string, toolsCalled: string[]): string {
    return this.recordEvent("response", response, {
      toolsCalled,
      responseLength: response.length,
      toolCount: toolsCalled.length,
    });
  }

  debugToolCall(toolName: string, parameters: any, result: any): string {
    return this.recordEvent("tool_call", result, {
      toolName,
      parameters,
      success: !!(result && !result.error),
    });
  }

  debugError(error: Error, context: any): string {
    return this.recordEvent("error", error.message, {
      errorName: error.name,
      stack: error.stack,
      context,
    });
  }

  debugProcessingStep(stepName: string, data: any, duration?: number): string {
    return this.recordEvent("processing_step", data, {
      stepName,
      duration,
    });
  }
}

// Create global instance
export const aiDebugger = AIDebugger.getInstance();

// Utility functions for common debugging patterns
export const debugHelpers = {
  createConversationContext(
    userId: string,
    appId: number,
    chatId: number,
  ): any {
    return {
      userId,
      appId,
      chatId,
      sessionId: `sess_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
  },

  measureAsyncOperation<T>(
    operation: () => Promise<T>,
  ): () => Promise<{ result: T; duration: number }> {
    return async () => {
      const startTime = Date.now();
      const result = await operation();
      const duration = Date.now() - startTime;
      return { result, duration };
    };
  },

  formatDebugInfo(info: any): string {
    return JSON.stringify(info, null, 2);
  },
};
