import {readFile,writeFile} from 'node:fs/promises';
import {parseLayoutOutput} from '../api/import/response.js';
import {validateTopology} from '../api/topology/validate.js';
import {analyzeTopology} from '../api/topology/diagnostics.js';

const [rawPath,outputPath]=process.argv.slice(2);
if(!rawPath||!outputPath)throw new Error('usage: alva-062-adapt-preview.ts <raw-response> <candidate.json>');
const raw=(await readFile(rawPath,'utf8')).trim();
const fenced=raw.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);
const value=JSON.parse(fenced?fenced[1]:raw);
const {walls,rooms,doors,windows,items,calibration,latitude,north,assumption}=value;
if(!Array.isArray(walls)||!Array.isArray(rooms)||!Array.isArray(doors)||!Array.isArray(windows)||!Array.isArray(items)||items.length||calibration!==null)throw new Error('unexpected raw shape');
const scene=parseLayoutOutput(JSON.stringify({
 walls,rooms:rooms.map((room:Record<string,unknown>)=>({...room,purpose:room.purpose??room.name})),
 openings:[...doors.map((opening:Record<string,unknown>)=>({...opening,kind:'door'})),...windows.map((opening:Record<string,unknown>)=>({...opening,kind:'window'}))],
 items,calibration,geography:{latitude,north,assumption}
}));
await writeFile(outputPath,JSON.stringify(scene,null,2),{mode:0o600});
let topologyError='';try{validateTopology(scene)}catch(error){topologyError=String(error).slice(0,500)}
const diagnostics=analyzeTopology(scene);
console.log(JSON.stringify({counts:{walls:scene.walls.length,rooms:scene.rooms.length,openings:scene.openings.length},topologyError,diagnostics:{status:diagnostics.status,issues:diagnostics.issues.length,undefinedAreaM2:diagnostics.measurements.undefinedAreaM2,wallComponents:diagnostics.measurements.wallComponents}}));
