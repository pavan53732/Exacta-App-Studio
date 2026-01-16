# F4. Observability & Logging

This document defines the **logging schema**, **redaction rules**, and **diagnostic bundle** format.

---

## Log Schema

```tsx
interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  correlation_id: UUID;
  component: string;
  message: string; // REDACTED content only
}
```

---

## Redaction Rules

**Never Log:** API Keys (`sk-...`), Passwords, Full Source Code.

**Redaction:** Replace secrets with `\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\[REDACTED:SECRET\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\]`.

---

## Logging Responsibility Model

<aside>
🔒

**Clarification (V2.1):** Core writes log entries. Guardian seals and anchors logs. This separation ensures auditability while maintaining performance.

</aside>

| **Responsibility** | **Owner** | **Rationale** |
| --- | --- | --- |
| Write log entries | Core | Core has operational context |
| Append-only enforcement | Guardian | Prevent tampering |
| Hash chain computation | Guardian | Detect tampering |
| External anchor writes | Guardian | Tamper evidence |
| Log rotation | Guardian | Prevent deletion of recent logs |

---

## External Log Anchor

<aside>
🔒

**INV-LOG-1: External Tamper Evidence**

Log integrity MUST be verifiable even if Core is compromised. Guardian MUST write log root hashes to a location Core cannot access.

</aside>

### Anchor Locations

Guardian writes daily log root hash to:

| **Location** | **Format** | **Core Access** |
| --- | --- | --- |
| Windows Event Log (Application) | Event ID 9001: "Exacta Log Anchor" | Read only |
| `C:\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ProgramData\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\Exacta\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\LogAnchor\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\` | `anchor-YYYY-MM-DD.json` | **None** (ACL enforced) |

### Anchor Format

```tsx
interface LogAnchor {
  date: string;              // ISO date
  log_file: string;          // Which log file this anchors
  entry_count: number;       // Number of entries in chain
  root_hash: string;         // SHA-256 of final chain state
  guardian_version: string;  // Guardian version that wrote anchor
  timestamp: string;         // When anchor was written
}
```

### Anchor Write Schedule

- **Daily:** At midnight (local time)
- **On Guardian shutdown:** Final anchor before exit
- **On log rotation:** Anchor before rotating to new file
- **On demand:** Via `exacta-guardian.exe --anchor-logs`

### Verification Process

```jsx
User requests log verification
    ↓
┌─────────────────────────────────────┐
│ Read anchor from protected location │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Replay log file, computing hashes   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Compare computed hash vs anchor     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ IF match: Logs verified intact      │
│ IF mismatch: TAMPERING DETECTED     │
└─────────────────────────────────────┘
```

### ACL on LogAnchor Directory

```
C:\ProgramData\Exacta\LogAnchor\
├── Owner: SYSTEM
├── Administrators: Full Control
├── exacta-guardian.exe: Write (via service account)
├── exacta-core.exe: **NO ACCESS**
└── Users: Read only
```

---

## Diagnostic Bundle

Users can export a safe debug bundle containing:

- `system_info.json` (OS, .NET version)
- `config_sanitized.json` (No keys)
- `recent_logs.jsonl` (Redacted)
- `error_details.json` (Stack trace of last error)
- `anchor_verification.json` (Log integrity check result) *(New in V2.1)*

---

## Forensic Export Mode

> **INV-LOG-2: Legal-Grade Forensics**
> 

> 
> 

> The system MUST support forensic export that produces court-admissible evidence packages. Forensic exports are cryptographically sealed and tamper-evident.
> 

<aside>
🔒

**INV-LOG-5: Governed Disclosure** *(New in V2.2)*

Forensic exports SHALL be classified as SYSTEM-LEVEL PLANS and MUST require explicit human approval and Safety Policy clearance.

</aside>

### Activation

```bash
exacta-guardian.exe --forensic-export --output C:\Evidence\case-001
```

Forensic export requirements *(Enhanced in V2.2)*:

- MUST be classified as a **SYSTEM-LEVEL PLAN**
- MUST require explicit human approval (Administrator)
- MUST pass Safety Policy check (`forensic_export_allowed`)
- MUST be logged with correlation_id and signed by Guardian
- MUST create approval record in Approval Gate registry

### Export Contents

| **File** | **Contents** | **Purpose** |
| --- | --- | --- |
| `logs/` | Complete log files with hash chain | Activity evidence |
| `anchors/` | All log anchor files | Tamper verification |
| `policy-snapshot.json` | Safety Policy + Runtime Policy at export time | Configuration evidence |
| `model-identity.json` | All model identities used in session | AI provenance |
| `guardian-attestation.json` | Full Guardian verification result | System integrity proof |
| `certification-state.json` | Current certification status | Autonomy authorization proof |
| `correlation-index.json` | Index of all correlation_ids and their operations | Activity tracing |
| `manifest.json` | List of all files with SHA-256 hashes | Package integrity |
| `manifest.json.sig` | Guardian signature over manifest | Authenticity proof |

### Package Format

```jsx
forensic-export-2026-01-16T10-45-00Z/
├── logs/
│   ├── exacta-2026-01-15.jsonl
│   ├── exacta-2026-01-16.jsonl
│   └── hash-chain.json
├── anchors/
│   ├── anchor-2026-01-15.json
│   └── anchor-2026-01-16.json
├── policy-snapshot.json
├── model-identity.json
├── guardian-attestation.json
├── certification-state.json
├── correlation-index.json
├── manifest.json
└── manifest.json.sig
```

### Manifest Schema

```tsx
interface ForensicManifest {
  export_id: UUID;
  export_timestamp: string;
  guardian_version: string;
  core_version: string;
  
