import type {SceneData,XY} from '../../../api/model.js';

export const wall=(id:string,ax:number,ay:number,bx:number,by:number):SceneData['walls'][number]=>({id,a:{x:ax,y:ay},b:{x:bx,y:by},thickness:.15,height:2.8,structural:'unknown',evidence:[]});
export const room=(id:string,points:number[][]):SceneData['rooms'][number]=>({id,name:id,purpose:'用途待确认',polygon:points.map(([x,y])=>({x,y})),locked:false});
export function rectangleScene():SceneData{
 return {walls:[wall('top',0,0,10,0),wall('right',10,0,10,6),wall('bottom',10,6,0,6),wall('left',0,6,0,0)],rooms:[room('客厅',[[0,0],[10,0],[10,6],[0,6]])],openings:[{id:'door',wallId:'top',kind:'door',offset:.5,width:1,height:2.1,sill:0}],items:[],calibration:{wallId:'top',length:10,source:'合成测试尺寸，不是现场测量',confirmed:true},geography:{latitude:31,north:0,assumption:'合成测试，无真实地理依据'}};
}

/** Synthetic reproduction of the three marked error classes, NOT a trace, user
 * source image or model output. Coordinates must never be treated as ground truth. */
export function annotatedFailureScene():SceneData{
 const s=rectangleScene();s.calibration=null;
 s.walls.find(w=>w.id==='bottom')!.b.y=4;
 s.walls.find(w=>w.id==='left')!.a.y=4;
 s.walls.push(wall('isolated-fragment',-1,1,-1,2));
 s.rooms=[room('已定义空间',[[0,0],[4,0],[4,3.5],[0,3.5]])];
 s.openings.push({id:'isolated-window',wallId:'isolated-fragment',kind:'window',offset:.5,width:.6,height:1.2,sill:.9});
 s.openings.push({id:'skew-window',wallId:'bottom',kind:'window',offset:.5,width:1,height:1.2,sill:.9});
 return s;
}
export function rotatedScene(scene:SceneData,degrees:number){
 const s=structuredClone(scene),a=degrees*Math.PI/180;
 const rotate=(p:XY)=>({x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a)});
 for(const w of s.walls){w.a=rotate(w.a);w.b=rotate(w.b)}for(const r of s.rooms)r.polygon=r.polygon.map(rotate);return s;
}
