import {homeFixture} from './home-fixtures.js';
import type {FurnitureModelData,FurniturePartData} from '../../../../packages/contracts/alva/furniture-model.js';
/** Original CC0 assemblies. Old instances acquire geometry without changing stored dimensions. */
export function catalogueFurniture(assetId:string,color:string,material:string):FurnitureModelData{
 const fixture=homeFixture(assetId,color);if(fixture)return fixture;
 const parts:FurniturePartData[]=[];
 const add=(label:string,shape:FurniturePartData['shape'],pos:number[],size:number[],role:FurniturePartData['role']='detail',mat=material,tint=color,rotation=[0,0,0],radius=.06)=>parts.push({id:`part-${parts.length}`,label,shape,position:pos as [number,number,number],size:size as [number,number,number],role,material:mat as FurniturePartData['material'],color:tint,rotation:rotation as [number,number,number],radius,path:[],profile:[]});
 const box=(label:string,pos:number[],size:number[],role:FurniturePartData['role']='detail',mat=material,tint=color)=>add(label,'roundedBox',pos,size,role,mat,tint);
 const legs=(height=.25)=>{for(const x of [-.4,.4])for(const z of [-.37,.37])add('独立支撑脚','cylinder',[x,height/2,z],[.06,height,.06],'support','wood','#674c37')};
 if(assetId==='alva-sofa'){
  legs(.16);box('沙发框架',[0,.25,0],[1,.22,.96],'body');
  box('左圆润扶手',[-.45,.59,0],[.1,.6,1],'body');box('右圆润扶手',[.45,.59,0],[.1,.6,1],'body');
  for(const x of [-.27,0,.27]){box('独立坐垫',[x,.48,.05],[.255,.21,.75]);box('独立靠背软包',[x,.77,-.34],[.255,.46,.22]);box('坐垫滚边',[x,.54,.05],[.259,.018,.754],'detail','fabric','#c2c7b7')}
 }else if(assetId==='alva-chair'){
  legs(.49);box('弧边座面',[0,.53,0],[.94,.1,.94],'body');box('座面软垫',[0,.59,.01],[.8,.07,.78],'detail','fabric','#c8b69c');
  for(const x of [-.39,.39])box('靠背立柱',[x,.76,-.4],[.07,.48,.07],'support');box('靠背上横梁',[0,.96,-.4],[.86,.08,.1],'body');
  for(const x of [-.25,0,.25])box('靠背细栅',[x,.8,-.4],[.065,.26,.055]);
 }else if(assetId==='alva-table'){
  legs(.92);box('圆角桌面',[0,.96,0],[1,.08,1],'body');box('抽屉箱体',[.22,.78,-.02],[.43,.26,.77],'body');
  box('抽屉面板',[.22,.78,.385],[.41,.21,.035]);box('抽屉内嵌饰面',[.22,.78,.407],[.35,.155,.012]);box('抽屉金属拉手',[.22,.8,.42],[.18,.025,.025],'detail','metal','#535652');
  for(const z of [-.38,.38])box('桌腿连接横档',[0,.77,z],[.85,.07,.04],'support');
 }else if(assetId==='alva-bed'){
  legs(.17);box('床架',[0,.27,0],[1,.24,.96],'body','wood','#826748');box('厚床垫',[0,.54,.06],[.97,.3,.84],'body');
  box('软包床头',[0,.66,-.45],[1,.68,.1],'body');for(const x of [-.24,.24])add('独立枕头','ellipsoid',[x,.78,-.23],[.39,.2,.24]);
  box('折叠被面',[0,.74,.23],[.94,.12,.45],'detail','fabric','#d8cfba');for(const z of [.04,.12,.2,.28,.36])box('被面绗缝',[0,.805,z],[.9,.006,.008],'detail','fabric','#c0b39e');
 }else if(assetId==='alva-cabinet'){
  legs(.08);box('柜体背板',[0,.54,-.46],[1,.92,.08],'body');for(const x of [-.47,.47])box('柜体侧板',[x,.54,0],[.06,.92,.96],'body');
  for(const y of [.1,.98])box('柜体横板',[0,y,0],[1,.04,1],'support');
  for(const x of [-.245,.245]){box('独立柜门',[x,.6,.47],[.478,.73,.045],'body');box('柜门内嵌面',[x,.6,.497],[.4,.65,.012]);add('金属门把','cylinder',[x<0?-.035:.035,.58,.515],[.018,.14,.025],'detail','metal','#68635c')}
  box('底部抽屉',[0,.17,.47],[.94,.11,.055]);box('抽屉拉手',[0,.17,.51],[.23,.015,.025],'detail','metal','#68635c');
 }else if(assetId==='alva-plant'){
  add('陶盆','lathe',[0,.17,0],[.7,.34,.7],'body','stone','#c7b393');parts.at(-1)!.profile=[[.32,-.5],[.4,-.46],[.5,.43],[.5,.5],[.44,.5],[.43,.37],[.34,-.4]];
  add('盆内土壤','cylinder',[0,.31,0],[.6,.02,.6],'detail','stone','#4c392b');add('主茎','cylinder',[0,.61,0],[.025,.62,.025],'support','wood','#657e46');
  for(let i=0;i<14;i++){const a=(i*2.4)%(Math.PI*2),y=.4+i*.04,x=Math.sin(a)*.22,z=Math.cos(a)*.22;add('分层曲面叶片','ellipsoid',[x,y,z],[.32,.028,.16],'detail','leaf',i%2?'#456d3c':'#729553',[.3,a,.4]);add('叶柄','cylinder',[x/2,y-.02,z/2],[.013,.27,.013],'support','wood','#65834c',[Math.cos(a)*.9,0,-Math.sin(a)*.9])}
 }else if(assetId==='alva-coffee'){
  box('咖啡机机身',[0,.53,-.1],[1,.94,.7],'body','metal',color);box('底座',[0,.05,0],[1,.1,1],'support','metal','#343c3c');
  box('前控制面板',[0,.76,.26],[.87,.23,.04],'detail','metal','#222a2b');for(const x of [-.27,0,.27])add('圆形控制按钮','cylinder',[x,.77,.295],[.1,.1,.045],'detail','metal','#c4c8c6',[Math.PI/2,0,0]);
  box('出水组件',[0,.58,.38],[.34,.15,.2],'body','metal','#b9bebd');for(const x of [-.09,.09])add('双出水嘴','cylinder',[x,.47,.41],[.04,.12,.04],'detail','metal','#d0d5d2');
  box('接水盘',[0,.14,.28],[.87,.05,.4],'detail','metal','#8e9997');for(let i=0;i<7;i++)box('接水盘格栅',[-.32+i*.105,.175,.28],[.018,.012,.34],'detail','metal','#353d3d');
 }else throw new Error(`没有详细几何的资产: ${assetId}`);
 return {version:1,name:assetId,designSummary:'原生程序化家具：独立主体、真实支撑、圆润边缘与可见结构细节。目录模型不是按本次用户原话生成或通过视觉critic的定制成品。',parts};
}
