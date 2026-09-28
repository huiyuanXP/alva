import {canonicalJson} from '../../packages/contracts/alva/canonical-json.js';
import {createHash} from 'node:crypto';
import {DomainError,type Project,type Proposal} from '../model.js';
/** Questionnaire, messages and UI metadata are deliberately outside the design basis. */
export function proposalDesignKey(p:Project){return createHash('sha256').update(canonicalJson({scene:p.scene,building:p.confirmedBuilding,styles:p.roomStyles})).digest('hex')}
/** Furniture patches carry absolute target values; unrelated edits are preserved. */
export function proposalArchitectureKey(p:Project){return createHash('sha256').update(canonicalJson({walls:p.scene?.walls,openings:p.scene?.openings,rooms:p.scene?.rooms.map(({id,polygon})=>({id,polygon})),topology:p.confirmedTopology?.id})).digest('hex')}
export function assertProposalBasis(p:Project,proposal:Proposal){
 if(proposal.baseArchitectureKey&&proposal.baseArchitectureKey!==proposalArchitectureKey(p))throw new DomainError(409,'房屋结构已变化，请基于当前户型重新生成方案');
 // Legacy furniture candidates also revalidate against the live scene at adoption.
 if(proposal.changes.some(c=>c.action==='wall')&&proposal.baseDesignKey!==proposalDesignKey(p))throw new DomainError(409,'墙体方案依据已变化，请重新生成');
}
export function publishProposals(p:Project,proposals:Proposal[],decisionSessionId:string){
 if(!proposals.length)return;
 for(const old of p.proposals)if(old.status==='proposed')old.status='rejected';
 for(const proposal of proposals){proposal.baseArchitectureKey=proposalArchitectureKey(p);proposal.baseRevision=p.revision+1;proposal.baseDesignKey=proposalDesignKey(p);proposal.decisionSessionId=decisionSessionId}
 p.proposals.push(...proposals);
}
/** Only siblings based on the same scene are rebased after an explicit decision. */
export function rebaseDecisionQueue(p:Project,chosen:Proposal,previousKey:string){
 for(const next of p.proposals)if(next.status==='proposed'&&chosen.decisionSessionId&&next.decisionSessionId===chosen.decisionSessionId&&next.baseDesignKey===previousKey){next.baseDesignKey=proposalDesignKey(p);next.baseRevision=p.revision+1}
}
