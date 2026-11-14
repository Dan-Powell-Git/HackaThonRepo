const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('../static/js/discovery.js');
const catalog=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../data/catalog.json'),'utf8')).opportunities;
const initial=()=>({skills:[],saved:[],passed:[],history:[],query:'',style:'All work styles',industry:'All industries',type:'All opportunities'});
test('saving, passing, and undo never duplicate or lose cards',()=>{
 let state=initial(), first=core.remaining(catalog,state)[0].id;
 state=core.act(state,first,'save',catalog);
 assert.equal(state.saved.length,1);assert.ok(!core.remaining(catalog,state).some(o=>o.id===first));
 assert.equal(core.act(state,first,'save',catalog),state);
 const second=core.remaining(catalog,state)[0].id;
 state=core.act(state,second,'pass',catalog);
 assert.deepEqual(core.undo(state).passed,[]);
 state=core.undo(core.undo(state));
 assert.deepEqual(state.saved,[]);assert.deepEqual(state.passed,[]);
 assert.equal(core.remaining(catalog,state).length,catalog.length);
});
test('filters retain decisions and undo safely across filter changes',()=>{
 let state=core.act(initial(),'office','save',catalog);
 state.query='Goldman';
 assert.deepEqual(core.remaining(catalog,state).map(o=>o.id),['goldman']);
 state=core.undo(state);assert.deepEqual(state.saved,[]);
 assert.deepEqual(core.remaining(catalog,state).map(o=>o.id),['goldman']);
 state.query='';state.style='Remote';
 assert.ok(core.remaining(catalog,state).every(o=>o.style==='Remote'));
 assert.ok(!core.remaining(catalog,state).some(o=>o.id==='goldman'));
});
test('restart restores passes while clear saved does not corrupt history',()=>{
 let state=core.act(core.act(initial(),'office','save',catalog),'project','pass',catalog);
 const reset=core.restart(state);assert.deepEqual(reset.saved,['office']);assert.deepEqual(reset.passed,[]);
 state=core.clearSaved(state);assert.deepEqual(state.saved,[]);assert.deepEqual(state.passed,['project']);
 assert.deepEqual(core.undo(state).passed,[]);
});
test('progress stays valid through empty filters and exhausted deck',()=>{
 let state=initial();
 for(const op of catalog)state=core.act(state,op.id,'pass',catalog);
 assert.deepEqual(core.progress(catalog,state),{total:catalog.length,remaining:0,reviewed:catalog.length,current:null});
 state.query='not-a-provider-xyz';
 assert.deepEqual(core.progress(catalog,state),{total:0,remaining:0,reviewed:0,current:null});
});
test('real program pages without role requirements never get a fabricated match',()=>{
 const op=catalog.find(o=>o.id==='goldman');
 assert.equal(core.matching(op,[{name:'Budgeting'}]).score,null);
 const sample=catalog.find(o=>o.id==='office');
 assert.equal(core.matching(sample,[{name:'Budgeting'}]).score,25);
 assert.equal(core.matching(sample,[]).score,0);
});
