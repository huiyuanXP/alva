import {canonicalJson} from '../../packages/contracts/alva/canonical-json.js';
import {createHash} from 'node:crypto';
import {DomainError,type Project,type Proposal} from '../model.js';
/** Questionnaire, messages and UI metadata are deliberately outside the design basis. */
export function proposalDesignKey(p:Project){return createHash('sha256').update(canonicalJson({scene:p.scene,building:p.confirmedBuilding,styles:p.roomStyles})).digest('hex')}
export function assertProposalBasis(p:Project,proposal:Proposal){
 if(proposal.baseDesignKey?proposal.baseDesignKey!==proposalDesignKey(p):proposal.baseRevision!==p.revision)throw new DomainError(409,'方案所依版本已变化，请重新生成');
}
export function publishProposals(p:Project,proposals:Proposal[],decisionSessionId:string){
 if(!proposals.length)return;
 for(const old of p.proposals)if(old.status==='proposed')old.status='rejected';
 for(const proposal of proposals){proposal.baseRevision=p.revision+1;proposal.baseDesignKey=proposalDesignKey(p);proposal.decisionSessionId=decisionSessionId}
 p.proposals.push(...proposals);
}
/** Only siblings based on the same scene are rebased after an explicit decision. */
export function rebaseDecisionQueue(p:Project,chosen:Proposal,previousKey:string){
 for(const next of p.proposals)if(next.status==='proposed'&&chosen.decisionSessionId&&next.decisionSessionId===chosen.decisionSessionId&&next.baseDesignKey===previousKey){next.baseDesignKey=proposalDesignKey(p);next.baseRevision=p.revision+1}
}
