'use strict';
window.RoomStudyModel=(()=>{
 const objects=[],colliders=[],walls=[],rooms=[];
 const add=(name,p,size,mat='wood',opts={})=>{const o={id:'o'+objects.length,name,p,size,mat,yaw:opts.yaw||0,kind:opts.kind||'furniture',note:opts.note||'',selectable:opts.selectable!==false,collide:opts.collide!==false};objects.push(o);if(o.collide&&o.kind!=='decor')colliders.push({minX:p[0]-size[0]/2,maxX:p[0]+size[0]/2,minZ:p[2]-size[2]/2,maxZ:p[2]+size[2]/2,type:o.kind,id:o.id});return o};
 const wall=(name,p,size)=>{walls.push(add(name,p,size,'wall',{kind:'wall',note:'按原平面图重建的墙体',selectable:false}))};
 // Approx. 11.2 m × 6.8 m footprint, 2.8 m height. Source image has no dimensions.
 add('整屋地面',[5.6,-.05,3.4],[11.2,.1,6.8],'floor',{kind:'floor',collide:false,selectable:false});
 // Outer walls with simplified openings retained as gaps.
 wall('北墙-左',[1.2,1.4,.08],[2.2,2.8,.16]); wall('北墙-中',[4.55,1.4,.08],[3.1,2.8,.16]); wall('北墙-右',[8.75,1.4,.08],[3.2,2.8,.16]);
 wall('西墙',[.08,1.4,3.4],[.16,2.8,6.8]); wall('东墙上',[10.32,1.4,1.8],[.16,2.8,3.45]); wall('东墙下',[11.2,1.4,5.2],[.16,2.8,3.25]); wall('南墙',[5.65,1.4,6.8],[11.1,2.8,.16]);
 // Internal partitions, leaving door gaps.
 wall('主卧隔墙A',[2.0,1.4,3.55],[3.2,2.8,.16]); wall('主卧隔墙B',[5.2,1.4,2.25],[.16,2.8,2.45]);
 wall('次卧隔墙',[3.45,1.4,5.35],[.16,2.8,2.75]);
 wall('厨房隔墙',[7.75,1.4,1.8],[.16,2.8,3.4]); wall('厨房南墙',[9.0,1.4,3.55],[2.2,2.8,.16]);
 wall('卫浴西墙',[9.55,1.4,4.75],[.16,2.8,2.3]); wall('卫浴北墙',[10.35,1.4,3.62],[1.55,2.8,.16]);
 // Window glass strips, purely visual.
 add('主卧北窗',[2.95,1.65,.10],[1.45,1.15,.04],'glass',{kind:'decor',collide:false,selectable:false});
 add('西侧窗',[.10,1.65,1.55],[.04,1.15,1.15],'glass',{kind:'decor',collide:false,selectable:false});
 add('厨房东窗',[10.30,1.65,1.45],[.04,1.15,1.3],'glass',{kind:'decor',collide:false,selectable:false});
 // Master bedroom furniture.
 add('主卧双人床',[1.9,.36,2.25],[2.05,.72,1.95],'fabric',{note:'基础几何床架、床垫和床品；尺寸为比例估算。'});
 add('主卧床头板',[1.9,.82,3.18],[2.12,1.0,.14],'wood',{note:'软包/木饰面示意。'});
 add('床头柜',[.55,.30,2.9],[.48,.60,.45],'wood'); add('床头柜',[3.28,.30,2.9],[.48,.60,.45],'wood');
 add('主卧衣柜',[4.94,1.15,2.25],[.48,2.3,1.25],'cabinet'); add('主卧书桌',[4.10,.38,.48],[1.48,.76,.58],'wood'); add('主卧工作椅',[4.10,.48,1.2],[.52,.96,.52],'sage');
 // Bedroom/study.
 add('次卧单人床',[2.25,.34,6.15],[1.0,.68,1.9],'fabric'); add('次卧书桌',[.95,.38,4.15],[1.3,.76,.58],'wood'); add('次卧工作椅',[.95,.48,4.82],[.52,.96,.52],'sage');
 // Dining/living.
 add('六人餐桌',[5.85,.40,5.25],[2.25,.80,1.35],'wood',{note:'按原图比例重建的六人餐桌。'});
 for(const p of [[5.25,.48,4.3],[6.45,.48,4.3],[5.25,.48,6.18],[6.45,.48,6.18],[4.45,.48,5.25],[7.3,.48,5.25]]) add('餐椅',p,[.48,.96,.48],'fabric');
 add('客厅双人沙发',[8.38,.43,4.35],[1.55,.86,.82],'fabric',{note:'基础布艺沙发建模。'}); add('客厅茶几',[8.4,.24,5.35],[.78,.48,.78],'stone'); add('电视柜',[8.38,.26,6.5],[1.55,.52,.40],'wood'); add('电视',[8.38,1.05,6.62],[1.25,.72,.08],'dark',{collide:false});
 // Kitchen.
 add('厨房北侧橱柜',[8.75,.45,.48],[1.75,.90,.58],'cabinet'); add('厨房东侧橱柜',[9.92,.45,1.85],[.58,.90,2.15],'cabinet'); add('水槽',[8.52,.91,.47],[.52,.10,.38],'steel',{collide:false}); add('灶台',[9.93,.91,1.85],[.48,.08,.72],'dark',{collide:false}); add('冰箱',[9.95,.91,3.03],[.62,1.82,.62],'cabinet');
 // Bathroom.
 add('浴缸',[10.38,.30,4.06],[1.45,.60,.72],'ceramic'); add('坐便器',[10.18,.38,5.05],[.48,.76,.72],'ceramic'); add('洗手台',[9.85,.42,5.62],[.50,.84,.48],'wood');
 // Decorative plants / lamps.
 for(const p of [[3.0,.50,5.45],[9.12,.62,4.15],[5.62,1.55,.62]]) add('绿植/灯具',p,[.28,1.0,.28],'leaf',{kind:'decor',collide:false,selectable:false});
 rooms.push(
  {id:'entry',name:'玄关',p:[6.55,1.62,1.25],target:[6.2,1.15,4.0]},
  {id:'living',name:'客餐厅',p:[7.85,1.62,6.0],target:[7.8,1.0,4.3]},
  {id:'master',name:'主卧',p:[4.45,1.62,2.75],target:[1.9,.9,2.15]},
  {id:'study',name:'次卧 / 书房',p:[2.55,1.62,4.85],target:[1.75,.9,6.1]},
  {id:'kitchen',name:'厨房',p:[8.65,1.62,2.7],target:[8.65,1.05,.52]},
  {id:'bath',name:'卫浴',p:[10.72,1.62,5.55],target:[10.30,.9,4.15]}
 );
 const themes={
  oak:{name:'温润原木',wood:[.72,.52,.33],floor:[.67,.57,.45],fabric:[.83,.80,.73],sage:[.48,.57,.48],cabinet:[.77,.78,.70]},
  cream:{name:'暖白奶油',wood:[.83,.76,.63],floor:[.80,.73,.62],fabric:[.90,.84,.75],sage:[.68,.67,.57],cabinet:[.87,.84,.77]},
  walnut:{name:'沉静胡桃',wood:[.36,.23,.15],floor:[.48,.40,.31],fabric:[.68,.67,.60],sage:[.35,.45,.39],cabinet:[.50,.54,.49]}
 };
 const fixed={wall:[.83,.82,.77],glass:[.42,.67,.72],stone:[.73,.73,.68],steel:[.55,.59,.58],dark:[.08,.10,.09],ceramic:[.88,.89,.84],leaf:[.25,.36,.23]};
 return{objects,walls,colliders,rooms,themes,fixed,bounds:{minX:.15,maxX:11.05,minZ:.15,maxZ:6.65},wallHeight:2.8};
})();
