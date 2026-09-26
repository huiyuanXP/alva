import {z} from 'zod';
export const SurfaceStyleSchema=z.object({color:z.string().regex(/^#[a-fA-F0-9]{6}$/),material:z.enum(['paint','plaster','wood','tile','stone','concrete'])}).strict();
export const RoomStyleSchema=z.object({tags:z.array(z.string().trim().min(1).max(40)).min(1).max(8),wall:SurfaceStyleSchema,floor:SurfaceStyleSchema}).strict();
export type SurfaceStyle=z.infer<typeof SurfaceStyleSchema>;
export type RoomStyle=z.infer<typeof RoomStyleSchema>;
export type RoomStyleCandidate={id:string;roomId:string;style:RoomStyle;reason:string;basis:string;status:'pending'|'confirmed'|'rejected'|'expired';createdAt:string;confirmedAt?:string};
