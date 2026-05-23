/**
 * NN Hellas — Integrations
 * integrations.js — EmailJS & Google Sheets
 *
 * Exposes window.NN_INTEGRATIONS = { saveToSheets, sendEmails }.
 * Caller (ui.js) passes advisor_name/email/phone inside the data object.
 */
(function () {
  'use strict';

  // ════════════════════════════════════════════════════════════════
  // SERVICE CONFIG
  // ════════════════════════════════════════════════════════════════
  const SVC = {
    ej_key:    '3qFxGixe2gHChiZ0T',
    ej_svc:    'service_nfxu98b',
    ej_client: 'template_ky8g7hp',
    ej_agent:  'template_cp85icg',
    sheets_url:'https://script.google.com/macros/s/AKfycbxeyXOn3_iVydydbu1XDgSH8xd8srECLZSMJ4YycYEVb-4j8HCqtzGnyhYXvIY1H3lwiA/exec',
  };

  let _emailSent = false;

  // ════════════════════════════════════════════════════════════════
  // GOOGLE SHEETS
  // ════════════════════════════════════════════════════════════════
  function saveToSheets(data) {
    if (!SVC.sheets_url || SVC.sheets_url.startsWith('REPLACE')) return;
    try {
      const p = new URLSearchParams({
        date:               new Date().toLocaleString('el-GR'),
        name:               data.client_name        || '',
        email:              data.client_email       || '',
        phone:              data.client_phone       || '',
        age:                data.age                || '',
        marital_status:     data.marital_status     || '',
        spouse_age:         data.spouse_age         || '',
        children:           data.children           || '',
        kids_ages:          (data.kids_ages         || []).join(', '),
        occupation:         data.occupation         || '',
        fund_satisfaction:  data.fund_satisfaction  || '',
        hospital_mild:      data.hospital_mild      || '',
        hospital_severe:    data.hospital_severe    || '',
        deductible_type:    data.deductible_type    || '',
        ci_pref:            data.ci_pref            || '',
        hospital_allowance: data.hospital_allowance || '',
        income_concern:     data.income_concern     || '',
        uncovered_needs:    (data.uncovered_needs   || []).join(', '),
        life_capital:       data.life_capital       || '',
        pension_estimate:   data.pension_estimate   || '',
        savings_plan:       data.savings_plan       || '',
        target_amount:      data.target_amount      || '',
        target_years:       data.target_years       || '',
        monthly_budget:     data.monthly_budget     || '',
        health_score:       data.health_score       || '',
        life_score:         data.life_score         || '',
        retirement_score:   data.retirement_score   || '',
        urgency:            data.urgency            || '',
        proposal:           data.proposal_text      || '',
      });
      // POST + application/x-www-form-urlencoded (simple header, επιτρεπόμενο με no-cors).
      // doPost(e) στο Apps Script διαβάζει e.parameter.fieldName.
      fetch(SVC.sheets_url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: p.toString(),
      }).catch(() => {});
    } catch (e) {}
  }

  // ════════════════════════════════════════════════════════════════
  // EMAILJS
  // ════════════════════════════════════════════════════════════════
  function sendEmails(data) {
    if (_emailSent) return;
    _emailSent = true;
    const statusEl = document.getElementById('email-status');
    const params = {
      client_name:      data.client_name      || 'Πελάτης',
      client_email:     data.client_email     || '',
      client_phone:     data.client_phone     || '',
      client_age:       data.age              || '',
      family_status:    data.marital_status   || '',
      health_score:     data.health_score     || 0,
      life_score:       data.life_score       || 0,
      retirement_score: data.retirement_score || 0,
      urgency_level:    data.urgency          || '',
      needs_hierarchy:  data.needs_hierarchy  || '',
      monthly_budget:   data.monthly_budget   || '',
      deductible_pref:  data.deductible_type  || '',
      proposal_text:    data.proposal_text    || '',
      date:             new Date().toLocaleDateString('el-GR'),
      advisor_name:     data.advisor_name     || '',
      advisor_email:    data.advisor_email    || '',
      advisor_phone:    data.advisor_phone    || '',
    };
    // eslint-disable-next-line no-undef
    emailjs.send(SVC.ej_svc, SVC.ej_client, { ...params, to_email: params.client_email })
      .then(() => { if (statusEl) statusEl.textContent = '✅ Το email στάλθηκε επιτυχώς!'; })
      .catch(() => { if (statusEl) statusEl.textContent = '⚠️ Τα αποτελέσματα αποθηκεύτηκαν. Επικοινωνήστε με τον σύμβουλό σας.'; });
    // eslint-disable-next-line no-undef
    emailjs.send(SVC.ej_svc, SVC.ej_agent, { ...params, to_email: params.advisor_email })
      .catch(() => {});
  }

  // ════════════════════════════════════════════════════════════════
  // INIT
  // ════════════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', () => {
    try { emailjs.init(SVC.ej_key); } catch (e) {} // eslint-disable-line no-undef
  });

  function reset() { _emailSent = false; }

  // ════════════════════════════════════════════════════════════════
  // EXPORTS
  // ════════════════════════════════════════════════════════════════
  window.NN_INTEGRATIONS = { saveToSheets, sendEmails, reset };

})();
