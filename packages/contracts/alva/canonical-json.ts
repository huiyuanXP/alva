/** Object key order may change when JSON passes through the database. */
export function canonicalJson(value:unknown):string{
 const normalize=(v:unknown):unknown=>Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([,x])=>x!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,normalize(x)])):v;
 return JSON.stringify(normalize(value));
}
