/* Shared discovery state rules, used by the interface and Node's built-in tests. */
(function(root) {
  'use strict';
  function matching(op, skills) {
    const required = op.skills || [];
    const names = skills.map(s => s.name.trim().toLowerCase());
    const have = required.filter(s => names.includes(s.toLowerCase()));
    return {have, missing:required.filter(s => !have.includes(s)), score:required.length ? Math.round(have.length/required.length*100) : null};
  }
  function filtered(opportunities, state) {
    return opportunities.filter(op =>
      (state.style === 'All work styles' || op.style === state.style) &&
      (state.industry === 'All industries' || op.industry === state.industry) &&
      (state.type === 'All opportunities' || op.type === state.type) &&
      `${op.title} ${op.provider} ${op.location} ${op.description} ${(op.skills || []).join(' ')}`.toLowerCase().includes(state.query.trim().toLowerCase())
    ).sort((a,b) => (matching(b,state.skills).score ?? -1) - (matching(a,state.skills).score ?? -1));
  }
  function remaining(opportunities, state) {
    return filtered(opportunities,state).filter(op => !state.saved.includes(op.id) && !state.passed.includes(op.id));
  }
  function progress(opportunities, state) {
    const all=filtered(opportunities,state), left=remaining(opportunities,state);
    return {total:all.length, remaining:left.length, reviewed:all.length-left.length, current:left[0]?.id || null};
  }
  function act(state, id, kind, opportunities) {
    if(!['save','pass'].includes(kind)||!opportunities.some(op=>op.id===id)||state.saved.includes(id)||state.passed.includes(id))return state;
    const key=kind==='save'?'saved':'passed';
    return {...state,[key]:[...state[key],id],history:[...state.history,{id,kind}]};
  }
  function undo(state) {
    const last=state.history.at(-1);if(!last)return state;
    const key=last.kind==='save'?'saved':'passed';
    return {...state,[key]:state[key].filter(id=>id!==last.id),history:state.history.slice(0,-1)};
  }
  function restart(state) {return {...state,passed:[],history:state.history.filter(h=>h.kind==='save')};}
  function clearSaved(state) {return {...state,saved:[],history:state.history.filter(h=>h.kind!=='save')};}
  const api={matching,filtered,remaining,progress,act,undo,restart,clearSaved};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ReturnReadyDiscovery=api;
})(globalThis);
