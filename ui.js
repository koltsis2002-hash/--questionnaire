/**
 * NN Hellas — Ασφαλιστικό Ερωτηματολόγιο
 * ui.js — Διεπαφή Χρήστη (Επίπεδο 1)
 *
 * Χειρίζεται: navigation, form state, adapter snake↔camel,
 * rendering αποτελεσμάτων, integrations (EmailJS / Sheets).
 * Όλη η λογική ασφαλιστικής πρότασης βρίσκεται στο engine.js.
 */
(function () {
  'use strict';

  // ════════════════════════════════════════════════════════════════
  // CONFIG
  // ════════════════════════════════════════════════════════════════
  const BRAND = {
    name:    'NN Hellas',
    advisor: 'Χρήστος Κόλτσης',
    email:   'koltsis2002@gmail.com',
    publicEmail: 'christos.koltsis@nnadvisors.gr',
    phone:   '6989118348',
  };
  const SITE = 'https://koltsis2002-hash.github.io/christoskoltsis-site/';
  const TOPICS = {
    health:     { word: 'ΥΓΕΙΑ',       path: 'ygeia/' },
    life:       { word: 'ΖΩΗ',         path: 'zoi/' },
    retirement: { word: 'ΑΠΟΤΑΜΙΕΥΣΗ', path: 'apotamieusi/' },
  };

  // ════════════════════════════════════════════════════════════════
  // STATE
  // ════════════════════════════════════════════════════════════════
  let currentStep = 0;
  const TOTAL_STEPS = 6;
  let answers = { age: 35, monthly_budget: 100 };
  let _submitted = false;

  // ════════════════════════════════════════════════════════════════
  // ADAPTER — μετατρέπει τα snake_case HTML answers στο canonical
  //           camelCase schema που περιμένει το engine.js
  // ════════════════════════════════════════════════════════════════
  function toCanonical(a) {
    const maritalMap = {
      single:        'single',
      married:       'married',
      divorced:      'single',      // treated as single for engine
      widowed:       'widowed',     // fix: χήρος/α → score 9 (υψηλή ανάγκη Ζωής)
      single_parent: 'singleParent',
    };
    const occupationMap = {
      employee:     'privateEmployee',
      civil_servant:'publicEmployee',
      freelancer:   'freelancer',
      retired:      'retired',
      other:        'other',
    };
    const hospitalMap = {
      local_pub:  'localPub',
      city_pub:   'cityPub',
      local_priv: 'localPriv',
      big_priv:   'bigPriv',
      abroad:     'abroad',
    };
    const deductibleMap = {
      none:         'none',
      annual:       'annual',
      per_incident: 'perIncident',
    };
    // HTML 'yes' = «έχω ήδη σχέδιο» → engine 'already'
    const savingsPlanMap = {
      yes:    'already',
      soon:   'soon',
      family: 'family',
      no:     'no',
    };

    return {
      age:                 Number(a.age) || 35,
      maritalStatus:       maritalMap[a.marital_status]   || 'single',
      spouseAge:           a.spouse_age ? Number(a.spouse_age) : undefined,
      children:            String(a.children  || '0'),
      childrenAges:        a.kids_ages || [],
      occupation:          occupationMap[a.occupation]    || 'other',
      fundSatisfaction:    a.fund_satisfaction            || 'little',
      hospitalMild:        hospitalMap[a.hospital_mild]   || 'localPub',
      hospitalSevere:      hospitalMap[a.hospital_severe] || 'localPub',
      desiredBenefits:     a.health_benefits              || [],
      deductibleType:      deductibleMap[a.deductible_type] || 'annual',
      deductibleAmount:    a.deductible_amount             || '',
      criticalIllnessPref: a.ci_pref                      || 'none',
      hospitalAllowancePref: a.hospital_allowance         || 'no',
      incomeConcern:       a.income_concern               || 'no',
      uncoveredNeeds:      a.uncovered_needs              || [],
      lifeCapital:         a.life_capital                 || '50k',
      pensionEstimate:     a.pension_estimate             || 'small',
      savingsPlan:         savingsPlanMap[a.savings_plan] || 'no',
      monthlyBudget:       Number(a.monthly_budget)       || 100,
      coverageScope:       a.coverage_scope               || 'family',
    };
  }

  // ════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ════════════════════════════════════════════════════════════════
  function showStep(n) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('s' + n).classList.add('active');
    currentStep = n;
    if (n === 2) updateCoverageScope();
    const pct = n === 0 ? 0 : Math.round((n / TOTAL_STEPS) * 100);
    document.getElementById('progress-fill').style.width = pct + '%';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function nextStep() {
    const errs = validateStep(currentStep);
    if (errs.length) { showErr(currentStep, errs[0]); return; }
    hideErr(currentStep);
    collectAnswers();
    if (currentStep < TOTAL_STEPS) showStep(currentStep + 1);
  }

  function prevStep() {
    hideErr(currentStep);
    if (currentStep > 0) showStep(currentStep - 1);
  }

  function submitForm() {
    if (_submitted) return;
    const errs = validateStep(5);
    if (errs.length) { showErr(5, errs[0]); return; }
    _submitted = true;
    const btn = document.querySelector('#s5 .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Φόρτωση…'; }
    hideErr(5);
    collectAnswers();
    showStep(6);
    renderResults();
  }

  function showErr(step, msg) {
    const el = document.getElementById('err' + step);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
  function hideErr(step) {
    const el = document.getElementById('err' + step);
    if (el) el.style.display = 'none';
  }

  // ════════════════════════════════════════════════════════════════
  // OPTION SELECTION HELPERS
  // ════════════════════════════════════════════════════════════════
  function selOpt(el, field, val) {
    const parent = el.closest('.opts') || el.parentNode;
    parent.querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
    el.classList.add('sel');
    answers[field] = val;
  }

  function togMulti(e, el, field, val) {
    e.preventDefault();
    el.classList.toggle('sel');
    if (!answers[field]) answers[field] = [];
    if (el.classList.contains('sel')) {
      if (!answers[field].includes(val)) answers[field].push(val);
    } else {
      answers[field] = answers[field].filter(v => v !== val);
    }
  }

  // ════════════════════════════════════════════════════════════════
  // DYNAMIC UI
  // ════════════════════════════════════════════════════════════════
  function toggleDeductibleAmount(type) {
    const annualBlock = document.getElementById('deductible-amount-annual');
    const piBlock     = document.getElementById('deductible-amount-perincident');
    if (annualBlock) annualBlock.style.display = (type === 'annual') ? 'block' : 'none';
    if (piBlock)     piBlock.style.display     = (type === 'per_incident') ? 'block' : 'none';

    if (type === 'none') {
      // «Όχι εκπιπτόμενο» → άμεση αντιστοίχιση με CROSS PLUS
      // (από πρώτο € καλύπτει η εταιρία)
      answers.deductible_amount = '0';
      document.querySelectorAll('input[name="deductible_amount"]').forEach(r => { r.checked = false; });
      document.querySelectorAll('#opts-ded-amt-annual .opt, #opts-ded-amt-perinc .opt').forEach(o => o.classList.remove('sel'));
    } else {
      // Αλλαγή τύπου → καθαρισμός προηγούμενης επιλογής ποσού
      answers.deductible_amount = '';
      document.querySelectorAll('input[name="deductible_amount"]').forEach(r => { r.checked = false; });
      document.querySelectorAll('#opts-ded-amt-annual .opt, #opts-ded-amt-perinc .opt').forEach(o => o.classList.remove('sel'));
    }
  }

  function updateCoverageScope() {
    const block = document.getElementById('coverage-scope-block');
    if (!block) return;
    const hasSpouse = answers.marital_status === 'married';
    const hasKids   = parseInt(answers.children || '0') > 0;
    const needScope = hasSpouse || hasKids;
    block.style.display = needScope ? 'block' : 'none';

    if (!needScope) {
      answers.coverage_scope = 'self';
      document.querySelectorAll('input[name="coverage_scope"]').forEach(r => { r.checked = false; });
      document.querySelectorAll('#opts-coverage-scope .opt').forEach(o => o.classList.remove('sel'));
    }
  }

  function updateKidsAges(count) {
    const section = document.getElementById('kids-section');
    const grid    = document.getElementById('kids-grid');
    if (count === 0) { section.style.display = 'none'; answers.kids_ages = []; return; }
    section.style.display = 'block';
    grid.innerHTML = '';
    answers.kids_ages = new Array(Math.min(count, 4)).fill(0);
    for (let i = 0; i < Math.min(count, 4); i++) {
      const inp = document.createElement('input');
      inp.type = 'number'; inp.className = 'form-input kid-age';
      inp.placeholder = 'Ηλικία ' + (i + 1) + 'ου παιδιού';
      inp.min = 0; inp.max = 25;
      const idx = i;
      inp.addEventListener('input', () => { answers.kids_ages[idx] = parseInt(inp.value) || 0; });
      grid.appendChild(inp);
    }
  }

  // ════════════════════════════════════════════════════════════════
  // COLLECT ANSWERS
  // ════════════════════════════════════════════════════════════════
  function collectAnswers() {
    answers.age           = parseInt(document.getElementById('age-input').value) || null;
    answers.monthly_budget = parseInt(document.getElementById('budget-slider').value) || 100;
    answers.target_years  = parseInt(document.getElementById('target-years-slider').value) || 15;
    answers.client_name   = (document.getElementById('client-name')?.value || '').trim();
    answers.client_email  = (document.getElementById('client-email')?.value || '').trim();
    answers.client_phone  = (document.getElementById('client-phone')?.value || '').trim();

    const spouseInp = document.getElementById('spouse-age');
    if (spouseInp && spouseInp.value) answers.spouse_age = parseInt(spouseInp.value) || null;

    ['marital_status','hospital_mild','hospital_severe','fund_satisfaction',
     'deductible_type','deductible_amount','coverage_scope','income_concern','life_capital',
     'pension_estimate','savings_plan','occupation','children','ci_pref','hospital_allowance',
     'target_amount'
    ].forEach(name => {
      const el = document.querySelector('input[name="' + name + '"]:checked');
      if (el) answers[name] = el.value;
    });

    answers.health_benefits = Array.from(
      document.querySelectorAll('input[name="health_benefits"]:checked')
    ).map(cb => cb.value);

    answers.uncovered_needs = Array.from(
      document.querySelectorAll('input[name="uncovered_needs"]:checked')
    ).map(cb => cb.value);
  }

  // ════════════════════════════════════════════════════════════════
  // VALIDATION
  // ════════════════════════════════════════════════════════════════
  function validateStep(step) {
    const a = answers;
    if (step === 1) {
      const ageEl = document.getElementById('age-input');
      const ageVal = ageEl ? parseInt(ageEl.value) : NaN;
      if (!ageEl || !ageEl.value || isNaN(ageVal)) return ['Γράψε την ηλικία σου για να συνεχίσεις'];
      if (ageVal < 18 || ageVal > 70) return ['Η ηλικία πρέπει να είναι από 18 έως 70'];
      if (!a.marital_status) return ['Διάλεξε την οικογενειακή σου κατάσταση'];
      if (a.marital_status === 'married') {
        const sa = document.getElementById('spouse-age')?.value;
        if (!sa || parseInt(sa) < 18) return ['Γράψε την ηλικία του/της συντρόφου σου'];
      }
      if (a.children === undefined) return ['Πες μου αν έχεις παιδιά'];
      if (a.children && a.children !== '0') {
        const filled = Array.from(document.querySelectorAll('.kid-age'))
          .every(inp => inp.value && parseInt(inp.value) >= 0);
        if (!filled) return ['Γράψε την ηλικία κάθε παιδιού'];
      }
      if (!a.occupation) return ['Πες μου με τι ασχολείσαι'];
      return [];
    }
    if (step === 2) {
      if (!a.fund_satisfaction)  return ['Πες μου πόσο σίγουρος/η νιώθεις για τα έξοδα υγείας'];
      if (!a.hospital_mild)      return ['Διάλεξε πού θα πήγαινες για ένα απλό θέμα υγείας'];
      if (!a.hospital_severe)    return ['Διάλεξε πού θα ήθελες να είσαι για κάτι σοβαρό'];
      if (!a.deductible_type)    return ['Πες μου αν θέλεις απαλλαγή'];
      if ((a.deductible_type === 'annual' || a.deductible_type === 'per_incident') && !a.deductible_amount) {
        return ['Διάλεξε πόσο μεγάλη να είναι η απαλλαγή'];
      }
      const scopeBlock = document.getElementById('coverage-scope-block');
      if (scopeBlock && scopeBlock.style.display !== 'none' && !a.coverage_scope) {
        return ['Διάλεξε ποιους θέλεις να καλύψουμε'];
      }
      if (!a.ci_pref)            return ['Απάντησε για το ποσό σε σοβαρή ασθένεια'];
      if (!a.hospital_allowance) return ['Απάντησε για το ποσό ανά μέρα στο νοσοκομείο'];
      return [];
    }
    if (step === 3) {
      if (!a.income_concern) return ['Απάντησε για το εισόδημα του σπιτιού'];
      if (!a.life_capital)   return ['Διάλεξε πόσο δυνατό «δίχτυ» θέλεις'];
      return [];
    }
    if (step === 4) {
      if (!a.pension_estimate) return ['Πες μου πώς βλέπεις τη σύνταξή σου'];
      if (!a.savings_plan)     return ['Πες μου αν βάζεις ήδη χρήματα στην άκρη'];
      if (!a.target_amount)    return ['Διάλεξε έναν στόχο (ή «Δεν με απασχολεί τώρα»)'];
      return [];
    }
    if (step === 5) {
      const name  = document.getElementById('client-name')?.value?.trim();
      const email = document.getElementById('client-email')?.value?.trim();
      const phone = document.getElementById('client-phone')?.value?.trim();
      if (!name)                           return ['Γράψε το ονοματεπώνυμό σου'];
      if (!email || !email.includes('@'))  return ['Γράψε ένα σωστό email'];
      if (phone && phone.length < 10)      return ['Το τηλέφωνο θέλει 10 ψηφία (ή άφησέ το κενό)'];
      return [];
    }
    return [];
  }

  // ════════════════════════════════════════════════════════════════
  // SAVINGS SCENARIOS (αποταμίευση — ανεξάρτητο από engine)
  // Πηγή αποδόσεων: NN-E-422/07.2025
  // ════════════════════════════════════════════════════════════════
  function calcSavingsScenarios(targetAmount, years, offerMonthly) {
    if (!targetAmount || !years || targetAmount <= 0 || years <= 0) return null;
    const returns = [
      { label:'Συντηρητικό',  annual:0.0270, color:'#4a9eda',
        desc:'Χαμηλότερο ρίσκο, μεγαλύτερη σταθερότητα στις αποδόσεις' },
      { label:'Ισορροπημένο', annual:0.0640, color:'#C9A84C',
        desc:'Ισορροπία ασφάλειας και απόδοσης μεσοπρόθεσμα' },
      { label:'Δυναμικό',     annual:0.1020, color:'#F47920',
        desc:'Υψηλότερο ρίσκο με μεγαλύτερη δυνητική απόδοση' },
    ];
    const months = years * 12;
    const pmt = Math.max(0, offerMonthly || 0);
    return returns.map(s => {
      const r = s.annual / 12;
      const factor = (Math.pow(1 + r, months) - 1) / r;   // annuity FV factor
      const fv = Math.round(pmt * factor);                // τι χτίζει η προσφορά
      const requiredMonthly = Math.round(targetAmount / factor);
      const gap = Math.max(0, targetAmount - fv);         // κενό κεφαλαίου
      const extraMonthly = Math.max(0, requiredMonthly - pmt); // επιπλέον €/μήνα
      return { ...s, fv, gap, extraMonthly, requiredMonthly, reachesTarget: gap <= 0 };
    });
  }

  // ════════════════════════════════════════════════════════════════
  // BENEFITS TEXT
  // ════════════════════════════════════════════════════════════════
  function generateBenefitsText(a, scores, lines, totalMonthly) {
    const parts = [];
    const avg = (scores.health + scores.life + scores.retirement) / 3;
    const urg    = avg >= 70 ? 'ΚΡΙΣΙΜΗ' : avg >= 50 ? 'ΥΨΗΛΗ' : avg >= 30 ? 'ΜΕΤΡΙΑ' : 'ΧΑΜΗΛΗ';
    const urgGr  = { ΚΡΙΣΙΜΗ:'κρίσιμης', ΥΨΗΛΗ:'υψηλής', ΜΕΤΡΙΑ:'μέτριας', ΧΑΜΗΛΗ:'βασικής' }[urg];

    const kids = parseInt(a.children) || 0;
    const familyCtx = a.marital_status === 'married'
      ? `Ως έγγαμος/η${kids > 0 ? ` με ${kids >= 3 ? '3+' : kids} παιδί${kids === 1 ? '' : 'ά'}` : ''}`
      : a.marital_status === 'single_parent' ? 'Ως μονογονέας' : '';

    if (familyCtx) parts.push(
      `${familyCtx}, η ασφάλιση εξασφαλίζει την οικονομική ευστάθεια της οικογένειάς σας σε κάθε απρόβλεπτο.`
    );

    const topNeeds = [];
    if (scores.health >= 30)     topNeeds.push('νοσοκομειακή/ιατρική κάλυψη');
    if (scores.life >= 40)       topNeeds.push('προστασία εισοδήματος');
    if (scores.retirement >= 40) topNeeds.push('συνταξιοδοτική ασφάλεια');
    if (topNeeds.length) parts.push(
      `Η ανάλυση αναδεικνύει ανάγκη ${urgGr} προτεραιότητας για: ${topNeeds.join(' · ')}.`
    );

    if (lines.length > 0) {
      const prodNames = lines.map(l => l.label).join(' + ');
      parts.push(
        `Το προτεινόμενο πακέτο (${prodNames}) σας καλύπτει για μόλις €${totalMonthly}/μήνα — ισοδύναμο με €${(totalMonthly / 30).toFixed(1)} ημερησίως.`
      );
    }

    if (a.income_concern === 'yes') parts.push(
      'Σε περίπτωση απώλειας εισοδήματος, η οικογένειά σας διατηρεί την οικονομική της ισορροπία χάρη στην ασφαλιστική προστασία.'
    );
    if (scores.retirement >= 45) parts.push(
      'Η ιδιωτική αποταμίευση αποτελεί σήμερα αναγκαίο συμπλήρωμα της κρατικής σύνταξης για αξιοπρεπή διαβίωση.'
    );
    return parts.join(' ');
  }

  // ════════════════════════════════════════════════════════════════
  // RANKED NEEDS — επιστρέφει τις 3 κατηγορίες ταξινομημένες κατά score ↓
  // ════════════════════════════════════════════════════════════════
  function rankNeeds(h, l, r) {
    const cats = [
      { key:'health',     name:'Υγεία',                short:'ΥΓΕΙΑ',       score:h },
      { key:'life',       name:'Ζωή',                  short:'ΖΩΗ',         score:l },
      { key:'retirement', name:'Αποταμίευση & σύνταξη', short:'ΑΠΟΤΑΜΙΕΥΣΗ', score:r },
    ];
    return cats.sort((a, b) => b.score - a.score);
  }

  // ════════════════════════════════════════════════════════════════
  // PODIUM HTML για EMAIL — table-based (συμβατό με Gmail/Outlook)
  // ════════════════════════════════════════════════════════════════
  function buildPodiumEmailHTML(h, l, r) {
    const ranked = rankNeeds(h, l, r);
    const rows = ranked.map((cat, i) => `
          <tr><td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-family:Arial,Helvetica,sans-serif">
            <div style="font-size:12px;font-weight:bold;color:#555555;text-transform:uppercase">${i + 1}η ανάγκη</div>
            <div style="font-size:26px;font-weight:bold;color:#e56410;line-height:1.2">${cat.short}</div>
            <a href="${SITE}${TOPICS[cat.key].path}" style="font-size:14px;font-weight:bold;color:#111111">Μάθε για αυτήν →</a>
          </td></tr>`).join('');
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e3e3e3;border-radius:12px;margin:8px 0">
        ${rows}
      </table>`;
  }

  // ════════════════════════════════════════════════════════════════
  // NEED REASONS — γιατί βγήκε κάθε ανάγκη (για τον επισκέπτη, χωρίς ποσά)
  // ════════════════════════════════════════════════════════════════
  function needReasons(key, a) {
    const out = [];
    const needs = Array.isArray(a.uncovered_needs) ? a.uncovered_needs : [];
    if (key === 'health') {
      if (a.fund_satisfaction === 'none' || a.fund_satisfaction === 'little') out.push('Νιώθεις ότι υπάρχουν κενά στα έξοδα υγείας.');
      if (a.hospital_severe === 'big_priv' || a.hospital_severe === 'abroad') out.push('Για κάτι σοβαρό θέλεις να διαλέγεις εσύ πού θα πας.');
      if (a.ci_pref && a.ci_pref !== 'none') out.push('Θέλεις ένα ποσό στο χέρι, αν εμφανιστεί σοβαρή ασθένεια.');
      if (a.coverage_scope === 'family') out.push('Θέλεις να είναι καλυμμένη όλη η οικογένεια.');
      if (a.hospital_allowance === 'yes') out.push('Ένα ποσό για κάθε μέρα στο νοσοκομείο θα σε βοηθούσε.');
      if (!out.length) out.push('Ένα θέμα υγείας δεν το διαλέγει κανείς. Καλό είναι να ξέρεις από πριν τι καλύπτεται.');
    }
    if (key === 'life') {
      if (a.income_concern === 'yes') out.push('Εσύ φέρνεις το βασικό εισόδημα στο σπίτι.');
      if (a.children && a.children !== '0') out.push('Έχεις παιδιά που στηρίζονται σε σένα.');
      if (needs.includes('mortgage')) out.push('Θέλεις να μη μείνει ακάλυπτο το σπίτι.');
      if (needs.includes('education')) out.push('Θέλεις να είναι σίγουρες οι σπουδές των παιδιών.');
      if (needs.includes('spouse_income')) out.push('Θέλεις να συνεχίσει κανονικά η καθημερινότητα των δικών σου.');
      if (!out.length) out.push('Ένα «δίχτυ» για τους δικούς σου, αν συμβεί κάτι απρόοπτο.');
    }
    if (key === 'retirement') {
      if (a.pension_estimate === 'none' || a.pension_estimate === 'small') out.push('Δεν περιμένεις ότι η σύνταξη θα σου φτάνει.');
      if (a.savings_plan === 'soon' || a.savings_plan === 'no') out.push('Θέλεις να ξεκινήσεις να βάζεις χρήματα στην άκρη.');
      if (a.target_amount && a.target_amount !== 'none') out.push(`Έχεις έναν στόχο για τα επόμενα ${a.target_years || 15} χρόνια.`);
      if (!out.length) out.push('Λίγα χρήματα κάθε μήνα, με σταθερότητα, κάνουν μεγάλη διαφορά με τα χρόνια.');
    }
    return out;
  }

  function buildClientSummaryText(h, l, r, a) {
    return rankNeeds(h, l, r).map((c, i) =>
      `${i + 1}. ${c.short}\n` + needReasons(c.key, a).map(x => '• ' + x).join('\n')
      + `\nΜάθε για αυτήν: ${SITE}${TOPICS[c.key].path}`
    ).join('\n\n');
  }

  // ════════════════════════════════════════════════════════════════
  // NEEDS HIERARCHY TEXT — ενιαίο κείμενο παραγράφου για το email πελάτη
  // ════════════════════════════════════════════════════════════════
  function buildNeedsHierarchyText(h, l, r) {
    const ranked = rankNeeds(h, l, r);
    if (ranked[0].score < 45) {
      return 'Με βάση τις απαντήσεις σου, δεν βλέπω κάτι επείγον αυτή τη στιγμή, και αυτό είναι καλό νέο. '
           + 'Οι ανάγκες μας όμως αλλάζουν με τα χρόνια, μαζί με την οικογένεια και τη δουλειά. '
           + 'Όποτε θέλεις, τα βλέπουμε μαζί, με την ησυχία σου.';
    }
    const [top, second, third] = ranked.map(c => c.short);
    return `Σε ευχαριστώ για τον χρόνο σου. Με βάση τις απαντήσεις σου, η πρώτη σου ανάγκη είναι η ${top}. `
         + `Ακολουθούν η ${second} και η ${third}. `
         + `Από εκεί ξεκινάμε μαζί. Το πρόγραμμα και το κόστος τα βρίσκουμε στη συζήτησή μας, πάνω σε ό,τι σου ταιριάζει.`;
  }

  // ════════════════════════════════════════════════════════════════
  // NEEDS HIERARCHY SHORT — μικρή σύνοψη για email συμβούλου
  // ════════════════════════════════════════════════════════════════
  function buildNeedsHierarchyShort(h, l, r) {
    const ranked = rankNeeds(h, l, r);
    const order = ranked.map((c, i) => `${i + 1}η ${c.name}`).join(' · ');
    return `Με βάση τις επιλογές του πελάτη, η ιεράρχηση των αναγκών του είναι: ${order}.`;
  }

  // ════════════════════════════════════════════════════════════════
  // CLIENT PROFILE — πλήρες, αναγνώσιμο προφίλ απαντήσεων (email συμβούλου)
  // ════════════════════════════════════════════════════════════════
  function buildClientProfileText(a, scores) {
    const L = {
      marital:  { single:'Άγαμος/η', married:'Έγγαμος/η', divorced:'Διαζευγμένος/η', widowed:'Χήρος/α', single_parent:'Μονογονέας' },
      occ:      { employee:'Μισθωτός/ή ιδ. τομέα', civil_servant:'Δημόσιος υπάλληλος', freelancer:'Ελ. επαγγελματίας', retired:'Συνταξιούχος', other:'Άλλο' },
      fund:     { none:'Καθόλου', little:'Λίγο', enough:'Αρκετά', fully:'Απόλυτα' },
      dedType:  { none:'Χωρίς εκπιπτόμενο', annual:'Ετήσιο', per_incident:'Ανά νοσηλεία' },
      scope:    { self:'Μόνο ο ίδιος', family:'Οικογένεια' },
      ci:       { em31:'Ναι — 31 ασθένειες', em7:'Ναι — 7 ασθένειες', none:'Όχι / αυτόματα' },
      yn:       { yes:'Ναι', no:'Όχι' },
      lifeCap:  { '50k':'€50.000', '100k':'€100.000', '150k':'€150.000', '200k':'€200.000+' },
      pension:  { none:'Καμία', small:'Μικρή', adequate:'Ικανοποιητική', big:'Μεγάλη' },
      savings:  { yes:'Έχει ήδη πρόγραμμα', soon:'Σκέφτεται να ξεκινήσει', family:'Οικογενειακό πρόγραμμα', no:'Δεν αποταμιεύει' },
      hosp:     { local_pub:'Τοπικό δημόσιο', city_pub:'Δημόσιο Αθ./Θεσ.', local_priv:'Τοπικό ιδιωτικό', big_priv:'Μεγάλο ιδιωτικό', abroad:'Εξωτερικό' },
      benefits: { diagnostics:'Διαγνωστικές', visits:'Επισκέψεις γιατρών', hospital:'Νοσηλεία', checkup:'Check-up', abroad:'Πρόσβαση στο εξωτερικό' },
      uncov:    { expenses:'Πάγια έξοδα', education:'Σπουδές παιδιών', loans:'Δάνεια', taxes:'Φορολογικές υποχρεώσεις' },
    };
    const g = (map, v) => (v != null && map[v]) ? map[v] : (v != null && v !== '' ? String(v) : '—');
    const lines = [];
    lines.push(`Ηλικία: ${a.age || '—'}`);
    lines.push(`Οικογ. κατάσταση: ${g(L.marital, a.marital_status)}`);
    if (a.spouse_age) lines.push(`Ηλικία συζύγου: ${a.spouse_age}`);
    lines.push(`Παιδιά: ${a.children || '0'}${(a.kids_ages && a.kids_ages.length) ? ' (ηλικίες: ' + a.kids_ages.join(', ') + ')' : ''}`);
    lines.push(`Επάγγελμα: ${g(L.occ, a.occupation)}`);
    lines.push(`Ικανοποίηση από δημόσιο ταμείο: ${g(L.fund, a.fund_satisfaction)}`);
    lines.push(`Νοσοκομείο για ήπιο θέμα: ${g(L.hosp, a.hospital_mild)}`);
    lines.push(`Νοσοκομείο για σοβαρό θέμα: ${g(L.hosp, a.hospital_severe)}`);
    if (a.health_benefits && a.health_benefits.length)
      lines.push(`Επιθυμητές παροχές: ${a.health_benefits.map(x => g(L.benefits, x)).join(', ')}`);
    lines.push(`Τύπος εκπιπτόμενου: ${g(L.dedType, a.deductible_type)}${a.deductible_amount ? ' (€' + a.deductible_amount + ')' : ''}`);
    lines.push(`Εύρος κάλυψης: ${g(L.scope, a.coverage_scope)}`);
    lines.push(`Ενδιαφέρον για κρίσιμες ασθένειες: ${g(L.ci, a.ci_pref)}`);
    lines.push(`Ενδιαφέρον για επίδομα νοσηλείας: ${g(L.yn, a.hospital_allowance)}`);
    lines.push(`Ανησυχία για απώλεια εισοδήματος: ${g(L.yn, a.income_concern)}`);
    if (a.uncovered_needs && a.uncovered_needs.length)
      lines.push(`Ακάλυπτες ανάγκες σε απώλεια: ${a.uncovered_needs.map(x => g(L.uncov, x)).join(', ')}`);
    lines.push(`Επιθυμητό κεφάλαιο Ζωής: ${g(L.lifeCap, a.life_capital)}`);
    lines.push(`Εκτίμηση μελλοντικής σύνταξης: ${g(L.pension, a.pension_estimate)}`);
    lines.push(`Αποταμιευτικό προφίλ: ${g(L.savings, a.savings_plan)}`);
    if (a.target_amount && a.target_amount !== 'none')
      lines.push(`Στόχος αποταμίευσης: €${parseInt(a.target_amount).toLocaleString('el-GR')} σε ${a.target_years || 15} χρόνια`);
    lines.push(`Μηνιαίος προϋπολογισμός: €${a.monthly_budget}/μήνα`);
    if (scores)
      lines.push(`\nScores αναγκών → Υγεία: ${Math.round(scores.health)}/100 · Ζωή: ${Math.round(scores.life)}/100 · Σύνταξη: ${Math.round(scores.retirement)}/100`);
    return lines.join('\n');
  }

  // ════════════════════════════════════════════════════════════════
  // RESULTS RENDERING
  // ════════════════════════════════════════════════════════════════
  function renderResults() {
    const s6 = document.getElementById('s6');
    if (!window.NN_ENGINE) {
      s6.innerHTML = '<div class="error-msg" style="display:block;margin-top:32px">Κάτι δεν φόρτωσε σωστά. Ανανέωσε τη σελίδα και δοκίμασε ξανά.</div>';
      return;
    }

    collectAnswers();
    const a        = answers;
    const canonical = toCanonical(a);
    const proposal  = window.NN_ENGINE.buildProposal(canonical);
    const scores    = proposal.scores;

    const h = scores.health, l = scores.life, r = scores.retirement;
    const avg     = (h + l + r) / 3;
    const urg     = avg >= 70 ? 'ΚΡΙΣΙΜΗ' : avg >= 50 ? 'ΥΨΗΛΗ' : avg >= 30 ? 'ΜΕΤΡΙΑ' : 'ΧΑΜΗΛΗ';

    const totalMonthly = Math.ceil(proposal.totals.monthly);
    const totalAnnual  = proposal.totals.annual;

    // Ταξινόμηση proposal.lines σύμφωνα με την ιεράρχηση αναγκών
    const rankedNeeds = rankNeeds(h, l, r);
    const categoryOrder = {};
    rankedNeeds.forEach((c, idx) => {
      // Όλες οι health-related γραμμές μπαίνουν με την προτεραιότητα της Υγείας
      if (c.key === 'health') {
        categoryOrder.health = idx;
        categoryOrder.criticalIllness = idx + 0.1;
        categoryOrder.hospitalAllowance = idx + 0.2;
        categoryOrder.primaryCare = idx + 0.3;
      } else if (c.key === 'life') {
        categoryOrder.life = idx;
      } else if (c.key === 'retirement') {
        categoryOrder.savings = idx;
      }
    });
    proposal.lines.sort((a, b) => {
      const oa = categoryOrder[a.category] ?? 99;
      const ob = categoryOrder[b.category] ?? 99;
      return oa - ob;
    });

    // Notes from engine
    const savingsNote   = proposal.notes.find(n => n.category === 'savings');
    const budgetWarning = proposal.warnings.find(w => w.type === 'budgetExceeded');

    // ── Savings section (αν δήλωσε στόχο) ───────────────────────
    const targetAmt = (a.target_amount && a.target_amount !== 'none') ? parseInt(a.target_amount) : 0;
    const targetYrs = parseInt(a.target_years) || 15;
    const savingsLine = proposal.lines.find(l => l.category === 'savings');
    const offerSavingsMonthly = savingsLine ? savingsLine.price.monthly : 0;
    const hasOfferSavings = offerSavingsMonthly > 0;
    const savScenarios = calcSavingsScenarios(targetAmt, targetYrs, offerSavingsMonthly);
    // ── Build proposalText for email/sheets ──────────────────────
    const familyNote = proposal.notes.find(n => n.category === 'familyDiscount');
    const proposalText =
      proposal.lines.map(l => {
        const member = (l.memberType && l.memberType !== 'client') ? ` [${l.memberLabel}]` : '';
        const disc   = (l.price.discountPct && l.price.discountPct > 0)
          ? ` (-${Math.round(l.price.discountPct * 100)}%)` : '';
        const note   = (l.category === 'savings')
          ? ' (το ποσό που υπολείπεται αφού καλυφθούν Υγεία & Ζωή)' : '';
        return `• ${l.label}${l.capital ? ' ' + Math.round(l.capital / 1000) + 'k' : ''}${member}${disc}: €${l.price.monthly}/μήνα${note}`;
      }).join('\n') +
      `\nΣύνολο: €${totalMonthly}/μήνα` +
      (savScenarios ? (hasOfferSavings
        ? '\n\n🎯 Σενάρια Αποταμίευσης'
          + '\nΜε €' + offerSavingsMonthly.toLocaleString('el-GR') + '/μήνα, σε ' + targetYrs + ' χρόνια χτίζετε:\n'
          + savScenarios.map(s => `• ${s.label} (${(s.annual*100).toFixed(2)}%): €${s.fv.toLocaleString('el-GR')}`).join('\n')
          + '\n\nΠόσα χρειάζονται ακόμα για στόχο €' + targetAmt.toLocaleString('el-GR') + ':\n'
          + savScenarios.map(s => `• ${s.label}: ` + (s.reachesTarget
              ? '✅ καλύπτει τον στόχο'
              : `+€${s.extraMonthly.toLocaleString('el-GR')}/μήνα (υπολείπονται €${s.gap.toLocaleString('el-GR')})`)).join('\n')
        : '\n\n🎯 Σενάρια Αποταμίευσης — απαιτούμενο μηνιαίο ποσό για στόχο €' + targetAmt.toLocaleString('el-GR')
          + ' σε ' + targetYrs + ' χρόνια:\n'
          + savScenarios.map(s => `• ${s.label} (${(s.annual*100).toFixed(2)}%): €${s.requiredMonthly.toLocaleString('el-GR')}/μήνα`).join('\n'))
        : '') +
      (familyNote   ? '\n👨‍👩‍👧 ' + familyNote.message : '') +
      (savingsNote   ? '\n📌 ' + savingsNote.message : '') +
      (budgetWarning ? '\n⚠️ ' + budgetWarning.message : '');

    // ── Render (μόνο ανάγκες, χωρίς τιμές και προγράμματα) ──────
    const firstName = a.client_name ? a.client_name.trim().split(' ')[0] : '';
    const calm = rankedNeeds[0].score < 45;
    const cards = rankedNeeds.map((c, i) => `
        <div class="need-card${i === 0 && !calm ? ' top' : ''}">
          <div class="need-rank">${i + 1}η ανάγκη</div>
          <div class="topic-word">${TOPICS[c.key].word}</div>
          <ul class="need-why">${needReasons(c.key, a).map(x => `<li>${x}</li>`).join('')}</ul>
          <a class="learn" href="${SITE}${TOPICS[c.key].path}" target="_blank" rel="noopener">Μάθε για αυτήν →</a>
        </div>`).join('');

    s6.innerHTML = `
      <div class="step-label">Τα αποτελέσματά σου</div>
      <h2 class="screen-title">${firstName ? firstName + ', ' : ''}${calm ? 'είσαι σε καλό δρόμο' : 'από εδώ ξεκινάμε'}</h2>
      <p class="screen-sub">${calm
        ? 'Δεν βλέπω κάτι επείγον σήμερα. Οι ανάγκες σου, με τη σειρά που βγήκαν:'
        : 'Με βάση τις απαντήσεις σου, οι ανάγκες σου μπαίνουν με αυτή τη σειρά:'}</p>

      <div class="need-list">${cards}</div>

      <div class="indicative-banner">
        Είναι μια πρώτη εικόνα από τις απαντήσεις σου. Το πρόγραμμα και το κόστος τα βρίσκουμε μαζί, πάνω σε ό,τι σου ταιριάζει.
      </div>

      <div class="contact-cta-section">
        <div class="contact-cta-title">Ας τα πούμε από κοντά</div>
        <p class="contact-cta-sub">Χωρίς υποχρέωση. Μια κουβέντα αρκεί για να δεις τι σου ταιριάζει.</p>
        <div class="contact-cta-row">
          <a class="btn btn-primary" href="tel:${BRAND.phone}">Πάρε με τηλέφωνο</a>
          <a class="btn btn-ghost" href="${SITE}epikoinonia/" target="_blank" rel="noopener">Σε παίρνω εγώ</a>
        </div>
        <p class="contact-cta-meta">${BRAND.phone} · <a href="mailto:${BRAND.publicEmail}">${BRAND.publicEmail}</a></p>
        <p class="contact-cta-meta">${BRAND.advisor} · Ασφαλιστικός &amp; Χρηματοοικονομικός Σύμβουλος · Έδεσσα</p>
      </div>

      <div id="email-status" class="email-status">Στέλνω τα αποτελέσματα στο email σου…</div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
        <button class="btn btn-ghost" onclick="resetForm()">Ξεκίνα από την αρχή</button>
        <button class="btn btn-ghost" onclick="window.print()">Εκτύπωση</button>
      </div>`;

    // Integrations
    const resultData = {
      ...a,
      health_score:  h, life_score: l, retirement_score: r,
      urgency:       urg, proposal_text: proposalText,
      needs_hierarchy:       buildNeedsHierarchyText(h, l, r),
      needs_hierarchy_short: buildNeedsHierarchyShort(h, l, r),
      client_profile:        buildClientProfileText(a, scores),
      podium_html:           buildPodiumEmailHTML(h, l, r),
      client_summary:        buildClientSummaryText(h, l, r, a),
      advisor_name:  BRAND.advisor,
      advisor_email: BRAND.email,
      advisor_phone: BRAND.phone,
      advisor_public_email: BRAND.publicEmail,
    };
    window.NN_INTEGRATIONS?.saveToSheets(resultData);
    window.NN_INTEGRATIONS?.sendEmails(resultData);

    // Εμφάνιση rating modal 8 δευτερόλεπτα αφού φορτώσουν τα αποτελέσματα
    setTimeout(openRatingModal, 8000);
  }

  // ════════════════════════════════════════════════════════════════
  // RATING MODAL
  // ════════════════════════════════════════════════════════════════
  let _ratingValue = 0;
  let _ratingSent  = false;
  const RATING_LABELS = {
    1: 'Καθόλου ικανοποιητικό',
    2: 'Μέτριο',
    3: 'Καλό',
    4: 'Πολύ καλό',
    5: 'Εξαιρετικό!',
  };

  function openRatingModal() {
    if (_ratingSent) return;
    const modal = document.getElementById('rating-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    // Setup star click listeners (idempotent)
    const stars = modal.querySelectorAll('.rating-star');
    stars.forEach(star => {
      star.onclick = () => setRating(parseInt(star.dataset.value));
      star.onmouseenter = () => previewRating(parseInt(star.dataset.value));
    });
    document.getElementById('rating-stars').onmouseleave = () => previewRating(_ratingValue);
  }

  function setRating(val) {
    _ratingValue = val;
    previewRating(val);
    document.getElementById('rating-label').textContent = RATING_LABELS[val] || '';
    document.getElementById('rating-submit').disabled = false;
  }

  function previewRating(val) {
    document.querySelectorAll('.rating-star').forEach(s => {
      const v = parseInt(s.dataset.value);
      s.classList.toggle('active', v <= val);
    });
  }

  function closeRatingModal() {
    const modal = document.getElementById('rating-modal');
    if (modal) modal.style.display = 'none';
  }

  function submitRating() {
    if (_ratingSent || _ratingValue === 0) return;
    _ratingSent = true;
    const comment = (document.getElementById('rating-comment')?.value || '').trim();
    const payload = {
      rating: _ratingValue,
      comment: comment,
      client_name:  answers.client_name  || '',
      client_email: answers.client_email || '',
      date: new Date().toLocaleString('el-GR'),
    };
    window.NN_INTEGRATIONS?.saveRating(payload);

    // Δείξε το thank-you screen
    const thanks = document.getElementById('rating-thanks');
    if (thanks) thanks.style.display = 'flex';
    setTimeout(closeRatingModal, 2200);
  }

  // ════════════════════════════════════════════════════════════════
  // RESET
  // ════════════════════════════════════════════════════════════════
  function resetForm() {
    answers = { age: 35, monthly_budget: 100 };
    _submitted = false;
    _ratingValue = 0;
    _ratingSent  = false;
    const ratingModal = document.getElementById('rating-modal');
    if (ratingModal) ratingModal.style.display = 'none';
    const ratingThanks = document.getElementById('rating-thanks');
    if (ratingThanks) ratingThanks.style.display = 'none';
    document.querySelectorAll('.rating-star').forEach(s => s.classList.remove('active'));
    const ratingLabel = document.getElementById('rating-label');
    if (ratingLabel) ratingLabel.innerHTML = '&nbsp;';
    const ratingComment = document.getElementById('rating-comment');
    if (ratingComment) ratingComment.value = '';
    const ratingSubmit = document.getElementById('rating-submit');
    if (ratingSubmit) ratingSubmit.disabled = true;
    window.NN_INTEGRATIONS?.reset();
    document.querySelectorAll('.opt.sel').forEach(el => el.classList.remove('sel'));
    document.querySelectorAll('input[type=radio], input[type=checkbox]').forEach(inp => inp.checked = false);
    document.querySelectorAll('.form-input').forEach(inp => inp.value = '');
    const ageInputEl = document.getElementById('age-input');
    if (ageInputEl) ageInputEl.value = '';
    answers.age = null;
    document.getElementById('budget-slider').value = 100;
    document.getElementById('budget-display').textContent = '100';
    document.getElementById('annual-display').textContent = '1.200';
    document.getElementById('spouse-section').style.display = 'none';
    document.getElementById('kids-section').style.display = 'none';
    document.getElementById('kids-grid').innerHTML = '';
    const dedA = document.getElementById('deductible-amount-annual');
    const dedP = document.getElementById('deductible-amount-perincident');
    if (dedA) dedA.style.display = 'none';
    if (dedP) dedP.style.display = 'none';
    showStep(0);
  }

  // ════════════════════════════════════════════════════════════════
  // INIT
  // ════════════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', () => {
    const ageInput = document.getElementById('age-input');
    if (ageInput) ageInput.addEventListener('input', () => {
      answers.age = parseInt(ageInput.value) || null;
    });

    const budgetSlider = document.getElementById('budget-slider');
    budgetSlider.addEventListener('input', () => {
      const v = parseInt(budgetSlider.value);
      document.getElementById('budget-display').textContent = v;
      document.getElementById('annual-display').textContent = (v * 12).toLocaleString('el-GR');
      answers.monthly_budget = v;
    });

    document.querySelectorAll('input[name="marital_status"]').forEach(r => {
      r.addEventListener('change', () => {
        document.getElementById('spouse-section').style.display =
          r.value === 'married' ? 'block' : 'none';
      });
    });

    const tyEl = document.getElementById('target-years-slider');
    if (tyEl) tyEl.addEventListener('input', () => {
      document.getElementById('target-years-display').textContent = tyEl.value;
      answers.target_years = parseInt(tyEl.value);
    });

    showStep(0);
  });

  // ════════════════════════════════════════════════════════════════
  // GLOBAL EXPORTS — needed for inline onclick handlers in HTML
  // ════════════════════════════════════════════════════════════════
  window.nextStep       = nextStep;
  window.prevStep       = prevStep;
  window.submitForm     = submitForm;
  window.selOpt         = selOpt;
  window.togMulti       = togMulti;
  window.updateKidsAges = updateKidsAges;
  window.toggleDeductibleAmount = toggleDeductibleAmount;
  window.resetForm      = resetForm;
  window.openRatingModal  = openRatingModal;
  window.closeRatingModal = closeRatingModal;
  window.submitRating     = submitRating;

})();
