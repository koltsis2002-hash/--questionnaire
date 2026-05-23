/**
 * NN Hellas — Ασφαλιστικό Ερωτηματολόγιο
 * ════════════════════════════════════════════════════════════════════
 *  engine.js — ΜΗΧΑΝΗ ΚΑΝΟΝΩΝ (Επίπεδο 1)
 * ════════════════════════════════════════════════════════════════════
 *
 *  Όλη η επιχειρηματική λογική (scoring, επιλογή προϊόντων, τιμολόγηση,
 *  επικύρωση συμβατοτήτων, παραγωγή πρότασης) ζει εδώ.
 *
 *  Καμία «καρφωτή» τιμή/προϊόν/κανόνας — όλα διαβάζονται από `NN_DATA`
 *  (window.NN_DATA, ορίζεται στο data.js).
 *
 *  Δημόσιο API:
 *    NN_ENGINE.calcScores(answers)      → scores + flags
 *    NN_ENGINE.buildProposal(answers)   → ένα προτεινόμενο πακέτο
 *    NN_ENGINE.isCompatible(p, a)       → boolean
 *    NN_ENGINE.calcPrice(id, ctx)       → { net, gross, monthly, annual }
 *
 *  Δες επίσης: DATA_MAPPING.md
 * ════════════════════════════════════════════════════════════════════
 */
