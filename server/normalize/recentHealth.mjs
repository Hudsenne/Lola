const METRIC_FIELDS = [
  'sleep_duration_hours',
  'sleep_efficiency',
  'hrv_ms',
  'resting_hr_bpm',
  'steps',
  'active_energy_kcal',
  'weight_kg'
];

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeSample(sample) {
  const sleepDurationMinutes = toNumber(sample?.sleep?.duration_min);
  const sleepEfficiencyPct = toNumber(sample?.sleep?.efficiency_pct);
  const hrv = toNumber(sample?.recovery?.hrv);
  const restingHr = toNumber(sample?.recovery?.resting_hr);
  const steps = toNumber(sample?.activity?.steps);
  const activeEnergy = toNumber(sample?.activity?.active_energy);
  const weightLb = toNumber(sample?.body?.weight_lb);

  return {
    date: sample?.date || null,
    sleep_duration_hours: sleepDurationMinutes === null ? null : round(sleepDurationMinutes / 60, 2),
    sleep_efficiency: sleepEfficiencyPct === null ? null : round(sleepEfficiencyPct / 100, 3),
    hrv_ms: hrv,
    resting_hr_bpm: restingHr,
    steps,
    active_energy_kcal: activeEnergy,
    weight_kg: weightLb === null ? null : round(weightLb * 0.45359237, 2)
  };
}

export function normalizeRecentHealth(rawRecentHealth) {
  const rawSamples = Array.isArray(rawRecentHealth?.samples) ? rawRecentHealth.samples : [];
  const daily_snapshots = rawSamples.map(normalizeSample).filter((sample) => sample.date);

  const metric_means = {};
  for (const field of METRIC_FIELDS) {
    const values = daily_snapshots
      .map((snapshot) => snapshot[field])
      .filter((value) => value !== null && value !== undefined);
    metric_means[field] = values.length ? round(average(values), 3) : null;
  }

  return {
    schema_version: 'recent-health.v1',
    source: rawRecentHealth?.source || 'unknown',
    user_id: rawRecentHealth?.user_id || null,
    captured_at: rawRecentHealth?.captured_at || new Date().toISOString(),
    metric_fields: METRIC_FIELDS,
    daily_snapshots,
    recent_summary: {
      days_observed: daily_snapshots.length,
      start_date: daily_snapshots[0]?.date || null,
      end_date: daily_snapshots[daily_snapshots.length - 1]?.date || null,
      metric_means
    }
  };
}
