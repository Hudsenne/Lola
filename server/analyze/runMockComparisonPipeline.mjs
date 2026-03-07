import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeRecentHealth } from '../normalize/recentHealth.mjs';
import { fetchLolaBaseline } from '../providers/lolaBaseline.mjs';
import { compareAgainstBaseline } from '../compare/againstBaseline.mjs';
import { buildAnalysisContext } from './buildAnalysisContext.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMockComparisonPipeline(options = {}) {
  const question = options.question || 'What changed in recent health metrics versus baseline?';
  const mockFile =
    options.mockFile || path.resolve(__dirname, '../mock/mockRecentHealth.json');

  let rawRecent;
  try {
    const fileContent = await fs.readFile(mockFile, 'utf8');
    rawRecent = JSON.parse(fileContent);
  } catch (err) {
    throw new Error(`Unable to load mock recent health data at ${mockFile}: ${err.message}`);
  }

  const normalizedRecent = normalizeRecentHealth(rawRecent);

  let baselineReference;
  try {
    baselineReference = await fetchLolaBaseline({
      baseUrl: options.baseUrl,
      timeoutMs: options.timeoutMs
    });
  } catch (err) {
    throw new Error(`Baseline fetch failed: ${err.message}`);
  }

  const comparisonResult = compareAgainstBaseline({ normalizedRecent, baselineReference });
  const analysisContext = buildAnalysisContext({
    question,
    normalizedRecent,
    baselineReference,
    comparisonResult
  });

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    pipeline: {
      normalized_schema: normalizedRecent.schema_version,
      baseline_source: baselineReference.source,
      comparison_module: 'againstBaseline.v1',
      analysis_context_module: 'buildAnalysisContext.v1'
    },
    analysis_context: analysisContext
  };
}
