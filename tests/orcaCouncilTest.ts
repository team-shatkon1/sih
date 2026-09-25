/**
 * ORCA DECISION COUNCIL & ADVANCED FEATURES COMPREHENSIVE TEST SUITE
 * Problem Statement: ISRO PS-26176 (Space Technology / Disaster Management)
 * Strict Anti-Hallucination & Deterministic Arbitration Verification
 */

import { CouncilService, CouncilInputs } from '../server/src/services/councilService.js';
import { RiskEngine } from '../server/src/services/riskEngine.js';
import { SuitabilityEngine } from '../server/src/services/suitabilityEngine.js';
import { CandidateZoneEngine } from '../server/src/services/candidateZoneEngine.js';
import { localKnowledgeService } from '../server/src/services/localKnowledgeService.js';
import { Coordinates } from '../server/src/types/orca.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✓ PASS\x1b[0m: ${testName}`);
  } else {
    console.error(`  \x1b[31m✕ FAIL\x1b[0m: ${testName}${detail ? ` (${detail})` : ''}`);
  }
}

async function runTestSuite() {
  console.log('\n=====================================================================');
  console.log('ORCA DECISION COUNCIL & EVIDENCE ARBITRATION TEST SUITE (PS-26176)');
  console.log('=====================================================================\n');

  const testCoords: Coordinates = { latitude: 15.4909, longitude: 73.8278, name: 'Goa Coastal Waters', isMarine: true };

  // -------------------------------------------------------------
  // Test 1: 5 Independent Specialist Agents Evaluation
  // -------------------------------------------------------------
  console.log('[1/10] Testing 5 Independent Council Specialist Agents (Favorable Baseline)');
  const favorableInputs: CouncilInputs = {
    waveHeight: 1.1,
    windSpeed: 16.0,
    currentVelocity: 1.0,
    sst: 28.3,
    chlorophyll: 2.1,
    precipitation: 0.0
  };
  const evalFavorable = CouncilService.evaluateCouncil(testCoords, favorableInputs);
  assert(evalFavorable.arbitration.finalScore >= 75, 'Final score exceeds 75 for benign sea state');
  assert(evalFavorable.arbitration.decision === 'FAVORABLE' || evalFavorable.arbitration.decision === 'CONDITIONALLY_FAVORABLE', 'Decision status is favorable');
  assert(evalFavorable.agents.WEATHER.status === 'FAVORABLE', 'Weather Agent reports FAVORABLE');
  assert(evalFavorable.agents.OCEAN.status === 'FAVORABLE', 'Ocean Agent reports FAVORABLE');
  assert(evalFavorable.agents.ECOSYSTEM.status === 'FAVORABLE', 'Ecosystem Agent reports FAVORABLE');
  assert(evalFavorable.agents.RISK.status === 'FAVORABLE', 'Risk Agent reports FAVORABLE');
  assert(evalFavorable.agents.LOCAL_KNOWLEDGE.status === 'FAVORABLE', 'Local Knowledge Agent reports FAVORABLE');
  assert(evalFavorable.disagreement.hasDisagreement === false, 'Zero disagreement under unanimous favorable baseline');
  assert(evalFavorable.arbitration.agreementLevel.includes('/5 agents'), 'Agreement level reflects all 5 independent council agents');

  // -------------------------------------------------------------
  // Test 2: Agent Disagreement Engine (Independent Unforced Reasoning)
  // -------------------------------------------------------------
  console.log('\n[2/10] Testing Agent Disagreement Engine (High Wave Perturbation)');
  const disagreementInputs: CouncilInputs = {
    waveHeight: 2.3, // High wave -> triggers Ocean/Risk caution while Weather/Ecosystem are favorable
    windSpeed: 18.0,
    currentVelocity: 1.2,
    sst: 28.5,
    chlorophyll: 2.3,
    precipitation: 0.0
  };
  const evalDisagreement = CouncilService.evaluateCouncil(testCoords, disagreementInputs);
  assert(evalDisagreement.disagreement.hasDisagreement === true, 'Disagreement is correctly flagged (hasDisagreement = true)');
  assert(evalDisagreement.disagreement.dissentingAgents.length >= 1, 'At least 1 dissenting agent detected');
  assert(evalDisagreement.disagreement.explanation.length > 20, 'Deterministic explanation explains root cause of divergence');
  assert(evalDisagreement.disagreement.evidenceContrast.cautionaryFactors.length > 0, 'Cautionary factors list is populated');

  // -------------------------------------------------------------
  // Test 3: Source Disagreement Detector (Provider A vs Provider B)
  // -------------------------------------------------------------
  console.log('\n[3/10] Testing Source Disagreement Detector (Section 8: Never silently average)');
  const multiProviderInputs: CouncilInputs = {
    ...favorableInputs,
    waveHeight: 1.2,
    secondaryWaveHeight: 1.8, // 0.6m discrepancy between Copernicus and Open-Meteo
    secondaryWindSpeed: 25.0  // 9 km/h discrepancy
  };
  const evalMultiSource = CouncilService.evaluateCouncil(testCoords, multiProviderInputs);
  assert(Boolean(evalMultiSource.sourceDisagreement && evalMultiSource.sourceDisagreement.length >= 1), 'Source disagreement detected across wave sensors');
  if (evalMultiSource.sourceDisagreement) {
    const waveConflict = evalMultiSource.sourceDisagreement.find(s => s.variable.includes('Wave'));
    assert(Boolean(waveConflict && waveConflict.difference >= 0.5), 'Wave height divergence difference accurately captured (0.6m difference)');
  }

  // -------------------------------------------------------------
  // Test 4: Local Knowledge Multilingual Parsing & Extraction
  // -------------------------------------------------------------
  console.log('\n[4/10] Testing Local Fisher Multilingual Parsing (Marathi, Hinglish, English)');
  const marathiParsed = localKnowledgeService.parseMultilingualText('मालवण किनाऱ्याजवळ सुरमई आणि बांगड्यांचे मोठे थवे दिसले आहेत. पाणी शांत आहे.');
  assert(marathiParsed.extractedSpecies?.includes('Surmai') ?? false, 'Extracted Marathi species: Surmai (Kingfish)');
  assert(marathiParsed.detectedLanguage === 'Marathi', 'Detected language: Marathi');

  const hinglishParsed = localKnowledgeService.parseMultilingualText('Yaha pichle 3 din se surmai ka activity accha hai.');
  assert(hinglishParsed.extractedSpecies?.includes('Surmai') ?? false, 'Extracted Hinglish species: Surmai');
  assert(hinglishParsed.extractedProductivity === 'HIGH', 'Extracted productivity: HIGH from "activity accha hai"');
  assert(hinglishParsed.detectedLanguage === 'Hinglish', 'Detected language: Hinglish');

  // -------------------------------------------------------------
  // Test 5: Local Knowledge Submission & Anonymization
  // -------------------------------------------------------------
  console.log('\n[5/10] Testing Observation Submission & Privacy Protection');
  const submitted = localKnowledgeService.submitObservation({
    location: { latitude: 16.05, longitude: 73.46 },
    observationText: 'Yahan kal se surmai ki bhari activity hai, samundar shant hai.',
    isVoice: true
  });
  assert(submitted.id.startsWith('LEK-'), 'Assigned standardized LEK identifier');
  assert(submitted.contributorType === 'FISHER', 'Anonymized identity protected as FISHER');
  assert(submitted.provenance.includes('Hinglish Voice'), 'Provenance traces modality and regional dialect');

  // -------------------------------------------------------------
  // Test 6: Local Knowledge vs Scientific Evidence Alignment & Disagreement
  // -------------------------------------------------------------
  console.log('\n[6/10] Testing Evidence Alignment (Respectful Disagreement Protocol)');
  const alignmentFavorable = localKnowledgeService.calculateAlignment(
    { sst: 28.5, chlorophyll: 2.2, waveHeight: 1.1, windSpeed: 16, suitabilityScore: 82 },
    [submitted]
  );
  assert(alignmentFavorable.alignment === 'HIGH', 'Synergistic convergence: Local + Scientific both high');
  assert(!alignmentFavorable.hasDisagreement, 'Zero disagreement when data points align');

  // Test Case: Local says High, but Satellite/Buoy says Rough Wave
  const alignmentConflict = localKnowledgeService.calculateAlignment(
    { sst: 26.0, chlorophyll: 0.4, waveHeight: 2.4, windSpeed: 34, suitabilityScore: 42 },
    [submitted]
  );
  assert(alignmentConflict.alignment === 'DISAGREEMENT', 'Disagreement flagged: Local Favorable vs Scientific Rough');
  assert(alignmentConflict.hasDisagreement === true, 'hasDisagreement is true');
  assert(!alignmentConflict.explanation.includes('Fisher is wrong'), 'Adheres to respectful communication (no "Fisher is wrong")');
  assert(!alignmentConflict.explanation.includes('AI knows better'), 'Adheres to respectful communication (no "AI knows better")');
  assert(alignmentConflict.explanation.includes('do not fully agree'), 'Standardized non-combative disagreement explanation');

  // -------------------------------------------------------------
  // Test 7: Community Knowledge History (Recurring Observations)
  // -------------------------------------------------------------
  console.log('\n[7/10] Testing Fisher Community Knowledge Memory (2024 - 2026)');
  const history = localKnowledgeService.getCommunityHistory(testCoords);
  assert(history.recurringObservations.length >= 3, 'Contains historical records for consecutive years');
  assert(history.recurringObservations.some(r => r.year === 2026), 'Includes 2026 active cycle observations');
  assert(!history.summary.includes('guaranteed'), 'Does not make reckless guaranteed catch claims');

  // -------------------------------------------------------------
  // Test 8: Decision Flip Inversion Engine
  // -------------------------------------------------------------
  console.log('\n[8/10] Testing Decision Flip Deterministic Inversion Solver');
  const zoneA = {
    id: 'zone-a',
    name: 'Ratnagiri Mirya Shelf (Zone A)',
    inputs: { waveHeight: 1.1, windSpeed: 15, currentVelocity: 1.0, sst: 28.4, chlorophyll: 2.2 }
  };
  const zoneB = {
    id: 'zone-b',
    name: 'Pawapuri Deep Basin (Zone B)',
    inputs: { waveHeight: 1.8, windSpeed: 24, currentVelocity: 1.5, sst: 27.6, chlorophyll: 1.1 }
  };
  const flipResult = CouncilService.calculateDecisionFlip(zoneA, zoneB);
  assert(flipResult.currentRanking.zoneA.score > flipResult.currentRanking.zoneB.score, 'Zone A initially leads Zone B');
  assert(flipResult.flipConditions.length >= 2, 'Generated concrete physical flip thresholds');
  assert(flipResult.resultingScores.flipped === true, 'Simulated perturbation confirms ranking inverts');

  // -------------------------------------------------------------
  // Test 9: Decision Audit Log & Reproducibility
  // -------------------------------------------------------------
  console.log('\n[9/10] Testing Decision Audit Trail & Scientific Reproducibility');
  assert(evalFavorable.arbitration.scoringModelVersion === 'ORCA-DET-2.1', 'Scoring model version is explicitly tracked (ORCA-DET-2.1)');
  const auditLogs = (CouncilService as any).auditLogs;
  assert(auditLogs.size > 0, 'Decision audit log registered in model memory');
  const sampleAudit = Array.from(auditLogs.values())[0] as any;
  assert(Boolean(sampleAudit.auditSignature && sampleAudit.auditSignature.startsWith('ORCA-SIG-')), 'Cryptographic/Reproducible audit signature present');
  assert(sampleAudit.weights.localKnowledge === 12, 'Local knowledge explicitly weighted in deterministic arbitration matrix');

  // -------------------------------------------------------------
  // Test 10: Anti-Hallucination & Challenge Grounding
  // -------------------------------------------------------------
  console.log('\n[10/10] Testing Grounded Challenge & Anti-Hallucination Barrier');
  const challengeDissent = CouncilService.challengeCouncil(evalDisagreement, 'Which agent disagrees?');
  assert(challengeDissent.groundedAnswer.includes('specialist') || challengeDissent.groundedAnswer.includes('dissenting'), 'Challenge references real council agent output');
  assert(challengeDissent.evidenceReferenced.length > 0, 'Evidence referenced contains concrete telemetry metrics');

  console.log('\n-------------------------------------------------------------');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('-------------------------------------------------------------\n');

  if (passedTests === totalTests) {
    console.log('\x1b[32mALL ORCA TESTS PASSED WITH 100% SUCCESS RATE!\x1b[0m\n');
    process.exit(0);
  } else {
    console.error('\x1b[31mSOME TESTS FAILED!\x1b[0m\n');
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
