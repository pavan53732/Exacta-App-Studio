# E10. Update Trust Chain & Signing Model

> **Document ID:** E10
> 

> **Version:** V2.1 (Guardian Architecture)
> 

> **Status:** Canonical & Enforced
> 

This is the **Master Specification** for the cryptographic trust chain that governs all software updates and self-upgrades.

> **Scope:** Code signing, hash verification, upgrade authorization, trust anchors
> 

> **Related:** Self-Upgrade Pipeline (E8), Immutable Trust Core (C4)
> 

---

## 1. Core Invariants

<aside>
🔒

**INV-SIGN-1: Mandatory Signing**

All executable code (Guardian, Core, upgrade packages) MUST be cryptographically signed. Unsigned code MUST NOT execute.

</aside>

<aside>
🔒

**INV-SIGN-2: Offline Root**

The root signing certificate MUST be stored offline (air-gapped). It is used only to sign Guardian and to issue operational certificates.

</aside>

<aside>
🔒

**INV-SIGN-3: Guardian Verifies All**

Guardian MUST verify the signature of Core on every startup and every upgrade package before installation. Verification failure = execution blocked.

</aside>

<aside>
🔒

**INV-SIGN-4: Core Cannot Sign**

Core has no access to signing keys. Core can only propose upgrades; it cannot create trusted packages.

</aside>

---

## 2. Trust Chain Architecture

```
┌─────────────────────────────────────────────────┐
│           OFFLINE ROOT CA                       │
│           (Air-gapped HSM)                      │
│                                                 │
│  • Signs Guardian binary                        │
│  • Issues Operational CA                        │
│  • Never connected to network                   │
└───────────────────┬─────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────────┐   ┌───────────────────┐
│ Guardian Cert     │   │ Operational CA    │
│ (signs Guardian)  │   │ (online, rotating)│
└───────────────────┘   └─────────┬─────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
            ┌───────────────┐           ┌───────────────┐
            │ Core Cert     │           │ Package Cert  │
            │ (signs Core)  │           │ (signs pkgs)  │
            └───────────────┘           └───────────────┘
```

---

## 3. Certificate Specifications

| **Certificate** | **Key Type** | **Validity** | **Storage** | **Purpose** |
| --- | --- | --- | --- | --- |
| Offline Root CA | RSA-4096 or Ed25519 | 10 years | Air-gapped HSM | Trust anchor |
| Guardian Signing | RSA-4096 or Ed25519 | 5 years | Air-gapped HSM | Sign Guardian binary |
| Operational CA | RSA-4096 or Ed25519 | 2 years | Secure build server | Issue Core/Package certs |
| Core Signing | RSA-2048 or Ed25519 | 1 year | Build server | Sign Core binary |
| Package Signing | RSA-2048 or Ed25519 | 1 year | Build server | Sign upgrade packages |

---

## 4. Verification Flow

### Startup Verification

```
Guardian starts
    ↓
┌─────────────────────────────────────┐
│ Self-verify Guardian signature      │
│ (Windows Authenticode check)        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Load Core binary path               │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Verify Core signature               │
│ • Check certificate chain           │
│ • Verify against trusted root       │
│ • Check certificate not revoked     │
│ • Check version is whitelisted      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ IF valid: Allow Core to start       │
│ IF invalid: Block + alert user      │
└─────────────────────────────────────┘
```

### Upgrade Verification

```jsx
Core proposes upgrade package
    ↓
┌─────────────────────────────────────┐
│ Guardian receives package           │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Verify package signature            │
│ • Check certificate chain           │
│ • Verify against trusted root       │
│ • Check certificate not revoked     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Verify package hash                 │
│ • SHA-256 of package contents       │
│ • Match against signed manifest     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Verify scope constraints            │
│ • No Guardian modifications         │
│ • No trust store modifications      │
│ • No policy root modifications      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Check privilege impact              │
│ IF ANY privilege_impact flag true: │
│ • Classify as PRIVILEGE-ESCALATION  │
│ • Require dual approval             │
│ • Display authority change diff     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ IF all valid: Proceed to approval   │
│ IF any invalid: Reject + log        │
└─────────────────────────────────────┘
```

---

## 5. Package Format

### Structure

```
upgrade-package.exapkg
├── manifest.json           ← Signed metadata
├── manifest.json.sig       ← Detached signature
├── core.exe                ← New Core binary
├── core.exe.sig            ← Detached signature
├── checksums.sha256        ← Hash of all files
└── checksums.sha256.sig    ← Signed checksums
```

### Manifest Schema