(function (root) {
  'use strict';

  const DATA = root.NN_DATA;
  if (!DATA) {
    throw new Error('engine.js: δεν βρέθηκε NN_DATA — βεβαιωθείτε ότι το data.js έχει φορτωθεί πρώτο.');
  }

  // ════════════════════════════════════════════════════════════════════
  // 0. ΒΟΗΘΗΤΙΚΑ
  // ════════════════════════════════════════════════════════════════════

  /** Ασφαλής ανάκτηση τιμής από αντικείμενο, με default. */
  function get(obj, key, fallback) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
    return fallback;
  }

  /** Στρογγυλοποίηση σε 2 δεκαδικά. */
  function round2(n) { return Math.round(n * 100) / 100; }

  /** Στρογγυλοποίηση σε ακέραιο ευρώ. */
  function roundEur(n) { return Math.round(n); }

  /**
   * Γραμμική παρεμβολή σε πίνακα ηλικίας:
   *   table: { 20: x, 25: y, 30: z, ... }
   *   age:   ζητούμενη ηλικία (αριθμός)
   *
   *  - Αν υπάρχει ακριβώς το age → επιστρέφει την τιμή.
   *  - Αν age < min(keys) → επιστρέφει την τιμή του min.
   *  - Αν age > max(keys) → επιστρέφει την τιμή του max.
   *  - Αλλιώς γραμμική: y = y1 + (y2 - y1) × (age - x1) / (x2 - x1)
   */
  function interpolateAge(table, age) {
    if (!table) return null;
    if (table[age] !== undefined) return table[age];

    const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
    if (keys.length === 0) return null;
    if (age <= keys[0])  return table[keys[0]];
    if (age >= keys[keys.length - 1]) return table[keys[keys.length - 1]];

    // Βρες τα δύο κλειδιά που περικλείουν την ηλικία
    let lower = keys[0], upper = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) {
      if (keys[i] <= age && age <= keys[i + 1]) {
        lower = keys[i];
        upper = keys[i + 1];
        break;
      }
    }
    const y1 = table[lower];
    const y2 = table[upper];
    return y1 + (y2 - y1) * (age - lower) / (upper - lower);
  }

  // ════════════════════════════════════════════════════════════════════
  // 1. SCORING — υπολογισμός 3 score (Υγεία / Ζωή / Σύνταξη)
  // ════════════════════════════════════════════════════════════════════
  //
  // Επιστρέφει: { health, life, retirement,
  //              includeHealth, includeLife, includeSavingsNote,
  //              checkpoints: { health: [...], life: [...] } }
  //
  // Πηγή κανόνων: DATA.scoring (από nn_hellas_scoring.csv + checkpoints.csv)
  // ────────────────────────────────────────────────────────────────────
  function calcScores(answers) {
    const S = DATA.scoring;
    const a = answers || {};

    // --- Υγεία -----------------------------------------------------
    let health = 0;
    health += get(S.health.fundSatisfaction, a.fundSatisfaction, 0);
    health += get(S.health.hospitalMild,     a.hospitalMild,     0);
    health += get(S.health.hospitalSevere,   a.hospitalSevere,   0);
    // desiredBenefits αφαιρέθηκε από scoring (v3)

    // --- Ζωή ------------------------------------------------------
    let life = 0;
    life += get(S.life.maritalStatus, a.maritalStatus, 0);
    const childrenKey = String(a.children ?? 0);
    life += get(S.life.children, childrenKey, 0);
    life += get(S.life.incomeConcern, a.incomeConcern, 0);
    const uncov = Array.isArray(a.uncoveredNeeds) ? a.uncoveredNeeds : [];
    life += Math.min(
      uncov.length * S.life.uncoveredNeedPerItem,
      S.life.uncoveredNeedMax
    );
    life += get(S.life.lifeCapital, a.lifeCapital, 0);

    // --- Σύνταξη --------------------------------------------------
    let retirement = 0;
    retirement += get(S.retirement.pensionEstimate, a.pensionEstimate, 0);
    retirement += get(S.retirement.savingsPlan,     a.savingsPlan,     0);
    const age = Number(a.age) || 0;
    if (age > S.retirement.ageOverBonus.age) {
      retirement += S.retirement.ageOverBonus.bonus;
    }

    // --- Μέγιστα δυνατά scores (για ποσοστά) ----------------------
    // v3: max = 100 σε κάθε κατηγορία
    const maxHealth = 39 + 33 + 28;        // fund + mild + severe = 100
    const maxLife   = 9  + 15 + 32 + 16 + 28; // marital+children+income+uncov+capital = 100
    const maxRetire = 59 + 30 + 11;        // pension + savings + age bonus = 100

    // --- Checkpoints (auto-include) ------------------------------
    function fieldEqualsAny(field, values) {
      const v = a[field];
      if (Array.isArray(values)) return values.includes(String(v));
      return false;
    }
    function checkpointHit(checkpoint) {
      if (checkpoint.equalsAny) return fieldEqualsAny(checkpoint.field, checkpoint.equalsAny);
      if (checkpoint.notEquals !== undefined) {
        return String(a[checkpoint.field]) !== String(checkpoint.notEquals);
      }
      return false;
    }

    const cpHealth = (S.checkpoints.health || []).filter(checkpointHit);
    const cpLife   = (S.checkpoints.life   || []).filter(checkpointHit);

    // --- Inclusion flags ------------------------------------------
    const healthPct = maxHealth > 0 ? health / maxHealth : 0;
    const lifePct   = maxLife   > 0 ? life   / maxLife   : 0;

    const includeHealth = (healthPct >= S.thresholds.healthIncludePct) || cpHealth.length > 0;
    const includeLife   = (lifePct   >= S.thresholds.lifeIncludePct)   || cpLife.length   > 0;
    const includeSavingsNote = retirement >= S.thresholds.savingsNoteMin;

    return {
      health, life, retirement,
      healthPct: round2(healthPct * 100),
      lifePct:   round2(lifePct   * 100),
      includeHealth, includeLife, includeSavingsNote,
      checkpoints: { health: cpHealth, life: cpLife },
    };
  }

  // ════════════════════════════════════════════════════════════════════
  // 2. ΣΥΜΒΑΤΟΤΗΤΑ
  // ════════════════════════════════════════════════════════════════════
  function isCompatible(programId, attachmentId) {
    const row = DATA.compatibilityMatrix[programId];
    if (!row) return false;
    return row[attachmentId] === true;
  }

  // ════════════════════════════════════════════════════════════════════
  // 3. ΤΙΜΟΛΟΓΗΣΗ — calcPrice(productId, ctx)
  // ════════════════════════════════════════════════════════════════════
  //
  // ctx: { age, capital?, isFirstYear? }
  //
  // Υποστηριζόμενα kinds:
  //   - 'ageTable'      → table[age], με γραμμική παρεμβολή σε missing
  //   - 'rateOnCapital' → (capital × rate(age) + surcharge) × (1 + guaranteeFund)
  //   - 'ratePerTenK'   → rate(age) × (capital / 10000)
  //   - 'flat'          → annual
  //
  // Επιστρέφει: { net, gross, monthly, annual, source } ή null αν αποτυχία.
  // ────────────────────────────────────────────────────────────────────
  function findProduct(productId) {
    if (DATA.prices.programs[productId])    return { spec: DATA.prices.programs[productId],    type: 'program' };
    if (DATA.prices.attachments[productId]) return { spec: DATA.prices.attachments[productId], type: 'attachment' };
    return null;
  }

  function calcPrice(productId, ctx) {
    const found = findProduct(productId);
    if (!found) return null;
    const spec = found.spec;
    const age  = Number((ctx && ctx.age) || 0);
    const cap  = Number((ctx && ctx.capital) || 0);

    let netAnnual = null;

    switch (spec.kind) {
      case 'ageTable': {
        if (!spec.table) return null;
        netAnnual = interpolateAge(spec.table, age);
        if (netAnnual == null) return null;
        break;
      }

      case 'rateOnCapital': {
        // Life family: (capital × rate + surcharge) × (1 + guaranteeFund)
        const rate = interpolateAge(spec.rates, age);
        if (rate == null || cap <= 0) return null;
        const surcharge = spec.surcharge || 0;
        const guarFund  = spec.guaranteeFund || 0;
        let base = cap * rate + surcharge;
        base = base * (1 + guarFund);
        if (ctx && ctx.isFirstYear && spec.contractFee) {
          base += spec.contractFee;
        }
        netAnnual = base;
        break;
      }

      case 'ratePerTenK': {
        // ExtraMed: rate × (capital / 10000)
        const rate = interpolateAge(spec.rates, age);
        if (rate == null || cap <= 0) return null;
        netAnnual = rate * (cap / 10000);
        break;
      }

      case 'flat': {
        if (spec.annual == null) return null;
        netAnnual = spec.annual;
        break;
      }

      default:
        return null;
    }

    const tax       = spec.tax || 0;
    const grossAnn  = netAnnual * (1 + tax);
    // Σημαντικό: για τα προϊόντα του νέου τιμοκαταλόγου 2026-06 (note: 'ΜΙΚΤΑ...')
    // οι τιμές είναι ΗΔΗ μικτές. Σε αυτή την περίπτωση το tax=0 ή στα notes φαίνεται.
    // Στο data.js έχουμε ορίσει tax=0.15 για όσα δεν περιλαμβάνουν φόρο.
    // Όμως για τα ALL PRODUCTS τιμολόγια (ΜΙΚΤΑ), το note σημαίνει «ήδη ΜΙΚΤΑ».
    // Αν note περιέχει 'ΜΙΚΤΑ', θεωρούμε netAnnual ως gross.
    let realGross = grossAnn;
    if (spec.note && /ΜΙΚΤΑ/i.test(spec.note)) {
      realGross = netAnnual; // ήδη ΜΙΚΤΟ
    }

    return {
      net:     round2(netAnnual),
      gross:   roundEur(realGross),
      annual:  roundEur(realGross),
      monthly: round2(realGross / 12),
      source:  spec.kind,
    };
  }

  // ════════════════════════════════════════════════════════════════════
  // 4. ΕΠΙΛΟΓΗ ΠΡΟΪΟΝΤΩΝ
  // ════════════════════════════════════════════════════════════════════

  /** Επιλογή κύριου health program βάσει εκπιπτόμενου + budget. */
  function selectHealthProgram(answers, monthlyBudget) {
    const age = Number(answers.age) || 0;
    const deductible = answers.deductibleType;
    if (!deductible) return null;

    const tier = DATA.healthTiers[deductible];
    if (!tier || tier.length === 0) return null;

    // Πρώτο πέρασμα: φιλτράρω βάσει age (maxAge)
    const candidates = tier.filter(progId => {
      const prog = DATA.programs[progId];
      if (!prog) return false;
      if (prog.maxAge && age > prog.maxAge) return false;
      return true;
    });

    if (candidates.length === 0) return null;

    // Δοκιμή πρώτου candidate, αλλά αν ξεπερνά το budget → προχωρά στο επόμενο
    // Το health πρόγραμμα δεν πρέπει να ξεπερνά το 70% του monthly budget
    // (αφήνει χώρο για riders).
    const budgetCap = monthlyBudget * 0.70;

    for (const progId of candidates) {
      const p = calcPrice(progId, { age });
      if (!p) continue;
      if (p.monthly <= budgetCap) return progId;
    }
    // Αν κανένα δεν χωράει, επιστρέφω το φθηνότερο
    let cheapest = null;
    let cheapestPrice = Infinity;
    candidates.forEach(progId => {
      const p = calcPrice(progId, { age });
      if (p && p.monthly < cheapestPrice) {
        cheapestPrice = p.monthly;
        cheapest = progId;
      }
    });
    return cheapest;
  }

  /** Επιλογή critical illness rider βάσει P7 + auto από health score. */
  function selectCriticalIllness(answers, scores) {
    const pref = answers.criticalIllnessPref;
    if (pref === 'em31') return 'extramed31';
    if (pref === 'em7')  return 'extramed7';
    // pref === 'none' ή undefined → auto από score
    const h = scores.health;
    if (h >= DATA.scoring.thresholds.extramed31AutoMin) return 'extramed31';
    if (h >= DATA.scoring.thresholds.extramed7AutoMin)  return 'extramed7';
    return null;
  }

  /** Επιλογή MediPlan βάσει P9 + remaining budget. */
  function selectHospitalAllowance(answers, remainingMonthlyBudget) {
    if (answers.hospitalAllowancePref !== 'yes') return null;
    const age = Number(answers.age) || 0;
    // Ξεκινώ από το χαμηλότερο tier και ανεβαίνω όσο χωράει στο budget
    const tiers = ['mediPlan500','mediPlan1000','mediPlan1500','mediPlan2000','mediPlan2500'];
    let chosen = null;
    for (const tierId of tiers) {
      const p = calcPrice(tierId, { age });
      if (!p) continue;
      if (p.monthly <= remainingMonthlyBudget) {
        chosen = tierId;
      } else {
        break; // δεν συμπληρώνεται από τα επόμενα (αυξάνουν)
      }
    }
    return chosen;
  }

  /** Επιλογή Primary Care όταν το health πρόγραμμα είναι hospital-only. */
  function selectPrimaryCare(programId) {
    const hospitalOnly = DATA.scoring.ofc.hospitalOnlyPrograms || [];
    if (!hospitalOnly.includes(programId)) return null;
    // Προτίμηση: firstCare1 (premium AFFIDEA) — fallback firstCare2
    const order = DATA.scoring.ofc.preferenceOrder || ['firstCare1','firstCare2'];
    return order[0];
  }

  /** Επιλογή Life product (life vs lifePlus) βάσει age + scores. */
  function selectLifeProduct(answers) {
    const age = Number(answers.age) || 0;
    // LifePlus έχει disability cover αλλά maxEntryAge=60
    // Αν ο πελάτης είναι ≤60 → lifePlus (καλύτερη κάλυψη)
    // Αν >60 → life (max είσοδος 65)
    const lifePlus = DATA.programs.lifePlus;
    if (lifePlus && age <= lifePlus.maxAge) return 'lifePlus';
    const life = DATA.programs.life;
    if (life && age <= life.maxAge) return 'life';
    return null;
  }

  // ════════════════════════════════════════════════════════════════════
  // 5. ΣΥΝΘΕΣΗ ΠΡΟΤΑΣΗΣ
  // ════════════════════════════════════════════════════════════════════
  function buildProposal(answers) {
    const age = Number(answers.age) || 0;
    const monthlyBudget = Number(answers.monthlyBudget) || 80;
    const scores = calcScores(answers);

    const proposal = {
      meta: {
        age, monthlyBudget,
        generatedAt: new Date().toISOString(),
      },
      scores,
      lines: [],            // λίστα γραμμών πρότασης (program + riders + life)
      notes: [],            // πληροφοριακές σημειώσεις (π.χ. αποταμίευση)
      totals: { monthly: 0, annual: 0 },
      warnings: [],         // π.χ. ξεπερνά budget
    };

    // ─── ΥΓΕΙΑ (αν περιλαμβάνεται) ───────────────────────────────
    if (scores.includeHealth) {
      const healthProgId = selectHealthProgram(answers, monthlyBudget);
      if (healthProgId) {
        const price = calcPrice(healthProgId, { age });
        if (price) {
          proposal.lines.push({
            category: 'health',
            kind: 'program',
            id: healthProgId,
            label: DATA.programs[healthProgId].label,
            price,
          });
          proposal.totals.monthly += price.monthly;
          proposal.totals.annual  += price.annual;

          // Critical Illness rider
          const ciId = selectCriticalIllness(answers, scores);
          if (ciId && isCompatible(healthProgId, ciId)) {
            // ExtraMed: rate per 10k — χρειάζεται κεφάλαιο
            // Default capital από lifeCapital ή 30k για ExtraMed
            const ciCapital = 30000;
            const ciPrice = calcPrice(ciId, { age, capital: ciCapital });
            if (ciPrice) {
              proposal.lines.push({
                category: 'criticalIllness',
                kind: 'attachment',
                id: ciId,
                label: DATA.attachments[ciId].label,
                price: ciPrice,
                capital: ciCapital,
              });
              proposal.totals.monthly += ciPrice.monthly;
              proposal.totals.annual  += ciPrice.annual;
            }
          }

          // Hospital Allowance (MediPlan)
          const remainingMonthly = monthlyBudget - proposal.totals.monthly;
          if (remainingMonthly > 0) {
            const haId = selectHospitalAllowance(answers, remainingMonthly);
            if (haId && isCompatible(healthProgId, haId)) {
              const haPrice = calcPrice(haId, { age });
              if (haPrice) {
                proposal.lines.push({
                  category: 'hospitalAllowance',
                  kind: 'attachment',
                  id: haId,
                  label: DATA.attachments[haId].label,
                  price: haPrice,
                });
                proposal.totals.monthly += haPrice.monthly;
                proposal.totals.annual  += haPrice.annual;
              }
            }
          }

          // Primary Care (αν το πρόγραμμα είναι hospital-only)
          const pcId = selectPrimaryCare(healthProgId);
          if (pcId) {
            const pcPrice = calcPrice(pcId, { age });
            if (pcPrice) {
              proposal.lines.push({
                category: 'primaryCare',
                kind: 'program',  // firstCare είναι standalone program
                id: pcId,
                label: DATA.programs[pcId].label,
                price: pcPrice,
              });
              proposal.totals.monthly += pcPrice.monthly;
              proposal.totals.annual  += pcPrice.annual;
            }
          }
        }
      }
    }

    // ─── ΖΩΗ (αν περιλαμβάνεται) ─────────────────────────────────
    if (scores.includeLife) {
      const lifeId = selectLifeProduct(answers);
      if (lifeId) {
        // Κεφάλαιο: από lifeCapital ('50k','100k','150k','200k')
        const capMap = { '50k': 50000, '100k': 100000, '150k': 150000, '200k': 200000 };
        const lifeCap = capMap[answers.lifeCapital] || 50000;
        const lifePrice = calcPrice(lifeId, { age, capital: lifeCap, isFirstYear: true });
        if (lifePrice) {
          proposal.lines.push({
            category: 'life',
            kind: 'program',
            id: lifeId,
            label: DATA.programs[lifeId].label,
            price: lifePrice,
            capital: lifeCap,
          });
          proposal.totals.monthly += lifePrice.monthly;
          proposal.totals.annual  += lifePrice.annual;
        }
      }
    }

    // ─── ΣΥΝΤΑΞΗ — μόνο σημείωση ─────────────────────────────────
    if (scores.includeSavingsNote) {
      proposal.notes.push({
        category: 'savings',
        message: 'Το συνταξιοδοτικό σας προφίλ δείχνει σημαντική ανάγκη αποταμίευσης. '
              + 'Προτείνουμε ξεχωριστή συζήτηση για αποταμιευτικά προγράμματα '
              + '(NN Accelerator+ / NN Single Flex) — η τιμολόγηση εξαρτάται από το ποσό αποταμίευσης.',
      });
    }

    // ─── BUDGET WARNING ──────────────────────────────────────────
    proposal.totals.monthly = round2(proposal.totals.monthly);
    proposal.totals.annual  = roundEur(proposal.totals.annual);

    if (proposal.totals.monthly > monthlyBudget * 1.05) { // 5% ανοχή
      proposal.warnings.push({
        type: 'budgetExceeded',
        message: `Η πρόταση (€${proposal.totals.monthly}/μήνα) ξεπερνά τον προϋπολογισμό σας (€${monthlyBudget}/μήνα).`,
        excess: round2(proposal.totals.monthly - monthlyBudget),
      });
    }

    return proposal;
  }

  // ════════════════════════════════════════════════════════════════════
  // EXPORT
  // ════════════════════════════════════════════════════════════════════
  const ENGINE = {
    calcScores,
    isCompatible,
    calcPrice,
    selectHealthProgram,
    selectCriticalIllness,
    selectHospitalAllowance,
    selectPrimaryCare,
    selectLifeProduct,
    buildProposal,
    // Internal helpers (εκτεθειμένα για testing)
    _interpolateAge: interpolateAge,
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = ENGINE;
  }
  root.NN_ENGINE = ENGINE;

})(typeof window !== 'undefined' ? window : globalThis);
