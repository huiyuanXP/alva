export type ChatStage='floorplan'|'living';
export type ChatActionKind='enter_living'|'confirm_topology'|'reopen_topology'|'confirm_building'|'save_design'|'confirm_purpose';
export type ChatAction={details?:{roomId:string;purpose:string;sourceText?:string};id:string;projectId:string;stage:ChatStage;kind:ChatActionKind;title:string;description:string;status:'pending'|'confirmed'|'rejected';version?:number;/** Legacy cards must be refreshed; no hash is computed or trusted. */basis?:string;createdAt:string;finishedAt?:string};
