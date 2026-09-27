import type {FurnitureModelData,FurniturePartData} from '../../../../packages/contracts/alva/furniture-model.js';
/** Original CC0 assemblies in normalized local coordinates. */
export function homeFixture(id:string,color:string):FurnitureModelData|undefined{
 const parts:FurniturePartData[]=[];const white='#F5F4EF',metal='#9BA5A4',dark='#344650';
 const add=(label:string,shape:FurniturePartData['shape'],p:number[],s:number[],role:FurniturePartData['role']='detail',material:FurniturePartData['material']='stone',tint=color,rotation=[0,0,0])=>parts.push({id:'fixture-'+parts.length,label,shape,position:p as [number,number,number],size:s as [number,number,number],role,material,color:tint,rotation:rotation as [number,number,number],radius:.04,path:[],profile:[]});
 const box=(l:string,p:number[],s:number[],r:FurniturePartData['role']='detail',m:FurniturePartData['material']='stone',c=color)=>add(l,'roundedBox',p,s,r,m,c);
 if(id==='alva-toilet'){
  add('陶瓷底座','ellipsoid',[0,.2,.05],[.64,.4,.55],'support');add('弧形便盆','ellipsoid',[0,.47,.13],[.96,.42,.72],'body');
  add('便盆内腔','ellipsoid',[0,.67,.16],[.63,.035,.46],'detail','stone','#D8DEDD');add('椭圆座圈','torus',[0,.695,.16],[.84,.065,.63],'detail','stone',white,[Math.PI/2,0,0]);
  box('后水箱',[0,.67,-.33],[.84,.58,.29],'body');box('水箱盖',[0,.976,-.33],[.88,.05,.32]);
  for(const x of [-.085,.085])add('冲水键','cylinder',[x,1.01,-.33],[.12,.025,.12],'detail','metal',metal);
  for(const x of [-.19,.19])box('座圈铰链',[x,.69,-.17],[.09,.04,.09],'detail','metal',metal);
 }else if(id==='alva-vanity'){
  box('洗手柜',[0,.29,0],[.96,.35,.86],'body','wood');for(const x of [-.44,.44])box('柜脚',[x,.07,0],[.065,.14,.72],'support','wood');
  for(const x of [-.24,.24]){box('独立柜门',[x,.29,.45],[.45,.32,.035],'detail','wood');box('细拉手',[x,.43,.48],[.27,.012,.025],'detail','metal',metal)}
  box('洗手台面',[0,.49,0],[1,.055,1],'body','stone',white);add('洗手盆','ellipsoid',[0,.535,.03],[.72,.1,.64],'body','stone',white);add('盆内腔','ellipsoid',[0,.581,.04],[.55,.015,.43],'detail','stone','#D4DED9');
  add('龙头','cylinder',[0,.61,-.35],[.035,.2,.045],'support','metal',metal);box('出水嘴',[0,.71,-.24],[.035,.025,.25],'detail','metal',metal);box('圆角镜框',[0,.84,-.47],[.85,.32,.035],'body','wood',white);box('镜面',[0,.84,-.446],[.79,.28,.008],'detail','metal','#D6E2E1');
 }else if(id==='alva-shower'){
  box('低门槛底盘',[0,.025,0],[1,.05,1],'support','stone',white);box('底盘内侧',[0,.052,0],[.87,.018,.87],'body','stone','#DDE7E3');
  for(const x of [-.47,.47])box('后立柱',[x,.52,-.47],[.025,.94,.025],'support','metal',metal);
  box('侧玻璃',[-.48,.52,0],[.012,.92,.93],'body','glass','#D2E5DF');box('后玻璃',[0,.52,-.48],[.94,.92,.012],'body','glass','#D2E5DF');box('透明门',[.04,.52,.48],[.85,.92,.012],'body','glass','#DCEAE7');box('门侧柱',[.48,.52,.48],[.02,.94,.025],'support','metal',metal);box('门把',[.34,.48,.5],[.018,.11,.022],'detail','metal',metal);
  box('花洒管',[.15,.6,-.44],[.022,.69,.022],'detail','metal',metal);box('顶喷连接臂',[.15,.945,-.29],[.022,.02,.3],'detail','metal',metal);add('顶喷盘','cylinder',[.15,.93,-.12],[.27,.018,.27],'detail','metal',metal);box('混水阀',[.15,.46,-.41],[.25,.04,.035],'detail','metal',metal);add('地漏','cylinder',[.27,.064,-.25],[.09,.008,.09],'detail','metal',metal);
 }else if(id==='alva-projector'){
  box('投影矮柜',[0,.35,0],[1,.55,.95],'body','wood');for(const x of [-.42,.42])box('柜脚',[x,.075,0],[.07,.15,.75],'support','wood');
  for(const x of [-.25,.25]){box('分体柜门',[x,.35,.49],[.47,.5,.025],'detail','wood');box('门拉手',[x,.4,.51],[.18,.018,.02],'detail','metal',metal)}
  box('投影仪',[0,.78,0],[.48,.28,.7],'body','metal',white);add('镜头','cylinder',[-.12,.79,.365],[.16,.16,.045],'detail','glass',dark,[Math.PI/2,0,0]);add('镜头环','torus',[-.12,.79,.39],[.18,.18,.02],'detail','metal',metal);
  for(let i=0;i<5;i++)box('散热格栅',[.13,.70+i*.035,.36],[.12,.012,.01],'detail','metal',dark);add('电源键','cylinder',[.13,.935,-.1],[.035,.018,.035],'detail','metal',metal);
 }else if(id==='alva-screen'){
  box('幕框',[0,.57,0],[1,.86,.18],'body','metal','#D8D8D1');box('浅灰幕面',[0,.57,.1],[.95,.80,.015],'body','fabric',white);
  for(const x of [-.38,.38]){box('幕布支柱',[x,.08,-.01],[.025,.16,.1],'support','metal',metal);box('平稳底脚',[x,.012,0],[.14,.024,1],'support','metal',metal)}
  for(const x of [-.475,.475])box('框饰条',[x,.57,.12],[.012,.8,.008],'detail','metal',white);box('上卷轴',[0,1.005,0],[1,.025,.22],'detail','metal',white);box('卷轴端盖',[.49,1.005,0],[.025,.03,.25],'detail','metal',metal);
 }else if(id==='alva-gaming-desk'){
  box('电竞桌面',[0,.6,0],[1,.055,1],'body','wood');for(const x of [-.44,.44]){box('桌腿',[x,.3,0],[.045,.6,.78],'support','metal',white);box('桌脚',[x,.018,0],[.15,.025,.85],'support','metal',white)}
  box('显示器支架',[0,.75,-.23],[.05,.25,.05],'support','metal',dark);box('显示器底座',[0,.64,-.18],[.27,.025,.28],'support','metal',dark);box('显示器边框',[0,.86,-.29],[.62,.29,.05],'body','metal',white);box('浅蓝屏幕',[0,.86,-.26],[.59,.26,.008],'detail','glass','#A5BCD4');
  box('桌垫',[0,.635,.17],[.69,.008,.37],'detail','fabric','#CEDBD8');box('键盘',[0,.65,.09],[.38,.02,.14],'detail','metal',white);for(let i=0;i<9;i++)box('键帽',[-.16+i*.04,.667,.08],[.025,.01,.1],'detail','stone',white);add('鼠标','ellipsoid',[.28,.658,.14],[.06,.025,.10],'detail','metal',white);box('主机箱',[.35,.25,-.12],[.23,.46,.53],'body','metal',white);box('主机侧板',[.47,.25,-.12],[.008,.37,.42],'detail','glass','#BCD5D9');
 }else if(id==='alva-kitchen-unit'){
  box('厨房地柜',[0,.43,0],[1,.8,.95],'body','wood');box('踢脚板',[0,.04,.34],[.9,.08,.12],'support','wood','#B7B1A4');box('浅色台面',[0,.875,0],[1,.065,1],'body','stone',white);
  for(const x of [-.33,0,.33]){box('分区柜门',[x,.44,.49],[.31,.72,.025],'detail','wood');box('柜门拉手',[x,.76,.51],[.2,.018,.025],'detail','metal',metal)}
  box('水槽内腔',[-.26,.914,-.03],[.31,.015,.55],'detail','metal','#8EAAA7');for(const x of [-.43,-.09])box('水槽边框',[x,.93,-.03],[.016,.025,.61],'detail','metal',metal);for(const z of [-.32,.26])box('水槽边框',[-.26,.93,z],[.36,.025,.014],'detail','metal',metal);
  add('龙头柱','cylinder',[-.26,1.035,-.37],[.022,.27,.045],'support','metal',metal);box('龙头出水嘴',[-.26,1.16,-.27],[.022,.022,.24],'detail','metal',metal);box('双头灶',[.25,.925,0],[.37,.018,.65],'detail','glass',dark);for(const z of [-.16,.16]){add('灶圈','torus',[.25,.95,z],[.2,.018,.19],'detail','metal',metal,[Math.PI/2,0,0]);add('灶芯','cylinder',[.25,.935,z],[.08,.02,.08],'detail','metal',dark)}
 }else return undefined;
 return {version:1,name:id,designSummary:'原创程序化家具与卫浴，包含物件主体、支撑和可辨识五金细节，用于空间搭配可视化。不是实测商品或本轮视觉critic定制模型。',parts};
}