```tsx
interface UpgradeManifest {
  package_version: string;      // Semantic version
  target_version: string;       // Core version being upgraded TO
  minimum_guardian: string;     // Minimum Guardian version required
  created_at: string;           // ISO timestamp
  expires_at: string;           // Package expiration
  
  files: {
    path: string;
    sha256: string;
    size: number;
  }[];
  
  scope: {
    modifies_guardian: false;   // MUST be false
    modifies_trust_store: false;// MUST be false
    modifies_policy_root: false;// MUST be false
  };
  
  privilege_impact: {
    shell_scope_changed: boolean;
    network_scope_changed: boolean;
    policy_rules_changed: boolean;
    audit_behavior_changed: boolean;
  };
  
  changelog: string;
  rollback_version: string;     // Version to rollback to on failure
}
```

---

## 6. Forbidden Modifications

Upgrade packages MUST NOT contain modifications to:

| **Protected Component** | **Reason** | **Detection** |
| --- | --- | --- |
| Guardian binary | Immutable Trust Core | Manifest check + path filter |
| Guardian config | Immutable Trust Core | Manifest check + path filter |
| Trust store (certs) | Would allow forged signatures | Manifest check + path filter |
| Policy root | Would allow safety bypass | Manifest check + path filter |
| Signing keys | Would allow forged packages | Manifest check + path filter |

Any package claiming to modify these is **automatically rejected** regardless of signature validity.

---

## 7. Version Pinning & Whitelisting

### Guardian's Trusted Core List

Guardian maintains a whitelist of trusted Core versions:

```json
{
  "trusted_core_versions": [
    {
      "version": "2.1.0",
      "sha256": "abc123...",
      "cert_thumbprint": "def456...",
      "min_guardian": "2.1.0"
    },
    {
      "version": "2.1.1",
      "sha256": "789xyz...",
      "cert_thumbprint": "def456...",
      "min_guardian": "2.1.0"
    }
  ],
  "revoked_versions": ["2.0.9"]
}
```

### Version Policy

- Guardian will only run whitelisted Core versions
- Revoked versions are blocked even if signature is valid
- Whitelist is updatable only by signed Guardian updates (offline root)

---

## 8. Rollback Trust Anchor

### Preservation Requirement

Before any upgrade:

1. Current Core binary is copied to `backup/core-\\\\\\\\\\\\\\\{version\\\\\\\\\\\\\\\}.exe`
2. Backup is verified (signature + hash)
3. Backup path is recorded in rollback manifest

### Rollback Trigger

Automatic rollback occurs if:

- New Core fails to start within 30 seconds
- New Core fails self-test
- New Core signature becomes invalid (cert revoked)
- User initiates rollback within grace period

### Rollback Flow

```
Rollback triggered
    ↓
Guardian stops new Core
    ↓
Guardian verifies backup signature
    ↓
Guardian restores backup to active path
    ↓
Guardian verifies restored binary
    ↓
Guardian starts restored Core
    ↓
Log rollback event
```

---

## 9. Guardian Update Model (Two-Tier)

<aside>
🔒

**INV-SIGN-5: Guardian Update Isolation**

Guardian updates MUST be installed by the OS installer (MSI/EXE), not by Core or Guardian itself. This prevents the trust anchor from being self-modifying.

</aside>

### The Guardian Update Paradox

Guardian is immutable at runtime, but must be updatable for security patches. This creates a potential recursion loop if not carefully constrained.

**Resolution: Two-Tier Update Model**

| **Update Type** | **Installer** | **Signing** | **Approval** | **Trust Reset** |
| --- | --- | --- | --- | --- |
| Core Update | Guardian | Operational Cert | Per profile | No |
| Guardian Update | OS (MSI/EXE) | Offline Root Cert | Administrator | Yes (re-establish) |

### Guardian Update Rules

Guardian updates MUST:

1. **Be signed by offline root key** — Same key that signs Guardian binary, never exposed online
2. **Be installed only by OS installer** — MSI, EXE, or MSIX; never by Core or Guardian self-update
3. **Require Administrator approval** — UAC elevation required; standard user cannot install
4. **Re-run First-Run Trust Establishment** — New Guardian hash must be confirmed by user
5. **Preserve audit logs** — Old logs must not be deleted during upgrade
6. **Be atomic** — Failed Guardian update must not leave system in broken state

### Guardian Update Flow

```jsx
User downloads Guardian update package
    ↓
┌─────────────────────────────────────┐
│ OS verifies Authenticode signature  │
│ (offline root certificate)          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ UAC prompt: "Allow this app to      │
│ make changes to your device?"       │
│ (Administrator approval)            │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Installer stops Guardian service    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Installer backs up current Guardian │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Installer replaces Guardian binary  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Installer clears TrustRoot registry │
│ (forces re-establishment)           │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Installer restarts Guardian         │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ First-Run Trust Establishment       │
│ (user confirms new Guardian hash)   │
└─────────────────────────────────────┘
```

