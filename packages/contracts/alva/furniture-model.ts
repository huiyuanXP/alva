import {z} from 'zod';
const Vec=z.tuple([z.number().finite(),z.number().finite(),z.number().finite()]);
export const FurniturePart=z.object({
 id:z.string().min(1).max(80),label:z.string().min(2).max(100),role:z.enum(['body','support','detail']),
 shape:z.enum(['roundedBox','ellipsoid','cylinder','torus','lathe','tube']),
 position:Vec,rotation:Vec,size:Vec.refine(v=>v.every(n=>n>0&&n<=2),'size must be positive and <=2'),
 color:z.string().regex(/^#[0-9a-fA-F]{6}$/),material:z.enum(['wood','fabric','metal','glass','stone','leaf']),
 radius:z.number().min(.005).max(.2),
 path:z.array(Vec).max(32),profile:z.array(z.tuple([z.number().min(0).max(1),z.number().min(-1).max(1)])).max(32)
}).strict();
export const FurnitureModel=z.object({
 version:z.literal(1),name:z.string().min(1).max(100),
 designSummary:z.string().min(20).max(2400).describe('Concise visible design decisions and requirement mapping; not private chain-of-thought'),
 parts:z.array(FurniturePart).min(8).max(120)
}).strict();
export type FurnitureModelData=z.infer<typeof FurnitureModel>;
export type FurniturePartData=z.infer<typeof FurniturePart>;
export const FurnitureCritique=z.object({
 verdict:z.enum(['pass','revise']),detailAdequate:z.boolean(),matchesRequest:z.boolean(),
 observations:z.array(z.string().min(5).max(600)).min(3).max(12),
 issues:z.array(z.string().min(3).max(600)).max(16),repairs:z.array(z.string().min(3).max(600)).max(16)
}).strict();
export const ReviewedFurnitureModel=z.object({
 model:FurnitureModel,modelHash:z.string().regex(/^[a-f0-9]{64}$/),originalPrompt:z.string().min(1).max(10000),
 dimensions:z.object({width:z.number().positive(),height:z.number().positive(),depth:z.number().positive()}).strict(),baseAppearance:z.object({color:z.string(),material:z.string()}).strict(),modelName:z.string(),createdAt:z.string(),attempts:z.number().int().min(1).max(3),
 renderHashes:z.array(z.string().regex(/^[a-f0-9]{64}$/)).length(3),
 critique:FurnitureCritique.refine(c=>c.verdict==='pass'&&c.detailAdequate&&c.matchesRequest&&!c.issues.length&&!c.repairs.length,'Visual critic must pass without outstanding repairs')
}).strict();
export type ReviewedFurnitureModelData=z.infer<typeof ReviewedFurnitureModel>;
/** Numeric detail alone is not approval; a visual critic must also inspect the actual renders. */
export function validateFurnitureModel(value:unknown):FurnitureModelData{
 const model=FurnitureModel.parse(value),ids=new Set<string>();
 for(const part of model.parts){
  if(ids.has(part.id))throw new Error('部件ID重复');ids.add(part.id);
  if(part.path.some(v=>v.some(n=>Math.abs(n)>2))||part.position.some(n=>Math.abs(n)>2)||part.rotation.some(n=>Math.abs(n)>Math.PI*2))throw new Error('部件坐标/弧度超范围');
  if(part.shape==='tube'&&part.path.length<2)throw new Error('曲管需要至少两个路径点');
  if(part.shape==='lathe'&&part.profile.length<3)throw new Error('旋转曲面需要至少三个轮廓点');
 }
 if(model.parts.filter(p=>p.role==='detail').length<3||!model.parts.some(p=>p.role==='body')||!model.parts.some(p=>p.role==='support'))throw new Error('必须包含主体、支撑和至少三个可见细节部件，不能只细分包围盒');
 return model;
}
