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
  };

  // ════════════════════════════════════════════════════════════════
  // HOSPITAL NETWORK (display only)
  // ════════════════════════════════════════════════════════════════
  const HOSPITAL_NETWORK = {
    premium: {
      label: 'Ειδικά Συμβεβλημένα',
      perk:  'Απορρόφηση συμμετοχής 15-20% (έως €1.500) με ΕΟΠΥΥ',
      athens: [
        'ΥΓΕΙΑ', 'ΜΗΤΕΡΑ', 'ΕΡΡΙΚΟΣ ΝΤΥΝΑΝ',
        'METROPOLITAN Hospital', 'METROPOLITAN General',
        'ΙΑΤΡΙΚΟ Αθηνών', 'ΙΑΤΡΙΚΟ Ψυχικού', 'ΙΑΤΡΙΚΟ Π. Φαλήρου', 'ΙΑΤΡΙΚΟ Περιστερίου',
        'ΕΥΡΩΚΛΙΝΙΚΗ Αθηνών', 'ΕΥΡΩΚΛΙΝΙΚΗ Παίδων',
        'MEDITERRANEO',
      ],
      thessaloniki: [
        'ΙΑΤΡΙΚΟ ΔΙΑΒΑΛΚΑΝΙΚΟ', 'ΑΓΙΟΣ ΛΟΥΚΑΣ',
        'ΓΕΝΕΣΙΣ', 'ΓΕΝΙΚΗ ΚΛΙΝΙΚΗ Θεσσαλονίκης', 'ΚΥΑΝΟΥΣ ΣΤΑΥΡΟΣ',
      ],
      other: [
        'Γενική Κλινική Κοζάνης', 'Γενική Κλινική Ρόδου',
      ],
    },
    partner: {
      label: 'Συμβεβλημένα',
      athens: [
        'ΑΘΗΝΑΪΚΗ Κλινική', 'ΒΙΟΚΛΙΝΙΚΗ Αθηνών', 'ΚΕΝΤΡΙΚΗ Κλινική',
        'ΙΑΣΩ Μαιευτική', 'ΙΑΣΩ Παίδων', 'ΡΕΑ Μαιευτική',
        'Doctors\' Hospital', 'Therapis General', 'ΩΝΑΣΕΙΟ',
        'ΙΑΤΡΟΠΟΛΙΣ Χαλανδρίου', 'ΠΕΙΡΑΪΚΟ Θεραπευτήριο',
      ],
      thessaloniki: ['ΒΙΟΚΛΙΝΙΚΗ Θεσσαλονίκης', 'OPHTHALMICA'],
      crete: ['Creta Interclinic', 'Μητέρα Κρήτης', 'IASIS Χανίων'],
      patras: ['ΟΛΥΜΠΙΟΝ Πατρών'],
      larisa: ['ΙΑΣΩ Θεσσαλίας', 'Θεσσαλία Γενική Κλινική'],
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
  let chartInst = null;
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
      criticalIllnessPref: a.ci_pref                      || 'none',
      hospitalAllowancePref: a.hospital_allowance         || 'no',
      incomeConcern:       a.income_concern               || 'no',
      uncoveredNeeds:      a.uncovered_needs              || [],
      lifeCapital:         a.life_capital                 || '50k',
      pensionEstimate:     a.pension_estimate             || 'small',
      savingsPlan:         savingsPlanMap[a.savings_plan] || 'no',
      monthlyBudget:       Number(a.monthly_budget)       || 100,
    };
  }

  // ════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ════════════════════════════════════════════════════════════════
  function showStep(n) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('s' + n).classList.add('active');
    currentStep = n;
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
     'deductible_type','income_concern','life_capital','pension_estimate',
     'savings_plan','occupation','children','ci_pref','hospital_allowance','target_amount'
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
        desc:'Conservative Multifund · Χαμηλότερο ρίσκο, μεγαλύτερη σταθερότητα' },
      { label:'Ισορροπημένο', annual:0.0640, color:'#C9A84C',
        desc:'Balanced Multifund · Ισορροπία ασφάλειας & απόδοσης' },
      { label:'Δυναμικό',     annual:0.1020, color:'#F47920',
        desc:'Appreciation Multifund · Υψηλότερο ρίσκο, μεγαλύτερη δυνητική απόδοση' },
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
      'Επιπλέον, αποκτάτε πρόσβαση σε <strong>30+ συμβεβλημένα νοσοκομεία</strong> πανελλαδικά (Metropolitan, Υγεία, Ερρίκος Ντυνάν, Ιατρικό, Ευρωκλινική, Mediterraneo κ.ά.) με δωρεάν επείγοντα, εξετάσεις έως €600 και απορρόφηση συμμετοχής έως 20% στα Ειδικά Συμβεβλημένα.'
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
        <div class="net-sub">30+ ιδιωτικά νοσοκομεία πανελλαδικά με δωρεάν παροχές για ασφαλισμένους</div>
        <div class="net-perks">${perksHTML}</div>
        ${premHTML}${partHTML}
        <p style="margin-top:10px;font-size:11px;color:var(--text-muted);font-style:italic">
          📞 Πριν από νοσηλεία ενημερώστε την NN Hellas στο 210 950 6000. Λίστα στο nnhellas.gr.
        </p>
      </div>`;
  }

  // ════════════════════════════════════════════════════════════════
  // NEEDS HIERARCHY TEXT — για email πελάτη
  // ════════════════════════════════════════════════════════════════
  // Κατωφλία: > 65 = Υψηλή Ανάγκη, >= 45 = Απλή Ανάγκη
  // Σειρά: Υψηλές (κατά score ↓), μετά Απλές (κατά score ↓)
  function buildNeedsHierarchyText(h, l, r) {
    const cats = [
      { name: 'Ασφάλεια Υγείας',      score: h },
      { name: 'Ασφάλεια Ζωής',        score: l },
      { name: 'Συνταξιοδοτικό Πλάνο', score: r },
    ];
    const high  = cats.filter(c => c.score > 65).sort((a, b) => b.score - a.score);
    const basic = cats.filter(c => c.score >= 45 && c.score <= 65).sort((a, b) => b.score - a.score);

    if (high.length === 0 && basic.length === 0) {
      return 'Βάσει των απαντήσεών σας δεν εντοπίστηκε άμεση ανάγκη ασφαλιστικής κάλυψης. ' +
             'Ο σύμβουλός σας μπορεί να σας βοηθήσει να αξιολογήσετε μελλοντικές ανάγκες.';
    }

    const parts = [];
    high.forEach((c, i)  => parts.push(`${i + 1}. ${c.name} — Υψηλή Ανάγκη`));
    basic.forEach((c, i) => parts.push(`${high.length + i + 1}. ${c.name} — Απλή Ανάγκη (εφόσον το budget το επιτρέπει)`));

    return 'Με βάση τις απαντήσεις σας, η ιεράρχηση των ασφαλιστικών σας αναγκών είναι:\n' + parts.join('\n');
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
    const urgIcon = { ΚΡΙΣΙΜΗ:'🔴', ΥΨΗΛΗ:'🟠', ΜΕΤΡΙΑ:'🟡', ΧΑΜΗΛΗ:'🟢' }[urg];

    const scoreTot = (h + l + r) || 1;
    const hP = h / scoreTot * 100;
    const lP = l / scoreTot * 100;
    const rP = r / scoreTot * 100;

    const totalMonthly = Math.ceil(proposal.totals.monthly);
    const totalAnnual  = proposal.totals.annual;

    // ── Proposal card lines ──────────────────────────────────────
    const linesHTML = proposal.lines.map(line => {
      const catLabel = CAT_LABELS[line.category] || line.category;
      const monthly  = Math.round(line.price.monthly);
      const capStr   = line.capital
        ? `<span style="color:var(--text-muted);font-weight:400;font-size:11px"> · Κεφ. €${Math.round(line.capital / 1000)}k</span>`
        : '';
      return `
        <div class="prod-row">
          <span class="prod-cat">${catLabel}</span>
          <span class="prod-name">${line.label}${capStr}</span>
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
        <div class="savings-title">🎯 Στόχος Αποταμίευσης — Επίσημα Σενάρια NN Accelerator+</div>
        <div class="savings-sub">Μηνιαία συνεισφορά για να συγκεντρώσετε τον στόχο σας, με βάση τα 3 επίσημα επενδυτικά σενάρια της NN Hellas (μετά τα έξοδα διαχείρισης).</div>
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
        <p style="margin-top:14px;font-size:11px;color:var(--text-muted);text-align:center;line-height:1.6">
          💡 <strong>Επίσημα δεδομένα NN Hellas</strong> (έντυπο NN-E-422/07.2025) με βάση τις 3 επενδυτικές στρατηγικές Multifund. Ελάχιστη ετήσια συνεισφορά €1.000–€5.000. Οι παρελθούσες αποδόσεις δεν εγγυώνται μελλοντικές.
        </p>
      </div>` : '';

    // ── Network ──────────────────────────────────────────────────
    const hasHealth = proposal.lines.some(l => l.category === 'health' || l.category === 'primaryCare');
    const networkHTML = hasHealth ? buildNetworkHTML() : '';

    // ── Score descriptions ───────────────────────────────────────
    const scoreDesc = v => v >= 70 ? 'Υψηλή Ανάγκη' : v >= 40 ? 'Μέτρια Ανάγκη' : 'Χαμηλή Ανάγκη';

    const benefitsText = generateBenefitsText(a, scores, proposal.lines, totalMonthly);

    // ── Build proposalText for email/sheets ──────────────────────
    const proposalText =
      proposal.lines.map(l =>
        `• ${l.label}${l.capital ? ' ' + Math.round(l.capital / 1000) + 'k' : ''}: €${l.price.annual}/έτος`
      ).join('\n') +
      `\nΣύνολο: €${totalAnnual}/έτος (€${totalMonthly}/μήνα)` +
      (savingsNote   ? '\n📌 ' + savingsNote.message : '') +
      (budgetWarning ? '\n⚠️ ' + budgetWarning.message : '');

    // ── Render ───────────────────────────────────────────────────
    s6.innerHTML = `
      <div class="step-label">Τα Αποτελέσματά σας</div>
      <h2 class="screen-title">Η Ανάλυσή σας${a.client_name ? ', ' + a.client_name.split(' ')[0] : ''}</h2>
      <p class="screen-sub">Βάσει των απαντήσεών σας δημιουργήθηκε εξατομικευμένη πρόταση κάλυψης.</p>

      <div class="urgency-banner urgency-${urg}" style="padding:18px 22px;margin-bottom:20px;">
        <div class="urgency-banner-inner">
          <div class="urgency-icon">${urgIcon}</div>
          <div>
            <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;opacity:.7;margin-bottom:3px">Επίπεδο Ανάγκης</div>
            <div style="font-size:22px;font-weight:700;line-height:1">${urg}</div>
          </div>
          <div style="margin-left:auto;text-align:right;font-size:12px;opacity:.8">
            <div>Υγεία &nbsp;<strong>${h}</strong></div>
            <div>Ζωή &nbsp;<strong>${l}</strong></div>
            <div>Σύνταξη &nbsp;<strong>${r}</strong></div>
          </div>
        </div>
      </div>

      <div class="score-summary">
        <div class="score-pill h">
          <div class="score-pill-label">Υγεία</div>
          <div class="score-pill-val">${h}</div>
          <div class="score-pill-bar"><div class="score-pill-fill" style="width:0%" data-target="${h}%"></div></div>
          <div class="score-pill-desc">${scoreDesc(h)}</div>
        </div>
        <div class="score-pill l">
          <div class="score-pill-label">Ζωή</div>
          <div class="score-pill-val">${l}</div>
          <div class="score-pill-bar"><div class="score-pill-fill" style="width:0%" data-target="${l}%"></div></div>
          <div class="score-pill-desc">${scoreDesc(l)}</div>
        </div>
        <div class="score-pill r">
          <div class="score-pill-label">Σύνταξη</div>
          <div class="score-pill-val">${r}</div>
          <div class="score-pill-bar"><div class="score-pill-fill" style="width:0%" data-target="${r}%"></div></div>
          <div class="score-pill-desc">${scoreDesc(r)}</div>
        </div>
      </div>

      <div class="benefits-box">
        <h4>📋 Κύρια Οφέλη Ασφάλισης για Εσάς</h4>
        <p>${benefitsText || 'Βάσει του προφίλ σας δεν εντοπίστηκαν έκτακτες ανάγκες. Ο σύμβουλός σας μπορεί να σας βοηθήσει να αξιολογήσετε πιθανές μελλοντικές ανάγκες.'}</p>
      </div>

      <div class="chart-section">
        <div class="chart-title">Κατανομή Ασφαλιστικών Αναγκών</div>
        <div class="chart-wrap"><canvas id="needs-chart" width="280" height="280"></canvas></div>
      </div>

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

    // Animate score bars
    requestAnimationFrame(() => {
      document.querySelectorAll('.score-pill-fill').forEach(el => {
        el.style.width = el.dataset.target;
      });
    });
    setTimeout(() => renderChart(hP, lP, rP), 80);

    // Integrations
    const resultData = {
      ...a,
      health_score:  h, life_score: l, retirement_score: r,
      urgency:       urg, proposal_text: proposalText,
      needs_hierarchy: buildNeedsHierarchyText(h, l, r),
      advisor_name:  BRAND.advisor,
      advisor_email: BRAND.email,
      advisor_phone: BRAND.phone,
    };
    window.NN_INTEGRATIONS?.saveToSheets(resultData);
    window.NN_INTEGRATIONS?.sendEmails(resultData);
  }

  // ════════════════════════════════════════════════════════════════
  // CHART
  // ════════════════════════════════════════════════════════════════
  function renderChart(hP, lP, rP) {
    if (chartInst) { chartInst.destroy(); chartInst = null; }
    const canvas = document.getElementById('needs-chart');
    if (!canvas) return;
    const chartEntries = [
      { label:'Υγεία',   pct: hP, color:'#F47920' },
      { label:'Ζωή',     pct: lP, color:'#C9A84C' },
      { label:'Σύνταξη', pct: rP, color:'#4a9eda' },
    ].filter(e => e.pct > 0);
    chartInst = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels:   chartEntries.map(e => `${e.label} ${e.pct.toFixed(0)}%`),
        datasets: [{
          data:            chartEntries.map(e => e.pct),
          backgroundColor: chartEntries.map(e => e.color),
          borderColor: '#1a2d42',
          borderWidth: 3,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color:'#e8edf4', font:{ family:'Nunito Sans', size:13 }, padding:16 },
          },
          tooltip: { callbacks: { label: ctx => '  ' + ctx.parsed.toFixed(1) + '%' } },
        },
      },
    });
  }

  // ════════════════════════════════════════════════════════════════
  // RESET
  // ════════════════════════════════════════════════════════════════
  function resetForm() {
    answers = { age: 35, monthly_budget: 100 };
    _submitted = false;
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
    if (chartInst) { chartInst.destroy(); chartInst = null; }
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
  window.resetForm      = resetForm;

})();
