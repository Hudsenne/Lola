import { runLolaOrchestrator } from './agents/lolaOrchestrator.mjs';

async function main() {
  const question =
    process.argv[2] ||
    'What changed in recent health metrics versus baseline, and what low-friction action should I take?';

  try {
    const result = await runLolaOrchestrator({ question });
    console.log(
      JSON.stringify(
        {
          state: result.state,
          ingestion_summary: result.ingestion_summary,
          clinical_reasoning: result.clinical_reasoning,
          behaviour_change: result.behaviour_change,
          surfaced_output: result.surfaced_output,
          degraded_mode: result.degraded_mode,
          degraded_reason: result.degraded_reason
        },
        null,
        2
      )
    );
  } catch (err) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: err.message,
          where: 'runOrchestratedDemo',
          hint: 'If this is a baseline connectivity issue, verify LOLA_API_BASE_URL or run without lola-api in degraded mode.'
        },
        null,
        2
      )
    );
    process.exit(1);
  }
}

main();
