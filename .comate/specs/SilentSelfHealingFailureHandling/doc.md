# Silent Self-Healing Failure Handling Doc

## Requirement Scenario & Handling Logic
Exacta App Studio must implement a self-healing execution model where most errors are handled silently without operator interruption. The system should retry failed operations, adjust approaches, and switch providers as needed before escalating to the operator.

## Architecture & Technical Solution
The failure handling system follows a silent recovery strategy with predefined actions for each failure type. It includes:
1. Silent Recovery Strategies for different failure types (build failure, AI provider error, etc.)
2. Recovery Escalation Steps (1-20 attempts with varying strategies)
3. AI Provider Fallback Mechanism (retry with backoff, switch to alternate provider)

## Impacted Files
- src/core/execution_loop.ts: Handles the continuous execution loop and failure detection.
- src/utils/failure_recovery.ts: Implements recovery strategies for different failure types.
- src/ipc/handlers/ai_handlers.ts: Manages AI provider fallback and error handling.
- src/guardian/policy_engine.ts: Checks policy and budget during recovery.

## Implementation Details
### Silent Recovery Strategies Code Snippet
```typescript
// src/utils/failure_recovery.ts
export enum FailureType {
  BuildFailure,
  AIProviderError,
  BudgetLimit,
  FileConflict,
  NetworkTimeout,
  RunawayPattern
}

export async function handleFailure(failureType: FailureType, attempt: number): Promise<boolean> {
  switch (failureType) {
    case FailureType.BuildFailure:
      return handleBuildFailure(attempt);
    case FailureType.AIProviderError:
      return handleAIProviderError(attempt);
    default:
      return false;
  }
}

async function handleBuildFailure(attempt: number): Promise<boolean> {
  if (attempt <=5) {
    return await retryBuild(adjustBuildConfig);
  } else if (attempt <=10) {
    return await retryBuild(switchBuildToolchain);
  } else if (attempt <=15) {
    return await retryBuild(reduceGoalScope);
  } else if (attempt <=20) {
    return await retryBuild(useMinimalViableConfig);
  }
  return false;
}

async function handleAIProviderError(attempt: number): Promise<boolean> {
  if (attempt <=5) {
    await delay(Math.pow(2, attempt) * 1000);
    return await retryAIRequest();
  } else {
    const alternateProvider = getAlternateAIProvider();
    if (alternateProvider) {
      setCurrentAIProvider(alternateProvider);
      return await retryAIRequest();
    }
  }
  return false;
}
```

### Recovery Escalation Code Snippet
```typescript
// src/core/execution_loop.ts
async function executeCycle(): Promise<boolean> {
  let attempt = 0;
  let success = false;
  while (attempt <20 && !success) {
    attempt++;
    try {
      success = await runCycleSteps();
    } catch (error) {
      const failureType = determineFailureType(error);
      success = await handleFailure(failureType, attempt);
    }
  }
  if (!success) {
    await notifyOperator("Failed after 20 attempts. Please clarify.");
  }
  return success;
}
```

## Boundary Conditions & Exception Handling
- Maximum retry attempts:20 per failure type.
- Escalate to operator only after 20 failed attempts.
- AI provider fallback limited to configured alternates.
- Network timeouts use exponential backoff (1s→16s) before escalation.

## Data Flow Path
1. Failure occurs during cycle execution.
2. Failure type is determined.
3. Recovery strategy applied based on attempt count.
4. If recovery succeeds, continue cycle; else increment attempt.
5. After 20 attempts, escalate to operator.

## Expected Outcome
The system handles most failures silently, reducing operator interruption. Only critical/persistent issues require input, ensuring smooth autonomous execution.