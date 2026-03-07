export function buildAnalysisContext({
  question = 'How is recent health trending versus baseline?',
  normalizedRecent,
  baselineReference,
  comparisonResult
}) {
  const { recent_summary, daily_snapshots } = normalizedRecent;

  // Keep baseline as reference-only context. Lobster should reason over derived comparisons,
  // not over a naive merged dataset where baseline and fresh values look equivalent.
  return {
    question,
    baseline_reference: {
      source: baselineReference.source,
      fetched_at: baselineReference.fetched_at,
      base_url: baselineReference.base_url,
      metric_baselines: baselineReference.metric_baselines
    },
    recent_summary,
    comparisons: comparisonResult.comparisons,
    flags: comparisonResult.flags,
    supporting_daily_snapshots: daily_snapshots
  };
}
