// lib/inference-engine.ts

export interface Fact {
  question: string;
  cf: number;
}

export interface Rule {
  id: string;
  if: string[];
  then: string;
  cf: number;
  note?: string;
}

export interface RulesData {
  meta: {
    title: string;
    description: string;
  };
  facts: Record<string, Fact>;
  rules: Rule[];
  labels: Record<string, string>;
}

export interface DiagnosisResult {
  id: string;
  penyakit: string;
  cf: number;
  note?: string;
}

interface MatchedRule {
  id: string;
  antecedents: string[];
  antecedentValues: number[];
  parallelCF: number;
  ruleCF: number;
  seqCF: number;
  conclusion: string;
  cf: number;
  note?: string;
}

// CF combination (MYCIN-like)
function calculateCF(cf1: number, cf2: number): number {
  if (cf1 >= 0 && cf2 >= 0) {
    return cf1 + cf2 * (1 - cf1);
  } else if (cf1 <= 0 && cf2 <= 0) {
    return cf1 + cf2 * (1 + cf1);
  } else {
    const denom = 1 - Math.min(Math.abs(cf1), Math.abs(cf2));
    if (denom === 0) return 0; // avoid division by zero
    return (cf1 + cf2) / denom;
  }
}

// Forward chaining inference with CF calculations
function infer(userAnswers: Record<string, number>, rulesData: RulesData): DiagnosisResult[] {
  const matchedRules: MatchedRule[] = [];
  const firedRules = new Set<string>();
  let newFacts = true;

  // working memory: include user answers (facts) and will add inferred P*/K*
  const workingMemory: Record<string, number> = { ...userAnswers };

  while (newFacts) {
    newFacts = false;

    for (const rule of rulesData.rules) {
      if (firedRules.has(rule.id)) continue;

      const conditions = rule.if || [];
      // Check all antecedents exist in workingMemory
      const satisfied = conditions.every(cond => workingMemory[cond] !== undefined);

      if (!satisfied) continue;

      // Parallel CF = MIN of antecedent CFs (AND)
      const cfValues = conditions.map(cond => workingMemory[cond]);
      const cfParallel = cfValues.reduce((acc, v) => Math.min(acc, v), 1);

      // Sequential CF = parallel * rule.cf
      const cfRule = typeof rule.cf === 'number' ? rule.cf : 1;
      const cfSequential = cfParallel * cfRule;

      // Combine with existing CF for the same conclusion
      const conclusion = rule.then;
      const existing = workingMemory[conclusion] !== undefined ? workingMemory[conclusion] : 0;
      const combined = calculateCF(existing, cfSequential);

      // If combined value improves (bigger) or conclusion new, update
      if (combined !== existing) {
        workingMemory[conclusion] = combined;
        newFacts = true;

        matchedRules.push({
          id: rule.id,
          antecedents: conditions.slice(),
          antecedentValues: cfValues,
          parallelCF: parseFloat(cfParallel.toFixed(6)),
          ruleCF: cfRule,
          seqCF: parseFloat(cfSequential.toFixed(6)),
          conclusion,
          cf: parseFloat(combined.toFixed(6)),
          note: rule.note || ''
        });
      }

      firedRules.add(rule.id);
    }
  }

  // Build result array: map conclusions P*/K* to labels & CF (highest)
  const resultsMap: Record<string, { id: string; cf: number; note?: string }> = {};
  for (const m of matchedRules) {
    const key = m.conclusion;
    if (!resultsMap[key] || resultsMap[key].cf < m.cf) {
      resultsMap[key] = {
        id: key,
        cf: m.cf,
        note: m.note
      };
    }
  }

  // Create results array with labels (if available)
  const results: DiagnosisResult[] = Object.values(resultsMap).map(r => {
    const label = (rulesData.labels && rulesData.labels[r.id]) ? rulesData.labels[r.id] : r.id;
    return {
      id: r.id,
      penyakit: label,
      cf: parseFloat(r.cf.toFixed(6)),
      note: r.note
    };
  });

  // Sort descending by CF
  results.sort((a, b) => b.cf - a.cf);

  return results;
}

// Main exported function to run expert system
export function runExpertSystem(userAnswers: Record<string, number>, rulesData: RulesData): DiagnosisResult[] {
  return infer(userAnswers, rulesData);
}
