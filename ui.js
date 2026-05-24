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
    phone:   '6989118348',
  };

  // ════════════════════════════════════════════════════════════════
  // DISPLAY MAPS
  // ════════════════════════════════════════════════════════════════
  const CAT_LABELS = {
    health:            '🏥 Υγεία',
    primaryCare:       '🩺 Εξωνοσ.',
    criticalIllness:   '⚕️ Κρίσιμες',
    hospitalAllowance: '🏨 Επίδομα',
    life:              '💛 Ζωή',
    savings:           '💰 Αποταμίευση',
  };

  // ════════════════════════════════════════════════════════════════
  // HOSPITAL NETWORK (display only)
  // ════════════════════════════════════════════════════════════════
  const HOSPITAL_NETWORK = {
    premium: {
      label: 'Ειδικά Συμβεβλημένα',
      perk:  'Απορρόφηση συμμετοχής 15–20% (έως €1.500) σε συνδυασμό με δημόσιο φορέα',
      athens: [
        'ΥΓΕΙΑ', 'ΕΡΡΙΚΟΣ ΝΤΥΝΑΝ',
        'METROPOLITAN', 'METROPOLITAN General',
        'ΙΑΤΡΙΚΟ Κέντρο Αθηνών', 'ΙΑΤΡΙΚΟ Ψυχικού',
        'ΙΑΤΡΙΚΟ Κέντρο Π. Φαλήρου', 'ΙΑΤΡΙΚΟ Περιστερίου',
        'ΕΥΡΩΚΛΙΝΙΚΗ Αθηνών', 'ΕΥΡΩΚΛΙΝΙΚΗ Παίδων',
        'MEDITERRANEO',
      ],
      thessaloniki: [
        'ΙΑΤΡΙΚΟ ΔΙΑΒΑΛΚΑΝΙΚΟ', 'ΑΓΙΟΣ ΛΟΥΚΑΣ',
        'ΓΕΝΕΣΙΣ', 'ΓΕΝΙΚΗ ΚΛΙΝΙΚΗ Θεσσαλονίκης', 'ΚΥΑΝΟΥΣ ΣΤΑΥΡΟΣ',
      ],
      other: [
        'Γεν. Κλινική Ζωοδόχος Πηγή (Κοζάνη)', 'Γεν. Κλινική Ρόδου',
      ],
    },
    partner: {
      label: 'Συμβεβλημένα',
      athens: [
        'ΑΘΗΝΑΪΚΗ Κλινική', 'ΒΙΟΚΛΙΝΙΚΗ Αθηνών',
        'ΙΑΣΩ Μαιευτική', 'ΙΑΣΩ Παίδων',
        'ΙΑΤΡΟΠΟΛΙΣ Χαλανδρίου', 'ΚΕΝΤΡΙΚΗ Κλινική',
        'Λευκός Σταυρός', 'ΟΦΘΑΛΜΟΛΟΓΙΚΟ Αθηνών',
        'ΠΕΙΡΑΪΚΟ Θεραπευτήριο', 'ΕΥΓΕΝΙΔΙΟ Θεραπευτήριο',
        'ΡΕΑ Μαιευτική', 'ΩΝΑΣΕΙΟ',
        'ATHENS EYE Hospital', 'ATHENS VISION',
        'Doctors\' Hospital', 'EYE DAY Clinic',
        'LASER VISION', 'Therapis General',
      ],
      thessaloniki: ['ΒΙΟΚΛΙΝΙΚΗ Θεσσαλονίκης', 'OPHTHALMICA'],
      crete: ['Creta Interclinic', 'Creta Interclinic Μητέρα Κρήτης', 'IASIS Χανίων'],
      patras: ['ΟΛΥΜΠΙΟΝ Πατρών'],
      larisa: ['Θεσσαλία Γενική Κλινική', 'ΙΑΣΩ Θεσσαλίας'],
      volos:  ['ΑΝΑΣΣΑ Γενική Κλινική', 'ΕΛΠΙΣ Γενική Κλινική'],
    },
    perks: [
      { icon:'🚨', title:'Επείγοντα Περιστατικά',
        desc:'Δωρεάν εξετάσεις €200-€600/περιστατικό + επισκέψεις παθολόγου/καρδιολόγου/χειρουργού/ορθοπεδικού στα €10' },
      { icon:'🚑', title:'Δωρεάν Ασθενοφόρο',
        desc:'Μεταφορά εντός Αττικής/Θεσσαλονίκης 24/7 σε περίπτωση εισαγωγής' },
      { icon:'🩺', title:'Τακτικά Εξωτερικά Ιατρεία',
        desc:'Δωρεάν ή €20 προγραμματισμένες επισκέψεις σε όλες τις βασικές ειδικότητες' },
      { icon:'🔬', title:'Διαγνωστικές Εξετάσεις',
        desc:'Τιμές ΦΕΚ/ΕΟΠΥΥ ή έκπτωση έως 60% στον ιδιωτικό τιμοκατάλογο' },
      { icon:'✅', title:'Ετήσιο Check-up €10',
        desc:'12 βασικές εξετάσεις (Γενική, σάκχαρο, χολ., ηπατικά, TSH, ούρων)' },
      { icon:'👨‍👩‍👧', title:'Προνόμια Οικογένειας',
        desc:'20% έκπτωση νοσηλείας + €20 επισκέψεις για σύζυγο/τέκνα/γονείς' },
      { icon:'🤰', title:'Μαιευτική Φροντίδα',
        desc:'ΜΗΤΕΡΑ: Τοκετός + 3ήμερη νοσηλεία από €2.100 με πλήρη προγεννητικό' },
      { icon:'📞', title:'Συντονιστικό 24/7',
        desc:'210 9506000 — ιατρικές συμβουλές, ραντεβού, διακομιδές' },
    ],
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
      widowed:       'single',
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

  function revealContact(type, card) {
    const reveal = document.getElementById('reveal-' + type);
    if (!reveal) return;
    const isRevealed = reveal.style.display === 'block';
    reveal.style.display = isRevealed ? 'none' : 'block';
    card.classList.toggle('revealed', !isRevealed);
    if (!isRevealed) {
      const link = reveal.querySelector('a');
      if (link && window.innerWidth <= 600) setTimeout(() => link.click(), 300);
    }
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
      return;
    }

    const optSelfChildren = document.getElementById('opt-scope-self-children');
    const optFamily       = document.getElementById('opt-scope-family');
    if (optSelfChildren) optSelfChildren.style.display = hasKids ? '' : 'none';
    if (optFamily)       optFamily.style.display       = hasSpouse ? '' : 'none';

    // Clear selection if no longer valid
    const cur = answers.coverage_scope;
    if ((cur === 'self_children' && !hasKids) || (cur === 'family' && !hasSpouse)) {
      answers.coverage_scope = '';
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
    answers.age           = parseInt(document.getElementById('age-slider').value) || 35;
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
      if (!a.marital_status) return ['Επιλέξτε οικογενειακή κατάσταση'];
      if (a.marital_status === 'married') {
        const sa = document.getElementById('spouse-age')?.value;
        if (!sa || parseInt(sa) < 18) return ['Εισάγετε έγκυρη ηλικία συζύγου'];
      }
      if (a.children === undefined) return ['Επιλέξτε αριθμό παιδιών'];
      if (a.children && a.children !== '0') {
        const filled = Array.from(document.querySelectorAll('.kid-age'))
          .every(inp => inp.value && parseInt(inp.value) >= 0);
        if (!filled) return ['Συμπληρώστε τις ηλικίες όλων των παιδιών'];
      }
      if (!a.occupation) return ['Επιλέξτε επάγγελμα'];
      return [];
    }
    if (step === 2) {
      if (!a.fund_satisfaction)  return ['Αξιολογήστε την ικανοποίησή σας από το ταμείο'];
      if (!a.hospital_mild)      return ['Επιλέξτε νοσοκομείο για ήπιο θέμα υγείας'];
      if (!a.hospital_severe)    return ['Επιλέξτε νοσοκομείο για σοβαρό θέμα υγείας'];
      if (!a.deductible_type)    return ['Επιλέξτε τύπο εκπιπτόμενου'];
      if ((a.deductible_type === 'annual' || a.deductible_type === 'per_incident') && !a.deductible_amount) {
        return ['Επιλέξτε το ύψος του εκπιπτόμενου ποσού'];
      }
      const scopeBlock = document.getElementById('coverage-scope-block');
      if (scopeBlock && scopeBlock.style.display !== 'none' && !a.coverage_scope) {
        return ['Επιλέξτε ποια μέλη θέλετε να συμπεριλάβετε στην πρόταση'];
      }
      if (!a.ci_pref)            return ['Επιλέξτε προτίμηση για Κρίσιμες Ασθένειες'];
      if (!a.hospital_allowance) return ['Επιλέξτε αν επιθυμείτε ημερήσιο επίδομα νοσηλείας'];
      return [];
    }
    if (step === 3) {
      if (!a.income_concern) return ['Απαντήστε στην ερώτηση εισοδήματος'];
      if (!a.life_capital)   return ['Επιλέξτε επιθυμητό κεφάλαιο ζωής'];
      return [];
    }
    if (step === 4) {
      if (!a.pension_estimate) return ['Εκτιμήστε την κρατική σύνταξή σας'];
      if (!a.savings_plan)     return ['Επιλέξτε σχέδιο αποταμίευσης'];
      if (!a.target_amount)    return ['Επιλέξτε στόχο αποταμίευσης (ή «δεν με ενδιαφέρει»)'];
      return [];
    }
    if (step === 5) {
      const name  = document.getElementById('client-name')?.value?.trim();
      const email = document.getElementById('client-email')?.value?.trim();
      const phone = document.getElementById('client-phone')?.value?.trim();
      if (!name)                           return ['Εισάγετε το ονοματεπώνυμό σας'];
      if (!email || !email.includes('@'))  return ['Εισάγετε έγκυρη διεύθυνση email'];
      if (phone && phone.length < 10)      return ['Αν θέλετε να δηλώσετε τηλέφωνο, εισάγετε τουλάχιστον 10 ψηφία (ή αφήστε το κενό)'];
      return [];
    }
    return [];
  }

  // ════════════════════════════════════════════════════════════════
  // SAVINGS SCENARIOS (αποταμίευση — ανεξάρτητο από engine)
  // Πηγή αποδόσεων: NN-E-422/07.2025
  // ════════════════════════════════════════════════════════════════
  function calcSavingsScenarios(targetAmount, years) {
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
    return returns.map(s => {
      const r = s.annual / 12;
      const pmt = targetAmount * r / (Math.pow(1 + r, months) - 1);
      return { ...s, monthlyRequired: Math.round(pmt), annualRequired: Math.round(pmt * 12) };
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
    if (scores.health >= 30) parts.push(
      'Επιπλέον, αποκτάτε πρόσβαση σε <strong>45+ συμβεβλημένα νοσοκομεία</strong> πανελλαδικά (Metropolitan, Υγεία, Ερρίκος Ντυνάν, Ιατρικό, Ευρωκλινική, Mediterraneo κ.ά.) με δωρεάν επείγοντα, εξετάσεις έως €600 και απορρόφηση συμμετοχής έως 20% στα Ειδικά Συμβεβλημένα.'
    );
    return parts.join(' ');
  }

  // ════════════════════════════════════════════════════════════════
  // HOSPITAL NETWORK HTML
  // ════════════════════════════════════════════════════════════════
  function buildNetworkHTML() {
    const N = HOSPITAL_NETWORK;
    const perksHTML = N.perks.map(p =>
      `<div class="net-perk"><span class="ic">${p.icon}</span><span class="tx"><b>${p.title}</b>${p.desc}</span></div>`
    ).join('');
    const chips = arr => arr.map(h => `<span class="net-hosp">${h}</span>`).join('');
    const premHTML = `
      <div class="net-tier premium">
        <div class="net-tier-head"><h5>🏆 ${N.premium.label}</h5><span class="badge">${N.premium.perk}</span></div>
        <div class="net-tier-region">Αθήνα</div><div class="net-hospitals">${chips(N.premium.athens)}</div>
        <div class="net-tier-region">Θεσσαλονίκη</div><div class="net-hospitals">${chips(N.premium.thessaloniki)}</div>
        <div class="net-tier-region">Περιφέρεια</div><div class="net-hospitals">${chips(N.premium.other)}</div>
      </div>`;
    const p = N.partner;
    const partHTML = `
      <div class="net-tier partner">
        <div class="net-tier-head"><h5>🏥 ${p.label}</h5><span class="badge">Πανελλαδική κάλυψη</span></div>
        <div class="net-tier-region">Αθήνα</div><div class="net-hospitals">${chips(p.athens)}</div>
        <div class="net-tier-region">Θεσσαλονίκη</div><div class="net-hospitals">${chips(p.thessaloniki)}</div>
        <div class="net-tier-region">Κρήτη · Πάτρα · Λάρισα · Βόλος</div>
        <div class="net-hospitals">${chips([...p.crete, ...p.patras, ...p.larisa, ...p.volos])}</div>
      </div>`;
    return `
      <div class="network-section">
        <div class="net-title">🏥 Δίκτυο Συμβεβλημένων Νοσοκομείων NN Hellas</div>
        <div class="net-sub">45+ ιδιωτικά νοσοκομεία πανελλαδικά με δωρεάν παροχές για ασφαλισμένους</div>
        <div class="net-perks">${perksHTML}</div>
        ${premHTML}${partHTML}
        <p style="margin-top:10px;font-size:11px;color:var(--text-muted);font-style:italic">
          📞 Πριν από νοσηλεία ενημερώστε την NN Hellas στο 210 950 6000. Λίστα στο nnhellas.gr.
        </p>
      </div>`;
  }

  // ════════════════════════════════════════════════════════════════
  // RANKED NEEDS — επιστρέφει τις 3 κατηγορίες ταξινομημένες κατά score ↓
  // ════════════════════════════════════════════════════════════════
  function rankNeeds(h, l, r) {
    const cats = [
      { key:'health',     name:'Ασφάλεια Υγείας',      short:'Υγεία',   score:h, color:'#F47920' },
      { key:'life',       name:'Ασφάλεια Ζωής',        short:'Ζωή',     score:l, color:'#C9A84C' },
      { key:'retirement', name:'Συνταξιοδοτικό Πλάνο', short:'Σύνταξη', score:r, color:'#4a9eda' },
    ];
    return cats.sort((a, b) => b.score - a.score);
  }

  // ════════════════════════════════════════════════════════════════
  // PODIUM HTML — βάθρο νικητών (1η/2η/3η θέση) χωρίς αριθμούς/ποσοστά
  // Χρησιμοποιείται και στη σελίδα αποτελεσμάτων και στο email πελάτη
  // ════════════════════════════════════════════════════════════════
  function buildPodiumHTML(h, l, r) {
    const ranked = rankNeeds(h, l, r);
    // Διάταξη βάθρου: 2η αριστερά, 1η μέση, 3η δεξιά
    const layout = [
      { rank: 2, height: 110, color: '#9aa5b1', medal: '🥈' },
      { rank: 1, height: 150, color: '#F47920', medal: '🥇' },
      { rank: 3, height: 80,  color: '#b08758', medal: '🥉' },
    ];
    const pillars = layout.map(pos => {
      const cat = ranked[pos.rank - 1];
      return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:0">
          <div style="font-size:28px;margin-bottom:4px">${pos.medal}</div>
          <div style="font-size:13px;font-weight:700;color:#1a2238;margin-bottom:4px;text-align:center;line-height:1.2">${cat.short}</div>
          <div style="width:90%;max-width:120px;height:${pos.height}px;background:linear-gradient(180deg,${pos.color},${pos.color}cc);border-radius:8px 8px 0 0;display:flex;align-items:flex-start;justify-content:center;padding-top:8px;color:#fff;font-weight:800;font-size:18px">${pos.rank}η</div>
        </div>`;
    }).join('');
    return `
      <div class="podium-section" style="background:#f8f9fc;border-radius:12px;padding:24px 20px;margin:24px 0;border:1px solid #e0e6ed">
        <h3 style="text-align:center;margin:0 0 8px;font-size:16px;color:#1a2238;font-weight:700">Ιεράρχηση Ασφαλιστικών Αναγκών σας</h3>
        <p style="text-align:center;margin:0 0 18px;font-size:12px;color:#666">με βάση τις απαντήσεις σας</p>
        <div style="display:flex;align-items:flex-end;justify-content:center;gap:8px;max-width:420px;margin:0 auto;border-bottom:2px solid #cbd2da;padding-bottom:0">
          ${pillars}
        </div>
      </div>`;
  }

  // ════════════════════════════════════════════════════════════════
  // NEEDS HIERARCHY TEXT — ενιαίο κείμενο παραγράφου για το email πελάτη
  // ════════════════════════════════════════════════════════════════
  function buildNeedsHierarchyText(h, l, r) {
    const ranked = rankNeeds(h, l, r);
    const topScore = ranked[0].score;

    // Αν όλες είναι πολύ χαμηλές, μήνυμα ηρεμίας
    if (topScore < 45) {
      return 'Με βάση τις απαντήσεις σας, δεν εντοπίστηκε άμεση ανάγκη ασφαλιστικής κάλυψης. ' +
             'Παρόλα αυτά, ο σύμβουλός σας μπορεί να σας βοηθήσει να αξιολογήσετε μελλοντικές ανάγκες ' +
             'που μπορεί να προκύψουν με αλλαγές στην οικογενειακή ή επαγγελματική σας κατάσταση.';
    }

    // Δομή: εισαγωγή + 1η/2η/3η ανάγκη με ροή
    const intro = 'Από την ανάλυση των απαντήσεών σας, οι ασφαλιστικές σας ανάγκες ιεραρχούνται ως εξής:';

    const describe = (cat, pos) => {
      const level = cat.score >= 65 ? 'υψηλή' : cat.score >= 45 ? 'σημαντική' : 'βασική';
      const prefix = pos === 1 ? 'Πρωταρχικά' : pos === 2 ? 'Παράλληλα' : 'Επιπρόσθετα';
      switch (cat.key) {
        case 'health':
          return `${prefix}, η ${cat.name} αναδεικνύεται ως ${level} προτεραιότητα — η προστασία απέναντι σε νοσηλεία, χειρουργείο και ιατρικές δαπάνες αποτελεί θεμέλιο της οικογενειακής σας ασφάλειας.`;
        case 'life':
          return `${prefix}, η ${cat.name} αποτελεί ${level} ανάγκη — η οικονομική προστασία της οικογένειάς σας σε περίπτωση απρόοπτου εξασφαλίζει τη συνέχιση του τρόπου ζωής τους.`;
        case 'retirement':
          return `${prefix}, το ${cat.name} εμφανίζεται ως ${level} προτεραιότητα — η ιδιωτική αποταμίευση είναι σήμερα αναγκαία για να διασφαλίσετε αξιοπρεπή σύνταξη και ανεξαρτησία στο μέλλον.`;
      }
    };

    const sentences = [intro];
    ranked.forEach((cat, i) => {
      if (cat.score >= 45 || i === 0) sentences.push(describe(cat, i + 1));
    });
    sentences.push('Ο σύμβουλός σας θα σας προτείνει εξατομικευμένες λύσεις με βάση αυτή την ιεράρχηση και τον προϋπολογισμό σας.');
    return sentences.join(' ');
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
  // RESULTS RENDERING
  // ════════════════════════════════════════════════════════════════
  function renderResults() {
    const s6 = document.getElementById('s6');
    if (!window.NN_ENGINE) {
      s6.innerHTML = '<div class="error-msg" style="display:block;margin-top:32px">⚠️ Σφάλμα φόρτωσης μηχανής. Ανανεώστε τη σελίδα.</div>';
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

    // ── Proposal card lines ──────────────────────────────────────
    const linesHTML = proposal.lines.map(line => {
      const catLabel = CAT_LABELS[line.category] || line.category;
      const monthly  = Math.round(line.price.monthly);
      const capStr   = line.capital
        ? `<span style="color:var(--text-muted);font-weight:400;font-size:11px"> · Κεφ. €${Math.round(line.capital / 1000)}k</span>`
        : '';
      // Family member indicator (Εσείς / Σύζυγος / Παιδί N)
      const memberStr = (line.memberType && line.memberType !== 'client')
        ? `<span style="color:var(--primary);font-weight:600;font-size:11px"> · ${line.memberLabel}${line.memberAge ? ' (' + line.memberAge + ' ετών)' : ''}</span>`
        : '';
      // Discount badge
      const discStr = (line.price.discountPct && line.price.discountPct > 0)
        ? `<span style="color:#4caf50;font-weight:600;font-size:11px"> · -${Math.round(line.price.discountPct * 100)}%</span>`
        : '';
      return `
        <div class="prod-row">
          <span class="prod-cat">${catLabel}</span>
          <span class="prod-name">${line.label}${capStr}${memberStr}${discStr}</span>
          <span class="prod-price">€${monthly}/μήνα</span>
        </div>`;
    }).join('');

    const emptyCard = `
      <div class="prod-row">
        <span style="color:var(--text-muted);font-size:13px;padding:4px 0">
          Βάσει των απαντήσεών σας δεν προκύπτει τρέχουσα ανάγκη ασφαλιστικής κάλυψης.
          Επικοινωνήστε με τον σύμβουλό σας για αξιολόγηση.
        </span>
      </div>`;

    // Notes from engine
    const savingsNote   = proposal.notes.find(n => n.category === 'savings');
    const budgetWarning = proposal.warnings.find(w => w.type === 'budgetExceeded');

    const scenHTML = `
      <div class="scenario-card rec">
        <div class="rec-badge">✦ Εξατομικευμένη Πρόταση</div>
        <div class="scen-header" style="margin-top:8px">
          <div class="scen-letter">Α</div>
          <div>
            <div class="scen-title">Προτεινόμενη Κάλυψη</div>
            <div class="scen-sub">Βέλτιστη ισορροπία κάλυψης &amp; κόστους</div>
          </div>
        </div>
        <div class="products">
          ${proposal.lines.length > 0 ? linesHTML : emptyCard}
        </div>
        ${proposal.lines.length > 0 ? `
        <div class="scen-total">
          <div class="total-annual">€${totalAnnual.toLocaleString('el-GR')}/έτος</div>
          <div class="total-monthly">€${totalMonthly}<span>/μήνα</span></div>
        </div>` : ''}
        ${savingsNote   ? `<div class="ret-note">📌 ${savingsNote.message}</div>` : ''}
        ${budgetWarning ? `<div class="ret-note" style="border-left-color:var(--danger);color:var(--danger)">${budgetWarning.message}</div>` : ''}
      </div>`;

    // ── Savings section (αν δήλωσε στόχο) ───────────────────────
    const targetAmt = (a.target_amount && a.target_amount !== 'none') ? parseInt(a.target_amount) : 0;
    const targetYrs = parseInt(a.target_years) || 15;
    const savScenarios = calcSavingsScenarios(targetAmt, targetYrs);
    const savingsHTML = savScenarios ? `
      <div class="savings-section">
        <div class="savings-title">🎯 Σενάρια Αποταμίευσης</div>
        <div class="savings-sub">Μηνιαία συνεισφορά για να συγκεντρώσετε τον στόχο σας, με βάση 3 διαφορετικές επενδυτικές στρατηγικές.</div>
        <div class="savings-target">
          Θέλετε να συγκεντρώσετε <strong>€${targetAmt.toLocaleString('el-GR')}</strong> σε <strong>${targetYrs} χρόνια</strong>
        </div>
        <div class="savings-grid">
          ${savScenarios.map(s => `
            <div class="savings-card" style="--scen-color:${s.color}">
              <div class="savings-label">${s.label}</div>
              <div class="savings-pmt">€${s.monthlyRequired.toLocaleString('el-GR')}<span>/μήνα</span></div>
              <div class="savings-rate">απόδοση ${(s.annual * 100).toFixed(2)}% ετησίως</div>
              <div class="savings-desc">${s.desc}</div>
            </div>`).join('')}
        </div>
      </div>` : '';

    // ── Network ──────────────────────────────────────────────────
    const hasHealth = proposal.lines.some(l => l.category === 'health' || l.category === 'primaryCare');
    const networkHTML = hasHealth ? buildNetworkHTML() : '';

    // ── Build proposalText for email/sheets ──────────────────────
    const familyNote = proposal.notes.find(n => n.category === 'familyDiscount');
    const proposalText =
      proposal.lines.map(l => {
        const member = (l.memberType && l.memberType !== 'client') ? ` [${l.memberLabel}]` : '';
        const disc   = (l.price.discountPct && l.price.discountPct > 0)
          ? ` (-${Math.round(l.price.discountPct * 100)}%)` : '';
        return `• ${l.label}${l.capital ? ' ' + Math.round(l.capital / 1000) + 'k' : ''}${member}${disc}: €${l.price.annual}/έτος`;
      }).join('\n') +
      `\nΣύνολο: €${totalAnnual}/έτος (€${totalMonthly}/μήνα)` +
      (familyNote   ? '\n👨‍👩‍👧 ' + familyNote.message : '') +
      (savingsNote   ? '\n📌 ' + savingsNote.message : '') +
      (budgetWarning ? '\n⚠️ ' + budgetWarning.message : '');

    // ── Render ───────────────────────────────────────────────────
    s6.innerHTML = `
      <div class="step-label">Τα Αποτελέσματά σας</div>
      <h2 class="screen-title">Η Ανάλυσή σας${a.client_name ? ', ' + a.client_name.split(' ')[0] : ''}</h2>
      <p class="screen-sub">Βάσει των απαντήσεών σας δημιουργήθηκε εξατομικευμένη πρόταση κάλυψης.</p>

      ${buildPodiumHTML(h, l, r)}

      <div class="section-label">Προτεινόμενη Κάλυψη</div>
      <div class="scenarios">${scenHTML}</div>

      ${savingsHTML}
      ${networkHTML}

      <div class="contact-cta-section">
        <div class="contact-cta-title">📞 Επικοινωνήστε με τον Σύμβουλό σας</div>
        <div class="contact-cta-row">
          <div class="contact-card" onclick="revealContact('phone',this)">
            <div class="contact-card-icon">📱</div>
            <div class="contact-card-label">Τηλεφωνική Επικοινωνία</div>
            <div class="contact-reveal" id="reveal-phone"><a href="tel:${BRAND.phone}">${BRAND.phone}</a></div>
            <div class="contact-card-hint">Πατήστε για τον αριθμό</div>
          </div>
          <div class="contact-card" onclick="revealContact('email',this)">
            <div class="contact-card-icon">✉️</div>
            <div class="contact-card-label">Email</div>
            <div class="contact-reveal" id="reveal-email"><a href="mailto:${BRAND.email}">${BRAND.email}</a></div>
            <div class="contact-card-hint">Πατήστε για το email</div>
          </div>
        </div>
        <p style="text-align:center;margin-top:14px;font-size:11px;color:var(--text-muted)">${BRAND.advisor} — ${BRAND.name}</p>
      </div>

      <div id="email-status" class="email-status">📧 Αποστολή email…</div>

      <div class="indicative-banner">
        📌 <strong>Σημαντικό:</strong> Η παραπάνω πρόταση είναι <strong>ενδεικτική</strong> και βασίζεται στις απαντήσεις που δώσατε.<br/>
        Για την <strong>πραγματική προσφορά</strong> προσαρμοσμένη στις λεπτομέρειες σας, παρακαλώ επικοινωνήστε με τον σύμβουλό σας.
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
        <button class="btn btn-ghost" onclick="resetForm()">🔄 Νέα Αξιολόγηση</button>
        <button class="btn btn-accent" onclick="window.print()">🖨️ Εκτύπωση</button>
      </div>
      <p style="text-align:center;margin-top:16px;font-size:11px;color:var(--text-muted);line-height:1.6">
        Τα ασφάλιστρα είναι ενδεικτικά (Class B) και ενδέχεται να διαφέρουν στην πραγματική προσφορά ανάλογα με υγεία, επάγγελμα και άλλους παράγοντες αξιολόγησης.
      </p>`;

    // Integrations
    const resultData = {
      ...a,
      health_score:  h, life_score: l, retirement_score: r,
      urgency:       urg, proposal_text: proposalText,
      needs_hierarchy:       buildNeedsHierarchyText(h, l, r),
      needs_hierarchy_short: buildNeedsHierarchyShort(h, l, r),
      podium_html:           buildPodiumHTML(h, l, r),
      advisor_name:  BRAND.advisor,
      advisor_email: BRAND.email,
      advisor_phone: BRAND.phone,
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
    document.getElementById('age-slider').value = 35;
    document.getElementById('age-display').textContent = '35';
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
    const ageSlider = document.getElementById('age-slider');
    ageSlider.addEventListener('input', () => {
      document.getElementById('age-display').textContent = ageSlider.value;
      answers.age = parseInt(ageSlider.value);
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

    document.querySelectorAll('input[name="target_amount"]').forEach(r => {
      r.addEventListener('change', () => {
        document.getElementById('target-years-section').style.display =
          r.value !== 'none' ? 'block' : 'none';
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
  window.revealContact  = revealContact;
  window.selOpt         = selOpt;
  window.togMulti       = togMulti;
  window.updateKidsAges = updateKidsAges;
  window.toggleDeductibleAmount = toggleDeductibleAmount;
  window.resetForm      = resetForm;
  window.openRatingModal  = openRatingModal;
  window.closeRatingModal = closeRatingModal;
  window.submitRating     = submitRating;

})();
