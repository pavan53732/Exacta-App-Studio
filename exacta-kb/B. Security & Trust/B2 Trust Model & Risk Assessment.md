# B2. Trust Model & Risk Assessment

This document specifies the **trust model** and **risk management** approach for autonomous execution in LocalAgent.

> **Document ID:** B2
> 

> **Version:** V2 (Autonomous Agent)
> 

> **Status:** Canonical & Enforced
> 

**V2 Changes:**

- Approval is now policy-based (Gate Pipeline), not just risk-based
- Autonomy Profiles control execution behavior (PROFILE-SAFE, PROFILE-DEV, PROFILE-FULL-AUTO)
- Shell execution capability added with sandbox
- Self-upgrade capability added with strict controls

---

## 1. Trust Model Philosophy

### Core Philosophy

LocalAgent trusts AI as a **"skilled but imperfect junior developer"**:

**What we trust:**

- AI can generate syntactically correct code
- AI understands common patterns and idioms
- AI can follow explicit instructions
- AI provides reasonable solutions to well-defined problems

**What we do NOT trust:**

- AI to never make mistakes
- AI to understand complex business logic without context
- AI to detect all security vulnerabilities
- AI to make architectural decisions autonomously
- AI to understand implicit requirements

### Trust Model Comparison

| Aspect | Exacta (Manual) | LocalAgent (Autonomous) |
| --- | --- | --- |
| AI Output | Untrusted until reviewed | Trusted with mitigation |
| User Role | Gatekeeper | Supervisor |
| Execution | After approval | Immediate (low/medium risk) |
| Validation | Before execution | After execution |
| Safety Net | Approval gate | Rollback + audit trail |

---

## 2. Known Risks and Mitigations

```tsx
const KnownRisks = [
  {
    risk: "Incorrect code generation",
    probability: "Medium",
    impact: "Low-Medium",
    mitigation: "Automatic retry + rollback",
    examples: [
      "Syntax errors",
      "Logic bugs",
      "API misuse"
    ]
  },
  {
    risk: "Context misunderstanding",
    probability: "Medium",
    impact: "Medium",
    mitigation: "Quality scoring + clarification requests",
    examples: [
      "Modifying wrong file",
      "Missing requirements",
      "Incorrect assumptions"
    ]
  },
  {
    risk: "Breaking changes",
    probability: "Low",
    impact: "High",
    mitigation: "Risk assessment + user confirmation",
    examples: [
      "Public API changes",
      "Database schema changes",
      "Breaking refactors"
    ]
  },
  {
    risk: "Security vulnerabilities introduced",
    probability: "Low",
    impact: "High",
    mitigation: "Security-sensitive code flagged as high-risk",
    examples: [
      "SQL injection",
      "XSS vulnerabilities",
      "Authentication bypass"
    ]
  },
  {
    risk: "Data loss",
    probability: "Very Low",
    impact: "Critical",
    mitigation: "Deletions always require confirmation + atomic operations",
    examples: [
      "Accidental file deletion",
      "Database truncation",
      "Configuration wipeout"
    ]
  }
];
```

---

## 3. Risk Assessment Algorithm

