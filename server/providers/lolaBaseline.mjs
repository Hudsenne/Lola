const CANONICAL_METRICS = [
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

function normalizeMetricStats(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return { mean: value, std: null };
  }
  if (typeof value !== 'object') return null;

  const mean = toNumber(
    value.baseline_mean ?? value.mean ?? value.avg ?? value.average ?? value.value ?? null
  );
  const std = toNumber(value.baseline_std ?? value.std ?? value.stddev ?? value.standard_deviation ?? null);
  if (mean === null && std === null) return null;
  return { mean, std };
}

async function fetchEndpoint(baseUrl, endpoint, timeoutMs) {
  const candidates = [`${baseUrl}/${endpoint}`, `${baseUrl}/api/${endpoint}`];
  const errors = [];

  for (const url of candidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!response.ok) {
        errors.push(`${url} -> HTTP ${response.status}`);
        continue;
      }
      const payload = await response.json();
      return { url, payload };
    } catch (err) {
      clearTimeout(timer);
      errors.push(`${url} -> ${err.message}`);
    }
  }

  throw new Error(`Unable to fetch ${endpoint} from lola-api (${errors.join('; ')})`);
}

function mapBaselineMetricName(metric) {
  if (metric === 'weight_kg' || metric === 'steps') return metric;
  if (metric === 'active_energy_kcal') return 'calories';
  return null;
}

function deriveStatsFromTrajectory(trajectoryPayload) {
  const points = Array.isArray(trajectoryPayload?.trajectory) ? trajectoryPayload.trajectory : [];
  const valid = points.filter((point) => point?.is_valid !== false);
  if (!valid.length) {
    return { mean: null, std: null, samples: 0 };
  }

  const latest = valid.at(-1) || null;
  const latestStats = normalizeMetricStats(latest);
  if (latestStats?.mean !== null || latestStats?.std !== null) {
    return { ...latestStats, samples: valid.length };
  }

  const actualValues = valid
    .map((point) => toNumber(point?.actual_value))
    .filter((value) => value !== null);
  if (!actualValues.length) {
    return { mean: null, std: null, samples: valid.length };
  }

  const mean = actualValues.reduce((sum, value) => sum + value, 0) / actualValues.length;
  const variance =
    actualValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(actualValues.length, 1);
  return {
    mean,
    std: Math.sqrt(variance),
    samples: valid.length
  };
}

export async function fetchLolaBaseline(options = {}) {
  const baseUrl = (options.baseUrl || process.env.LOLA_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const timeoutMs = Number(options.timeoutMs || process.env.LOLA_API_TIMEOUT_MS || 5000);

  const metricsResponse = await fetchEndpoint(baseUrl, 'metrics', timeoutMs);
  const availableMetrics = Array.isArray(metricsResponse.payload?.metrics) ? metricsResponse.payload.metrics : [];

  const metric_baselines = {};
  const metric_trajectories = {};
  const endpoints = { metrics: metricsResponse.url, per_metric: {} };

  for (const canonicalMetric of CANONICAL_METRICS) {
    const baselineMetric = mapBaselineMetricName(canonicalMetric);
    if (!baselineMetric || !availableMetrics.includes(baselineMetric)) {
      metric_baselines[canonicalMetric] = { mean: null, std: null, source_metric: baselineMetric };
      continue;
    }

    const baselineResult = await fetchEndpoint(baseUrl, `baseline/${baselineMetric}`, timeoutMs);
    const trajectoryResult = await fetchEndpoint(baseUrl, `trajectory/${baselineMetric}`, timeoutMs);
    const baselineStats = normalizeMetricStats(baselineResult.payload);
    const trajectoryStats = deriveStatsFromTrajectory(trajectoryResult.payload);

    metric_baselines[canonicalMetric] = {
      mean: baselineStats?.mean ?? trajectoryStats.mean ?? null,
      std: baselineStats?.std ?? trajectoryStats.std ?? null,
      source_metric: baselineMetric,
      samples: trajectoryStats.samples ?? 0
    };

    metric_trajectories[canonicalMetric] = trajectoryResult.payload?.trajectory ?? [];
    endpoints.per_metric[canonicalMetric] = {
      baseline: baselineResult.url,
      trajectory: trajectoryResult.url
    };
  }

  return {
    source: 'lola-api',
    fetched_at: new Date().toISOString(),
    base_url: baseUrl,
    endpoints,
    available_metrics: availableMetrics,
    metric_baselines,
    metric_trajectories,
    raw: {
      metrics: metricsResponse.payload
    }
  };
}
