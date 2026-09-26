export function visionQuestionInput(messageId:string,quote='喜欢浅木色，但不喜欢每天擦柜子'){
 return {questionId:'Q07a',expectedVersion:0,hypothesis:'我猜你可能想要明亮、暖和且不显杂乱的家。',basis:[{id:'message:'+messageId,quote}],uncertainty:'还不知道你更喜欢浅木色，还是更有色彩的组合。',question:'想象回家看到下面的墙面、地板和柜子，你更想住在哪一种里？',reason:'用实际搭配验证色彩需求。',options:[
  {id:'A' as const,title:'暖白墙配浅木柜',outcome:'房间看起来温暖、颜色较统一。',example:'暖白墙、浅木色标准双门柜与米色沙发搭配。',tradeoff:'整体变化比较柔和，不适合想要强烈色彩的人。',value:'Q07a.warm_light_wood'},
  {id:'B' as const,title:'白墙配彩色小柜',outcome:'背景明亮，常用区域有明显的色彩点缀。',example:'白墙配浅绿标准柜和深蓝抱枕。',tradeoff:'后续增加家具时需要留意颜色是否协调。',value:'Q07a.white_pops'},
 ],assumptions:['仅为配色和使用效果示例，尺寸、材料性能和实际布局尚未验证。'],recommendedOptionId:null,recommendationReason:''};
}
