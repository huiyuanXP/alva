import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {BusinessTool} from '../codex.js';
import type {AlvaStore} from '../store.js';
import type {Project} from '../model.js';
import {applyZoneOperation,ZoneOperation} from '../zones-service.js';
const Input=z.object({expectedRevision:z.number().int().min(0),operation:ZoneOperation}).strict();
export function zoneTools(store:AlvaStore,projectId:string,onProject:(p:Project)=>void):BusinessTool[]{return [{
 name:'edit_functional_zone',description:'按用户明确请求创建虚拟功能分区、按三面墙成区、重命名或删除分区。仅修改功能分区，不改变墙体几何。锁定房间禁止修改。',inputSchema:z.toJSONSchema(Input),
 run:async args=>{const b=Input.parse(args),p=await store.mutate(projectId,randomUUID(),b.expectedRevision,'zone-'+b.operation.kind,b,state=>applyZoneOperation(state,b.operation));onProject(p);return {revision:p.revision,zones:p.zones}},
}]}
