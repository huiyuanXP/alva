import {z} from 'zod';
export const ProjectNavigation=z.discriminatedUnion('mode',[
 z.object({mode:z.literal('create'),name:z.string().trim().min(1).max(100)}).strict(),
 z.object({mode:z.literal('switch'),targetProjectId:z.string().uuid()}).strict(),
]);
export type Navigation=z.infer<typeof ProjectNavigation>;
