# Fyza

Fyza is a premium personal and business financial workspace designed with Apple × Linear craft. Built with React 19, TypeScript, Vite, and Tailwind CSS 4, it provides deterministic financial forecasting, multi-profile capability management, atmospheric dark/light modes, and privacy-first local persistence.

---

## Architecture & Principles

1. **Deterministic Financial Engine**:
   - Pure mathematical calculations for amortization schedules, compound forecasts, debt-to-income, runway, and cash-flow reconciliation (`src/engine/finance.ts`).
   - Strict accounting invariants: For every forecast period, `openingBalance + net === balance` holds continuously without double-counting elapsed activity.
   - Deterministic source of truth: The AI assistant interprets intent and triggers pure engine actions; the LLM never fabricates numbers.

2. **Persistence & Data Safety**:
   - Stored in a versioned envelope (`fyza.v3`) containing `version`, `workspaceId`, `updatedAt`, and hydrated `AppState`.
   - Automatic schema validation, legacy migration (`v2` -> `v3`), and foreign-key reference unlinking on entity deletion (`src/engine/persistence.ts`).
   - Corrupted backup preservation: In the event of unparseable storage or malformed payloads, raw data is preserved under `fyza.corrupted_backup_<timestamp>` before resetting to an empty workspace.
   - Quota handling: Detects storage quota errors and emits visible persistence warnings.

3. **Multi-Profile & Capability System**:
   - Supports Student, Personal, Freelancer, Family, and Business profiles.
   - Capabilities (`accounts`, `cards`, `loans`, `invoices`, `business`, etc.) are enforced across navigation, direct routing, add modals, and AI actions (`src/engine/capabilities.ts`).

4. **Atmospheric UI & Theme System**:
   - **Light Mode**: Morning sky gradient (`#5a9ee6` → `#a4caf4` → `#e2ecf7`).
   - **Dark Mode**: Night navy gradient (`#0b1020` → `#0f162c` → `#141c38`).
   - **System Default**: Seamlessly synchronizes with the host operating system.
   - Dynamic net glow: Financial headline balances and chart series dynamically illuminate in emerald green when profitable and crimson red when negative.

---

## Installation & Setup

### Prerequisites
- Node.js 18+ (tested on Node.js 20 & 26)
- npm 9+

### Install Dependencies
```bash
npm install
```

### Run Locally
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

---

## Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `VITE_GROQ_API_KEY` | Optional API key for Groq external LLM fallback | None (Uses deterministic local parser) |

> **Note**: Missing or unset API keys **never** break application functionality. Fyza defaults to an instantaneous local rule-based financial parser that runs entirely on-device without internet access.

---

## Testing & Quality Assurance

Fyza includes a comprehensive suite of 10 test modules running via a unified test runner:

```bash
# Run all test suites
npm test

# Typecheck with TypeScript
npx tsc --noEmit

# Lint codebase with oxlint
npm run lint

# Compile production bundle
npm run build
```

### Test Suites Included
1. **Financial Engine & Invariants** (`test_finance.ts`): Loan amortization (EMI), card utilization, cash flow reconciliation, forecast invariants, goal completion cutoffs.
2. **Persistence, Hydration & Backups** (`test_persistence.ts`): Envelope serialization, hydration, corrupted backup preservation, quota failure handling, negative opening balances.
3. **Capabilities & Profiles** (`test_capabilities.ts`): Capability enforcement across Student, Personal, Freelancer, Family, and Business profiles.
4. **Trips & Budgets** (`test_trips.ts`, `test_regression_trips.ts`): Multi-category trip budgeting, timeline overlap, expense allocation.
5. **AI Action & Tool Safety** (`test_ai.ts`): Idempotency, duplicate detection, high-value transaction gates (`≥ 100,000`), ambiguous amount parsing, atomic undo.
6. **Atmosphere & Themes** (`test_atmosphere.ts`): Morning/Night gradient transitions and timezone handling.
7. **End-to-End Integration** (`test_integration.ts`): Full workflows across manual and AI entry points.
8. **Audit Hardening & Ledger** (`test_audit_hardening.ts`): Linked debit deductions, credit card debt separation, non-destructive snapshot undo.
9. **General Regressions** (`test_regression.ts`): Bug fix verification across the application lifecycle.

---

## Backup, Import, and Recovery

- **Export Backup**: Open Settings (top right avatar / gear icon) → **Data & Backup** → Click **Export backup (JSON)** to download a full snapshot of your workspace.
- **Import Backup**: Open Settings → **Data & Backup** → Click **Import backup** and select your `.json` backup file. The schema validates the envelope format before importing.
- **Recovering Corrupted Backups**: If a corrupted state was detected, Settings displays a **Preserved corrupted backups** card where the raw data can be downloaded or dismissed.
- **Workspace Reset**: Deliberate confirmation dialog clears local storage and re-initializes a fresh workspace.
