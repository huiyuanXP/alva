import type {Value} from './flow.js';
import type {OutcomeOption} from '../consultation-question.js';
export type VisionQuestion = {
 language?:'zh'|'en';
 id:string;questionId:string;respondentId:string;respondentName:string;responseVersion:number;
 roomId:string|null;topologyVersion:number;sourceMessageId:string;
 hypothesis:string;basis:{id:string;quote:string}[];uncertainty:string;
 question:string;reason:string;options:(OutcomeOption&{value:Value})[];
 assumptions:string[];recommendedOptionId:string|null;recommendationReason:string;evidenceIds:string[];
 status:'awaiting_owner_confirmation'|'confirmed'|'dismissed';createdAt:string;
};
export type VisionChatAnswer = {
 id:string;questionId:string;roomId:string|null;question:string;hypothesis:string;
 text:string;state:'answered'|'unknown'|'skipped';value?:Value;
 synced:boolean;evidenceId:string;confirmedAt:string;status:'active'|'superseded';
};
