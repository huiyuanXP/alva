import {ProjectNavigation} from './projects.js';
import {z} from 'zod';
export const SceneUiActionSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('view'),mode:z.enum(['2d','3d'])}).strict(),
 z.object({kind:z.literal('sunlight'),time:z.number().min(0).max(24),day:z.number().int().min(1).max(365)}).strict(),
 z.object({kind:z.literal('focus_room'),roomId:z.string()}).strict(),
]);
export const UiActionSchema=z.discriminatedUnion('kind',[
 ...SceneUiActionSchema.options,
 z.object({kind:z.literal('project_manager'),navigation:ProjectNavigation}).strict(),
]);
export type UiAction=z.infer<typeof UiActionSchema>;
export type UiActionRequest={id:string;action:UiAction};
