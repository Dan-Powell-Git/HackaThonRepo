import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibility,extractSkills,match,opportunities,demoStory,childcare} from '../lib/returnready.ts';
import {coach} from '../worker/coach.ts';
test('official household-of-four examples',()=>{
 assert.deepEqual(eligibility(4,4000,2),{group:4,eligible:true,copay:121});
 assert.deepEqual(eligibility(4,5100,2),{group:6,eligible:true,copay:199});
 assert.deepEqual(eligibility(4,6000,2),{group:8,eligible:false,copay:null});
});
test('entry and review boundaries across all modeled household sizes',()=>{
 for(const size of Object.keys(childcare).map(Number)){
 const entry=childcare[size][5][0],exit=childcare[size][9][0];
 assert.equal(eligibility(size,entry,1).eligible,true);
 assert.equal(eligibility(size,entry+.01,1).eligible,false);
 assert.equal(eligibility(size,exit,1,true).eligible,true);
 assert.equal(eligibility(size,exit+.01,1,true).eligible,false);
 }
 assert.equal(eligibility(9,4000,2),null);assert.equal(eligibility(4,-1,2),null);assert.equal(eligibility(2,1000,2),null);
 assert.equal(eligibility(4,10000,0).copay,0);
});
test('skills always quote source text and matching exposes its denominator',()=>{
 const skills=extractSkills(demoStory);assert.ok(skills.some(s=>s.name==='Budgeting'));
 for(const s of skills)assert.ok(demoStory.includes(s.evidence));
 const op=opportunities[0],m=match(op,skills);assert.equal(m.have.length+m.missing.length,op.skills.length);assert.equal(m.score,Math.round(m.have.length/op.skills.length*100));
 assert.equal(match(op,[]).score,0);assert.deepEqual(extractSkills(''),[]);
});
test('coach validates input, origin and missing credentials',async()=>{
 assert.equal((await coach(new Request('https://example.com/api/coach',{method:'POST',body:JSON.stringify({action:'skills',story:'My budget.'})}),{})).status,503);
 assert.equal((await coach(new Request('https://example.com/api/coach',{method:'POST',headers:{origin:'https://other.com'},body:'{}'}),{})).status,403);
 assert.equal((await coach(new Request('https://example.com/api/coach',{method:'POST',body:'bad'}),{})).status,400);
});
