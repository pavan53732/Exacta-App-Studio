# D. AI Interaction Pipeline

## Purpose
This section specifies how user intent is captured, constraints are enforced, plans are generated and approved, and diffs are produced and validated.

## Documents
- [Intent Extraction and Planning](Intent%20Extraction%20and%20Planning.md)
- [Intent Model & Supported Intent Types (V1)](Intent%20Model%20%26%20Supported%20Intent%20Types%20%28V1%29.md)
- [Constraint Model & Propagation](Constraint%20Model%20%26%20Propagation.md)
- [Plan Model & Approval Semantics](Plan%20Model%20%26%20Approval%20Semantics.md)
- [Plan Validation Rules & Completeness Criteria](Plan%20Validation%20Rules%20%26%20Completeness%20Criteria.md)
- [Diff Generation, Validation & Application](Diff%20Generation%2C%20Validation%20%26%20Application.md)
- [Unified Diff Contract & File Modification Rules](Unified%20Diff%20Contract%20%26%20File%20Modification%20Rules.md)

## Scope Rules
- AI output MUST NOT directly cause side effects.
- All AI-generated artifacts MUST be validated deterministically before use.
- Approval semantics MUST be explicit and auditable.

## Navigation
- Back to KB root: [Exacta KB](../README.md)