See [Autonomous Agent Controller Specification](https://www.notion.so/Autonomous-Agent-Controller-Specification-0295062ca8bd4fc8af0d93e584bfaa4d?pvs=21) for the complete risk scoring algorithm.

### Risk Factors Summary

| Factor | Weight | Key Criteria |
| --- | --- | --- |
| File Operations | 0-35 pts | Deletions, bulk modifications |
| Dependency Changes | 0-25 pts | Added/removed dependencies |
| Refactoring Scope | 0-20 pts | Cross-file changes |
| Breaking Changes | 0-15 pts | API signature changes |
| Security Impact | 0-15 pts | Auth/crypto code touched |
| Code Complexity | 0-10 pts | Cyclomatic complexity |

**Total Range:** 0-100 points

- **Low Risk:** 0-30 → Auto-execute
- **Medium Risk:** 31-65 → Auto-execute with notification
- **High Risk:** 66-100 → Require user confirmation

---

## 4. Risk Mitigation Strategies

### Automated Mitigations

```tsx
class RiskMitigator {
  
  async applyMitigations(
    operation: AutonomousOperation,
    assessment: DetailedRiskAssessment
  ): Promise<MitigatedOperation> {
    
    const mitigations: AppliedMitigation[] = [];
    
    // Mitigation 1: Increase context for complex changes
    if (this.hasComplexityRisk(assessment)) {
      operation.contextLines = Math.max(operation.contextLines || 3, 8);
      mitigations.push({
        risk: "High Complexity",
        action: "Increased context window to 8 lines",
        automatic: true
      });
    }
    
    // Mitigation 2: Break large changes into smaller steps
    if (this.hasLargeChangeRisk(assessment)) {
      operation = await this.breakIntoSmallerSteps(operation);
      mitigations.push({
        risk: "Large Change",
        action: "Split into smaller incremental steps",
        automatic: true
      });
    }
    
    // Mitigation 3: Add validation step after execution
    if (this.hasBusinessLogicRisk(assessment)) {
      operation.postExecutionValidation = true;
      mitigations.push({
        risk: "Business Logic Impact",
        action: "Added post-execution validation",
        automatic: true
      });
    }
    
    // Mitigation 4: Enable strict mode for security-sensitive
    if (this.hasSecurityRisk(assessment)) {
      operation.strictMode = true;
      operation.autoExecutable = false; // Always require confirmation
      mitigations.push({
        risk: "Security Impact",
        action: "Enabled strict mode, requiring user confirmation",
        automatic: false
      });
    }
    
    // Mitigation 5: Create checkpoint before execution
    if (assessment.score > 50) {
      await this.createCheckpoint(operation.projectId);
      mitigations.push({
        risk: "Medium-High Risk",
        action: "Created full project checkpoint",
        automatic: true
      });
    }
    
    return {
      operation,
      mitigations,
      riskReduction: this.calculateRiskReduction(mitigations)
    };
  }
}
```

---

## 5. Rollback as Safety Net

### Checkpoint System

```tsx
class RollbackManager {
  private checkpoints: Map<string, Checkpoint> = new Map();
  
  // Create checkpoint before risky operation
  async createCheckpoint(
    projectId: string,
    operation: AutonomousOperation
  ): Promise<string> {
    const checkpointId = `ckpt-${
```

### Rollback Guarantees

✅ **Always reversible:** Every autonomous operation creates a checkpoint

✅ **Atomic rollback:** All files restored or none

✅ **Verification:** Checksums validated after restore

✅ **No data loss:** Original content preserved until checkpoint expires

✅ **Fast rollback:** In-memory snapshots for quick restoration

---

## 6. Audit Trail for Autonomous Actions

### Comprehensive Logging

```tsx
class AuditLogger {
  private logFile: string;
  
  async logOperation(
    operation: AutonomousOperation,
    result: ExecutionResult
  ): Promise<void> {
    const entry: AuditEntry = {
      timestamp: 
```

### Audit Guarantees

✅ **Complete history:** Every autonomous action logged

✅ **Queryable:** Filter by date, risk level, success/failure

✅ **Immutable:** Log entries cannot be modified

✅ **Exportable:** Generate reports for review

✅ **Persistent:** Survives app restarts

---

## 7. Post-Execution Validation

### Validation Pipeline

```tsx
class PostExecutionValidator {
  
  async validate(
    operation: AutonomousOperation,
    result: ExecutionResult
  ): Promise<ValidationResult> {
    
    const checks: ValidationCheck[] = [];
    
    // Check 1: Syntax validation
    const syntaxCheck = await this.validateSyntax(result.changedFiles);
    checks.push(syntaxCheck);
    
    // Check 2: Build validation
    if (operation.requiresBuild) {
      const buildCheck = await this.validateBuild(operation.projectId);
      checks.push(buildCheck);
    }
    
    // Check 3: Test validation
    if (operation.hasTests) {
      const testCheck = await this.validateTests(operation.projectId);
      checks.push(testCheck);
    }
    
    // Check 4: Security scan
    if (operation.touchesSecuritySensitiveCode) {
      const securityCheck = await this.scanForVulnerabilities(result.changedFiles);
      checks.push(securityCheck);
    }
    
    // Check 5: Verify intent was met
    const intentCheck = await this.verifyIntentFulfillment(operation, result);
    checks.push(intentCheck);
    
    // Determine if validation passed
    const allPassed = checks.every(c => c.passed);
    const criticalFailed = checks.some(c => !c.passed && c.severity === "critical");
    
    // Handle validation failure
    if (criticalFailed) {
      await this.handleCriticalValidationFailure(operation, checks);
    }
    
    return {
      passed: allPassed,
      checks,
      requiresAttention: criticalFailed,
      recommendation: this.generateRecommendation(checks)
    };
  }
  
  private async handleCriticalValidationFailure(
    operation: AutonomousOperation,
    checks: ValidationCheck[]
  ): Promise<void> {
    
    // Auto-rollback on critical failure
    if (operation.checkpointId) {
      await this.rollbackManager.rollback(operation.checkpointId);
    }
    
    // Notify user immediately
    await this.notifyUser({
      type: "error",
      priority: NotificationPriority.Critical,
      title: "Validation Failed - Changes Rolled Back",
      message: `Operation "${operation.description}" produced invalid results`,
      details: checks.filter(c => !c.passed),
      actions: [
        { label: "View Details", action: () => this.showValidationReport(checks) },
        { label: "Try Different Approach", action: () => this.suggestAlternative(operation) }
      ]
    });
  }
}
```

### Validation Checks

| Check | Severity | Auto-Rollback |
| --- | --- | --- |
| Syntax errors | Critical | Yes |
| Build failures | Critical | Yes |
| Test failures | High | No (user decides) |
| Security issues | High | No (user decides) |
| Intent not met | Medium | No (user decides) |

---

## 8. Trust Calibration Over Time

### Learning from History

```tsx
class TrustCalibrator {
  
  async calibrateRiskThresholds(
    projectId: string
  ): Promise<CalibratedThresholds> {
    
    // Analyze last 100 operations
    const history = await this.auditLogger.query({
      projectId,
      limit: 100
    });
    
    // Calculate success rate by risk level
    const successRates = {
      low: this.calculateSuccessRate(history, RiskLevel.Low),
      medium: this.calculateSuccessRate(history, RiskLevel.Medium),
      high: this.calculateSuccessRate(history, RiskLevel.High)
    };
    
    // Adjust thresholds based on success rates
    const thresholds: CalibratedThresholds = {
      lowRiskCeiling: 30,
      mediumRiskCeiling: 65
    };
    
    // If medium-risk operations have >95% success, raise ceiling
    if (successRates.medium > 0.95) {
      thresholds.mediumRiskCeiling = 70;
    }
    
    // If low-risk operations have <90% success, lower ceiling
    if (successRates.low < 0.90) {
      thresholds.lowRiskCeiling = 25;
    }
    
    return thresholds;
  }
}
```

---

## 9. Security Boundaries

### What Agent CANNOT Do

❌ **Unauthorized network operations** (only AI APIs + package managers per profile)

❌ **System-level changes** (OS, registry, drivers)

❌ **Access files outside project** (sandbox enforced)

❌ **Execute blocklisted shell commands** *(Changed in V2 - allowlist/blocklist filtering)*

❌ **Self-authorize upgrades** *(Changed in V2 - can upgrade but not authorize)*

❌ **Access credentials/secrets** (redacted before AI sees)

❌ **Send telemetry** (local-only guarantee)

❌ **Bypass Gate Pipeline** *(New in V2)*

❌ **Execute during profile switch** *(New in V2)*

### What Agent CAN Do

✅ **Read project files** (within sandbox)

✅ **Write project files** (with rollback)

✅ **Run build tools** (npm, cargo, etc.)

✅ **Generate code** (via AI)

✅ **Apply diffs** (with validation)

✅ **Create checkpoints** (for rollback)

✅ **Log actions** (audit trail)

✅ **Execute shell commands** (filtered by allowlist/blocklist) *(New in V2)*

✅ **Auto-execute per policy** (Gate Pipeline evaluation) *(New in V2)*

✅ **Self-upgrade** (in PROFILE-FULL-AUTO with explicit config) *(New in V2)*

---

## Summary

LocalAgent's trust model balances **autonomy with safety**:

1. **Trust AI for routine tasks** (low risk, high quality)
2. **Verify through post-execution** (not pre-approval)
3. **Rollback on failures** (safety net always available)
4. **Log everything** (complete audit trail)
5. **Ask when uncertain** (clarifications on ambiguity)
6. **Learn over time** (calibrate based on history)

This approach enables **fast iteration** while maintaining **safety and control**.

---

## V2 Integration with Autonomy Profiles

### Profile Override Constraints *(New in V2)*

Advanced Mode overrides are constrained by the active profile:

| Override | PROFILE-SAFE | PROFILE-DEV | PROFILE-FULL-AUTO |
| --- | --- | --- | --- |
| Extended file types | Cannot override | Can override | Can override |
| Lower risk thresholds | Cannot override | Limited (not below 50) | Can override |
| Skip build validation | Cannot override | Can override | Can override |
| Shell allowlist expansion | Cannot override | Can add commands | Can add commands |
| Self-upgrade enablement | Cannot override | Cannot override | Can override |

### Advanced Mode + Gate Pipeline *(New in V2)*

- Advanced Mode overrides are evaluated as part of Policy Gate
- Overrides can relax policy decisions but not bypass Security Gate
- All override decisions logged with `approval_source: "advanced_mode"`

---

## Hard Invariants

This component enforces the following Global System Invariants:

- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Policy-Based Approval Gate** *(Changed in V2)*
- **INV-GLOBAL-3: Background Operation**
- **INV-GLOBAL-4: Graceful Degradation with Auto-Rollback** *(Enhanced in V2)*
- **INV-GLOBAL-5: AI Treated as Trusted Advisor**
- **INV-GLOBAL-6: User-Owned API Keys**
- **INV-GLOBAL-7: No Telemetry**
- **INV-GLOBAL-8: All Changes Reversible**
- **INV-GLOBAL-9: Complete Audit Trail** *(Enhanced in V2)*
- **INV-GLOBAL-10: Shell Execution Sandbox** *(New in V2)*
- **INV-GLOBAL-11: Self-Improving, Never Self-Authorizing** *(New in V2)*

### Invariant Alignment

**Risk-Based Execution (INV-GLOBAL-2, INV-GLOBAL-3):**

- Low risk (0-30): Execute silently in background
- Medium risk (31-65): Execute with notification to user
- High risk (66-100): Request user confirmation before execution

**Graceful Degradation (INV-GLOBAL-4):**

- Automatic retry up to 3 times with exponential backoff
- Auto-rollback on critical validation failures (syntax errors, build failures)
- Escalate to user after retry exhaustion

**Rollback Safety Net (INV-GLOBAL-8):**

- Checkpoint created before every operation with risk score > 30
- Atomic rollback ensures all-or-nothing restoration
- Verification via checksums guarantees integrity

**Audit Trail (INV-GLOBAL-9):**

- Every autonomous action logged with full context
- Immutable log entries with correlation IDs
- Queryable history for compliance and debugging