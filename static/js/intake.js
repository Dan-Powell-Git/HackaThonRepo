/* Information intake rules. Assistant text is never used as skill evidence. */
(function(root){
  'use strict';
  const questions=[
    'What past jobs have you had, and what tasks did you handle? It’s okay if you haven’t had paid work yet.',
    'Have you volunteered, helped in your community, or organized activities? What did you do? You can skip this topic.',
    'Have you cared for others, managed household responsibilities, or helped a family business? Tell me about the tasks involved.',
    'What classes, training, or education have you completed or started? Informal learning counts too.',
    'What tools or skills did you use in those experiences—for example spreadsheets, scheduling, writing, or helping people?'
  ];
  function background(state){return [state.story,...state.messages.filter(m=>m.role==='user').map(m=>m.content)].filter(Boolean).join('\n');}
  function fallback(state){const turns=state.messages.filter(m=>m.role==='user').length;return {reply:turns>=questions.length?'Thank you for sharing your experience. Review the suggested skills, edit anything that doesn’t fit, and add any skills we missed.':questions[turns],complete:turns>=questions.length};}
  function stage(state){if(state.profileReady&&state.skills.length)return 'discover';return background(state)?'review':'intake';}
  function supportedSkills(skills,text){return skills.filter(s=>typeof s.name==='string'&&typeof s.evidence==='string'&&s.evidence.trim()&&text.includes(s.evidence));}
  const api={questions,background,fallback,stage,supportedSkills};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.ReturnReadyIntake=api;
})(globalThis);