  files: {
    path: string;
    sha256: string;
    size: number;
  }[];
  
  time_range: {
    earliest_log: string;
    latest_log: string;
  };
  
  integrity: {
    all_anchors_verified: boolean;
    hash_chain_intact: boolean;
    guardian_attestation_passed: boolean;
  };
}
```

### Verification Command

```bash
exacta-guardian.exe --verify-forensic C:\Evidence\case-001
```

Outputs:

- Whether manifest signature is valid
- Whether all file hashes match
- Whether hash chains are intact
- Whether export was tampered with

### Legal Considerations

- **Read-only output:** Export directory is marked read-only
- **Chain of custody:** Export timestamp and Guardian signature establish provenance
- **Tamper evidence:** Any modification breaks manifest verification
- **No secrets:** API keys and credentials are never included

---

## Path Redaction

<aside>
🔒

**INV-LOG-3: Path Redaction Mode**

File paths in logs MUST be redactable to prevent information disclosure. Path redaction is configurable per deployment context.

</aside>

### Redaction Levels

| **Level** | **Example Input** | **Logged As** | **Use Case** |
| --- | --- | --- | --- |
| `FULL` | `C:\\\\Users\\\\john\\\\project\\\\src\\\\main.cs` | `C:\\\\Users\\\\john\\\\project\\\\src\\\\main.cs` | Development / debugging |
| `USER_REDACTED` | `C:\\\\Users\\\\john\\\\project\\\\src\\\\main.cs` | `C:\\\\Users\\\\\\\[USER\\\]\\\\project\\\\src\\\\main.cs` | Standard operation |
| `PROJECT_RELATIVE` | `C:\\\\Users\\\\john\\\\project\\\\src\\\\main.cs` | `src\\\\main.cs` | Privacy-sensitive environments |
| `HASH_ONLY` | `C:\\\\Users\\\\john\\\\project\\\\src\\\\main.cs` | `\\\[PATH:a1b2c3d4\\\]` | Maximum privacy |

### Configuration

```json
{
  "logging": {
    "path_redaction_level": "USER_REDACTED",
    "redact_usernames": true,
    "redact_machine_names": true
  }
}
```

### Invariants

- Default level MUST be `USER_REDACTED`
- Forensic exports MUST use `FULL` (for evidence completeness)
- Diagnostic bundles MUST use `PROJECT_RELATIVE` (for shareability)
- Path redaction MUST be applied consistently across all log entries

---

## Log Payload Limits *(New in V2.2)*

<aside>
🔒

**INV-LOG-4: Log Payload Ceiling**

Log message fields SHALL be limited to a fixed maximum length and entropy threshold. High-entropy or oversized payloads MUST be truncated and flagged as `LOG-CHANNEL-ABUSE`.

</aside>

### Limits

| **Field** | **Max Length** | **Entropy Threshold** | **On Exceed** |
| --- | --- | --- | --- |
| `message` | 4 KB | 6.5 bits/byte | Truncate + flag |
| `component` | 128 bytes | N/A | Reject entry |
| `correlation_id` | 36 bytes (UUID) | N/A | Reject entry |

### Entropy Detection

```tsx
function detectHighEntropy(payload: string): boolean {
  const entropy = calculateShannonEntropy(payload);
  return entropy > 6.5; // bits per byte threshold
}
```

### Rationale

Prevents logging from being used as a covert data exfiltration channel:

- AI-generated text could encode arbitrary data
- Hash-chained persistence creates reliable storage
- External anchoring provides retrieval path
- Entropy detection blocks encoded/compressed payloads