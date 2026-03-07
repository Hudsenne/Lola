function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rankSignal(comparison) {
  if (!comparison) return 0;
  if (Number.isFinite(comparison.z_score)) return Math.abs(comparison.z_score);
  if (Number.isFinite(comparison.percent_delta)) return Math.abs(comparison.percent_delta) / 20;
  return 0;
}

function pickPrimaryMetric(comparisons = {}) {
  let bestMetric = null;
  let bestComparison = null;
  let bestScore = -1;

  for (const [metric, comparison] of Object.entries(comparisons)) {
    const score = rankSignal(comparison);
    if (score > bestScore) {
      bestScore = score;
      bestMetric = metric;
      bestComparison = comparison;
    }
  }

  return { metric: bestMetric, comparison: bestComparison, score: bestScore };
}

function interventionClassFor(metric) {
  const mapping = {
    sleep_duration_hours: 'sleep_rhythm',
    sleep_efficiency: 'sleep_quality',
    hrv_ms: 'recovery_load_balance',
    resting_hr_bpm: 'recovery_load_balance',
    steps: 'movement_consistency',
    active_energy_kcal: 'movement_consistency',
    weight_kg: 'nutrition_structure'
  };
  return mapping[metric] || 'general_behavior_support';
}

function significanceFor(score) {
  if (score >= 3.5) return 'high';
  if (score >= 2) return 'moderate';
  if (score >= 1) return 'low';
  return 'minimal';
}

function buildCausalChain({ metric, comparison, seasonal_context }) {
  const direction = Number.isFinite(comparison?.delta) ? (comparison.delta >= 0 ? 'upward' : 'downward') : 'variable';
  const seasonalNode = seasonal_context
    ? `Seasonal context (${seasonal_context}) may be amplifying routine friction.`
    : 'Routine context may be amplifying this drift.';

  return [
    `${metric || 'A core metric'} shows ${direction} drift versus personal setpoint baseline.`,
    'This drift can reduce day-to-day consistency if left unaddressed.',
    seasonalNode
  ];
}

function summaryText({ metric, score, seasonal_context, degraded_mode }) {
  const seasonalSuffix = seasonal_context ? ` Seasonal context considered: ${seasonal_context}.` : '';
  const degradedSuffix = degraded_mode
    ? ' Baseline reference is degraded, so confidence is conservatively reduced.'
    : '';

  return `Hypothesis: ${metric || 'recent health trend'} appears to be drifting from setpoint (signal=${score.toFixed(2)}).${seasonalSuffix}${degradedSuffix}`;
}

export function runClinicalReasoningAgent(input = {}) {
  const comparisons = input?.comparison_result?.comparisons || {};
  const daysObserved = Number(input?.normalized_recent?.recent_summary?.days_observed || 0);
  const hasBaseline = input?.baseline_reference?.source === 'lola-api';
  const degraded_mode = Boolean(input?.degraded_mode);

  const primary = pickPrimaryMetric(comparisons);
  const significance = significanceFor(primary.score);

  const confidence = clamp(
    0.52 +
      Math.min(primary.score / 6, 0.32) +
      (hasBaseline ? 0.08 : 0) +
      (daysObserved >= 7 ? 0.06 : 0) -
      (degraded_mode ? 0.1 : 0),
    0.35,
    0.97
  );

  const shouldEscalate = hasBaseline && primary.score >= 3.5;

  return {
    drift_event_id: `${primary.metric || 'unknown'}-${Date.now()}`,
    clinical_significance: significance,
    causal_chain: buildCausalChain({
      metric: primary.metric,
      comparison: primary.comparison,
      seasonal_context: input?.seasonal_context || ''
    }),
    cost_of_inaction:
      significance === 'high'
        ? 'Sustained drift may compound fatigue, adherence drop-off, and avoidable health risk.'
        : 'Continued drift may gradually reduce routine stability and intervention responsiveness.',
    intervention_class: interventionClassFor(primary.metric),
    confidence,
    escalate: shouldEscalate,
    escalation_reason: shouldEscalate
      ? 'Signal strength is high enough to warrant clinician review before additional prompts.'
      : null,
    natural_language_summary: summaryText({
      metric: primary.metric,
      score: primary.score,
      seasonal_context: input?.seasonal_context || '',
      degraded_mode
    })
  };
}
