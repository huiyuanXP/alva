export type ChatStage='floorplan'|'living';
export type ChatActionKind='confirm_topology'|'reopen_topology'|'confirm_building'|'save_design';
export type ChatAction={id:string;projectId:string;stage:ChatStage;kind:ChatActionKind;title:string;description:string;status:'pending'|'confirmed'|'rejected';basis:string;createdAt:string;finishedAt?:string};
