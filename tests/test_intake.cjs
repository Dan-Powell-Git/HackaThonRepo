const test=require('node:test');
const assert=require('node:assert/strict');
const intake=require('../static/js/intake.js');
test('profile collection precedes confirmation and discovery',()=>{
 const state={story:'',messages:[],skills:[],profileReady:false};
 assert.equal(intake.stage(state),'intake');
 state.story='I managed the budget.';assert.equal(intake.stage(state),'review');
 state.skills=[{name:'Budgeting',evidence:'managed the budget'}];assert.equal(intake.stage(state),'review');
 state.profileReady=true;assert.equal(intake.stage(state),'discover');
 state.skills=[];assert.equal(intake.stage(state),'review');
});
test('only user background is used to extract and substantiate skills',()=>{
 const state={story:'Office coordinator.',messages:[{role:'user',content:'I organized a fundraiser.'},{role:'assistant',content:'You wrote software.'}]};
 const text=intake.background(state);assert.ok(!text.includes('software'));
 assert.deepEqual(intake.supportedSkills([{name:'Fundraising',evidence:'organized a fundraiser'},{name:'Coding',evidence:'You wrote software.'},{name:'Blank',evidence:''}],text),[{name:'Fundraising',evidence:'organized a fundraiser'}]);
});
test('guided fallback covers experience and education then invites review',()=>{
 const state={story:'',messages:[]};
 assert.equal(intake.fallback(state).reply,intake.questions[0]);
 for(let i=1;i<5;i++){state.messages.push({role:'user',content:'An answer.'},{role:'assistant',content:'A question.'});assert.equal(intake.fallback(state).complete,false);assert.equal(intake.fallback(state).reply,intake.questions[i]);}
 state.messages.push({role:'user',content:'Final answer.'});assert.equal(intake.fallback(state).complete,true);assert.match(intake.fallback(state).reply,/review/i);
 assert.ok(intake.questions.some(q=>/classes|education/.test(q)));assert.ok(intake.questions.some(q=>/volunteer/.test(q)));
});
