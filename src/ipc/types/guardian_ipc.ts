/**
 * Internal IPC types for Guardian service communication
 * These match the C# message contracts
 */

export interface GuardianMessage {
  MessageId: string;
  MessageType: "request" | "response" | "event";
  Timestamp: number;
}

export interface GuardianRequest extends GuardianMessage {
  MessageType: "request";
  Action: string;
  Payload?: Record<string, unknown>;
}

export interface GuardianResponse extends GuardianMessage {
  MessageType: "response";
  RequestId: string;
  Success: boolean;
  Data?: Record<string, unknown>;
  Error?: string;
}

export interface GuardianEvent extends GuardianMessage {
  MessageType: "event";
  EventType: string;
  Data?: Record<string, unknown>;
}
