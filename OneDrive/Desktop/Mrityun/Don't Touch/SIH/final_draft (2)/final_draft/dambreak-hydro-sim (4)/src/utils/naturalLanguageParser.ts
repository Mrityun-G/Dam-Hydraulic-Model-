import { AIScenarioInterpretation, FailureMode } from '../types';
import { INDIAN_DAMS_REGISTRY, HIRAKUD_DAM_SPECS } from '../data/damData';

export function parseNaturalLanguagePrompt(
  userPrompt: string,
  defaultDamId: string = 'hirakud-dam-odisha'
): AIScenarioInterpretation {
  const text = (userPrompt || '').toLowerCase();

  let matchedDam = false;
  let targetDamId = defaultDamId;

  // 1. Dam Name & Location Matching
  if (text.includes('kallanai') || text.includes('grand anicut') || text.includes('coleroon') || text.includes('kollidam') || text.includes('trichy') || text.includes('thanjavur')) {
    targetDamId = 'kallanai-dam-tamilnadu';
    matchedDam = true;
  } else if (text.includes('idukki') || text.includes('cheruthoni') || text.includes('periyar dam')) {
    targetDamId = 'idukki-dam-kerala';
    matchedDam = true;
  } else if (text.includes('tehri') || text.includes('bhagirathi') || text.includes('koteshwar') || text.includes('garhwal')) {
    targetDamId = 'tehri-dam-uttarakhand';
    matchedDam = true;
  } else if (text.includes('sardar') || text.includes('sarovar') || text.includes('narmada') || text.includes('kevadia')) {
    targetDamId = 'sardar-sarovar-gujarat';
    matchedDam = true;
  } else if (text.includes('bhakra') || text.includes('sutlej') || text.includes('nangal') || text.includes('bilaspur')) {
    targetDamId = 'bhakra-dam-himachal';
    matchedDam = true;
  } else if (text.includes('mullaperiyar') || text.includes('mulla')) {
    targetDamId = 'mullaperiyar-dam-kerala';
    matchedDam = true;
  } else if (text.includes('nagarjuna') || text.includes('sagar') || text.includes('krishna')) {
    targetDamId = 'nagarjuna-sagar-telangana-ap';
    matchedDam = true;
  } else if (text.includes('hirakud') || text.includes('mahanadi') || text.includes('sambalpur') || text.includes('burla')) {
    targetDamId = 'hirakud-dam-odisha';
    matchedDam = true;
  } else if (text.includes('tamil nadu') || text.includes('tamilnadu') || text.includes('cauvery') || text.includes('cavery')) {
    targetDamId = 'kallanai-dam-tamilnadu';
    matchedDam = true;
  } else if (text.includes('kerala')) {
    targetDamId = 'idukki-dam-kerala';
    matchedDam = true;
  } else if (text.includes('uttarakhand')) {
    targetDamId = 'tehri-dam-uttarakhand';
    matchedDam = true;
  } else if (text.includes('gujarat')) {
    targetDamId = 'sardar-sarovar-gujarat';
    matchedDam = true;
  } else if (text.includes('himachal')) {
    targetDamId = 'bhakra-dam-himachal';
    matchedDam = true;
  } else if (text.includes('odisha')) {
    targetDamId = 'hirakud-dam-odisha';
    matchedDam = true;
  }

  const activeDam = INDIAN_DAMS_REGISTRY.find((d) => d.id === targetDamId) || HIRAKUD_DAM_SPECS;

  // 2. Failure Mode Matching
  let failureMode: FailureMode = 'overtopping';
  let matchedMode = false;

  if (text.includes('piping') || text.includes('pipe') || text.includes('internal erosion') || text.includes('seepage') || text.includes('tunneling')) {
    failureMode = 'piping';
    matchedMode = true;
  } else if (text.includes('sunny') || text.includes('fair') || text.includes('normal pool') || text.includes('structural failure') || text.includes('sunny_day')) {
    failureMode = 'sunny_day';
    matchedMode = true;
  } else if (text.includes('landslide') || text.includes('blockage') || text.includes('river surge') || text.includes('impulse wave') || text.includes('river_blockage')) {
    failureMode = 'river_blockage';
    matchedMode = true;
  } else if (text.includes('overtopping') || text.includes('overtop') || text.includes('pmf') || text.includes('flood wave')) {
    failureMode = 'overtopping';
    matchedMode = true;
  }

  // 3. Breach Width Extraction
  let breachWidth = 160;
  let matchedWidth = false;
  const widthMatch =
    text.match(/(\d+(?:\.\d+)?)\s*(?:m|meter|meters|metre|metres)\s*(?:breach|width)?\b/i) ||
    text.match(/(?:breach\s+)?width\s*(?:of|=|:)?\s*(\d+(?:\.\d+)?)/i);

  if (widthMatch) {
    const val = parseFloat(widthMatch[1]);
    if (!isNaN(val) && val > 0) {
      breachWidth = Math.max(10, Math.min(600, Math.round(val)));
      matchedWidth = true;
    }
  }

  // 4. Breach Formation Time & Simulation Duration Extraction
  let breachFormationTimeHours = 1.85;
  let simulationDurationHours = 12;
  let matchedFormation = false;
  let matchedDuration = false;

  // Pattern 4a: Formation time
  const formationMatch =
    text.match(/(?:over|within|in|formation\s+time(?:\s+of)?|breach\s+formation(?:\s+time)?)\s*(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\s*(?:formation|breach\s+formation)\b/i);

  if (formationMatch) {
    const val = parseFloat(formationMatch[1]);
    if (!isNaN(val) && val > 0) {
      breachFormationTimeHours = Math.max(0.1, Math.min(24.0, Number(val.toFixed(2))));
      matchedFormation = true;
    }
  }

  // Pattern 4b: Simulation duration
  const durationMatch =
    text.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\s*(?:of\s+)?(?:downstream|flood)?\s*(?:propagation|simulation|duration)\b/i) ||
    text.match(/(?:simulate\s+for|propagation\s+for|duration|simulation)\s*(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i) ||
    text.match(/for\s+(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i);

  if (durationMatch) {
    const val = parseFloat(durationMatch[1]);
    if (!isNaN(val) && val > 0) {
      simulationDurationHours = Math.max(1.0, Math.min(72.0, Number(val.toFixed(1))));
      matchedDuration = true;
    }
  }

  // Fallback for hour values in prompt
  const allHourMatches = Array.from(text.matchAll(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/gi));
  if (allHourMatches.length > 0) {
    const hourValues = allHourMatches.map((m) => parseFloat(m[1])).filter((v) => !isNaN(v) && v > 0);
    if (!matchedFormation && !matchedDuration) {
      if (hourValues.length >= 2) {
        breachFormationTimeHours = Math.min(...hourValues);
        simulationDurationHours = Math.max(...hourValues);
        matchedFormation = true;
        matchedDuration = true;
      } else if (hourValues.length === 1) {
        breachFormationTimeHours = hourValues[0];
        matchedFormation = true;
      }
    } else if (!matchedFormation && hourValues.length > 0) {
      const unparsed = hourValues.find((v) => v !== simulationDurationHours);
      if (unparsed !== undefined) {
        breachFormationTimeHours = unparsed;
        matchedFormation = true;
      }
    } else if (!matchedDuration && hourValues.length > 0) {
      const unparsed = hourValues.find((v) => v !== breachFormationTimeHours);
      if (unparsed !== undefined) {
        simulationDurationHours = unparsed;
        matchedDuration = true;
      }
    }
  }

  // 5. Confidence Score Calculation
  let slotsMatched = 0;
  if (matchedDam) slotsMatched += 1;
  if (matchedMode) slotsMatched += 1;
  if (matchedWidth) slotsMatched += 1;
  if (matchedFormation) slotsMatched += 1;
  if (matchedDuration) slotsMatched += 1;

  let confidenceScore = 0.70 + (slotsMatched / 5) * 0.30;
  if (slotsMatched >= 4) confidenceScore = 0.95;
  if (slotsMatched === 5) confidenceScore = 1.0;

  // Guarantee confidence is a valid float between 0.70 and 1.00 (never NaN)
  if (isNaN(confidenceScore) || confidenceScore <= 0) {
    confidenceScore = 0.85;
  }
  confidenceScore = Number(confidenceScore.toFixed(2));

  const modeTitle = failureMode.toUpperCase().replace('_', ' ');

  return {
    damId: activeDam.id,
    damName: activeDam.name,
    failureMode,
    breachWidth,
    breachFormationTimeHours,
    simulationDurationHours,
    reservoirWaterLevel: failureMode === 'overtopping' ? activeDam.maximumWaterLevelMWL : activeDam.fullReservoirLevelFRL,
    empiricalEquation: 'Froehlich_2008',
    confidenceScore,
    confidence: confidenceScore,
    explanation: `Parsed prompt for ${activeDam.name}: ${modeTitle} failure scenario with ${breachWidth}m breach width forming over ${breachFormationTimeHours}h (${simulationDurationHours}h downstream flood propagation).`,
    hazardWarnings: [
      `Hydrodynamic wave surge arrival along ${activeDam.location.river} River downstream corridor.`,
      `Peak discharge estimated within T+${(breachFormationTimeHours * 1.1).toFixed(1)}h.`,
    ],
    suggestedMitigation: `Activate Level-3 dam safety protocol and alert emergency response centers in ${activeDam.location.district}.`,
    isFeatherlessModel: false,
  };
}
