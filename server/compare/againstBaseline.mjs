const DIRECTION_HINTS = {
  sleep_duration_hours: 'higher_is_better',
  sleep_efficiency: 'higher_is_better',
  hrv_ms: 'higher_is_better',
  resting_hr_bpm: 'lower_is_better',
  steps: 'higher_is_better',
  active_energy_kcal: 'higher_is_better',
  weight_kg: 'neutral'
};

function round(value, digits = 3) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function classifyDrift({ zScore, percentDelta }) {
  const absZ = zScore === null ? null : Math.abs(zScore);
  const absPct = percentDelta === null ? null : Math.abs(percentDelta);

  if (absZ !== null) {
    if (absZ >= 2) return 'significant_drift';
    if (absZ >= 1) return 'moderate_drift';
    return 'within_baseline';
  }

  if (absPct !== null) {
    if (absPct >= 20) return 'significant_drift';
    if (absPct >= 10) return 'moderate_drift';
    return 'within_baseline';
  }

  return 'insufficient_baseline';
}

function buildFlag(metric, comparison) {
  if (comparison.drift_label === 'within_baseline' || comparison.drift_label === 'insufficient_baseline') {
    return null;
  }

  const severity = comparison.drift_label === 'significant_drift' ? 'high' : 'medium';
  const directionHint = DIRECTION_HINTS[metric] || 'neutral';
  let direction = 'changed';
  if (comparison.delta !== null) {
    direction = comparison.delta > 0 ? 'above' : 'below';
  }

  return {
    code: `drift_${metric}`,
    metric,
    severity,
    drift_label: comparison.drift_label,
    direction,
    direction_hint: directionHint,
    message: `${metric} is ${direction} baseline (${comparison.drift_label}).`
  };
}

export function compareAgainstBaseline({ normalizedRecent, baselineReference }) {
  const metric_means = normalizedRecent?.recent_summary?.metric_means || {};
  const metric_baselines = baselineReference?.metric_baselines || {};
  const comparisons = {};
  const flags = [];

  for (const metric of normalizedRecent?.metric_fields || []) {
    const recentMean = metric_means[metric] ?? null;
    const baselineMean = metric_baselines?.[metric]?.mean ?? null;
    const baselineStd = metric_baselines?.[metric]?.std ?? null;

    const delta = recentMean !== null && baselineMean !== null ? recentMean - baselineMean : null;
    const percentDelta =
      delta !== null && baselineMean !== 0 && baselineMean !== null ? (delta / baselineMean) * 100 : null;
    const zScore = delta !== null && baselineStd !== null && baselineStd > 0 ? delta / baselineStd : null;

    const comparison = {
      recent_mean: recentMean,
      baseline_mean: baselineMean,
      baseline_std: baselineStd,
      delta: delta === null ? null : round(delta),
      percent_delta: percentDelta === null ? null : round(percentDelta),
      z_score: zScore === null ? null : round(zScore),
      drift_label: classifyDrift({ zScore: zScore === null ? null : round(zScore), percentDelta })
    };

    comparisons[metric] = comparison;

    const flag = buildFlag(metric, comparison);
    if (flag) flags.push(flag);
  }

  // Baseline values are kept as a reference frame and never merged into recent samples.
  // We interpret recent behavior against that frame first, then pass comparisons to downstream synthesis.
  return {
    compared_at: new Date().toISOString(),
    comparisons,
    flags
  };
}
