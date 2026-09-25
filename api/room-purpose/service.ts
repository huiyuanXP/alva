import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {applyChanges} from '../business.js';
import {DomainError,type Project} from '../model.js';
export const RoomPurposeInput=z.object({roomId:z.string(),purpose:z.string().trim().min(1).max(120),sourceText:z.string().max(3000).optional()});
export function confirmRoomPurpose(p:Project,input:z.infer<typeof RoomPurposeInput>){
 const b=RoomPurposeInput.parse(input),scene=p.scene;if(!scene)throw new DomainError(422,'请先确认户型');
 const room=scene.rooms.find(r=>r.id===b.roomId);if(!room)throw new DomainError(422,'房间不存在');if(room.locked)throw new DomainError(422,'房间已锁定，不能修改用途');
 const evidenceId=randomUUID(),now=new Date().toISOString();p.scene=applyChanges(scene,[{action:'purpose',targetId:b.roomId,values:{purpose:b.purpose}}],false,true);
 p.evidence.push({id:evidenceId,quote:b.sourceText?.trim()||('确认房间“'+room.name+'”用途为“'+b.purpose+'”'),source:'manual',roomId:b.roomId,createdAt:now});
 p.purposeConfirmations=[...(p.purposeConfirmations||[]),{id:randomUUID(),roomId:b.roomId,purpose:b.purpose,evidenceId,confirmedAt:now}];p.dirty=true;
}
