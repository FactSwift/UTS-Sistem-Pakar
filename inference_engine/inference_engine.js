// inference_engine.js

let _rulesCache = null;

// Load rules from JSON file (supports http(s) and file:// fallback) with cache
async function loadRules(filePath) {
  if (_rulesCache) return _rulesCache;
  const url = new URL(filePath, import.meta.url);
  // Try fetch first (works when served via http(s))
  try {
    const response = await fetch(url.href, { cache: 'no-store' });
    if (response && response.ok) {
      _rulesCache = await response.json();
      return _rulesCache;
    }
  } catch (err) {
    // ignore and try fallback
  }

  // Fallback: dynamic import of JSON when running from file://
  try {
    const mod = await import(/* @vite-ignore */ url.href + (url.search ? '' : `?t=${Date.now()}`), {
      assert: { type: 'json' }
    });
    // Some bundlers put JSON under default
    _rulesCache = mod.default || mod;
    return _rulesCache;
  } catch (error) {
    console.error('Error loading rules (fallback):', error);
    throw new Error('Tidak dapat memuat rules.json. Jalankan lewat server lokal (Live Server) atau periksa path.');
  }
}

// CF combination (MYCIN-like)
function calculateCF(cf1, cf2) {
  if (cf1 === null || cf1 === undefined) cf1 = 0;
  if (cf2 === null || cf2 === undefined) cf2 = 0;

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
function infer(userAnswers, rulesData) {
  const matchedRules = [];
  const firedRules = new Set();
  let newFacts = true;

  // working memory: include user answers (facts) and will add inferred P*/K*
  const workingMemory = { ...userAnswers };

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
      const cfRule = (typeof rule.cf === 'number') ? rule.cf : 1;
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
  const resultsMap = {};
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
  const results = Object.values(resultsMap).map(r => {
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
export async function runExpertSystem(userAnswers) {
  try {
    // Path relative to UI file: UI sits in ui/ so rules.json in parent: "../rules.json"
    const rulesData = await loadRules("../rules.json");
    const results = infer(userAnswers, rulesData);
    return results;
  } catch (err) {
    console.error('runExpertSystem error:', err);
    throw err;
  }
}