### What Guardian Update CANNOT Do

Even a legitimately signed Guardian update CANNOT:

- Be initiated by Core
- Be initiated by Guardian itself
- Be initiated by shell commands
- Be initiated by AI-generated plans
- Skip Administrator approval
- Skip First-Run Trust Establishment
- Delete audit logs
- Downgrade to unsigned version

### Rollback on Guardian Update Failure

If Guardian update fails:

1. Installer restores backed-up Guardian
2. Original TrustRoot remains valid
3. System returns to pre-update state
4. Failure is logged to Windows Event Log

---

## 10. Self-Generated Upgrade Handling

### Special Rules for AI-Generated Code Changes

When AI proposes improvements to Core itself:

1. **No Direct Compilation:** Core cannot compile itself
2. **Proposal Only:** AI generates diff/patch, not executable
3. **External Build:** Changes must be built externally and signed
4. **Extra Review:** Self-generated changes require human confirmation regardless of profile
5. **Scope Lock:** Self-generated changes cannot touch Guardian, policy, signing, or audit code

### Forbidden Self-Modifications

Even with valid signature, upgrades cannot modify:

- Signature verification logic
- Certificate validation code
- Policy enforcement code
- Audit logging code
- Guardian IPC handlers
- Kill switch logic

These components are **frozen at Guardian level**.

---

## 11. Root Key Compromise Response

<aside>
🚨

**INV-SIGN-6: Key Compromise Containment**

If the offline root signing key is compromised, the system MUST fail permanently safe. There is no recovery path that doesn't involve manual operator intervention.

</aside>

### Compromise Detection

Root key compromise may be detected via:

- Vendor security bulletin
- Certificate revocation (if CRL/OCSP configured)
- Anomalous upgrade packages appearing
- External security audit

### Immediate Response

When root key compromise is confirmed or suspected:

| **Action** | **Trigger** | **Automation** |
| --- | --- | --- |
| Guardian enters **permanent Safe Mode** | Vendor pushes revocation or operator sets flag | Automatic |
| All upgrades disabled | Safe Mode enforcement | Automatic |
| All shell execution disabled | Safe Mode enforcement | Automatic |
| Autonomy locked to PROFILE-SAFE | Safe Mode enforcement | Automatic |
| Alert displayed to operator | Safe Mode entry | Automatic |

### Recovery Path

Recovery from root key compromise requires **manual operator intervention**:

1. **Obtain offline recovery image** from vendor (new root key)
2. **Boot into Windows Recovery** or use separate admin account
3. **Completely uninstall** existing Guardian and Core
4. **Delete registry trust root:**
    
    ```
    reg delete "HKLM\SOFTWARE\Exacta\Guardian" /f
    ```
    
5. **Reinstall** from verified offline recovery image
6. **Re-run First-Run Trust Establishment** with new root
7. **Verify new Guardian hash** matches vendor-published hash

### What Cannot Happen

Even with a compromised root key, attackers CANNOT:

- **Silently upgrade Guardian** (requires OS installer + admin)
- **Bypass Safe Mode** (Guardian enforces, not Core)
- **Access existing projects** (read-only in Safe Mode)
- **Exfiltrate data** (network disabled in Safe Mode)

### Revocation Distribution

Vendor MAY distribute emergency revocation via:

- Signed revocation file at known URL (Guardian checks on startup)
- Windows Event Log injection (enterprise deployment)
- Manual operator action

**Note:** Revocation check is the ONLY network call Guardian makes, and it's optional. Offline systems remain safe but won't receive revocation notices.

---

## 12. Implementation Checkpoints

- [ ]  Offline root CA established with air-gapped HSM
- [ ]  Guardian signed with offline root certificate
- [ ]  Core signed with operational certificate
- [ ]  Guardian verifies Core signature on every startup
- [ ]  Guardian verifies upgrade packages before installation
- [ ]  Package scope constraints enforced (no Guardian/trust modifications)
- [ ]  Version whitelist maintained by Guardian
- [ ]  Rollback preserves signed backup
- [ ]  Certificate revocation checked before execution
- [ ]  Self-generated upgrades have extra gates

---

## Hard Invariants

This component enforces the following Global System Invariants:

- **INV-GLOBAL-11: Self-Improving, Never Self-Authorizing**
- **INV-GLOBAL-12: Immutable Trust Core**
- **INV-GLOBAL-8: All Changes Reversible**
- **INV-GLOBAL-9: Complete Audit Trail**
- **INV-GLOBAL-14: External Build & Signing Authority** — Exacta App Studio runtime SHALL NOT produce, compile, package, or sign executable artifacts. All executable code must originate from an external, human-governed, signed build system.