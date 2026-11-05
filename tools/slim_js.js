const acorn=require('acorn'),walk=require('acorn-walk'),fs=require('fs');
const raw=fs.readFileSync(process.argv[2],'utf8');
const m=raw.match(/<script>([\s\S]*)<\/script>/);const src=m?m[1]:raw;
const ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:'script'});
const decls=[];
for(const st of ast.body){
  let names=[];
  if(st.type==='FunctionDeclaration'||st.type==='ClassDeclaration')names=[st.id.name];
  else if(st.type==='VariableDeclaration')for(const d of st.declarations){if(d.id.type==='Identifier')names.push(d.id.name);else walk.full(d.id,n=>{if(n.type==='Identifier')names.push(n.name)})}
  const refs=new Set();walk.full(st,n=>{if(n.type==='Identifier')refs.add(n.name)});
  decls.push({st,names,refs,size:st.end-st.start,line:src.slice(0,st.start).split('\n').length});
}
const byName={};decls.forEach((d,i)=>d.names.forEach(n=>byName[n]=i));
console.log(JSON.stringify({n:decls.length,big:decls.map((d,i)=>[i,d.names.join(','),d.size,d.line]).sort((a,b)=>b[2]-a[2]).slice(0,12)}));
// closure
const lo=+process.argv[3], hi=+process.argv[4];
const extraRoots=(process.argv[5]||'').split(',').filter(Boolean);
const EX=new Set((process.argv[7]||'').split(',').filter(Boolean));
const keep=new Set();
const q=[];
decls.forEach((d,i)=>{ if(d.line>=lo&&d.line<=hi&&!d.names.some(n=>EX.has(n))){keep.add(i);q.push(i);} });
extraRoots.forEach(n=>{if(byName[n]!==undefined&&!keep.has(byName[n])){keep.add(byName[n]);q.push(byName[n]);}});
while(q.length){const i=q.pop();for(const r of decls[i].refs){if(EX.has(r))continue;const j=byName[r];if(j!==undefined&&!keep.has(j)){keep.add(j);q.push(j);}}}
const out=decls.map((d,i)=>keep.has(i)?src.slice(d.st.start,d.st.end):null).filter(x=>x!==null).join('\n');
fs.writeFileSync(process.argv[6]||'/tmp/slim.js',out);
const missing=new Set();decls.forEach((d,i)=>{if(keep.has(i))for(const r of d.refs)if(byName[r]===undefined)missing.add(r)});
console.log('kept',keep.size,'bytes',Buffer.byteLength(out),'outside-region:',[...keep].filter(i=>decls[i].line<lo||decls[i].line>hi).map(i=>decls[i].names.join(',')||('stmt@'+decls[i].line)).join(' '));
