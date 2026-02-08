# IPC Architecture Documentation and Validation

## Requirement Scenario
Document and validate the IPC architecture implementation in Exacta App Studio to ensure compliance with the canonical spec and user-defined rules. This includes verifying the IPC client-handler pattern, React hook integration with TanStack Query, and security measures as defined in the project specifications.

## Architecture Technical Solution
1. **IPC Layer**: Follow the client-handler pattern with `IpcClient` (renderer process) communicating with main process handlers via Electron IPC.
2. **React Integration**: Use TanStack Query for managing asynchronous operations, state, and caching in React components.
3. **Security**: Implement IPC handshake protocol, session-bound secrets, and capability token validation as per the canonical spec.
4. **Error Handling**: Propagate errors from main process handlers to React components via rejected Promises, with appropriate UI feedback.

## Impacted Files
- **Renderer Process**:
  - `src/ipc/ipc_client.ts`: IPC client implementation (existing)
  - `src/hooks/use*.ts`: React hooks using TanStack Query (to be validated)
- **Main Process**:
  - `src/ipc/handlers/*.ts`: IPC handlers (existing, e.g., chat_stream_handlers.ts)
- **Documentation**:
  - `EXACTA_PROJECT_FULL_SPEC_ARCHIVE.md`: Canonical spec (existing)
  - `.cursor/rules/ipc.mdc`: User-defined rules (existing)

## Implementation Details
### IPC Client Pattern
```typescript
// Example from existing ipc_client.ts
export class IpcClient {
  private static instance: IpcClient;
  private ipcRenderer: IpcRenderer;
  
  private constructor() {
    this.ipcRenderer = (window as any).electron.ipcRenderer as IpcRenderer;
  }
  
  public static getInstance(): IpcClient {
    if (!IpcClient.instance) {
      IpcClient.instance = new IpcClient();
    }
    return IpcClient.instance;
  }
  
  // Example method
  public async getChat(chatId: number): Promise<Chat> {
    try {
      const data = await this.ipcRenderer.invoke("get-chat", chatId);
      return data;
    } catch (error) {
      showError(error);
      throw error;
    }
  }
}
```

### React Hook with TanStack Query Pattern
```typescript
// Example React hook pattern
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IpcClient } from '@/ipc/ipc_client';

export function useChat(chatId: number | null) {
  const queryClient = useQueryClient();
  
  // Query for fetching data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      if (!chatId) throw new Error("Chat ID is required");
      const ipcClient = IpcClient.getInstance();
      return ipcClient.getChat(chatId);
    },
    enabled: chatId !== null,
    meta: { showErrorToast: true },
  });
  
  // Mutation for updating data
  const mutation = useMutation({
    mutationFn: async (updatedChat: Partial<Chat>) => {
      if (!chatId) throw new Error("Chat ID is required");
      const ipcClient = IpcClient.getInstance();
      return ipcClient.updateChat({ chatId, ...updatedChat });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
    },
    onError: (error) => {
      showError(error);
    },
  });
  
  return {
    chat: data,
    isLoading,
    error,
    refetch,
    updateChat: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
```

### IPC Handler Pattern
```typescript
// Example from existing chat_stream_handlers.ts
import { ipcMain } from 'electron';
import { db } from '../../db';
import { chats } from '../../db/schema';
import { eq } from 'drizzle-orm';

export function registerChatHandlers() {
  ipcMain.handle("get-chat", async (event, chatId: number) => {
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
      with: {
        messages: true,
      },
    });
    
    if (!chat) {
      throw new Error(`Chat not found: ${chatId}`);
    }
    
    return chat;
  });
  
  ipcMain.handle("update-chat", async (event, params: { chatId: number; name?: string }) => {
    const { chatId, name } = params;
    
    if (!name) {
      throw new Error("Chat name is required");
    }
    
    await db.update(chats)
      .set({ name })
      .where(eq(chats.id, chatId));
      
    return { success: true };
  });
}
```

## Boundary Conditions & Error Handling
1. **IPC Communication Errors**: Handle cases where the main process is unresponsive or the IPC channel is not registered.
2. **Validation Errors**: Throw errors in both client and server side for invalid inputs (e.g., missing chatId).
3. **Security**: Ensure all IPC messages are authenticated and authorized as per the canonical spec.
4. **Concurrency**: Use locking mechanisms for operations modifying shared resources (e.g., database updates).

## Data Flow Path
1. React Component → Custom Hook (useChat) → IpcClient → Electron IPC → Main Process Handler → Database/File System → Response → IpcClient → Custom Hook → React Component.

## Expected成果
- A validated IPC architecture compliant with the canonical spec and user-defined rules.
- Documentation of the IPC pattern for future development.
- Identification of any deviations from the specified architecture.