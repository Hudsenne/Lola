import { runMockComparisonPipeline } from './analyze/runMockComparisonPipeline.mjs';

async function main() {
  const question = process.argv[2] || 'What changed in recent health metrics versus baseline?';

  try {
    const result = await runMockComparisonPipeline({ question });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    const failure = {
      ok: false,
      error: err.message,
      hint: 'Ensure lola-api is running and LOLA_API_BASE_URL points to it.'
    };
    console.error(JSON.stringify(failure, null, 2));
    process.exit(1);
  }
}

main();
