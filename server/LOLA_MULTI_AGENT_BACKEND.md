# LOLA Multi-Agent Backend (MVP)

Backend-only implementation of a simplified multi-agent architecture.

## Implemented now

### Agent modules

- `server/agents/lolaOrchestrator.mjs` (AGENT 0)
- `server/agents/dataSteward.mjs` (SUBAGENT 1)
- `server/agents/clinicalReasoningAgent.mjs` (SUBAGENT 2)
- `server/agents/behaviourChangeAgent.mjs` (SUBAGENT 3)

### Unified LOLA state

The orchestrator maintains this state shape:

```json
{
  "user_goals": [],
  "active_constraints": [],
  "risk_register": [],
  "intervention_history": [],
  "seasonal_context": "",
  "data_freshness_hours": 0
}
```

### Data Steward responsibilities (implemented)

- Ingests mock recent health data from `server/mock/mockRecentHealth.json`.
- Normalizes records using existing canonical normalizer.
- Produces:
  - `ingestion_summary`
  - `clean_records`
  - `validation_errors`
  - `provenance_log`
- Reports `data_freshness_hours` from `captured_at`.
- Attempts baseline fetch from `lola-api`; if unavailable, enters explicit degraded fallback mode:
  - `degraded_mode: true`
  - `degraded_reason` with connectivity/fetch error details

### Clinical Reasoning responsibilities (implemented)

Consumes cleaned data and baseline comparison context, then outputs a structured hypothesis object:

- `drift_event_id`
- `clinical_significance`
- `causal_chain`
- `cost_of_inaction`
- `intervention_class`
- `confidence`
- `escalate`
- `escalation_reason`
- `natural_language_summary`

Design constraints in this MVP:

- Uses hypothesis framing only.
- Avoids diagnosis language.
- Includes seasonal/setpoint context text when available.

### Behaviour Change responsibilities (implemented)

Consumes clinical reasoning output and intervention history, then outputs Agent Prompt Card objects:

- `card_id`
- `headline`
- `reasoning`
- `action_type`
- `estimated_impact`
- `evidence_source`
- `reversible`
- `spend_usd`
- `cool_down_days`

MVP constraints implemented:

- Low-friction autonomy-supportive framing.
- Simple relapse-aware cooldown if similar recent intervention exists.
- Escalation constraint support (cards can be blocked by orchestrator).

### Orchestrator guardrails (implemented)

Routing order:

1. Data Steward
2. Clinical Reasoning
3. Behaviour Change

Guardrails:

- Confidence gating:
  - `>0.85` -> prompt card
  - `0.65-0.85` -> observation
  - `<0.65` -> silent log
- Escalation threshold:
  - if `>3.5 sigma` sustained `>7 days`, blocks prompt cards and emits escalation output
- Data freshness:
  - `>48h`: prepends stale-data note
  - `>96h`: suppresses prompt cards

## Runnable demo

Run:

```bash
node server/runOrchestratedDemo.mjs "question"
# or
npm run analysis:orchestrated
```

Demo prints JSON with:

- `state`
- `ingestion_summary`
- `clinical_reasoning`
- `behaviour_change`
- `surfaced_output`

## API exposure

Also available via backend endpoint:

- `GET /api/analysis/orchestrated`
- `GET /api/analysis/orchestrated?question=...`

## Still conceptual / not implemented yet

- True multi-source ingestion from production Betterness-like integrations.
- Persistent state store across sessions/users.
- Personalized, learned intervention policy optimization.
- Advanced relapse policy modeling and safety workflows.
- Full clinical escalation routing to external care systems.
- Rich longitudinal setpoint modeling beyond current baseline comparison.

This is intentionally a coherent MVP backend scaffold, not a production medical decision system.
