import { runDataSteward } from './dataSteward.mjs';
import { runClinicalReasoningAgent } from './clinicalReasoningAgent.mjs';
import { runBehaviourChangeAgent } from './behaviourChangeAgent.mjs';

const DEFAULT_STATE = {
  user_goals: [],
  active_constraints: [],
  risk_register: [],
  intervention_history: [],
  seasonal_context: '',
  data_freshness_hours: 0
};

function cloneState(state = {}) {
  return {
    user_goals: Array.isArray(state.user_goals) ? [...state.user_goals] : [],
    active_constraints: Array.isArray(state.active_constraints) ? [...state.active_constraints] : [],
    risk_register: Array.isArray(state.risk_register) ? [...state.risk_register] : [],
    intervention_history: Array.isArray(state.intervention_history) ? [...state.intervention_history] : [],
    seasonal_context: typeof state.seasonal_context === 'string' ? state.seasonal_context : '',
    data_freshness_hours: Number(state.data_freshness_hours) || 0
  };
}

function deriveSeasonalContext(now = new Date()) {
  const month = now.getUTCMonth() + 1;
  if (month === 12 || month <= 2) return 'Winter: lower daylight and higher routine friction';
  if (month >= 3 && month <= 5) return 'Spring: routines can be reset with gradual load';
  if (month >= 6 && month <= 8) return 'Summer: travel/social variability can disrupt setpoints';
  return 'Autumn: transition period with variable schedule pressure';
}

function detectSustainedSigmaEvent(cleanRecords = [], baselineReference = {}, threshold = 3.5, minDays = 7) {
  const baselines = baselineReference?.metric_baselines || {};
  let strongest = null;

  for (const [metric, baseline] of Object.entries(baselines)) {
    if (!Number.isFinite(baseline?.mean) || !Number.isFinite(baseline?.std) || baseline.std <= 0) continue;

    let streak = 0;
    let maxStreak = 0;
    let peakSigma = 0;

    for (const row of cleanRecords) {
      const value = row?.[metric];
      if (!Number.isFinite(value)) {
        streak = 0;
        continue;
      }

      const sigma = Math.abs((value - baseline.mean) / baseline.std);
      peakSigma = Math.max(peakSigma, sigma);

      if (sigma > threshold) {
        streak += 1;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 0;
      }
    }

    if (maxStreak >= minDays) {
      if (!strongest || peakSigma > strongest.peak_sigma) {
        strongest = {
          metric,
          sustained_days: maxStreak,
          peak_sigma: Number(peakSigma.toFixed(3))
        };
      }
    }
  }

  return strongest;
}

function buildSurfacedOutput({
  clinicalReasoning,
  behaviourChange,
  dataFreshnessHours,
  sustainedEscalation,
  degradedMode
}) {
  const notes = [];
  if (dataFreshnessHours > 48) {
    notes.push(`Data is stale (${dataFreshnessHours}h since capture); interpret cautiously.`);
  }

  if (sustainedEscalation) {
    return {
      mode: 'escalation',
      notes,
      payload: {
        message:
          'Trend exceeds escalation threshold (>3.5 sigma sustained >7 days). Prompt cards are blocked pending clinical review.',
        escalation_reason: `metric=${sustainedEscalation.metric}, sustained_days=${sustainedEscalation.sustained_days}, peak_sigma=${sustainedEscalation.peak_sigma}`
      }
    };
  }

  if (clinicalReasoning?.confidence > 0.85) {
    if (dataFreshnessHours > 96) {
      notes.push('Prompt cards suppressed because data freshness is >96 hours.');
      return {
        mode: 'suppressed_for_stale_data',
        notes,
        payload: {
          message: 'High-confidence hypothesis found, but cards are suppressed until fresher data arrives.'
        }
      };
    }

    return {
      mode: 'prompt_card',
      notes,
      payload: {
        cards: behaviourChange.cards || [],
        degraded_mode: degradedMode
      }
    };
  }

  if (clinicalReasoning?.confidence >= 0.65) {
    return {
      mode: 'observation',
      notes,
      payload: {
        message: clinicalReasoning.natural_language_summary,
        rationale: 'Confidence is moderate; observe before prompting an intervention card.'
      }
    };
  }

  return {
    mode: 'silent_log',
    notes,
    payload: {
      message: 'Signal confidence is low; stored in backend log only.'
    }
  };
}

export async function runLolaOrchestrator(options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const state = cloneState(options.state || DEFAULT_STATE);

  if (!state.seasonal_context) {
    state.seasonal_context = deriveSeasonalContext(now);
  }

  const dataSteward = await runDataSteward({
    now,
    mockFile: options.mockFile,
    baseUrl: options.baseUrl,
    timeoutMs: options.timeoutMs
  });

  state.data_freshness_hours = dataSteward.data_freshness_hours;

  if (dataSteward.validation_errors.length > 0) {
    state.risk_register.push({
      at: now.toISOString(),
      type: 'data_quality',
      details: `${dataSteward.validation_errors.length} validation issue(s) detected.`
    });
  }

  const clinicalReasoning = runClinicalReasoningAgent({
    seasonal_context: state.seasonal_context,
    ...dataSteward
  });

  const sustainedEscalation = detectSustainedSigmaEvent(
    dataSteward.clean_records,
    dataSteward.baseline_reference,
    3.5,
    7
  );

  if (sustainedEscalation) {
    clinicalReasoning.escalate = true;
    clinicalReasoning.escalation_reason =
      'Escalation threshold met: >3.5 sigma sustained >7 days.';
    state.risk_register.push({
      at: now.toISOString(),
      type: 'escalation_threshold',
      details: sustainedEscalation
    });
  }

  const behaviourChange = runBehaviourChangeAgent({
    clinical_reasoning: clinicalReasoning,
    intervention_history: state.intervention_history,
    seasonal_context: state.seasonal_context,
    now
  });

  const surfacedOutput = buildSurfacedOutput({
    clinicalReasoning,
    behaviourChange,
    dataFreshnessHours: state.data_freshness_hours,
    sustainedEscalation,
    degradedMode: dataSteward.degraded_mode
  });

  if (Array.isArray(surfacedOutput?.payload?.cards) && surfacedOutput.payload.cards.length > 0) {
    state.intervention_history.push(
      ...surfacedOutput.payload.cards.map((card) => ({
        card_id: card.card_id,
        action_type: card.action_type,
        proposed_at: now.toISOString(),
        status: 'proposed'
      }))
    );
  }

  if (dataSteward.degraded_mode) {
    state.risk_register.push({
      at: now.toISOString(),
      type: 'degraded_mode',
      details: dataSteward.degraded_reason
    });
  }

  return {
    ok: true,
    generated_at: now.toISOString(),
    degraded_mode: dataSteward.degraded_mode,
    degraded_reason: dataSteward.degraded_reason,
    question: options.question || 'What changed in recent health metrics versus baseline?',
    state,
    ingestion_summary: dataSteward.ingestion_summary,
    clinical_reasoning: clinicalReasoning,
    behaviour_change: behaviourChange,
    surfaced_output: surfacedOutput
  };
}
