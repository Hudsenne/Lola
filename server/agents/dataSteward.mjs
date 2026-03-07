import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeRecentHealth } from '../normalize/recentHealth.mjs';
import { fetchLolaBaseline } from '../providers/lolaBaseline.mjs';
import { compareAgainstBaseline } from '../compare/againstBaseline.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function parseTime(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function calculateFreshnessHours(capturedAt, now = new Date()) {
  const captured = parseTime(capturedAt);
  if (!captured) return 0;
  const diffMs = Math.max(0, now.getTime() - captured.getTime());
  return round(diffMs / (1000 * 60 * 60), 2);
}

function validateRawSamples(rawSamples) {
  const validation_errors = [];
  const seenDates = new Set();

  rawSamples.forEach((sample, index) => {
    const date = sample?.date;
    if (!date) {
      validation_errors.push({
        code: 'missing_date',
        severity: 'high',
        index,
        message: 'Record is missing date and cannot be trusted for trend analysis.'
      });
      return;
    }

    if (seenDates.has(date)) {
      validation_errors.push({
        code: 'duplicate_date',
        severity: 'medium',
        date,
        index,
        message: `Duplicate date found: ${date}.`
      });
    }
    seenDates.add(date);
  });

  return validation_errors;
}

function fallbackBaseline(errorMessage) {
  return {
    source: 'fallback-mock-only',
    fetched_at: new Date().toISOString(),
    base_url: null,
    endpoints: {},
    available_metrics: [],
    metric_baselines: {},
    metric_trajectories: {},
    degraded_mode: true,
    degraded_reason: errorMessage
  };
}

export async function runDataSteward(options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const mockFile =
    options.mockFile || path.resolve(__dirname, '../mock/mockRecentHealth.json');

  const provenance_log = [
    {
      at: now.toISOString(),
      stage: 'ingestion_start',
      status: 'ok',
      source: 'betterness-mock'
    }
  ];

  let rawRecent;
  try {
    const fileContent = await fs.readFile(mockFile, 'utf8');
    rawRecent = JSON.parse(fileContent);
    provenance_log.push({
      at: new Date().toISOString(),
      stage: 'ingestion_load_raw',
      status: 'ok',
      source_file: mockFile
    });
  } catch (err) {
    throw new Error(`Unable to load mock recent health data at ${mockFile}: ${err.message}`);
  }

  const rawSamples = Array.isArray(rawRecent?.samples) ? rawRecent.samples : [];
  const validation_errors = validateRawSamples(rawSamples);

  const normalizedRecent = normalizeRecentHealth(rawRecent);
  const clean_records = normalizedRecent.daily_snapshots;

  let baseline_reference;
  let degraded_mode = false;
  let degraded_reason = null;

  try {
    baseline_reference = await fetchLolaBaseline({
      baseUrl: options.baseUrl,
      timeoutMs: options.timeoutMs
    });
    provenance_log.push({
      at: new Date().toISOString(),
      stage: 'baseline_fetch',
      status: 'ok',
      source: baseline_reference.source,
      base_url: baseline_reference.base_url
    });
  } catch (err) {
    degraded_mode = true;
    degraded_reason = `lola-api unavailable; using mock-only fallback: ${err.message}`;
    baseline_reference = fallbackBaseline(degraded_reason);
    provenance_log.push({
      at: new Date().toISOString(),
      stage: 'baseline_fetch',
      status: 'degraded',
      source: 'fallback-mock-only',
      message: degraded_reason
    });
  }

  const comparison_result = compareAgainstBaseline({
    normalizedRecent,
    baselineReference: baseline_reference
  });

  const data_freshness_hours = calculateFreshnessHours(rawRecent?.captured_at, now);

  const ingestion_summary = {
    source: normalizedRecent.source,
    user_id: normalizedRecent.user_id,
    days_observed: normalizedRecent.recent_summary.days_observed,
    clean_records_count: clean_records.length,
    validation_error_count: validation_errors.length,
    baseline_source: baseline_reference.source,
    degraded_mode,
    degraded_reason,
    data_freshness_hours,
    captured_at: normalizedRecent.captured_at
  };

  return {
    ingestion_summary,
    clean_records,
    validation_errors,
    provenance_log,
    data_freshness_hours,
    normalized_recent: normalizedRecent,
    baseline_reference,
    comparison_result,
    degraded_mode,
    degraded_reason
  };
}
