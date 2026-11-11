/** An intentionally partial, unoptimized model plan; demonstrates schema and autofill. */
export const sampleDraft = {
  format:'coc-th18-draft-v1',description:'演示：偏置核心及分散防空（非经过实战验证的阵型）',
  grid:{width:44,height:44},
  placements:[
    {id:'town_hall',x:19,y:19},
    {id:'hero_hall',x:9,y:20},
    {id:'clan_castle',x:24,y:20},
    {id:'revenge_tower',x:20,y:11},
    {id:'monolith',x:29,y:26},
    {id:'hidden_tesla',x:18,y:27},
    {id:'giant_bomb',x:15,y:24}
  ],
  autoFill:[
    {id:'air_defense',count:4,region:'distributed',minSeparation:12},
    {id:'scattershot',count:2,region:'distributed',minSeparation:15},
    {id:'firespitter',count:2,region:'distributed',minSeparation:16}
  ]
};
