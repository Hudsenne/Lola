function recentSimilarIntervention(interventionHistory = [], actionType, now = new Date()) {
  const nowMs = now.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  return interventionHistory.some((item) => {
    if (item?.action_type !== actionType) return false;
    const at = new Date(item?.proposed_at || item?.at || 0);
    if (Number.isNaN(at.getTime())) return false;
    return nowMs - at.getTime() <= sevenDaysMs;
  });
}

function createCardTemplate(interventionClass, seasonalContext) {
  const seasonHint = seasonalContext ? ` Fit for ${seasonalContext.toLowerCase()} routines.` : '';

  switch (interventionClass) {
    case 'sleep_rhythm':
    case 'sleep_quality':
      return {
        headline: 'Anchor a 15-minute wind-down',
        reasoning: `A short pre-sleep routine can stabilize recovery signals without heavy friction.${seasonHint}`,
        action_type: 'sleep_micro_habit',
        estimated_impact: 'medium',
        spend_usd: 0,
        cool_down_days: 2
      };
    case 'nutrition_structure':
      return {
        headline: 'Use one default protein-forward meal',
        reasoning: `A repeatable meal pattern lowers decision fatigue and supports weight trend stability.${seasonHint}`,
        action_type: 'nutrition_default',
        estimated_impact: 'medium',
        spend_usd: 12,
        cool_down_days: 3
      };
    case 'movement_consistency':
      return {
        headline: 'Schedule one minimum movement block',
        reasoning: `A low-bar activity anchor helps maintain adherence on variable-energy days.${seasonHint}`,
        action_type: 'movement_anchor',
        estimated_impact: 'medium',
        spend_usd: 0,
        cool_down_days: 2
      };
    default:
      return {
        headline: 'Pick one tiny next-step action',
        reasoning: `Autonomy-supportive prompts work best when the action is reversible and low effort.${seasonHint}`,
        action_type: 'micro_commitment',
        estimated_impact: 'low',
        spend_usd: 0,
        cool_down_days: 2
      };
  }
}

export function runBehaviourChangeAgent(input = {}) {
  const now = input?.now ? new Date(input.now) : new Date();
  const clinical = input?.clinical_reasoning || {};
  const interventionHistory = Array.isArray(input?.intervention_history)
    ? input.intervention_history
    : [];

  const baseCard = createCardTemplate(clinical.intervention_class, input?.seasonal_context || '');
  const repeatedRecently = recentSimilarIntervention(interventionHistory, baseCard.action_type, now);

  const card = {
    card_id: `${baseCard.action_type}-${Date.now()}`,
    headline: repeatedRecently ? `Resume gently: ${baseCard.headline}` : baseCard.headline,
    reasoning: `${baseCard.reasoning} ${clinical.natural_language_summary || ''}`.trim(),
    action_type: baseCard.action_type,
    estimated_impact: repeatedRecently ? 'low' : baseCard.estimated_impact,
    evidence_source: `clinical_hypothesis:${clinical.drift_event_id || 'unknown'}`,
    reversible: true,
    spend_usd: baseCard.spend_usd,
    cool_down_days: repeatedRecently ? baseCard.cool_down_days + 2 : baseCard.cool_down_days
  };

  const relapse_planning_note = repeatedRecently
    ? 'Recent similar intervention detected; using softer re-entry framing.'
    : 'No recent overlap; standard low-friction prompt card generated.';

  return {
    cards: [card],
    relapse_planning_note,
    constraints_applied: {
      escalation_block: Boolean(clinical.escalate),
      low_friction_mode: true
    }
  };
}
