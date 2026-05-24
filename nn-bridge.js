/**
 * nn-bridge.js — Γέφυρα μεταξύ engine.js και nn_products.js
 *
 * Φορτώνεται ΜΕΤΑ από data.js / engine.js / ui.js / integrations.js / nn_products.js.
 * Δεν τροποποιεί κανένα υπάρχον αρχείο.
 *
 * Τι κάνει:
 *   1. Μεταφράζει τα camelCase IDs του engine.js → snake_case IDs του nn_products.js
 *   2. Τυλίγει το NN_ENGINE.buildProposal() για post-validation (R1/R2/R3)
 *   3. Τυλίγει το NN_INTEGRATIONS.saveToSheets() για να εισάγει το validation badge στο DOM
 *
 * Σημειώσεις μεταφοράς IDs:
 *   - Τα firstCare* προγράμματα παραλείπονται (family:'outpatient' στο engine vs
 *     family_id:'ygeias' στο nn_products → false R2 positives· δεν αξιολογούνται).
 *   - Το savings line έχει id:'savings' (εικονικό)· παραλείπεται.
 *   - Τα Orange Help / Personal Accident / Premium Waiver δεν υπάρχουν στο engine·
 *     παραλείπονται αυτόματα.
 */
(function () {
  'use strict';

  // ── ID Mappings ────────────────────────────────────────────────────────────

  /** engine.js program id → nn_products.js program id */
  const PROG_MAP = {
    life:            'life',
    lifePlus:        'life_plus',
    crossPlus:       'cross_plus',
    cross1:          'cross_1',
    cross2:          'cross_2',
    cross3:          'cross_3',
    cross4:          'cross_4',
    health500:       'health_500',
    health1500:      'health_1500',
    easyGroup500:    'easy_group_500',
    easyGroup1000:   'easy_group_1000',
    hospitalForAll:  'hospital_for_all',
    acceleratorPlus: 'accelerator_plus',
    singleFlex:      'single_flex',
    // firstCare* παραλείπονται σκόπιμα (βλ. σχόλιο άνω)
  };

  /** engine.js attachment id → nn_products.js attachment id */
  const ATT_MAP = {
    extramed7:           'extramed_7',
    extramed31:          'extramed_31',
    mediPlan500:         'mediplan_500',
    mediPlan1000:        'mediplan_1000',
    mediPlan1500:        'mediplan_1500',
    mediPlan2000:        'mediplan_2000',
    mediPlan2500:        'mediplan_2500',
    primaryCareBio:      'primary_care_bioiatriki',
    primaryCareAffidea:  'primary_care_affidea',
  };

  // ── Translation ────────────────────────────────────────────────────────────

  /**
   * Μετατρέπει ένα proposal του engine.js σε μορφή που δέχεται
   * το nn_products.validatePortfolio().
   *
   * Κανόνες:
   *   - Μόνο γραμμές πελάτη (client) — όχι σύζυγος/παιδιά
   *   - Τα riders (attachments) ανήκουν στο health πρόγραμμα
   *   - firstCare, savings παραλείπονται
   */
  function translateProposal(proposal) {
    const clientLines = proposal.lines.filter(
      l => !l.memberType || l.memberType === 'client'
    );

    let healthProgId  = null;
    const attachIds   = [];
    let lifeProgId    = null;
    let savingsProgId = null;

    for (const line of clientLines) {
      if (line.kind === 'program') {
        const nnId = PROG_MAP[line.id];
        if (!nnId) continue;

        if (line.category === 'health') {
          healthProgId = nnId;
        } else if (line.category === 'life') {
          lifeProgId = nnId;
        }
        // savings: acceleratorPlus / singleFlex → family apotamieusis, no attachments
        else {
          const nn   = nnDb();
          const prog = nn._programsById[nnId];
          if (prog && prog.family_id === 'apotamieusis') savingsProgId = nnId;
        }
      } else if (line.kind === 'attachment') {
        const nnId = ATT_MAP[line.id];
        if (nnId) attachIds.push(nnId);
      }
    }

    const selections = [];
    if (healthProgId)  selections.push({ program_id: healthProgId,  attachment_ids: attachIds });
    if (lifeProgId)    selections.push({ program_id: lifeProgId,    attachment_ids: [] });
    if (savingsProgId) selections.push({ program_id: savingsProgId, attachment_ids: [] });
    return selections;
  }

  // ── State ──────────────────────────────────────────────────────────────────

  let _lastValidation = null;

  // ── Wrap NN_ENGINE.buildProposal ───────────────────────────────────────────

  const origBuild = window.NN_ENGINE.buildProposal;

  window.NN_ENGINE.buildProposal = function (answers) {
    const proposal = origBuild(answers);

    try {
      const nn         = nnDb();
      const selections = translateProposal(proposal);

      if (selections.length > 0) {
        const result    = nn.validatePortfolio(selections);
        _lastValidation = { valid: result.valid, errors: result.errors, selections };
      } else {
        _lastValidation = { valid: true, errors: [], selections: [] };
      }
    } catch (e) {
      _lastValidation = { valid: false, errors: [`Σφάλμα επικύρωσης: ${e.message}`], selections: [] };
    }

    return proposal;
  };

  // ── Wrap NN_INTEGRATIONS.saveToSheets ─────────────────────────────────────
  // Τρέχει αμέσως μετά το s6.innerHTML = ... στο ui.js, οπότε το DOM είναι έτοιμο.

  const origSave = window.NN_INTEGRATIONS.saveToSheets;

  window.NN_INTEGRATIONS.saveToSheets = function (data) {
    origSave.call(this, data);
    appendValidationBadge();
  };

  // ── DOM Badge ──────────────────────────────────────────────────────────────

  function appendValidationBadge() {
    const s6 = document.getElementById('s6');
    if (!s6 || !_lastValidation) return;

    // Αφαίρεση παλιού badge αν υπάρχει (reset)
    const old = s6.querySelector('.nn-validation-badge');
    if (old) old.remove();

    const v      = _lastValidation;
    const isOk   = v.valid;
    const badge  = document.createElement('div');
    badge.className = 'nn-validation-badge';

    Object.assign(badge.style, {
      margin:      '0 0 16px',
      padding:     '10px 16px',
      borderRadius:'8px',
      fontSize:    '12px',
      lineHeight:  '1.5',
      borderLeft:  `4px solid ${isOk ? '#4caf50' : '#f44336'}`,
      background:  isOk ? '#f0faf0' : '#fff3f0',
      color:       isOk ? '#2e7d32' : '#c62828',
    });

    if (isOk) {
      return; // Επιτυχής επικύρωση — δεν εμφανίζεται badge
    }

    const errList = v.errors.map(e => `<li>${e}</li>`).join('');
    badge.innerHTML =
      `⚠️ <strong>Προειδοποίηση συμβατότητας:</strong><ul style="margin:4px 0 0 16px;padding:0">${errList}</ul>`;

    // Εισαγωγή πριν από το indicative-banner
    const banner = s6.querySelector('.indicative-banner');
    if (banner) {
      s6.insertBefore(badge, banner);
    } else {
      s6.appendChild(badge);
    }
  }

})();
