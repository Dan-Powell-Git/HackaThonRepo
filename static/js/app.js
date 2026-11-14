'use strict';
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => new Intl.NumberFormat('en-US', {style:'currency', currency:'USD', maximumFractionDigits:0}).format(n);
  const iconPaths = {
    arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>', bookmark:'<path d="M6 4h12v17l-6-4-6 4z"/>',
    check:'<path d="m5 12 4 4L19 6"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>',
    pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
    undo:'<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>', spark:'<path d="m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z"/>',
    plus:'<path d="M12 5v14M5 12h14"/>', upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    shield:'<path d="m12 3 8 4v6c0 5-8 9-8 9s-8-4-8-9V7z"/><path d="m8 12 3 3 5-6"/>',
    print:'<path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 13h10v9H7z"/>', briefcase:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12h18"/>',
    heart:'<path d="M20 5c-3-3-6-1-8 1C4-2-2 9 12 21 26 9 22 4 20 5Z"/>'
  };
  const icon = (name, size=15) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.spark}</svg>`;
  const state = {skills:[], saved:[], passed:[], story:'', messages:[], history:[], query:'', style:'All work styles', industry:'All industries', type:'All opportunities', tab:'intake', mobile:'opportunities', lang:'en', plan:null, size:4, children:2, other:1800, care:1400, commute:100, tax:20, review:false, view:'deck', theme:'light', profileReady:false, intakeComplete:false, skillsSource:'local'};
  let catalog = {opportunities:[], courses:[], demoStory:''}, noticeTimer, interview = null, busy = false, calculationVersion = 0, pointerStart = null;
  const discovery = window.ReturnReadyDiscovery;
  const intake = window.ReturnReadyIntake;
  const t = (en, es) => state.lang === 'es' ? es : en;
  async function api(path, payload) {
    const response = await fetch(path, payload === undefined ? {} : {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The request could not finish. Please try again.');
    return data;
  }
  function notify(message) {
    clearTimeout(noticeTimer);
    $('#notifications').innerHTML = `<div class="toast">${esc(message)}<button data-action="dismiss" aria-label="Dismiss notification">${icon('close')}</button></div>`;
    noticeTimer = setTimeout(() => {$('#notifications').innerHTML = '';}, 8000);
  }
  function persist() {
    try {sessionStorage.setItem('returnready-flask', JSON.stringify({skills:state.skills, story:state.story, messages:state.messages, saved:state.saved, passed:state.passed, view:state.view, theme:state.theme, profileReady:state.profileReady, intakeComplete:state.intakeComplete, skillsSource:state.skillsSource}));}
    catch {notify('Browser storage is unavailable. Keep this page open to retain your work.');}
  }
  function restore() {
    try {
      const value = JSON.parse(sessionStorage.getItem('returnready-flask') || 'null');
      if (!value || typeof value !== 'object') return;
      state.profileReady=value.profileReady===true;state.intakeComplete=value.intakeComplete===true;state.skillsSource=value.skillsSource==='gemini'?'gemini':'local';
      if (['deck','list'].includes(value.view)) state.view=value.view;
      if (['light','dark'].includes(value.theme)) state.theme=value.theme;
      if (typeof value.story === 'string' && value.story !== catalog.demoStory) state.story = value.story.slice(0,25000);
      if (Array.isArray(value.messages)) state.messages=value.messages.filter(m=>m && ['user','assistant'].includes(m.role) && typeof m.content==='string').slice(-40);
      if (value.story !== catalog.demoStory && Array.isArray(value.skills)) state.skills = value.skills.filter(s => typeof s.name === 'string' && typeof s.evidence === 'string').slice(0,30);
      for (const key of ['saved','passed']) if (Array.isArray(value[key])) state[key] = value[key].filter(id => catalog.opportunities.some(o => o.id === id));
    } catch { /* A corrupt session should not prevent using the app. */ }
  }
  const matching = op => discovery.matching(op, state.skills);
  const shortlist = () => catalog.opportunities.filter(o => state.saved.includes(o.id));
  const visible = () => discovery.remaining(catalog.opportunities,state);
  const filterValues = (field, all) => [all,...new Set(catalog.opportunities.map(op=>op[field]))];
  const options = (items, value) => items.map(s => `<option value="${esc(s)}"${s === value ? ' selected' : ''}>${esc(s==='All industries'?'All categories':s==='All work styles'?'All formats':s)}</option>`).join('');
  function renderIntake() {
    return `<section class="intake-page"><div class="intake-heading"><div class="eyebrow">STEP 1 OF 3 · YOUR INFORMATION</div><h2>Let’s start with your experience.</h2><p>Choose how you’d like to share your background. We’ll help identify your skills, and you’ll review them before exploring opportunities.</p></div><div class="intake-options"><section class="intake-option"><span class="intake-icon">${icon('upload',28)}</span><h3>I have a resume</h3><p>Upload your resume to find skills from your work, education, and training. You can add missing experience afterward.</p><label class="upload resume-choice">${icon('upload')} ${busy?'Reading your resume…':'Choose a resume'}<input id="resume-upload" type="file" accept=".pdf,.docx,.txt,.md" ${busy?'disabled':''}></label><span class="fine">PDF, Word (.docx), or text · up to 2 MB. Scanned PDFs need a text version.</span></section><section class="intake-option"><span class="intake-icon">${icon('spark',28)}</span><h3>I’d rather talk it through</h3><p>Answer a few questions about past jobs, volunteering, caregiving, classes, and education. No resume needed.</p><button class="primary full" data-action="interview" ${busy?'disabled':''}>Build my profile through chat ${icon('arrow')}</button><span class="fine">One question at a time. Skip anything that doesn’t apply.</span></section></div><p class="intake-privacy">${icon('shield',15)} Your information is kept in this browser session. Uploads are processed in memory; AI skill extraction sends your background to Gemini when available. You can edit or delete your information anytime.</p><button class="text-button" data-action="demo">Or try a fictional example ↗</button></section>`;
  }
  function renderReview() {
    return `<section class="profile-review"><div class="review-heading"><div class="eyebrow">STEP 2 OF 3 · REVIEW YOUR SKILLS</div><h2>Does this sound like you?</h2><p>These are suggestions from your experience. Open a skill to check its evidence, rename it, or remove it. Add anything we missed.</p><span class="source-badge">${state.skillsSource==='gemini'?'AI-assisted skill suggestions':'Guided skill suggestions · Gemini unavailable or not used'}</span></div><div class="review-layout">${renderSkills()}<section class="review-next"><h3>You’re in control of your profile.</h3><p>Only confirm skills you recognize in your own experience. Matching starts after you review this profile.</p>${!state.skills.length?'<p class="review-empty">No skills found yet. Add a skill with an exact quote from your background, or tell us more about your experience.</p>':''}<button class="primary full" data-action="confirm-profile" ${state.skills.length?'':'disabled'}>Confirm my skills & explore matches ${icon('arrow')}</button><button class="secondary full" data-action="interview">Add more experience through chat</button><button class="text-button" data-action="information">Review or edit my background</button></section></div></section>`;
  }
  function renderSkills() {
    return `<aside class="skills-panel mobile-${state.mobile === 'skills' ? 'show':'hide'}"><div class="section-top"><h2>${t('Your information','Tu información')}</h2><span class="tiny-icon">${icon('spark')}</span></div><p class="muted small">${t('More experience than you think.','Más experiencia de la que crees.')}</p>
      <div class="profile-card"><div class="profile-avatar">❧</div><h3>${t('Welcome to your next chapter','Bienvenida a tu próximo capítulo')}</h3><p>${t('Your life experience belongs on your resume, too.','Tu experiencia de vida también cuenta en tu currículum.')}</p><button class="primary full" data-action="interview">${icon('spark')}${t('Tell us about your experience','Cuéntanos tu experiencia')}${icon('arrow')}</button><button class="text-button" data-action="demo">${t('Try a fictional demo','Probar un ejemplo ficticio')} ↗</button></div>
      <button class="secondary full" data-action="information">View & edit your story and chat</button><div class="subheading"><h3>${t('Skills you bring','Tus habilidades')}</h3><span>${state.skills.length}</span></div>
      ${state.skills.length ? `<div class="skill-list">${state.skills.map((s,i) => `<details class="skill-detail"><summary>${icon('check',12)}${esc(s.name)}<span aria-hidden="true">⌄</span></summary><p class="evidence">“${esc(s.evidence)}”</p><label>Skill name<input data-skill-index="${i}" maxlength="100" value="${esc(s.name)}"></label><button class="text-button danger" data-action="remove-skill" data-index="${i}">Remove skill</button></details>`).join('')}</div>` : `<p class="empty-skills">${t('Start with your story. We’ll help you name the skills you already use.','Empieza con tu historia. Te ayudaremos a reconocer tus habilidades.')}</p>`}
      <details class="add-skill"><summary>${icon('plus',14)} ${t('Add a skill','Agregar habilidad')}</summary><form id="add-skill-form"><label>Skill<input name="skill" required maxlength="100" placeholder="e.g. Budgeting"></label><label>Evidence from your story<textarea name="evidence" required placeholder="Paste an exact quote"></textarea></label><button class="secondary full" type="submit">Add skill</button></form></details>
      <div class="line"></div><h3 class="small">${t('Your preferences','Tus preferencias')}</h3><label>${t('Resource format','Modalidad del recurso')}<select data-filter="style">${options(filterValues('style','All work styles'),state.style)}</select></label><div class="location">${icon('pin',14)} Utah & national resources</div><label class="upload">${icon('upload')} ${t('Upload a resume','Subir un currículum')}<input id="resume-upload" type="file" accept=".pdf,.docx,.txt,.md"></label><p class="privacy">${icon('shield',14)}${t('Your session stays in this browser. Story text is processed by this server and sent to Gemini only when you use AI coaching.','Tu sesión se guarda en este navegador. El servidor procesa tu historia; solo se envía a Gemini al usar el asistente.')}</p><button class="text-button muted" data-action="clear">${t('Clear my session','Borrar mi sesión')}</button></aside>`;
  }
  function programDetails(op) {
    return `<dl class="program-details"><div><dt>${op.dataSource?'Schedule':'Duration'}</dt><dd>${esc(op.duration||'Confirm with provider')}</dd></div><div><dt>${op.dataSource?'Eligibility':'Career break'}</dt><dd>${esc(op.breakRequirement||'Confirm with provider')}</dd></div><div><dt>${op.dataSource?'Cost / funding':'Compensation'}</dt><dd>${esc(op.compensation||'Confirm with provider')}</dd></div><div><dt>${op.dataSource?'Category':'Industry'}</dt><dd>${esc(op.industry)}</dd></div></dl><div class="program-perks">${(op.perks||[]).map(p=>`<span>${icon('check',11)}${esc(p)}</span>`).join('')}</div>`;
  }
  function card(op, deck=false) {
    const m=matching(op), showMatch=m.score!==null&&state.skills.length;
    return `<article class="opportunity ${deck?'deck-card':''}" ${deck?`data-deck-id="${esc(op.id)}"`:''}><div class="card-top"><span class="company-logo ${esc(op.color)}">${esc(op.initials)}</span><div class="company-name">${esc(op.provider)}<span>${esc(op.type)}</span></div><span class="match-score">${showMatch?m.score+'%':'—'}<small>${m.score===null?'resource info':t('skill match','afinidad')}</small></span></div><h3>${esc(op.title)}</h3><div class="metadata"><span>${icon('pin',13)}${esc(op.location)}</span><span>${icon('briefcase',13)}${esc(op.style)}</span>${op.hours?`<span>${icon('clock',13)}${op.hours} hrs/week</span>`:''}</div><p class="description">${esc(op.description)}</p>${programDetails(op)}<div class="tags">${(op.topics||op.skills).map(s=>`<span class="${(m.have.includes(s)||m.related.includes(s))?'has-skill':''}">${(m.have.includes(s)||m.related.includes(s))?icon('check',11):''}${esc(s)}</span>`).join('')}</div><div class="fit-note">${icon(showMatch?'check':'spark',13)}${m.score===null?op.dataSource?(m.related.length?'Topics related to your skills: '+esc(m.related.join(', '))+'. Confirm provider eligibility.':'Resource topics are not job requirements. Confirm eligibility with the provider.'):'Role requirements vary. Check the official opening before comparing skills.':showMatch?`${m.have.length} ${t('skills you have','habilidades que tienes')} · ${m.missing.length} ${t('to build','por desarrollar')}`:t('Add your skills to see your fit','Agrega tus habilidades para ver la afinidad')}</div>${op.url?`<a class="program-link" href="${esc(op.url)}" target="_blank" rel="noreferrer">${op.type==='Returnship directory'?'Explore official directory':op.dataSource?'Visit official resource':'Official program page'} ↗</a>`:''}<div class="card-bottom"><div>${op.sample?'<span class="sample">Sample listing</span>':'<span class="source-badge">Official source</span>'}${op.hourly?`<span class="pay">${money(op.hourly)}/hr · sample pay</span>`:''}</div>${deck?'<span class="small muted">← Pass · Save →</span>':`<div class="card-actions"><button class="pass" data-action="pass" data-id="${esc(op.id)}">${icon('close',14)}${t('Pass','Pasar')}</button><button class="save" data-action="save" data-id="${esc(op.id)}">${icon('bookmark',14)}${t('Save match','Guardar')}</button></div>`}</div>${op.sample?'':`<p class="checked">${op.dataSource?'Link checked by team':'Source checked'} ${esc(op.checkedAt||'2026-11-14')} · ${esc(op.status||'Availability unknown')}</p>`}</article>`;
  }
  function renderResults() {
    const items=visible(), progress=discovery.progress(catalog.opportunities,state);
    const empty=`<div class="empty-results"><div class="empty-deck-icon">${icon('check',28)}</div><h3>${progress.total?t('You’ve reviewed this deck.','Revisaste estas opciones.'):t('Let’s try a different search.','Probemos otra búsqueda.')}</h3><p>${progress.total?'Your saved matches are ready for the next step. Restart to revisit passed cards; saved matches stay in your plan.':'Try another keyword or reset your filters.'}</p><div class="empty-deck-actions">${state.passed.length?'<button class="secondary" data-action="restart-deck">Restart deck</button>':''}<button class="secondary" data-action="reset">Reset filters</button>${state.saved.length?'<button class="primary" data-action="plan">Open my plan →</button>':''}</div></div>`;
    const content=state.view==='deck'?(items[0]?`<div class="deck-stage">${card(items[0],true)}</div><div class="deck-controls"><button class="deck-pass" data-action="pass" data-id="${esc(items[0].id)}">${icon('close',17)}${t('Pass','Pasar')}</button><button class="deck-undo" data-action="undo" ${state.history.length?'':'disabled'}>${icon('undo',17)}${t('Undo','Deshacer')}</button><button class="deck-save" data-action="save" data-id="${esc(items[0].id)}">${icon('heart',17)}${t('Save match','Guardar')}</button></div><p class="swipe-hint">Swipe the card left to pass, right to save — or use the buttons.</p>`:empty):(items.map(op=>card(op)).join('')||empty);
    return `<div class="results-line"><span><strong>${items.length}</strong> ${t('possibilities to explore','posibilidades para explorar')}</span><span>${progress.total?`${progress.reviewed} of ${progress.total} reviewed`:'No matches'}</span></div>${content}<div class="keyboard-hint"><span>← Pass</span><span>→ Save match</span><span>U Undo</span></div>`;
  }
  function renderDiscovery() {
    return `<section class="discovery mobile-${state.mobile === 'opportunities'?'show':'hide'}"><div class="section-top"><div><h2>${t('Real paths to your next chapter','Caminos reales para tu próximo paso')}</h2><p class="muted small">${t('A little possibility. A lot of potential.','Un poco de posibilidad. Mucho potencial.')}</p></div><button class="undo" data-action="undo" ${state.history.length?'':'disabled'}>${icon('undo',14)}${t('Undo','Deshacer')}</button></div><div class="search">${icon('search',17)}<input id="search" aria-label="Search opportunities" value="${esc(state.query)}" placeholder="${t('Search roles, skills, or programs…','Buscar puestos, habilidades o programas…')}"></div><div class="filters"><select data-filter="type" aria-label="Opportunity type">${options(filterValues('type','All opportunities'),state.type)}</select><select data-filter="industry" aria-label="Resource category">${options(filterValues('industry','All industries'),state.industry)}</select></div><p class="catalog-notice">${esc(catalog.meta?.notice||'')}</p><div class="discovery-toolbar"><span class="small muted">${t('Find your next chapter, one card at a time.','Encuentra tu próximo paso, una tarjeta a la vez.')}</span><div class="view-toggle" role="group" aria-label="Browse view"><button data-action="view" data-value="deck" aria-pressed="${state.view==='deck'}">Cards</button><button data-action="view" data-value="list" aria-pressed="${state.view==='list'}">List</button></div></div><div id="results">${renderResults()}</div></section>`;
  }
  function renderSaved() {
    const saved=shortlist();
    return `<aside class="saved-panel shortlist-panel mobile-${state.mobile === 'saved'?'show':'hide'}" aria-label="Saved opportunities"><div class="section-top"><h2>${t('Your shortlist','Tus favoritos')}</h2><div class="saved-tools"><span class="count green" aria-label="${saved.length} saved opportunities">${saved.length}</span>${saved.length?`<button class="text-button" data-action="clear-saved">${t('Clear all','Borrar todo')}</button>`:''}</div></div><p class="shortlist-intro">${saved.length?t('A few possibilities. One next step.','Varias posibilidades. Un próximo paso.'):t('Keep the possibilities you want to come back to.','Guarda las posibilidades que quieras volver a ver.')}</p>${saved.length?`<div class="saved-list">${saved.map(op=>`<div class="saved-item"><span class="company-logo small-logo ${esc(op.color)}">${esc(op.initials)}</span><div><strong>${esc(op.title)}</strong><small>${esc(op.provider)}</small><span>${matching(op).score===null?'Check provider eligibility':matching(op).score+'% skill match'}</span>${op.url?`<a class="shortlist-source" href="${esc(op.url)}" target="_blank" rel="noreferrer">${t('View program','Ver programa')} ↗</a>`:''}</div><button data-action="remove-saved" data-id="${esc(op.id)}" aria-label="Remove ${esc(op.title)}">${icon('close',14)}</button></div>`).join('')}</div><button class="primary full" data-action="plan">${t('Build my return plan','Crear mi plan')}${icon('arrow')}</button><p class="shortlist-helper">${t('Start with one opportunity. You can add more anytime.','Empieza con una oportunidad. Puedes agregar más después.')}</p>`:`<div class="shortlist-empty"><div class="shortlist-bookmark">${icon('bookmark',25)}</div><span class="eyebrow">${t('YOUR NEXT STEP','TU PRÓXIMO PASO')}</span><h3>${t('Find one that feels like you.','Encuentra una para ti.')}</h3><p>${t('Tap “Save match” on an opportunity to keep it here. Then we’ll help you plan your next move.','Pulsa “Guardar” en una oportunidad para verla aquí. Después te ayudaremos a planificar tu próximo paso.')}</p><button class="primary full" data-action="explore-shortlist">${t('Explore opportunities','Explorar oportunidades')}${icon('arrow')}</button><span class="shortlist-helper">${t('Save one to unlock your return plan.','Guarda una para crear tu plan de regreso.')}</span></div>`}<section class="shortlist-next"><h3>${t('From possibility to a plan','De una posibilidad a un plan')}</h3><ol><li><strong>${t('Tell your story','Cuenta tu historia')}</strong><span>${t('Find words for the experience you bring.','Describe la experiencia que aportas.')}</span></li><li><strong>${t('Choose a direction','Elige un camino')}</strong><span>${t('Save programs and resources that fit your goals.','Guarda programas y recursos que se ajusten a tus metas.')}</span></li><li><strong>${t('Make your next move','Da el siguiente paso')}</strong><span>${t('Draft your resume and explore skills to refresh.','Prepara tu currículum y descubre habilidades para actualizar.')}</span></li></ol></section></aside>`;
  }

  function householdInput(label, name, min=0, max=1000000) {return `<label>${label}<input type="number" data-household="${name}" value="${state[name]}" min="${min}" max="${max}" ${name==='children'?'step="1"':'step="any"'} required></label>`;}
  function renderPlan() {
    return `<section class="return-plan"><div class="section-top"><div><div class="eyebrow">YOUR NEXT CHAPTER, ON PAPER</div><h2>${t('My return plan','Mi plan de regreso')}</h2></div><button class="secondary no-print" data-action="print">${icon('print')} Print plan</button></div>${!state.saved.length ? '<div class="empty-results"><h3>Your plan starts with a possibility.</h3><button class="primary" data-action="discover">Explore opportunities →</button></div>' : `<div class="plan-grid"><section class="plan-box"><h3>Your story, in your words</h3><p class="small muted">Review your confirmed skills before generating text. Gemini receives your story and confirmed skills. An editable local draft is available if AI is unavailable.</p><button class="primary no-print" data-action="generate-plan" ${busy||!state.skills.length?'disabled':''}>${icon('spark')}${busy?'Writing…':'Write my resume summary'}</button>${state.plan ? `<p class="fine">${state.plan.local?'Local template':'Gemini draft'} based on your confirmed skills. Verify every statement before using it.</p><label>Resume summary<textarea rows="5" data-draft="summary">${esc(state.plan.summary)}</textarea></label><div class="print-draft">${esc(state.plan.summary)}</div><label>Career break explanation<textarea rows="4" data-draft="gap">${esc(state.plan.gap)}</textarea></label><div class="print-draft">${esc(state.plan.gap)}</div>` : `<p class="small">Confirmed skills: ${esc(state.skills.map(s=>s.name).join(', ')||'Tell your story to get started.')}</p>`}</section><section class="plan-box"><h3>Does it pay?</h3><p class="small muted">The directory contains programs and resources, not salary-verified job offers. Household inputs are ready for when a verified paid role is added.</p><form id="calculator-form"><div class="form-grid"><label>Household size<select data-household="size">${options([2,3,4,5,6,7,8],state.size)}</select></label>${householdInput('Children in care','children',0,state.size-1)}${householdInput('Other income / month','other')}${householdInput('Full child care / month','care')}${householdInput('Commute / month','commute')}${householdInput('Estimated tax %','tax',0,60)}</div><label class="check-label"><input type="checkbox" data-household="review" ${state.review?'checked':''}>Existing recipient at review (Group 10 limit)</label></form></section></div><div id="comparison" class="comparison" aria-live="polite"><p>Calculating your comparison…</p></div><p class="calculator-note">Estimate only. Utah Department of Workforce Services makes the final decision. Income is only one eligibility condition. Does not model special-needs rules, work-hour requirements, maximum subsidy rates, or household sizes outside 2–8. <a href="https://jobs.utah.gov/occ/provider/table1026.pdf" target="_blank" rel="noreferrer">Official Table 4, October 1, 2026 ↗</a></p>`}</section>`;
  }
  function coursePlan(op) {
    const missing = matching(op).missing;
    return `<h4>Your 6-week refresher</h4><p class="small muted">Suggested pace: 2–3 hours per week. Actual course length varies.</p>${missing.map((s,i)=>{const course=catalog.courses.find(c=>c.skill===s);return `<div class="course"><span>${i<2?'Weeks 1–2':'Weeks 3–4'}</span><strong>${esc(s)}</strong>${course?`<a href="${esc(course.url)}" target="_blank" rel="noreferrer">${esc(course.title)} ↗<small>${esc(course.provider)} · ${esc(course.cost)}</small></a>`:'<p>Practice with a small project and collect an example to discuss in your interview.</p>'}</div>`;}).join('') || '<div class="course"><span>Weeks 1–4</span><strong>Refresh your strongest skills</strong><p>Build a small work sample and gather examples of your confirmed skills.</p></div>'}<div class="course"><span>Weeks 5–6</span><strong>Put it into practice</strong><p>Create a work sample and rehearse an honest career-break explanation.</p></div>`;
  }
  function comparisonCard(op, v) {
    return `<section class="plan-box"><span class="company-logo ${esc(op.color)}">${esc(op.initials)}</span><h3>${esc(op.title)}</h3><span class="sample">${op.sample?'Sample listing':esc(op.type)}</span>${v ? `<div class="net">${money(v.net)}<small>estimated monthly gain</small></div><dl>${[['Gross job income',money(v.gross)],['Estimated take-home',money(v.takeHome)],['Household gross income',money(v.householdIncome)],['Income group',v.result.group??'Above modeled groups'],['Income test',v.result.eligible?'Within income limit':'Above income limit'],['Child care estimate',money(v.expense)],['Commute',money(v.commute)]].map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><p class="fine">Co-payment assumes subsidy covers the remaining provider cost. Extra provider charges and maximum subsidy rates are not modeled. Tax and pay are demo assumptions.</p>` : op.type==='Learning program'?'<p>Learning programs are not paid job offers. Confirm tuition, schedule, and enrollment with the provider.</p>':'<p>This is a program or resource, not a confirmed job offer. No salary is listed, so no paycheck estimate is shown. Check current services, eligibility, costs, and any openings on the official page.</p>'}${programDetails(op)}<p class="resource-next"><strong>Next step</strong> ${esc(op.nextStep||'Confirm current details with the provider.')}</p>${op.dataSource?'<p class="small muted">Choose your learning goals after reviewing the provider’s requirements. Resource topic tags are not skill gaps.</p>':coursePlan(op)}${op.url?`<a href="${esc(op.url)}" target="_blank" rel="noreferrer">Visit official resource ↗</a>`:''}</section>`;
  }
  async function calculate() {
    const version = ++calculationVersion;
    try {
      const data = await api('/api/calculate', {size:state.size,children:state.children,other:state.other,care:state.care,commute:state.commute,tax:state.tax,review:state.review,saved:state.saved});
      if (version !== calculationVersion || state.tab !== 'plan' || !$('#comparison')) return;
      $('#comparison').innerHTML = shortlist().map(op=>comparisonCard(op,data.results[op.id])).join('');
    } catch(error) {if (version===calculationVersion && $('#comparison')) $('#comparison').innerHTML = `<p role="alert">${esc(error.message)}</p>`;}
  }
  function render() {
    if(['discover','plan'].includes(state.tab)&&!state.profileReady)state.tab=intake.stage(state);
    $('#discover-nav').classList.toggle('active',state.tab==='discover');
    $('#plan-nav').classList.toggle('active',state.tab==='plan');
    $('#discover-nav').textContent=t('Discover opportunities','Explorar oportunidades');
    $('#plan-nav').innerHTML=`${t('My return plan','Mi plan de regreso')} <span class="count">${state.saved.length}</span>`;
    $('.language').textContent=t('Español','English');
    document.documentElement.lang=state.lang;
    document.documentElement.dataset.theme=state.theme;
    const themeButton=$('[data-action="theme"]');themeButton.setAttribute('aria-pressed',String(state.theme==='dark'));themeButton.setAttribute('aria-label',state.theme==='dark'?'Switch to light theme':'Switch to dark theme');themeButton.innerHTML=state.theme==='dark'?'☀ <span>Light</span>':'☾ <span>Dark</span>';
    $('#intro-eyebrow').textContent=t('YOUR NEXT CHAPTER STARTS HERE','TU PRÓXIMO CAPÍTULO EMPIEZA AQUÍ');
    $('#intro-title').innerHTML=t('You took a break.<br>Your skills didn’t. <span class="sparkle">✳</span>','Tomaste una pausa.<br>Tus habilidades, no. <span class="sparkle">✳</span>');
    $('#intro-copy').textContent=t('Let’s turn everything you’ve learned into what comes next. Find work that fits your skills, your life, and your family.','Transforma lo que aprendiste en tu próximo paso. Encuentra trabajo que encaje con tus habilidades, tu vida y tu familia.');
    document.querySelectorAll('[data-action="mobile"]').forEach((button,i)=>{button.classList.toggle('selected',button.dataset.value===state.mobile);button.textContent=[t('My skills','Habilidades'),t('Discover','Explorar'),t('Saved','Guardados')][i];});
    $('.mobile-tabs').hidden=!['discover'].includes(state.tab);
    $('#app').innerHTML=state.tab==='intake'?renderIntake():state.tab==='review'?renderReview():state.tab==='discover'?`<div class="workspace">${renderSkills()}${renderDiscovery()}${renderSaved()}</div>`:renderPlan();
    if(state.tab==='plan'&&state.saved.length)calculate();
    persist();
  }
  function act(id, kind) {
    const next=discovery.act(state,id,kind,catalog.opportunities);if(next===state)return;
    Object.assign(state,next);render();
    notify(kind==='save'?t('Added to your return plan.','Agregado a tu plan.'):t('Opportunity passed. You can undo this.','Oportunidad omitida. Puedes deshacerlo.'));
  }
  function undo() {if(!state.history.length)return;Object.assign(state,discovery.undo(state));render();notify('Last action undone.');}
  async function demo() {try{const data=await api('/api/skills',{story:catalog.demoStory});state.story=catalog.demoStory;state.messages=[];state.intakeComplete=true;state.skills=data.skills;state.plan=null;state.profileReady=false;state.tab='review';state.skillsSource='local';closeInterview();render();notify(t('Fictional demo loaded. Review every suggested skill.','Ejemplo ficticio cargado. Revisa cada habilidad.'));}catch(error){notify(error.message)}}
  function invalidatePersonalDrafts() {
    const text=[state.story,...state.messages.filter(m=>m.role==='user').map(m=>m.content)].join('\n');
    state.skills=state.skills.filter(s=>text.includes(s.evidence));state.plan=null;state.profileReady=false;
  }
  function renderInformation() {
    const dialog=$('#interview-dialog');
    dialog.innerHTML=`<button class="close" data-action="close-interview" aria-label="Close your information">${icon('close',20)}</button><h2 id="interview-title">Your information</h2><p>Everything you’ve shared is kept in this browser session. Edit or delete it here. Chat and background are sent to Gemini when you request coaching.</p><label for="story-review-text">Your story / resume background</label><textarea id="story-review-text" rows="7" maxlength="25000" ${busy?'disabled':''}>${esc(state.story)}</textarea><p class="small" id="story-save-status" role="status">Changes save automatically in this browser.</p><button class="text-button danger" data-action="delete-story" ${busy?'disabled':''}>Delete my story</button><h3>Your chat</h3><p>${state.messages.filter(m=>m.role==='user').length} messages from you. Open the chat to edit or delete individual messages.</p><button class="secondary" data-action="open-chat">View & edit chat</button><h3>Skills & saved opportunities</h3><p>${state.skills.length} skills · ${state.saved.length} saved opportunities · ${state.passed.length} passed opportunities</p><button class="text-button" data-action="review-profile">Review skills, preferences & saved opportunities</button><h3>Start over</h3><p>Delete chat only, or clear your story, chat, skills, saved opportunities and passed cards.</p><div class="information-actions"><button class="secondary" data-action="reset-chat" ${busy?'disabled':''}>Delete chat & start over</button><button class="text-button danger" data-action="clear" ${busy?'disabled':''}>Delete all my information</button></div>`;
  }
  function renderInterview() {
    if(interview?.view==='information'){renderInformation();return;}

    const dialog=$('#interview-dialog');
    dialog.innerHTML=`<button class="close" data-action="close-interview" aria-label="Close chat">${icon('close',20)}</button><h2 id="interview-title">Let’s discover your skills</h2><p class="muted small">This chat only gathers your background: past jobs, volunteering, caregiving, classes, education, and the tasks you’ve done. We’ll suggest skills as you go.</p><div class="coach-messages" role="log" aria-live="polite">${state.messages.map((m,i)=>`<div class="coach-message"><strong>${m.role==='user'?'You':m.source==='guided'?'Guided profile assistant':'Skills assistant'}</strong>${interview.editIndex===i?`<label for="edit-message">Edit your message</label><textarea id="edit-message" rows="4" maxlength="8000">${esc(m.content)}</textarea><p class="small">Saving removes later replies so Gemini can respond to your updated message.</p><button class="secondary" data-action="save-message" data-index="${i}">Use edited message</button><button class="text-button" data-action="cancel-edit">Cancel</button>`:`<p class="coach-text">${esc(m.content)}</p>${m.role==='user'?`<div class="message-actions"><button class="text-button" data-action="edit-message" data-index="${i}" ${busy?'disabled':''}>Edit</button><button class="text-button danger" data-action="delete-message" data-index="${i}" ${busy?'disabled':''}>Delete</button></div>`:''}`}</div>`).join('')||`<div class="coach-message"><strong>Profile assistant</strong><p class="coach-text">${state.story?'Your resume gives us a starting point. What volunteering, caregiving, classes, or other experience would you like to add?':esc(intake.questions[0])}</p></div>`}</div><p class="small">Edit or delete any of your messages above. Deleting a message also removes the replies after it.</p><div class="information-actions"><button class="secondary" data-action="information">Edit your story</button><button class="text-button danger" data-action="reset-chat" ${busy?'disabled':''}>Delete chat & start over</button></div><form id="interview-form"><label for="story-answer">Your experience</label><textarea id="story-answer" name="answer" rows="3" maxlength="8000" required ${busy?'disabled':''}>${esc(interview.answer||'')}</textarea><div class="modal-actions"><button class="primary" type="submit" ${busy?'disabled':''}>${busy?'Finding your skills…':'Share & continue'}${icon('arrow')}</button></div></form><div class="intake-chat-summary"><span>${state.skills.length} skill suggestions so far</span><button type="button" class="primary" data-action="review-skills" ${busy||!intake.background(state)?'disabled':''}>${state.intakeComplete?'Review my skills':'Finish & review skills'}</button></div><section class="story-review"><h3>Your story / background</h3><p>Edit anytime. Changes save automatically.</p><label>Background or resume<textarea id="story-review-text" rows="5" maxlength="25000" ${busy?'disabled':''}>${esc(state.story)}</textarea></label></section><p class="fine">Your background and chat are used to identify your skills. AI extraction sends them to Google Gemini; guided questions are used when AI is unavailable. Clear my session removes local chat data.</p>`;
    const log=$('.coach-messages',dialog);log.scrollTop=log.scrollHeight;
    if(!busy)$('#story-answer').focus();
  }
  function startInterview() {
    interview={answer:''};renderInterview();if(!$('#interview-dialog').open)$('#interview-dialog').showModal();$('#story-answer').focus();
  }
  function closeInterview() {$('#interview-dialog').close();interview=null;render();}
  async function continueInterview(form) {
    if(busy||!interview)return;
    const answer=new FormData(form).get('answer').trim();if(!answer)return;
    const current=interview, messages=[...state.messages,{role:'user',content:answer}];
    if(messages.length>38||messages.reduce((n,m)=>n+m.content.length,0)>20000||[state.story,...messages.filter(m=>m.role==='user').map(m=>m.content)].join('\n').length>25000){notify('Your profile is getting long. Review your skills, or edit earlier messages to make room.');return;}
    state.messages=messages;state.profileReady=false;state.plan=null;busy=true;current.answer='';persist();renderInterview();
    try{
      const data=await api('/api/coach',{action:'chat',story:state.story,messages,skills:state.skills.map(s=>s.name),language:state.lang});
      state.skills=intake.supportedSkills(data.skills||[],intake.background(state));state.skillsSource='gemini';state.intakeComplete=data.complete===true;
      state.messages.push({role:'assistant',content:data.reply,source:'gemini'});
    }catch(error){
      const next=intake.fallback(state);
      try{state.skills=(await api('/api/skills',{story:intake.background(state)})).skills;}catch(localError){notify(localError.message);}
      state.skillsSource='local';state.intakeComplete=next.complete;
      state.messages.push({role:'assistant',content:next.reply,source:'guided'});
      notify('Using guided profile questions and local skill suggestions while Gemini is unavailable.');
    }finally{busy=false;persist();render();if(interview===current)renderInterview();}
  }
  async function reviewSkills() {
    if(busy)return;const text=intake.background(state);if(!text){notify('Share your experience or upload a resume first.');return;}
    busy=true;if(interview)renderInterview();
    try{const data=await api('/api/coach',{action:'skills',story:text,skills:[],language:state.lang});state.skills=data.skills;state.skillsSource='gemini';}
    catch(error){try{state.skills=(await api('/api/skills',{story:text})).skills;state.skillsSource='local';}catch(localError){busy=false;notify(localError.message);if(interview)renderInterview();return;}}
    busy=false;state.plan=null;state.profileReady=false;state.tab='review';state.mobile='skills';closeInterview();render();
  }
  async function generatePlan() {
    if(busy||!state.skills.length)return;busy=true;render();
    try {const data=await api('/api/coach',{action:'plan',story:[state.story,...state.messages.filter(m=>m.role==='user').map(m=>m.content)].filter(Boolean).join('\n'),skills:state.skills.map(s=>s.name),language:state.lang});state.plan={...data,local:false};}
    catch(error) {state.plan={summary:`My strengths include ${state.skills.map(s=>s.name).join(', ')}. I am looking for an opportunity to apply these confirmed skills and continue learning.`,gap:'I am returning to paid work after a career break. I am ready to discuss the experience and skills I can bring to this role.',local:true};notify(error.message+' An editable local draft is ready.');}
    finally {busy=false;render();}
  }
  async function upload(file) {
    if(!file||busy)return;if(file.size>2*1024*1024){notify('Please choose a resume under 2 MB.');return;}
    if(!/\.(pdf|docx|txt|md)$/i.test(file.name)){notify('Choose a PDF, Word (.docx), or text resume.');return;}
    busy=true;render();
    try{
      const form=new FormData();form.append('resume',file);
      const response=await fetch('/api/resume',{method:'POST',body:form}),data=await response.json();
      if(!response.ok)throw Error(data.error||'The resume could not be read.');
      const combined=[state.story,data.story].filter(Boolean).join('\n');
      if((combined+'\n'+state.messages.filter(m=>m.role==='user').map(m=>m.content).join('\n')).length>25000)throw Error('Your combined background is too long. Edit your story before adding this resume.');
      state.story=combined;state.profileReady=false;state.plan=null;state.skills=data.skills;state.skillsSource='local';
      try{const suggestions=await api('/api/coach',{action:'skills',story:intake.background(state),skills:[],language:state.lang});state.skills=suggestions.skills;state.skillsSource='gemini';}
      catch{state.skills=(await api('/api/skills',{story:intake.background(state)})).skills;}
      state.tab='review';state.mobile='skills';notify('Resume read. Review your suggested skills and their evidence.');
    }catch(error){notify(error.message);}finally{busy=false;render();}
  }
  document.addEventListener('click', event => {
    const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
    const {action,id,index,value}=button.dataset;
    if(['edit-message','delete-message','save-message','reset-chat','delete-story','clear'].includes(action)&&busy){notify('Wait for the current response before changing your information.');return;}
    if(action==='information'){interview={view:'information',answer:interview?.answer||''};renderInformation();if(!$('#interview-dialog').open)$('#interview-dialog').showModal();return;}
    if(action==='open-chat'){startInterview();return;}
    if(action==='review-profile'){closeInterview();state.tab='review';state.mobile='skills';render();return;}
    if(action==='edit-message'){interview.editIndex=Number(index);renderInterview();$('#edit-message').focus();return;}
    if(action==='cancel-edit'){delete interview.editIndex;renderInterview();return;}
    if(action==='save-message'||action==='delete-message'){
      const i=Number(index);if(state.messages[i]?.role!=='user')return;
      const updated=action==='save-message'?$('#edit-message').value.trim():'';
      if(action==='save-message'&&!updated){notify('Enter a message, or use Delete to remove it.');return;}
      state.messages=state.messages.slice(0,i);interview.answer=updated;delete interview.editIndex;
      invalidatePersonalDrafts();persist();render();renderInterview();
      notify(action==='save-message'?'Updated message is ready below. Send it to get a new response.':'Message and later replies deleted.');return;
    }
    if(action==='reset-chat'){state.messages=[];invalidatePersonalDrafts();if(interview)interview.answer='';persist();render();if(interview)renderInterview();notify('Chat deleted. You can start a new conversation.');return;}
    if(action==='delete-story'){state.story='';invalidatePersonalDrafts();persist();render();renderInformation();notify('Your story has been deleted.');return;}
    if(action==='dismiss'){$('#notifications').innerHTML='';return;}
    if(action==='explore-shortlist'){state.tab='discover';state.mobile='opportunities';render();$('.discovery').scrollIntoView({behavior:'smooth',block:'start'});$('#search').focus({preventScroll:true});return;}
    if(action==='discover'||action==='plan'){if(!state.profileReady){state.tab=intake.background(state)?'review':'intake';render();notify('Share your background and confirm your skills first.');return;}state.tab=action;render();return;}
    if(action==='mobile'){state.mobile=value;state.tab=state.profileReady?'discover':intake.stage(state);render();return;}
    if(action==='theme'){state.theme=state.theme==='light'?'dark':'light';render();return;}
    if(action==='view'){state.view=value;render();return;}
    if(action==='restart-deck'){Object.assign(state,discovery.restart(state));render();notify('Passed cards are back. Your saved matches are unchanged.');return;}
    if(action==='clear-saved'){Object.assign(state,discovery.clearSaved(state));render();notify('Saved list cleared. These opportunities are available to browse again.');return;}
    if(action==='language'){state.lang=state.lang==='en'?'es':'en';render();return;}
    if(action==='save'||action==='pass'){act(id,action);return;}
    if(action==='undo'){undo();return;}
    if(action==='remove-saved'){state.saved=state.saved.filter(x=>x!==id);state.history=state.history.filter(h=>h.id!==id);render();return;}
    if(action==='remove-skill'){state.skills.splice(Number(index),1);state.plan=null;state.profileReady=false;render();return;}
    if(action==='reset'){Object.assign(state,{query:'',style:'All work styles',industry:'All industries',type:'All opportunities'});render();return;}
    if(action==='interview'){startInterview();return;}
    if(action==='close-interview'){closeInterview();return;}
    if(action==='chat-skills'||action==='review-skills'){reviewSkills();return;}
    if(action==='confirm-profile'){if(!state.skills.length)return;state.profileReady=true;state.tab='discover';state.mobile='opportunities';render();notify('Profile confirmed. Explore opportunities using your skills.');return;}
    if(action==='demo'){demo();return;}
    if(action==='generate-plan'){generatePlan();return;}
    if(action==='print'){window.print();return;}
    if(action==='clear'){state.skills=[];state.story='';state.messages=[];state.saved=[];state.passed=[];state.history=[];state.plan=null;state.profileReady=false;state.intakeComplete=false;state.tab='intake';try{sessionStorage.removeItem('returnready-flask')}catch{}render();if(interview){interview.answer='';delete interview.editIndex;renderInterview();}notify('All your information has been deleted.');}
  });
  document.addEventListener('input', event => {
    const input=event.target;
    if(input.id==='search'){state.query=input.value;$('#results').innerHTML=renderResults();}
    if(input.dataset.draft&&state.plan){state.plan[input.dataset.draft]=input.value;const output=input.parentElement.nextElementSibling;if(output?.classList.contains('print-draft'))output.textContent=input.value;}
    if(input.id==='story-review-text'){state.story=input.value;invalidatePersonalDrafts();persist();const status=$('#story-save-status');if(status)status.textContent='Saved in this browser.';}
    if(input.id==='story-answer'&&interview)interview.answer=input.value;
  });
  document.addEventListener('change', event => {
    const input=event.target;
    if(input.dataset.filter){state[input.dataset.filter]=input.value;$('#results').innerHTML=renderResults();return;}
    if(input.dataset.skillIndex!==undefined){const value=input.value.trim();if(!value){notify('A skill needs a name.');input.value=state.skills[Number(input.dataset.skillIndex)].name;return;}state.skills[Number(input.dataset.skillIndex)].name=value;state.plan=null;state.profileReady=false;render();return;}
    if(input.id==='resume-upload'){upload(input.files[0]);return;}
    if(input.dataset.household){const name=input.dataset.household;if(!input.checkValidity()){notify(input.validationMessage);return;}state[name]=input.type==='checkbox'?input.checked:Number(input.value);if(name==='size'){state.children=Math.min(state.children,state.size-1);const child=$('[data-household="children"]');child.max=state.size-1;child.value=state.children;}calculate();}
  });
  document.addEventListener('submit', event => {
    if(event.target.id==='interview-form'){event.preventDefault();continueInterview(event.target);}
    if(event.target.id==='calculator-form'){event.preventDefault();calculate();}
    if(event.target.id==='add-skill-form'){
      event.preventDefault();const data=new FormData(event.target),name=data.get('skill').trim(),evidence=data.get('evidence').trim();
      if(!name||!evidence)return;if(![state.story,...state.messages.filter(m=>m.role==='user').map(m=>m.content)].join('\n').includes(evidence)){notify('Evidence must be an exact quote from your story.');return;}
      if(state.skills.some(s=>s.name.toLowerCase()===name.toLowerCase())){notify('That skill is already in your profile.');return;}
      state.skills.push({name,evidence});state.plan=null;state.profileReady=false;render();notify('Skill added.');
    }
  });
  document.addEventListener('keydown',event=>{
    if($('#interview-dialog').open||state.tab!=='discover'||event.target.closest('input,textarea,select,button,[contenteditable="true"]'))return;
    if(event.key==='ArrowRight'&&visible()[0]){event.preventDefault();act(visible()[0].id,'save');}
    if(event.key==='ArrowLeft'&&visible()[0]){event.preventDefault();act(visible()[0].id,'pass');}
    if(event.key.toLowerCase()==='u')undo();
  });
  document.addEventListener('pointerdown',event=>{
    const card=event.target.closest('[data-deck-id]');
    if(!card||event.button!==0||event.target.closest('a,button,input,textarea,select,summary'))return;
    pointerStart={id:card.dataset.deckId,x:event.clientX,y:event.clientY,pointer:event.pointerId};
  });
  document.addEventListener('pointerup',event=>{
    const start=pointerStart;pointerStart=null;
    if(!start||event.pointerId!==start.pointer||state.view!=='deck'||state.tab!=='discover'||visible()[0]?.id!==start.id)return;
    const dx=event.clientX-start.x,dy=event.clientY-start.y;
    if(Math.abs(dx)>80&&Math.abs(dx)>Math.abs(dy)*1.5){act(start.id,dx>0?'save':'pass');}
  });
  document.addEventListener('pointercancel',()=>{pointerStart=null;});
  $('#interview-dialog').addEventListener('cancel',()=>{interview=null;});
  async function init(){try{catalog=await api('/api/catalog');restore();state.tab=intake.stage(state);render();}catch(error){$('#app').innerHTML=`<div class="empty-results"><h2>We couldn’t load the opportunities.</h2><p>${esc(error.message)}</p><a href="/">Try again</a></div>`;}}
  init();
})();
