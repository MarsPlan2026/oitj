'use strict';
/* =====================================================================
   一、纯逻辑：随机数、地图、数据定义（无 DOM 依赖）
   ===================================================================== */
function hashStr(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h>>>0}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function rngFor(seed,key){return mulberry32(hashStr(seed+'|'+key))}
const pick=(r,a)=>a[Math.floor(r()*a.length)];
const ri=(r,a,b)=>a+Math.floor(r()*(b-a+1));

const W=7, ROWS=15;           // 7 列，15 层，第 16 层为 首领
const SPECIAL=['elite','rest','shop'];

/* ---------- 难度 ---------- */
const DNAMES=['起步','热身','初试','小试牛刀','渐入佳境','中段考验','深水区','攀登','极限','巅峰','先古试炼'];

/* 三个大难度，每个都有 0~10 共 11 个进阶。lo/hi 是该大难度的题目难度范围（洛谷难度数值） */
const TIERS=[{n:'普及',lo:1,hi:4},{n:'提高',lo:3,hi:5},{n:'省选',lo:5,hi:7}];
/* 洛谷难度数值 -> 颜色与名称（c：颜色，n：官方名称） */
const LV=[{c:'灰',n:'未评定'},{c:'红',n:'入门'},{c:'橙',n:'普及-'},{c:'黄',n:'普及/提高-'},{c:'绿',n:'普及+/提高'},{c:'蓝',n:'提高+/省选-'},{c:'紫',n:'省选/NOI-'},{c:'黑',n:'NOI/NOI+/CTSC'}];
const GI_MAX=TIERS.length*11-1;            // 全局难度序号 0..32，序号 = 大难度*11 + 难度
const giOf=(tier,d)=>tier*11+d;
const giName=gi=>TIERS[Math.floor(gi/11)].n+' · 进阶 '+(gi%11)+' · '+DNAMES[gi%11];
const lvChip=v=>`<span class="chip lv lv${v}">${v===0?LV[v].n:LV[v].c}</span>`;
const lvChips=a=>a.map(lvChip).join('<span class="dim">~</span>');
const needCount=n=>Math.max(1,Math.floor(n*2/3));   // 联机时每个战斗房间需要抽的题数：floor(人数/3*2)，至少 1
const MODS=[
  '基础规则：共三幕，击败每幕尽头的首领方可通关。普及/提高时限：普通 20 分钟、精英 40 分钟、首领 60 分钟；省选时限：普通 60 分钟、精英 90 分钟、首领 120 分钟。超时后每 5 分钟扣血。',
  '精英战斗更为常见。',
  '休息处的回复比例由 30% 降为 20%。',
  '战斗所得金币 -25%。',
  '药水栏位 -1。',
  '初始最大生命 -10。',
  '商店价格 +25%。',
  '超时扣血 +25%。',
  '幕与幕之间只恢复一半生命。',
  '首领战斗的超时扣血 +50%；不再携带初燃之血。',
  '未知之地更易遭遇凶险；第三幕须连续击败两位首领。'
];
function P(d){return{
  eliteW:d>=1?0.14:0.09, restPct:d>=2?0.2:0.3, goldMult:d>=3?0.75:1, slots:d>=4?2:3,
  startMax:100-(d>=5?10:0), shopMult:d>=6?1.25:1, failMult:d>=7?1.25:1, actHeal:d>=8?0.5:1,
  bossFailMult:d>=9?1.5:1, noStarter:d>=9, badEvent:d>=10?0.25:0 }}

/* ---------- 地图生成（仿杀戮尖塔：6 条不交叉路径） ---------- */
function genMap(seed,act,diff,ov){
  const r=rngFor(seed,'map'+act);
  const nodes=[];
  const dbl=(diff===10&&act===3);
  for(let i=0;i<=ROWS+(dbl?1:0);i++)nodes.push(new Array(W).fill(null));
  const starts=[];
  for(let p=0;p<6;p++){
    let c;
    if(p<2){do{c=Math.floor(r()*W)}while(p===1&&c===starts[0])}else c=Math.floor(r()*W);
    starts.push(c);
    for(let row=0;row<ROWS;row++){
      if(!nodes[row][c])nodes[row][c]={r:row,c,next:[],type:null};
      if(row===ROWS-1)break;
      const cand=[c-1,c,c+1].filter(x=>x>=0&&x<W);
      for(let i=cand.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[cand[i],cand[j]]=[cand[j],cand[i]]}
      let nc=c;
      for(const x of cand){
        if(x===c+1){const o=nodes[row][c+1];if(o&&o.next.includes(c))continue}
        if(x===c-1){const o=nodes[row][c-1];if(o&&o.next.includes(c))continue}
        nc=x;break;
      }
      const n=nodes[row][c];
      if(!n.next.includes(nc))n.next.push(nc);
      c=nc;
    }
  }
  // 顶层节点汇入 首领
  for(let c=0;c<W;c++){const n=nodes[ROWS-1][c];if(n)n.next=[3]}
  nodes[ROWS][3]={r:ROWS,c:3,next:dbl?[3]:[],type:'boss'};
  if(dbl)nodes[ROWS+1][3]={r:ROWS+1,c:3,next:[],type:'boss'};
  // 房间类型
  const pr=Object.assign(P(diff),ov||{});
  for(let row=0;row<ROWS;row++)for(let c=0;c<W;c++){
    const n=nodes[row][c];if(!n)continue;
    if(row===0){n.type='monster';continue}
    if(row===8){n.type='treasure';continue}
    if(row===ROWS-1){n.type='rest';continue}
    const pool=[['monster',0.45],['unknown',0.22],['elite',pr.eliteW],['rest',0.12],['shop',0.05]].filter(([t])=>{
      if((t==='elite'||t==='rest')&&row<4)return false;
      if(t==='rest'&&row===ROWS-2)return false;
      if(SPECIAL.includes(t)){
        for(let pc=0;pc<W;pc++){
          const p=nodes[row-1][pc];
          if(p&&p.next.includes(c)){
            if(p.type===t)return false;
            for(const sc of p.next){if(sc!==c&&nodes[row][sc]&&nodes[row][sc].type===t)return false}
          }
        }
      }
      return true;
    });
    let tot=0;pool.forEach(x=>tot+=x[1]);
    let v=r()*tot,t='monster';
    for(const x of pool){v-=x[1];if(v<=0){t=x[0];break}}
    n.type=t;
  }
  return {nodes};
}

/* ---------- 题目难度提示 ---------- */
const KIND_WIN={monster:[0,0.6],elite:[0.2,0.8],boss:[0.45,1]};   // 各类房间在大难度颜色范围里占的区间
/* 返回 {lv:[洛谷难度数值...]}：越高的难度与重越靠近范围上限，同重里 首领 > 精英 > 普通 */
function problemHint(run,kind,node){
  if(run.custom){const k=run.custom.kinds[kind],lv=[];for(let v=k.lo;v<=k.hi;v++)lv.push(v);return{lv,v:k.lo}}
  const t=TIERS[run.tier||0],w=KIND_WIN[kind];
  const p=Math.min(1,(run.difficulty*3+(run.act-1))/32);
  const jr=rngFor(run.seed,'ph'+run.act+'_'+node.r+'_'+node.c);
  let f=w[0]+(w[1]-w[0])*p+(jr()-0.5)*0.06;
  if(node.r>ROWS)f=1;
  f=Math.max(0,Math.min(1,f));
  const v=t.lo+(t.hi-t.lo)*f,cl=x=>Math.max(t.lo,Math.min(t.hi,x));
  const a=cl(Math.floor(v+1e-9)),b=cl(Math.ceil(v-1e-9));
  return {lv:a===b?[a]:[a,b],v:Math.round(v*100)/100};
}
const hintLevels=rm=>rm&&rm.hint&&Array.isArray(rm.hint.lv)&&rm.hint.lv.length?rm.hint.lv:[3];
const TOPICS=['数据结构','动态规划','图论','数学 / 数论','字符串','贪心','搜索 / 剪枝','构造','二分 / 三分','计算几何','模拟','博弈论'];
const MONSTER_NAMES=['水题史莱姆','模板傀儡','贪心小妖','DP 幼苗','字符串蝙蝠','图论蜘蛛','数学幽灵','二分地精','暴力哥布林'];
const ELITE_NAMES=['卡常怪','边界数据','毒瘤构造','反哈希魔像','大模拟','交互题恶魔'];
const BOSS_NAMES=['暴力杀手','毒瘤数据结构','出题人本人'];
const BOSS2_NAME='命题组组长';
const STAGE_NAMES=['第一幕 · 初赛','第二幕 · 复赛','第三幕 · 决赛'];

/* ---------- 遗物 ----------
   e：效果；描述 d 由效果自动生成，保证说明与实际数值一致。r：品阶（common 普通 / uncommon 罕见 / rare 稀有） */
const RELICS={
  starter:{n:'初燃之血',r:'starter',e:{winHeal:2}},
  brush:{n:'机械键盘',r:'common',e:{timeAll:5}},
  tea:{n:'保温杯',r:'common',e:{restHeal:8}},
  abacus:{n:'对拍器',r:'uncommon',e:{failMult:-0.2}},
  scroll:{n:'板子库',r:'common',e:{goldMult:0.5}},
  ginkgo:{n:'梨',r:'uncommon',e:{maxHp:12}},
  pavilion:{n:'空调',r:'uncommon',e:{time_elite:10}},
  divine:{n:'玄学罗盘',r:'common',e:{goodEvent:0.25}},
  bill:{n:'会员卡',r:'common',e:{shopDiscount:0.2}},
  draft:{n:'草稿纸',r:'common',e:{potionDrop:0.35}},
  gourd:{n:'药水腰带',r:'uncommon',e:{slots:1}},
  teapot:{n:'咖啡机',r:'uncommon',e:{actCoffee:1}},
  lamp:{n:'防蓝光眼镜',r:'uncommon',e:{time_boss:10}},
  jade:{n:'自动机护符',r:'rare',e:{actShield:1}},
  purse:{n:'沉重钱袋',r:'common',e:{gold:150}},
  bamboo:{n:'幸运星',r:'rare',e:{timeAll:3,slots:1}},
  cricket:{n:'橡皮鸭',r:'common',e:{time_monster:4}},
  errata:{n:'错题本',r:'common',e:{drainCut:2}},
  pillow:{n:'颈椎按摩仪',r:'uncommon',e:{drainCut:3}},
  couch:{n:'软枕',r:'uncommon',e:{restHeal:15}},
  ginseng:{n:'能量饮料',r:'uncommon',e:{winHeal:4}},
  midas:{n:'金手指',r:'rare',e:{goldMult:1}},
  coinjar:{n:'存钱罐',r:'common',e:{gold:80,shopDiscount:0.1}},
  inkstone:{n:'旧键盘',r:'common',e:{timeAll:3}},
  screen:{n:'降噪耳机',r:'uncommon',e:{time_elite:8,time_boss:8}},
  toolkit:{n:'万能工具箱',r:'common',e:{goldMult:0.2,potionDrop:0.2}},
  seal:{n:'草莓',r:'common',e:{maxHp:8}},
  compass:{n:'校验罗盘',r:'uncommon',e:{failMult:-0.15}},
  sachet:{n:'毛绒玩具',r:'common',e:{goodEvent:0.15}},
  ration:{n:'加班餐',r:'common',e:{potionHeal:10}},
  notes:{n:'纸质讲义',r:'uncommon',e:{restPotion:1}},
  heirloom:{n:'祖传U盘',r:'common',e:{eventGold:30}},
  trophy:{n:'金杯',r:'rare',e:{maxHp:20}},
  tripod:{n:'金色小像',r:'uncommon',e:{winGold:15}},
  library:{n:'万能模板库',r:'rare',e:{timeAll:10}},
  nightoil:{n:'肝帝套装',r:'rare',e:{drainCut:5}},
  swift:{n:'速通键盘',r:'rare',e:{time_elite:15,time_boss:15}},
  treasury:{n:'氪金卡',r:'rare',e:{gold:300,shopDiscount:0.2}},
  medbox:{n:'急救药箱',r:'rare',e:{restHeal:25}},
  dragonblood:{n:'肾上腺素',r:'rare',e:{winHeal:8}},
  alchemy:{n:'炼金台',r:'rare',e:{potionDrop:0.5,slots:1}},
  ganoderma:{n:'营养补剂',r:'uncommon',e:{potionHeal:20}},
  fortune:{n:'幸运之手',r:'rare',e:{goodEvent:0.4}},
  twinjade:{n:'双层护符',r:'rare',e:{actShield:2}},
  boxing:{n:'蟠桃',r:'rare',e:{maxHp:25}},
  seclusion:{n:'闭关修炼',r:'uncommon',e:{winMaxHp:1}},
  clepsydra:{n:'沙漏',r:'rare',e:{tickMin:2}},
  ember:{n:'不灭的灯',r:'uncommon',e:{timeAll:4,drainCut:2}},
  mentor:{n:'导师笔记',r:'uncommon',e:{maxHp:10,slots:1}},
  /* 以下为新增 */
  inkslab:{n:'磨刀石',r:'common',e:{eliteMaxHp:2}},
  windchime:{n:'风铃',r:'common',e:{eventHeal:6}},
  pine:{n:'余烬',r:'uncommon',e:{actHeal:15}},
  ironbrush:{n:'屠魔之刃',r:'uncommon',e:{drainCut_boss:6}},
  tally:{n:'猎手徽记',r:'uncommon',e:{drainCut_elite:4}},
  bronzemirror:{n:'幸运硬币',r:'common',e:{winGold:8}},
  vaultkey:{n:'宝箱钥匙',r:'uncommon',e:{chestGold:60}},
  laurel:{n:'胜利桂冠',r:'rare',e:{bossHeal:30,bossMaxHp:6}},
  dragonseal:{n:'龙之印记',r:'rare',e:{timeAll:6,drainCut:3}},
  cloudrobe:{n:'商人长袍',r:'uncommon',e:{shopDiscount:0.15,maxHp:6}},
  phoenix:{n:'涅槃之羽',r:'rare',e:{revive:1}},
  tortoise:{n:'龟壳',r:'rare',e:{failMult:-0.25}},
  silkmap:{n:'地图碎片',r:'common',e:{timeAll:2,goodEvent:0.1}},
  bell:{n:'召唤铃铛',r:'common',e:{gold:60,maxHp:5}},
  sword:{n:'匕首',r:'uncommon',e:{time_monster:8,time_elite:8}},
  elixirbox:{n:'药水包',r:'uncommon',e:{slots:1,potionDrop:0.2}},
  harvest:{n:'丰收',r:'uncommon',e:{goldMult:0.4,winHeal:2}},
  spring:{n:'圣泉',r:'rare',e:{restHeal:20,restMaxHp:3}},
  goldabacus:{n:'金色算盘',r:'rare',e:{shopDiscount:0.25,goldMult:0.3}},
  armillary:{n:'星象仪',r:'rare',e:{timeAll:8,goodEvent:0.2}},
  slips:{n:'竹简',r:'common',e:{drainCut:1,timeAll:2}},
  inkwash:{n:'小水瓶',r:'common',e:{winHeal:3}},
  moon:{n:'月光护符',r:'uncommon',e:{actPotion:1}},
  stele:{n:'不朽之碑',r:'rare',e:{maxHp:15,winHeal:5}},
  decree:{n:'王令',r:'rare',e:{timeAll:5,tickMin:1}}
};
/* 由效果生成描述 */
(function(){
  const pc=v=>Math.round(Math.abs(v)*100)+'%';
  const F={
    timeAll:v=>'所有战斗时限 +'+v+' 分钟', time_monster:v=>'普通战斗时限 +'+v+' 分钟', time_elite:v=>'精英战斗时限 +'+v+' 分钟', time_boss:v=>'首领战斗时限 +'+v+' 分钟',
    failMult:v=>'超时扣血 '+(v<0?'-':'+')+pc(v), drainCut:v=>'超时每次扣血 -'+v, drainCut_boss:v=>'首领战斗超时每次扣血 -'+v, drainCut_elite:v=>'精英战斗超时每次扣血 -'+v,
    tickMin:v=>'超时扣血的间隔 +'+v+' 分钟', actShield:v=>v>1?'每一幕前 '+v+' 场战斗不受超时扣血':'每一幕的第一场战斗不受超时扣血',
    winHeal:v=>'每场战斗取胜后回复 '+v+' 点生命', winMaxHp:v=>'每场战斗取胜后最大生命 +'+v, winGold:v=>'每场战斗取胜后额外 +'+v+' 金币',
    goldMult:v=>'战斗金币奖励 +'+pc(v), potionDrop:v=>'药水掉落率 +'+pc(v), slots:v=>'药水栏位 +'+v,
    maxHp:v=>'获得时最大生命 +'+v+'，并回复等量生命', gold:v=>'获得时得到 '+v+' 金币', shopDiscount:v=>'商店价格 -'+pc(v),
    goodEvent:v=>'未知之地更易出现吉事（+'+pc(v)+'）', restHeal:v=>'在休息处额外回复 '+v+' 点生命', restPotion:v=>'在休息处「炮制」时多得 '+v+' 瓶药水', restMaxHp:v=>'每次在休息处歇息，最大生命 +'+v,
    potionHeal:v=>'回复类药水额外回复 '+v+' 点生命', eventGold:v=>'每次事件结束额外 +'+v+' 金币', eventHeal:v=>'每次事件结束回复 '+v+' 点生命',
    actHeal:v=>'每进入新的一幕，回复 '+v+' 点生命', actCoffee:()=>'每进入新的一幕，获得一杯咖啡', actPotion:()=>'每进入新的一幕，获得一瓶随机药水',
    eliteMaxHp:v=>'每场精英战斗取胜后最大生命 +'+v, chestGold:v=>'开启宝箱时额外 +'+v+' 金币', bossHeal:v=>'击败首领后回复 '+v+' 点生命', bossMaxHp:v=>'击败首领后最大生命 +'+v,
    revive:()=>'生命归零时，以一半生命重新站起（仅一次）'
  };
  for(const k in RELICS){const r=RELICS[k];r.d=Object.keys(r.e).map(x=>F[x]?F[x](r.e[x]):x).join('；')+'。'}
})();
const RELIC_PRICE={common:140,uncommon:220,rare:320,starter:0};
const RARITY_NAME={common:'普通',uncommon:'罕见',rare:'稀有',starter:'初始'};

/* ---------- 药水 ---------- */
const POTIONS={
  coffee:{n:'咖啡',d:'战斗中使用：本场时限 +10 分钟。',w:3,price:55,combat:true},
  espresso:{n:'浓缩咖啡',d:'战斗中使用：本场时限 +20 分钟。',w:1,price:95,combat:true},
  heal:{n:'治疗药水',d:'回复 25 点生命。',w:3,price:60},
  insure:{n:'保险药水',d:'战斗中使用：本场不再受超时扣血。',w:2,price:90,combat:true},
  partial:{n:'暴力分药水',d:'战斗中使用：本场超时扣血减半。',w:2,price:60,combat:true},
  lucky:{n:'幸运药水',d:'战斗中使用：本场取胜所得金币翻倍。',w:2,price:50,combat:true},
  chosen:{n:'天选之子',d:'获得一件随机遗物。',w:0,price:200},
  bandage:{n:'创可贴',d:'回复 15 点生命。',w:3,price:35},
  bigheal:{n:'大治疗药水',d:'回复 50 点生命。',w:1,price:100},
  vital:{n:'活力药水',d:'最大生命 +6，并回复 6 点。',w:1,price:90},
  guard:{n:'护体药水',d:'战斗中使用：本场超时每次扣血 -10（至少 1 点）。',w:2,price:70,combat:true},
  fullheal:{n:'完全治疗药水',d:'回复 100 点生命。',w:0.6,price:160},
  timewarp:{n:'时间药水',d:'战斗中使用：本场时限 +30 分钟。',w:0.8,price:140,combat:true},
  recover:{n:'镇静药水',d:'战斗中使用：回复 20 点生命，并使本场时限 +5 分钟。',w:1.5,price:80,combat:true},
  greed:{n:'财富药水',d:'立即获得 120 金币。',w:1.5,price:70},
  tonic:{n:'成长药水',d:'最大生命 +12，并回复 12 点。',w:0.5,price:160}
};

/* ---------- 随机选择 ---------- */
function randPotion(r,allowChosen){
  const ids=Object.keys(POTIONS).filter(k=>allowChosen||POTIONS[k].w>0);
  let tot=0;ids.forEach(k=>tot+=Math.max(POTIONS[k].w,0.01));
  let v=r()*tot;
  for(const k of ids){v-=Math.max(POTIONS[k].w,0.01);if(v<=0)return k}
  return ids[0];
}
function randRelic(r,owned,rarity){
  const rw={common:60,uncommon:32,rare:8};
  let ids=Object.keys(RELICS).filter(k=>RELICS[k].r!=='starter'&&!owned.includes(k));
  if(rarity)ids=ids.filter(k=>RELICS[k].r===rarity);
  if(!ids.length)return null;
  let tot=0;ids.forEach(k=>tot+=rw[RELICS[k].r]);
  let v=r()*tot;
  for(const k of ids){v-=rw[RELICS[k].r];if(v<=0)return k}
  return ids[0];
}
const fmtTime=ms=>{ms=Math.max(0,Math.ceil(ms/1000));const m=Math.floor(ms/60),s=ms%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')};

const LG_TAGS={"algorithm":["语言入门","字符串","后缀自动机 SAM","字典树 Trie","AC 自动机","KMP 算法","后缀数组 SA","后缀树","有限状态自动机","回文自动机 PAM","Manacher 算法","顺序结构","分支结构","循环结构","数组","字符串（入门）","结构体","函数与递归","Lyndon 分解","Z 函数","动态规划 DP","搜索","广度优先搜索 BFS","深度优先搜索 DFS","剪枝","记忆化搜索","启发式搜索","迭代加深搜索","启发式迭代加深搜索 IDA*","Dancing Links","爬山算法 Local search","模拟退火","背包 DP","数位 DP","区间 DP","树形 DP","轮廓线 DP","线性 DP","状压 DP","后缀平衡树","数学","图论","Kruskal 重构树","网络流","信息论","随机调整","遗传算法","图论建模","图遍历","拓扑排序","最短路","生成树","平面图","最小环","A*  算法","折半搜索 meet in the middle","梯度下降法","拉格朗日乘数法","拉格朗日插值法","单位根反演","负权环","连通块","2-SAT","平面图欧拉公式","强连通分量","Tarjan","双连通分量","欧拉回路","差分约束","仙人掌","二分图","一般图的最大匹配","上下界网络流","最小割","费用流","圆方树","弦图","Floyd 算法","广义串并联图","Hall 定理","计算几何","树形数据结构","线段树","并查集","平衡树","堆","树状数组","cdq 分治","可并堆","动态树 LCT","三维计算几何","向量","凸包","叉积","线段相交","半平面交","旋转卡壳","极角排序","平面几何","闵可夫斯基和 Minkowski sum","博弈论","线性数据结构","单调队列","颜色段均摊（珂朵莉树 ODT）","树套树","可持久化线段树","可持久化","前缀和","栈","队列","博弈树","整体二分","K-D Tree","Nim 积","李超线段树","吉司机线段树 segment tree beats","线段树合并","SG 函数","二区间合并（猫树分治）","KTT / Kinetic Tournament Tree","原根","多项式","数论","素数判断","最大公约数 gcd","扩展欧几里德算法","不定方程","进制","分块","ST 表","快速傅里叶变换 FFT","快速数论变换 NTT","快速沃尔什变换 FWT","快速莫比乌斯变换 FMT","差分","链表","单调栈","Berlekamp-Massey(BM) 算法","集合幂级数，子集卷积","哈希表","模拟","贪心","基础算法","中国剩余定理 CRT","莫比乌斯反演","逆元","Lucas 定理","类欧几里得算法","调和级数","欧拉降幂","Stern-Brocot 树","整除分块","Dirichlet 卷积","大步小步算法 BSGS","二次剩余","Bézout 定理","杜教筛","欧拉函数","线性筛法","亚线性快速求和算法","递推","倍增","二分","递归","枚举","分治","排序","动态规划优化","优先队列","矩阵加速","斜率优化","状态合并","凸完全单调性（wqs 二分）","四边形不等式","DP 套 DP","动态 DP","决策单调性","STL","整体转移","斜率维护技巧 slope trick","点分治","树上启发式合并","树的遍历","最近公共祖先 LCA","树的直径","树链剖分","树论","群论","置换","Pólya 定理","虚树","组合数学","排列组合","二项式定理","康托展开","基环树","动态树分治","Prüfer 序列","全局平衡二叉树","树的重心","LGV 引理","矩阵树定理","矩阵运算","鸽笼原理","容斥原理","Fibonacci 数列","Catalan 数","Stirling 数","生成函数","概率论","期望","线性代数","矩阵乘法","线性递推","高斯消元","Dilworth 定理","拉格朗日反演","杨表","随机游走 Markov Chain","鞅的停时定理","暴力数据结构","高精度","莫队","三分","离散化","霍夫曼树","哈希 hashing","线性基","微积分","导数","积分","定积分","级数","扫描线","其它技巧","随机化","位运算","构造","行列式","特征值","分数规划","线性规划","双指针 two-pointer","Ad-hoc","笛卡尔树","拟阵","根号分治","模拟费用流","分散层叠","均摊分析","分类讨论","近似算法","线段树分治","离线处理","bitset","组合优化","整数规划","原始对偶","启发式合并","反悔贪心","最大流最小割定理","保序回归"],"source":["各省省选","集训队互测","福建省历届夏令营","NOI","NOIP 普及组","NOIP 提高组","APIO","NOI 导刊","CTT（清华集训/北大集训）","网络流与线性规划 24 题","CSP-S 提高级","CSP-J 入门级","NOI Online","Ynoi","NOI 系列赛事","经典套题","国际知名赛事","WC","CTSC/CTS","模板题","USACO","POI（波兰）","IOI","CCO（加拿大）","CCC（加拿大）","CEOI（中欧）","eJOI（欧洲）","COCI（克罗地亚）","BalticOI（波罗的海）","JOI（日本）","AGM","PA（波兰）","ROI（俄罗斯）","EGOI（欧洲/女生）","NOISG（新加坡）","NordicOI（北欧）","BalkanOI（巴尔干半岛）","KOI（韩国）","RMI（罗马尼亚）","COI（克罗地亚）","洛谷原创","ICPC","洛谷月赛","语言月赛","洛谷比赛","大学竞赛","ROIR（俄罗斯）","INOI（伊朗）","UOI（乌克兰）","JOISC/JOIST（日本）","COTS（克罗地亚）","Google Code Jam","Moscow Olympiad","PO（瑞典）","PAIO","MCC/MCO（马来西亚）","KTSC（韩国）","IATI（保加利亚/东欧）","Google Kick Start","入门赛","蓝桥杯国赛","蓝桥杯省赛","省赛/邀请赛","传智杯","THUPC","GESP","其他竞赛","THUSC","高校校赛","THUWC","CSP-X 小学组","Code+","梦熊比赛","信息与未来","科创活动","BCSP-X","小学活动","初中活动","CSPro","CCPC","科大国创杯","蓝桥杯青少年组"],"time":["1996","1997","1998","1999","2000","2001","2002","2003","2004","2005","2006","2007","2008","2009","2010","2011","2012","2013","2014","2015","2016","2017","2018","2019","2020","2021","2022","2023","2024","2025","2026","2027","2028","2029","2077","2078","2079"],"region":["重庆","四川","河南","浙江","上海","福建","江苏","安徽","湖南","北京","河北","广东","山东","吉林","山西","江西","贵州","广西","陕西","国内省市","辽宁","云南","天津","湖北","黑龙江","海南","甘肃","青海","台湾","内蒙古","西藏","宁夏","新疆","香港","澳门","济南","南京","青岛","国内赛站","EC Final","国际赛区","NERC/NEERC","SEERC","CERC","NWRRC","WF","NAC","杭州","昆明","西安","哈尔滨","首尔","横浜","SWERC","成都","雅加达"],"special":["交互题","提交答案","Special Judge","O2优化","通信题"]};
//==UI==
/* =====================================================================
   二、状态与存档
   ===================================================================== */
const $app=document.getElementById('app');
let view='menu', run=null, selDiff=0, toastTimer=null, endSeen=false;
let drawMode=false, penColor='#ff5252', curStroke=null, lgPanel=false, vjPanel=false;
let vjBinding=null,vjUsernameInput='',vjChallengeId='',vjProblemId='',vjMessage='',vjBusy=false;
const LS_PROG='oi3_progress', LS_RUN='oi3_run', LS_NAME='oi2_name', LS_MPRUN='oi3_mprun', LS_VJ='oi3_vjudge',
  LS_HISTORY='oi3_history', LS_STATS_CONSENT='oi3_stats_consent', LS_ONBOARD='oi3_onboard';
let telemetryMsg='',onboardingOpen=lsGet(LS_ONBOARD)!=='1';
let savePanel=false,saveCode='',saveError='',savePausedCombat=null;
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}
try{const v=JSON.parse(lsGet(LS_VJ));if(v&&/^[A-Za-z0-9_.-]{1,40}$/.test(v.username||'')&&/^[a-f0-9]{64}$/.test(v.token||''))vjBinding=v}catch(e){}
function vjForgetBinding(){
  if(!vjBinding)return;
  vjUsernameInput=vjBinding.username;vjBinding=null;lsDel(LS_VJ);
  if(net.connected)netSend({t:'vbind',token:''});
}
let theme=lsGet('oi_theme')==='dark'?'dark':'light';      // 默认浅色
function applyTheme(){document.documentElement.setAttribute('data-theme',theme)}
applyTheme();
function ssGet(k){try{return sessionStorage.getItem(k)}catch(e){return null}}
function ssSet(k,v){try{sessionStorage.setItem(k,v)}catch(e){}}
function ssDel(k){try{sessionStorage.removeItem(k)}catch(e){}}
/* 进度：unl[t] 为各大难度已解锁的最高级别（0~10）。三个大难度的进阶 0 一开始即解锁 */
let prog=(()=>{let p=null;try{p=JSON.parse(lsGet(LS_PROG))}catch(e){}
  if(p&&Array.isArray(p.unl)&&p.unl.length===3)return{unl:p.unl,best:p.best||{},cleared:p.cleared||{}};
  if(p&&typeof p.unlocked==='number')return{unl:[0,1,2].map(t=>Math.max(0,Math.min(10,p.unlocked-t*11))),best:p.best||{},cleared:p.cleared||{}};
  return{unl:[0,0,0],best:{},cleared:{}}})();
/* 测试模式：口令只在本页面校验（并非真正的安全机制），开启后所有难度开放，且不写入真实进度 */
let testMode=ssGet('oi_test')==='1',testAsk=false,testErr='',testDetOpen=true;
const TPW=[1695867148,2200767075];
const testPwOk=p=>hashStr('oi-spire-test|'+p)===TPW[0]&&hashStr('尖塔|'+p+'|II')===TPW[1];
const isUnlocked=gi=>testMode||(gi%11)<=prog.unl[Math.floor(gi/11)];
const unlockedList=()=>{const a=[];for(let g=0;g<=GI_MAX;g++)if(isUnlocked(g))a.push(g);return a};
function saveProg(){lsSet(LS_PROG,JSON.stringify(prog))}
function save(){
  if(run&&(run.over||run.victory))finishRun();
  if(run&&!run.mp&&!run.over&&!run.victory)lsSet(LS_RUN,JSON.stringify(run));
  else if(run&&!run.mp)lsDel(LS_RUN);
  else if(run&&run.mp)mpSave();
  syncStatus()
}
const SAVE_PREFIX='OISP2:';
function archiveSource(){
  let current=run;
  if(!current)try{current=JSON.parse(lsGet(LS_RUN)||'null')}catch(e){current=null}
  if(net.connected||net.want||!current||current.mp||current.over||current.victory)current=null;
  return{run:current,progress:JSON.parse(JSON.stringify(prog))};
}
function encodeRunArchive(source){
  const data=source||archiveSource(),progress=JSON.parse(JSON.stringify(data.progress));
  if(!validArchiveProgress(progress))throw new Error('解锁进度无效，无法生成存档');
  let copy=data.run?JSON.parse(JSON.stringify(data.run)):null;
  if(copy){
    if(copy.mp||copy.over||copy.victory)throw new Error('多人、已结束的对局不放入单人存档');
    const c=copy.room&&copy.room.combat;
    if(c&&c.started&&!c.done){
      const rem=remainingMs(data.run.room.combat);
      if(!Number.isFinite(rem))throw new Error('战斗计时状态无效，无法存档');
      c.graceMs=rem-(Number(c.extraMs)||0);c.startAt=0;
    }
  }
  const bytes=new TextEncoder().encode(JSON.stringify({format:'oi-spire-save',version:2,progress,run:copy}));
  let binary='';
  for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode.apply(null,Array.from(bytes.subarray(i,i+0x8000)));
  return SAVE_PREFIX+btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function validArchiveProgress(p){
  const record=o=>o&&typeof o==='object'&&!Array.isArray(o);
  return !!(p&&Array.isArray(p.unl)&&p.unl.length===3&&p.unl.every(v=>Number.isInteger(v)&&v>=0&&v<=10)&&
    record(p.best)&&Object.keys(p.best).every(k=>/^\d+$/.test(k)&&+k<=GI_MAX&&Number.isInteger(p.best[k])&&p.best[k]>=0&&p.best[k]<=3)&&
    record(p.cleared)&&Object.keys(p.cleared).every(k=>/^\d+$/.test(k)&&+k<=GI_MAX&&typeof p.cleared[k]==='boolean'));
}
function mergeArchiveProgress(saved){
  const best={},cleared={},keys=new Set([...Object.keys(prog.best),...Object.keys(saved.best)]);
  keys.forEach(k=>{best[k]=Math.max(Number(prog.best[k])||0,Number(saved.best[k])||0)});
  new Set([...Object.keys(prog.cleared),...Object.keys(saved.cleared)]).forEach(k=>{cleared[k]=!!(prog.cleared[k]||saved.cleared[k])});
  prog={unl:prog.unl.map((v,i)=>Math.max(v,saved.unl[i])),best,cleared};saveProg();
}
function decodeRunArchive(text){
  const code=String(text||'').trim();
  if(!code.startsWith(SAVE_PREFIX))throw new Error('存档字符串格式不正确');
  if(code.length>1000000)throw new Error('存档文件过大');
  const b64=code.slice(SAVE_PREFIX.length).replace(/-/g,'+').replace(/_/g,'/');
  const binary=atob(b64+'='.repeat((4-b64.length%4)%4)),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  const data=JSON.parse(new TextDecoder().decode(bytes));
  if(!data||data.format!=='oi-spire-save'||![1,2].includes(data.version)||!Object.prototype.hasOwnProperty.call(data,'run'))
    throw new Error('不支持此版本的存档');
  const progress=data.version===2?data.progress:JSON.parse(JSON.stringify(prog));
  if(!validArchiveProgress(progress))throw new Error('存档中的解锁进度无效');
  const r=data.run;
  if(r!==null){
    if(!r||r.v!==5)throw new Error('不支持此版本的对局存档');
    if(r.mp||r.over||r.victory)throw new Error('该存档不是可恢复的单人进行中存档');
    if(r.test&&!testMode)throw new Error('测试模式存档需要先开启测试模式');
    if(typeof r.seed!=='string'||r.seed.length>20||!Number.isInteger(r.gi)||r.gi<0||r.gi>GI_MAX||
      r.tier!==Math.floor(r.gi/11)||r.difficulty!==r.gi%11||!Number.isInteger(r.act)||r.act<1||r.act>3||
      !Number.isFinite(r.hp)||!Number.isFinite(r.maxHp)||!Number.isFinite(r.gold)||
      !Array.isArray(r.relics)||r.relics.some(id=>!Object.prototype.hasOwnProperty.call(RELICS,id))||
      !Array.isArray(r.potions)||r.potions.some(id=>!Object.prototype.hasOwnProperty.call(POTIONS,id))||
      !Array.isArray(r.pending)||r.pending.some(id=>!Object.prototype.hasOwnProperty.call(POTIONS,id))||
      !r.map||typeof r.map!=='object'||!r.map.ancient||!Array.isArray(r.map.draw)||
      !r.visited||typeof r.visited!=='object'||!r.stats||typeof r.stats!=='object')
      throw new Error('存档内容无效或已损坏');
    if(r.custom&&typeof r.custom!=='object')throw new Error('自定义存档内容无效');
    if(r.room){
      const kinds=['monster','elite','boss','ancient','shop','rest','treasure','event'];
      const phases=['prep','fight','won','choose','result','open'];
      if(typeof r.room!=='object'||!kinds.includes(r.room.kind)||!r.room.node||
        !Number.isFinite(r.room.node.r)||!Number.isFinite(r.room.node.c)||!phases.includes(r.room.phase))
        throw new Error('存档中的当前关卡无效');
      if(['monster','elite','boss'].includes(r.room.kind)&&
        (!r.room.combat||typeof r.room.combat!=='object'||!Number.isFinite(r.room.combat.graceMs)||
        !Number.isFinite(r.room.combat.extraMs)||typeof r.room.combat.started!=='boolean'||typeof r.room.combat.done!=='boolean'))
        throw new Error('存档中的战斗状态无效');
    }
    const savedMap=r.map,map=genMap(r.seed,r.act,r.difficulty,r.custom&&r.custom.pr||null);
    map.ancient={done:!!savedMap.ancient.done};
    map.draw=savedMap.draw.filter(st=>st&&typeof st.id==='string'&&typeof st.c==='string'&&Array.isArray(st.p)&&
      st.p.length<=500&&st.p.every(p=>Array.isArray(p)&&p.length===2&&Number.isFinite(p[0])&&Number.isFinite(p[1]))).slice(0,200);
    r.map=map;
    const c=r.room&&r.room.combat;
    if(c&&c.started&&!c.done)c.startAt=Date.now();
  }
  return{run:r,progress};
}
function savePanelHTML(){
  let hint=saveError?`<div class="msg" style="border-color:var(--bad)">${esc(saveError)}</div>`:'';
  return `<div class="modal-bg"><div class="modal"><h2>游戏进度存档</h2>
    <p class="dim" style="margin:0">存档包含已解锁进度，以及当前进行中的单人对局（如果有）。导入会保留你已有的更高解锁进度；含对局的存档会恢复到保存时的状态和剩余战斗时间。</p>
    ${hint}<textarea id="saveArchiveText" spellcheck="false" placeholder="粘贴 OISP2: 开头的存档字符串">${esc(saveCode)}</textarea>
    <div class="row"><button data-a="copyArchive">复制字符串</button><button data-a="downloadArchive">下载存档文件</button><label class="row">读取存档文件 <input type="file" id="saveArchiveFile" accept=".oisave,.txt"></label></div>
    <div class="row"><button class="primary" data-a="importArchive">导入存档</button><button data-a="closeArchive">关闭</button></div>
  </div></div>`;
}
function pauseArchiveTimer(){
  const c=cb();
  if(c&&c.started&&!c.done){
    const rem=remainingMs(c);
    c.graceMs=rem-(Number(c.extraMs)||0);c.startAt=Date.now();savePausedCombat=c;save();
  }
}
function resumeArchiveTimer(){
  if(savePausedCombat&&run&&cb()===savePausedCombat){savePausedCombat.startAt=Date.now();save()}
  savePausedCombat=null;
}
function copyArchiveText(text){
  const fallback=()=>{const el=document.createElement('textarea');el.value=text;el.setAttribute('readonly','');el.style.position='fixed';el.style.opacity='0';document.body.appendChild(el);el.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}el.remove();toast(ok?'存档字符串已复制':'复制失败，请手动选择存档字符串')};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(()=>toast('存档字符串已复制')).catch(fallback);
  else fallback();
}
function runModeName(mode){
  return ({practice:'no-timer practice',list:'fixed-list challenge',team_race:'team race',custom:'custom'})[mode]||'standard';
}
function historyRuns(){try{const h=JSON.parse(lsGet(LS_HISTORY));return Array.isArray(h)?h:[]}catch(e){return[]}}
function historyModeName(mode){
  return ({standard:'标准',practice:'无计时练习',list:'固定题单',team_race:'团队竞速',custom:'自定义'})[mode]||'标准';
}
function historyDuration(seconds){
  const s=Math.max(0,Math.floor(Number(seconds)||0)),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),r=s%60;
  return h?`${h}小时${m}分`:`${m}分${String(r).padStart(2,'0')}秒`;
}
function historyHTML(){
  const rows=historyRuns().filter(x=>x&&Number.isInteger(x.gi)&&x.gi>=0&&x.gi<=GI_MAX);
  const wins=rows.filter(x=>x.result==='win').length;
  const totalTime=rows.reduce((n,x)=>n+(Number(x.duration)||0),0);
  const totalSolved=rows.reduce((n,x)=>n+(Number(x.wins)||0),0);
  const totalDrain=rows.reduce((n,x)=>n+(Number(x.drain)||0),0);
  const totalElites=rows.reduce((n,x)=>n+(Number(x.elites)||0),0);
  const best=rows.reduce((b,x)=>{
    const act=Math.max(1,Math.min(3,Number(x.act)||1)),floor=Math.max(0,Number(x.floor)||0);
    return act>b.act||act===b.act&&floor>b.floor?{act,floor}:b;
  },{act:0,floor:0});
  const cards=rows.map(x=>{
    const when=Number.isFinite(Number(x.at))?new Date(Number(x.at)).toLocaleString():'时间未知';
    const result=x.result==='win';
    const act=Math.max(1,Math.min(3,Number(x.act)||1));
    const floor=Math.max(0,Number(x.floor)||0);
    return `<article class="panel history-card">
      <div class="row"><b>${esc(giName(x.gi))}</b><span class="chip">${esc(historyModeName(x.mode))}</span><span class="spacer"></span><b class="${result?'':'dim'}">${result?'通关':'未通关'}</b></div>
      <div class="dim">${esc(when)} · ${STAGE_NAMES[act-1]}${floor?` · 第 ${floor} 层`:''}</div>
      <div class="row history-stats"><span>用时 ${esc(historyDuration(x.duration))}</span><span>战斗胜利 ${Number(x.wins)||0} 场</span><span>精英 ${Number(x.elites)||0} 位</span><span>遗物 ${Number(x.relics)||0} 件</span><span>超时扣血 ${Number(x.drain)||0}</span></div>
      <div class="row"><span class="dim">种子 <span class="mono">${esc(x.seed||'—')}</span></span><span class="spacer"></span><button data-a="historySeed" data-seed="${esc(x.seed||'')}">复制种子</button></div>
    </article>`;
  }).join('');
  return `<div class="wrap"><div class="row" style="margin-bottom:12px"><button data-a="goMenu">返回菜单</button><h2>战绩复盘</h2><span class="spacer"></span>${rows.length?'<button class="danger" data-a="historyClear">清空战绩</button>':''}</div>
    <div class="history-summary">
      <div class="panel"><span class="dim">总局数</span><b>${rows.length}</b></div>
      <div class="panel"><span class="dim">通关 / 胜率</span><b>${wins} / ${rows.length?Math.round(wins/rows.length*100):0}%</b></div>
      <div class="panel"><span class="dim">最佳进度</span><b>${best.act?`第 ${best.act} 幕${best.floor?` · 第 ${best.floor} 层`:''}`:'—'}</b></div>
      <div class="panel"><span class="dim">累计战斗胜场</span><b>${totalSolved}</b></div>
      <div class="panel"><span class="dim">累计击败精英</span><b>${totalElites}</b></div>
      <div class="panel"><span class="dim">累计用时</span><b>${esc(historyDuration(totalTime))}</b></div>
      <div class="panel"><span class="dim">累计超时扣血</span><b>${totalDrain}</b></div>
    </div>
    <div class="history-list">${cards||'<div class="panel dim">还没有已结束的对局。完成或结束一局后，记录会显示在这里。</div>'}</div>
  </div>`;
}
function finishRun(){
  if(!run||run.historySaved)return;
  run.historySaved=true;
  const duration=Math.max(0,Math.floor((Date.now()-(run.stats.startedAt||Date.now()))/1000));
  const row={seed:String(run.seed),gi:run.gi,tier:run.tier||0,difficulty:run.difficulty,mode:run.mode||'standard',
    result:run.victory?'win':'loss',act:run.act||1,floor:run.pos?run.pos.r+1:0,duration,
    wins:run.stats.wins||0,elites:run.stats.elites||0,relics:run.relics.length,drain:run.stats.drain||0,at:Date.now()};
  const history=historyRuns();history.unshift(row);lsSet(LS_HISTORY,JSON.stringify(history.slice(0,20)));
  lsDel(LS_RUN);lsDel(LS_MPRUN);
  if(lsGet(LS_STATS_CONSENT)==='1')submitDifficultyStats(row);
}
async function submitDifficultyStats(row){
  telemetryMsg='Submitting opted-in anonymous difficulty stats…';render();
  try{
    const res=await fetch(apiBase()+'/api/stats',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tier:row.tier,difficulty:row.difficulty,result:row.result,act:row.act,floor:row.floor,
        duration:row.duration,wins:row.wins,drain:row.drain,mode:row.mode})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||('HTTP '+res.status));
    telemetryMsg='Anonymous difficulty stats uploaded with your consent.';
  }catch(e){telemetryMsg='Anonymous stats were not saved: '+(e.message||'server unavailable')+'. You can retry by completing another run.'}
  if(view==='menu')render();
}
function shareSeed(seed){
  const text=String(seed||'');
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(()=>toast('Seed copied')).catch(()=>copySeedFallback(text));
  else copySeedFallback(text);
}
function copySeedFallback(text){
  const el=document.createElement('textarea');el.value=text;el.setAttribute('readonly','');el.style.position='fixed';el.style.opacity='0';
  document.body.appendChild(el);el.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}el.remove();toast(ok?'Seed copied':'Could not access clipboard; seed: '+text);
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(m){
  const old=document.querySelector('.toast');if(old)old.remove();
  const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.remove(),2600);
}
const E=k=>run.relics.reduce((s,id)=>s+(RELICS[id].e[k]||0),0);
const hasRelic=id=>run.relics.includes(id);
function PR(){const b=P(run.difficulty);return run.custom?Object.assign(b,run.custom.pr):b}
const slotCount=()=>PR().slots+E('slots')+(run.extraSlots||0);
const nodeAt=(r,c)=>run.map.nodes[r][c];
const nodeKey=n=>run.act+'_'+n.r+'_'+n.c;

/* =====================================================================
   三、爬塔流程
   ===================================================================== */
function newRun(gi,seed,custom,mode,problemList){
  const tier=Math.floor(gi/11),diff=gi%11,pr=Object.assign(P(diff),custom?custom.pr:{});
  return {v:5,seed:String(seed),gi,tier,difficulty:diff,mode:mode||(custom?'custom':'standard'),problemList:problemList||null,problemCursor:0,
    act:1,hp:pr.startMax,maxHp:pr.startMax,gold:custom?custom.gold:99,custom:custom||null,
    relics:pr.noStarter?[]:['starter'],potions:['coffee'],nextFightMs:0,fightBoon:0,fightBonusMin:0,
    extraSlots:0,actCut:0,actShopDisc:0,actTick:0,actHint:0,shieldLeft:0,freeFights:0,mp:false,deadSent:false,pending:[],test:testMode,reviveUsed:false,
    pos:null,visited:{},room:null,map:null,over:false,victory:false,
    stats:{wins:0,drain:0,elites:0,startedAt:Date.now()}};
}
function startAct(){
  run.map=genMap(run.seed,run.act,run.difficulty,run.custom?run.custom.pr:null);
  run.map.ancient={done:false};run.map.draw=[];
  run.pos=null;run.visited={};run.room=null;run.actCut=0;run.actShopDisc=0;run.actTick=0;run.actHint=0;
  run.shieldLeft=E('actShield');
  if(E('actCoffee'))givePotion('coffee');
  if(E('actPotion'))givePotion(randPotion(Math.random));
  if(run.act>1&&E('actHeal'))heal(E('actHeal'));
  if(!run.test&&!run.custom&&run.mode!=='practice'&&run.mode!=='list'){prog.best[run.gi]=Math.max(prog.best[run.gi]||0,run.act);saveProg()}
  lastMapAct=null;
}
function startRun(gi,seed,mp,custom,mode,problemList){
  if(!custom&&!isUnlocked(gi)){toast('该进阶尚未解锁');return}
  if(mode==='list'&&(!Array.isArray(problemList)||!problemList.length)){toast('Choose a non-empty fixed problem list first');return}
  run=newRun(gi,seed||Math.random().toString(36).slice(2,8),custom,mode,problemList);
  run.mp=!!mp;curStroke=null;drawMode=false;
  startAct();save();view='game';render();
}
function availNodes(){
  if(!run.map.ancient.done)return [];
  if(!run.pos)return run.map.nodes[0].filter(Boolean);
  const n=nodeAt(run.pos.r,run.pos.c);
  return n.next.map(c=>nodeAt(run.pos.r+1,c));
}
function enterNode(r,c){
  if(run.room||run.over||run.victory)return;
  if(r===-1){
    if(run.map.ancient.done)return;
    const ra=rngFor(run.seed,'anc'+run.act);
    const ids=BOONS.map(b=>b.id);
    for(let i=ids.length-1;i>0;i--){const j=Math.floor(ra()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}
    run.room={node:{r:-1,c:3},kind:'ancient',phase:'choose',choices:ids.slice(0,3)};
    save();render();return;
  }
  const n=nodeAt(r,c);
  if(!availNodes().includes(n))return;
  let type=n.type;
  const rr=rngFor(run.seed,'room'+nodeKey(n));
  if(type==='unknown')type=resolveUnknown(rr);
  makeRoom(type,{r,c},rr);
  save();render();focusRoom();
}
const UNKNOWN_ROOM_OUTCOMES=[['monster',0.10],['shop',0.15],['treasure',0.15],['event',0.60]];
function resolveUnknown(rr){
  const roll=rr();let cumulative=0;
  for(const [type,weight] of UNKNOWN_ROOM_OUTCOMES){cumulative+=weight;if(roll<cumulative)return type}
  return 'event';
}
function makeRoom(type,pos,rr,evId){
  run.room={node:{r:pos.r,c:pos.c},kind:type,phase:'prep'};
  if(type==='monster'||type==='elite'||type==='boss'){
    run.room.name=type==='boss'?(pos.r>ROWS?BOSS2_NAME:BOSS_NAMES[run.act-1]):pick(rr,type==='elite'?ELITE_NAMES:MONSTER_NAMES);
    run.room.topic=pick(rr,TOPICS);
    run.room.hint=problemHint(run,type,pos);
    let bonus=E('timeAll')+E('time_'+type)+run.nextFightMs/60000;
    if(run.fightBoon>0){bonus+=run.fightBonusMin;run.fightBoon--}
    run.nextFightMs=0;
    run.room.combat={graceMs:(graceOf(type)+bonus)*60000,baseMin:graceOf(type),bonusMin:bonus,extraMs:0,started:false,done:false,
      insured:false,partial:false,lucky:false,shielded:false,guard:0,ticks:0,lost:0};
    if(run.mode==='list'&&Array.isArray(run.problemList)&&run.problemList.length)
      run.room.problem=run.problemList[run.problemCursor%run.problemList.length];
  }else if(type==='shop'){run.room.shop=genShop(rr)}
  else if(type==='treasure'){run.room.phase='open'}
  else if(type==='rest'){run.room.phase='choose'}
  else if(type==='event'){
    const good=0.45+E('goodEvent')-PR().badEvent;
    const wantGood=rr()<good;
    const pool=EVENTS.filter(e=>(e.kind==='good')===wantGood);
    run.room.event=evId||pick(rr,pool).id;
    run.room.phase='choose';
  }
}

function leaveRoom(){
  if(run.room&&run.room.test){run.room=null;save();render();return}
  const rm=run.room,n=rm.node,is首领=rm.kind==='boss';
  let next='vote';
  if(rm.kind==='ancient'){
    run.map.ancient.done=true;run.room=null;save();render();
    if(isMP())netSend({t:'done',next:'vote'});
    return;
  }
  run.pos={r:n.r,c:n.c};run.visited[n.r+','+n.c]=1;run.room=null;
  if(is首领){
    if(run.act<3){
      const pr=PR();
      run.hp=Math.min(run.maxHp,run.hp+Math.round((run.maxHp-run.hp)*pr.actHeal));
      run.act++;startAct();next='ancient';toast('进入 '+STAGE_NAMES[run.act-1]);
    }else if(run.difficulty===10&&n.r===ROWS){
      toast('第二位首领 出现了，没有喘息的机会。');
    }else{
      run.victory=true;next='finish';
      if(!run.test&&!run.custom&&run.mode!=='practice'&&run.mode!=='list'){prog.cleared[run.gi]=true;const t=run.tier||0;if(run.difficulty<10)prog.unl[t]=Math.max(prog.unl[t],run.difficulty+1);saveProg()}
    }
  }
  save();render();
  if(isMP())netSend({t:'done',next});
}
function gainRelic(id){
  if(!id||run.relics.includes(id))return;
  run.relics.push(id);
  const e=RELICS[id].e;
  if(e.maxHp){run.maxHp+=e.maxHp;run.hp+=e.maxHp}
  if(e.gold)run.gold+=e.gold;
  if(e.actShield)run.shieldLeft=(run.shieldLeft||0)+e.actShield;
}
function addPotion(id){if(run.potions.length>=slotCount())return false;run.potions.push(id);return true}
function givePotion(id){
  if(addPotion(id))return '获得药水：'+POTIONS[id].n+'。';
  (run.pending=run.pending||[]).push(id);
  return '药水栏已满，「'+POTIONS[id].n+'」暂存在顶部的待取处（先丢弃或用掉一瓶，再点「收入」）。';
}
function takePending(i){const id=(run.pending||[])[i];if(!id)return;if(!addPotion(id)){toast('药水栏仍然是满的');return}run.pending.splice(i,1);save();render()}
function dropPending(i){(run.pending||[]).splice(i,1);save();render()}
function damage(base,boss){
  const pr=PR();
  const d=base*(1+0.15*(run.act-1))*pr.failMult*(boss?pr.bossFailMult:1)*Math.max(0.3,1+E('failMult'));
  return Math.round(d);
}
function heal(n){const b=run.hp;run.hp=Math.min(run.maxHp,run.hp+n);return run.hp-b}

/* ---------- 战斗 ---------- */
const cb=()=>run&&run.room&&run.room.combat;
const GRACE={monster:20,elite:40,boss:60};
const GRACE_PROVINCIAL={monster:60,elite:90,boss:120};
const graceOf=k=>run.custom?run.custom.kinds[k].grace:((run.tier||0)===2?GRACE_PROVINCIAL[k]:GRACE[k]);      // 时限（分钟）
const DRAIN={monster:10,elite:10,boss:20};      // 超时后每 5 分钟扣血（基础值）
const tickMs=k=>((run.custom?run.custom.kinds[k||run.room.kind].tick:5)+E('tickMin')+(run.actTick||0))*60000;
const remainingMs=c=>c.graceMs+c.extraMs-(Date.now()-c.startAt);   // 距时限结束，负数表示已超时
function drainDmg(c,kind){
  if(c.insured||c.shielded)return 0;
  const pr=PR();
  if(run.custom&&run.custom.kinds[kind].drain<=0)return 0;
  let d=run.custom?run.custom.kinds[kind].drain:DRAIN[kind]*(1+0.15*(run.act-1))*pr.failMult*(kind==='boss'?pr.bossFailMult:1)*Math.max(0.3,1+E('failMult'));
  d=Math.round(d)-E('drainCut')-E('drainCut_'+kind)-(run.actCut||0)-(c.guard||0);
  d=Math.max(1,d);
  if(c.partial)d=Math.max(1,Math.ceil(d/2));
  return d;
}
async function startCombat(){
  const r=run,rm=r&&r.room,c=rm&&rm.combat;
  if(!c||c.started||c.vjStarting)return;
  if(!isMP()&&vjBinding){
    if(!rm.problem){toast('请先选定题目，再开始 VJudge 验证计时');return}
    c.vjStarting=true;render();
    try{
      const data=await vjPost('/api/vjudge/start',{token:vjBinding.token,pid:rm.problem.pid});
      if(run!==r||r.room!==rm||rm.combat!==c)return;
      c.vjBattleId=data.battleId;c.vjStartedAt=data.startedAt;
    }catch(e){
      if((e.message||'').includes('绑定已失效'))vjForgetBinding();
      if(run===r&&r.room===rm){c.vjStarting=false;render();toast('无法开始 VJudge 验证：'+(e.message||'请求失败'))}
      return;
    }
    c.vjStarting=false;
  }
  if(run!==r||r.room!==rm||rm.combat!==c)return;
  c.started=true;c.startAt=Date.now();
  if(run.shieldLeft>0){run.shieldLeft--;c.shielded=true}
  else if(run.freeFights>0){run.freeFights--;c.shielded=true}
  run.room.phase='fight';save();render();
}
function applyOvertime(){
  if(run.mode==='practice')return;
  const rm=run.room,c=rm.combat,tk=tickMs();
  const over=Date.now()-c.startAt-(c.graceMs+c.extraMs);
  const target=over>0?Math.floor(over/tk):0;
  let hit=0;
  while(c.ticks<target&&!run.over){
    c.ticks++;const d=drainDmg(c,rm.kind);
    run.hp=Math.max(0,run.hp-d);c.lost+=d;run.stats.drain+=d;hit+=d;
    if(run.hp<=0){
      if(E('revive')&&!run.reviveUsed){run.reviveUsed=true;run.hp=Math.ceil(run.maxHp/2);toast('涅槃之羽重燃，你重新站了起来。')}
      else run.over=true;
    }
  }
  if(hit>0){
    toast(run.over?'生命耗尽……':'超时扣血 -'+hit);save();
    if(run.over&&isMP())sendDead();
    render();
  }
}
function winCombat(){
  const rm=run.room,c=rm.combat,pr=PR();
  c.done=true;rm.phase='won';run.stats.wins++;
  if(run.mode==='list')run.problemCursor++;
  if(rm.problem)lgMarkDone(rm.problem.pid);
  if(rm.kind==='elite')run.stats.elites++;
  const rr=rngFor(run.seed,'rw'+nodeKey(rm.node));
  let g=rm.kind==='boss'?ri(rr,55,75):rm.kind==='elite'?ri(rr,28,42):ri(rr,14,24);
  g=Math.round(g*pr.goldMult*(1+E('goldMult'))*(c.lucky?2:1));
  g+=E('winGold');run.gold+=g;
  let h=E('winHeal')+(rm.kind==='boss'?E('bossHeal'):0);const healed=h?heal(h):0;
  const mh=E('winMaxHp')+(rm.kind==='elite'?E('eliteMaxHp'):0)+(rm.kind==='boss'?E('bossMaxHp'):0);if(mh){run.maxHp+=mh;run.hp+=mh}
  const rw={gold:g,heal:healed,potion:null,relic:null,choices:null};
  if(rr()<(rm.kind==='monster'?0.25:0.5)+E('potionDrop'))rw.potion=randPotion(rr);
  if(rm.kind==='elite')rw.relic=randRelic(rr,run.relics);
  if(rm.kind==='boss'){
    const ch=[];let tmp=run.relics.slice();
    for(let i=0;i<3;i++){const x=randRelic(rr,tmp,i===2?'rare':null);if(x){ch.push(x);tmp.push(x)}}
    rw.choices=ch;
  }
  rm.rewards=rw;save();render();
}
function usePotion(i){
  const id=run.potions[i];if(!id)return;
  const def=POTIONS[id],c=cb();
  if(def.combat&&!(c&&c.started&&!c.done)){toast('这瓶药水只能在战斗计时中使用');return}
  let msg='';const ph=E('potionHeal');
  if(id==='coffee'){c.extraMs+=10*60000;msg='时限 +10 分钟'}
  else if(id==='espresso'){c.extraMs+=20*60000;msg='时限 +20 分钟'}
  else if(id==='bandage'){msg='回复 '+heal(15+ph)+' 点生命'}
  else if(id==='heal'){msg='回复 '+heal(25+ph)+' 点生命'}
  else if(id==='bigheal'){msg='回复 '+heal(50+ph)+' 点生命'}
  else if(id==='vital'){run.maxHp+=6;run.hp+=6;msg='最大生命 +6'}
  else if(id==='guard'){c.guard=(c.guard||0)+10;msg='本场超时每次扣血 -10'}
  else if(id==='insure'){c.insured=true;msg='本场不再受超时扣血'}
  else if(id==='partial'){c.partial=true;msg='本场超时扣血减半'}
  else if(id==='lucky'){c.lucky=true;msg='本场金币翻倍'}
  else if(id==='fullheal'){msg='回复 '+heal(100+ph)+' 点生命'}
  else if(id==='timewarp'){c.extraMs+=30*60000;msg='时限 +30 分钟'}
  else if(id==='recover'){c.extraMs+=5*60000;msg='回复 '+heal(20+ph)+' 点生命，时限 +5 分钟'}
  else if(id==='greed'){run.gold+=120;msg='获得 120 金币'}
  else if(id==='tonic'){run.maxHp+=12;run.hp+=12;msg='最大生命 +12'}
  else if(id==='chosen'){const x=randRelic(Math.random,run.relics);if(x){gainRelic(x);msg='获得遗物：'+RELICS[x].n}else msg='已拥有全部遗物'}
  run.potions.splice(i,1);toast(def.n+'：'+msg);save();render();
}
function dropPotion(i){run.potions.splice(i,1);save();render()}

/* ---------- 商店 ---------- */
function genShop(rr){
  const pr=PR();
  const f=Math.max(0.3,1-E('shopDiscount')-(run.actShopDisc||0))*pr.shopMult;
  const items=[];let tmp=run.relics.slice();
  for(let i=0;i<3;i++){
    const id=randRelic(rr,tmp,i===2?(rr()<0.5?'uncommon':null):null)||randRelic(rr,tmp);
    if(id){tmp.push(id);items.push({t:'relic',id,price:Math.round(RELIC_PRICE[RELICS[id].r]*f*(0.9+rr()*0.2))})}
  }
  for(let i=0;i<3;i++){const id=i===2&&rr()<0.2?'chosen':randPotion(rr);items.push({t:'potion',id,price:Math.round(POTIONS[id].price*f*(0.9+rr()*0.2))})}
  items.push({t:'heal',price:Math.round(60*f)});
  items.push({t:'maxhp',price:Math.round(110*f)});
  return {items};
}
function buy(i){
  const it=run.room.shop.items[i];
  if(it.sold||run.gold<it.price)return;
  if(it.t==='potion'&&run.potions.length>=slotCount()){toast('药水栏已满');return}
  run.gold-=it.price;it.sold=true;
  if(it.t==='relic')gainRelic(it.id);
  else if(it.t==='potion')addPotion(it.id);
  else if(it.t==='heal')heal(20);
  else if(it.t==='maxhp'){run.maxHp+=6;run.hp+=6}
  save();render();
}

/* ---------- 休息 / 宝箱 / 事件 ---------- */
function rest(kind){
  const rm=run.room;
  if(kind==='sleep'){const n=heal(Math.round(run.maxHp*PR().restPct)+E('restHeal'));const mx=E('restMaxHp');if(mx)gainMax(mx);rm.result='小憩片刻，回复 '+n+' 点生命。'+(mx?'最大生命 +'+mx+'。':'')}
  else if(kind==='drill'){run.nextFightMs+=10*60000;rm.result='你温习了几道旧题。下一场战斗时限 +10 分钟。'}
  else{const k=1+(E('restPotion')||0);rm.result=Array.from({length:k},()=>givePotion(randPotion(Math.random))).join(' ')}
  rm.phase='result';save();render();
}
function openChest(){
  const rm=run.room,rr=rngFor(run.seed,'tc'+nodeKey(rm.node));
  const v=rr();const id=randRelic(rr,run.relics,v<0.15?'rare':v<0.5?'uncommon':'common')||randRelic(rr,run.relics);
  const g=ri(rr,25,40)+E('chestGold');run.gold+=g;
  if(id)gainRelic(id);
  rm.result=(id?'宝箱里有遗物「'+RELICS[id].n+'」，'+RELICS[id].d+' ':'')+'另外获得 '+g+' 金币。';
  rm.phase='result';save();render();
}
const hurt=n=>{run.hp=Math.max(1,run.hp-n)};
const gainMax=n=>{run.maxHp+=n;run.hp+=n};
const gainR=(r,rar)=>{const x=randRelic(r,run.relics,rar)||randRelic(r,run.relics);if(x){gainRelic(x);return '获得遗物「'+RELICS[x].n+'」。'}return '已经没有可得的遗物了。'};
const gainP=(r,id)=>givePotion(id||randPotion(r));
/* 事件：good 为吉事；mixed 带有风险或代价。选项里 need 为所需金币，needPot 需要至少一瓶药水，needHp 需要生命高于该值 */
const EVENTS=[
  /* ---- 吉事 ---- */
  {id:'rain',kind:'good',title:'对弈',text:'雨落檐前，一位老者在亭中独自对弈，抬手邀你同坐。',opts:[
    {t:'观棋不语（接下来 3 场战斗时限 +8 分钟）',f:()=>{run.fightBoon=3;run.fightBonusMin=8;return '接下来 3 场战斗时限 +8 分钟。'}},
    {t:'落子对弈（最大生命 +6）',f:()=>{gainMax(6);return '一局终了，最大生命 +6。'}}]},
  {id:'senior',kind:'good',title:'神秘学长',text:'多年前的师兄从山道上走来，看了看你的行囊，笑着递过一只瓷瓶。',opts:[
    {t:'收下药水',f:r=>gainP(r)},
    {t:'请益解惑（最大生命 +5）',f:()=>{gainMax(5);return '最大生命 +5。'}}]},
  {id:'garden',kind:'good',title:'药水摊',text:'药圃主人晾着两味新炼的药水，说有缘者可任取其一。',opts:null,dyn:r=>{
    const a=randPotion(r),b=randPotion(r);
    return [a,b].map(id=>({t:'取「'+POTIONS[id].n+'」：'+POTIONS[id].d,f:()=>givePotion(id)}))}},
  {id:'teahouse',kind:'good',title:'咖啡店',text:'掌柜认出了你，说今日头一杯茶，不收金币。',opts:[
    {t:'带走一杯咖啡',f:()=>givePotion('coffee')},
    {t:'坐下歇脚（回复 20 点生命）',f:()=>'回复 '+heal(20)+' 点生命。'}]},
  {id:'crane',kind:'good',title:'白鹤',text:'一只白鹤立于庭中，歪头看着你。',opts:[
    {t:'轻抚羽翼（回复 12 点生命）',f:()=>'回复 '+heal(12)+' 点生命。'},
    {t:'投喂鱼干（-30 金币，最大生命 +8）',need:30,f:()=>{run.gold-=30;gainMax(8);return '白鹤清唳一声，最大生命 +8。'}}]},
  {id:'inkwall',kind:'good',title:'白板',text:'石壁上留着前人未擦的推演，字迹依旧清晰。',opts:[
    {t:'凝神细读（接下来 3 场战斗时限 +8 分钟）',f:()=>{run.fightBoon=3;run.fightBonusMin=8;return '接下来 3 场战斗时限 +8 分钟。'}},
    {t:'拓印带走（+90 金币）',f:()=>{run.gold+=90;return '获得 90 金币。'}}]},
  {id:'teacher',kind:'good',title:'集训队教练',text:'恩师翻看了你近来的笔记，递给你一份修习之法。',opts:[
    {t:'依法修习（最大生命 +6）',f:()=>{gainMax(6);return '最大生命 +6。'}},
    {t:'换一只大行囊（药水栏位 +1）',f:()=>{run.extraSlots=(run.extraSlots||0)+1;return '药水栏位 +1。'}}]},
  {id:'merchant',kind:'good',title:'赞助商',text:'一位豪商看中了你的名声，愿意出资相助。',opts:[
    {t:'接受资助（+200 金币）',f:()=>{run.gold+=200;return '获得 200 金币。'}},
    {t:'请他赠一件信物（罕见遗物）',f:r=>gainR(r,'uncommon')}]},
  {id:'lecture',kind:'good',title:'大师课',text:'一位退隐的国手在书院开了一堂公开课。',opts:[
    {t:'凝神聆听（接下来 5 场战斗时限 +10 分钟）',f:()=>{run.fightBoon=5;run.fightBonusMin=10;return '接下来 5 场战斗时限 +10 分钟。'}},
    {t:'课后请教（最大生命 +10）',f:()=>{gainMax(10);return '最大生命 +10。'}}]},
  {id:'physician',kind:'good',title:'校医室',text:'郎中看了看你的脸色，皱起了眉。',opts:[
    {t:'接受诊治（回满生命）',f:()=>'回复 '+heal(run.maxHp)+' 点生命。'},
    {t:'领一副补药（最大生命 +8）',f:()=>{gainMax(8);return '最大生命 +8。'}}]},
  {id:'erratum',kind:'good',title:'官方数据有误',text:'你指出了典籍里的一处舛误，主事向你郑重道谢。',opts:[
    {t:'领取酬谢（普通遗物）',f:r=>gainR(r,'common')},
    {t:'领取赏金（+100 金币）',f:()=>{run.gold+=100;return '获得 100 金币。'}}]},
  {id:'elder',kind:'good',title:'热心的导师',text:'一位前辈把自己用不上的东西都塞给了你。',opts:[
    {t:'收下药水（2 瓶）',f:r=>gainP(r)+' '+gainP(r)},
    {t:'收下行囊（药水栏位 +1）',f:()=>{run.extraSlots=(run.extraSlots||0)+1;return '药水栏位 +1。'}}]},
  {id:'lostfound',kind:'good',title:'失物招领',text:'驿馆门口的木箱里，有几样东西无人认领。',opts:[
    {t:'取走一件遗物',f:r=>gainR(r,'common')},
    {t:'取走现银（+120 金币）',f:()=>{run.gold+=120;return '获得 120 金币。'}}]},
  {id:'parcel',kind:'good',title:'队友的包裹',text:'同窗托人捎来一只包裹，里面是为你备下的补给。',opts:[
    {t:'拆开（2 瓶药水与 50 金币）',f:r=>{run.gold+=50;return '获得 50 金币。'+gainP(r)+' '+gainP(r)}},
    {t:'只取信物（随机遗物）',f:r=>gainR(r)}]},
  /* 新增吉事（更强） */
  {id:'spring',kind:'good',title:'泉水',text:'岩缝里涌出一眼清泉，水面浮着淡淡的光。',opts:[
    {t:'掬水而饮（回满生命，最大生命 +8）',f:()=>{run.maxHp+=8;run.hp=run.maxHp;return '生命完全恢复，最大生命 +8。'}},
    {t:'取水带走（大治疗药水 ×1，治疗药水 ×2）',f:()=>givePotion('bigheal')+' '+givePotion('heal')+' '+givePotion('heal')}]},
  {id:'vault',kind:'good',title:'图书馆',text:'书阁的守阁人今日不在，门扉虚掩，满架典籍落着薄灰。',opts:[
    {t:'翻阅秘典（稀有遗物）',f:r=>gainR(r,'rare')},
    {t:'抄录要诀（接下来 6 场战斗时限 +6 分钟）',f:()=>{run.fightBoon=6;run.fightBonusMin=6;return '接下来 6 场战斗时限 +6 分钟。'}}]},
  {id:'treasuremap',kind:'good',title:'藏宝图',text:'旧书夹页里掉出一张泛黄的地图，墨迹指向一处不远的所在。',opts:[
    {t:'循图寻宝（罕见遗物与 80 金币）',f:r=>{run.gold+=80;return '获得 80 金币。'+gainR(r,'uncommon')}},
    {t:'转手卖给行家（+220 金币）',f:()=>{run.gold+=220;return '获得 220 金币。'}}]},
  {id:'ancestors',kind:'good',title:'神龛',text:'祠中香火不绝，案前摆着历代名家的牌位。',opts:[
    {t:'上香祭拜（回复 10 点生命；本幕内超时每次扣血 -6）',f:()=>{run.actCut=(run.actCut||0)+6;return '回复 '+heal(10)+' 点生命；本幕内超时每次扣血 -6。'}},
    {t:'叩首恭请（最大生命 +15，回满生命）',f:()=>{run.maxHp+=15;run.hp=run.maxHp;return '最大生命 +15，生命完全恢复。'}}]},
  {id:'alchemist',kind:'good',title:'炼金术士',text:'一位炼丹师正守着丹炉，见你路过，抬头道：「缘分到了。」',opts:[
    {t:'求一炉丹（完全治疗药水 ×1，大治疗药水 ×1）',f:()=>givePotion('fullheal')+' '+givePotion('bigheal')},
    {t:'求一炉补药（最大生命 +12，并回复 12 点）',f:()=>{gainMax(12);return '最大生命 +12。'}}]},
  {id:'oracle',kind:'good',title:'神谕',text:'香烟袅袅之中，似有一道身影垂目看你。',opts:[
    {t:'受其点化（稀有遗物，回复 20 点生命）',f:r=>gainR(r,'rare')+' 回复 '+heal(20)+' 点生命。'},
    {t:'祈求庇佑（接下来 4 场战斗不受超时扣血）',f:()=>{run.freeFights=(run.freeFights||0)+4;return '接下来 4 场战斗不受超时扣血。'}}]},
  /* ---- 凶吉参半 ---- */
  {id:'night',kind:'mixed',title:'半夜的灵感',text:'三更时分，你忽然看懂了一类题的本质，可明日还要赶路。',opts:[
    {t:'秉烛达旦（-10 生命，罕见或稀有遗物）',needHp:10,f:r=>{hurt(10);return '损失 10 点生命。'+gainR(r,r()<0.3?'rare':'uncommon')}},
    {t:'就此安歇（回复 15 点生命）',f:()=>'回复 '+heal(15)+' 点生命。'}]},
  {id:'postal',kind:'mixed',title:'评测机卡死',text:'你投递的文书已在商店压了许久，仍无回音。',opts:[
    {t:'再递一次（50%：+130 金币；50%：-12 生命）',f:r=>{if(r()<0.5){run.gold+=130;return '终于有了回音，获得 130 金币。'}hurt(12);return '驿马又误了时辰，损失 12 点生命。'}},
    {t:'煮茶静候（回复 5 点生命）',f:()=>'回复 '+heal(5)+' 点生命。'}]},
  {id:'market',kind:'mixed',title:'交易区',text:'有人压低声音说，他手里有一件好东西，要价 60 金币。',opts:[
    {t:'买下（-60 金币，罕见遗物）',need:60,f:r=>{run.gold-=60;return gainR(r,'uncommon')}},
    {t:'一笑而过',f:()=>'你没有理会。'}]},
  {id:'duel',kind:'mixed',title:'擂台',text:'空地上搭了擂台，有人高声叫阵，胜者有赏。',opts:[
    {t:'上台应战（60%：+110 金币；40%：-15 生命）',f:r=>{if(r()<0.6){run.gold+=110;return '你技高一筹，获得 110 金币。'}hurt(15);return '惜败一招，损失 15 点生命。'}},
    {t:'袖手观战',f:()=>'你把精力留给了正事。'}]},
  {id:'mock',kind:'mixed',title:'校内模拟赛',text:'同窗临时凑了一场模拟，名次靠前者有奖。',opts:[
    {t:'参加（-10 生命，+100 金币并得一瓶药水）',needHp:10,f:r=>{hurt(10);run.gold+=100;return '损失 10 点生命，获得 100 金币。'+gainP(r)}},
    {t:'不参加',f:()=>'你选择专心准备正赛。'}]},
  {id:'blackout',kind:'mixed',title:'机房停电',text:'一阵风过，满屋烛火尽灭，你的文稿还摊在桌上。',opts:[
    {t:'出门买灯油（-20 金币，回复 20 点生命）',need:20,f:()=>{run.gold-=20;return '花了 20 金币，回复 '+heal(20)+' 点生命。'}},
    {t:'摸黑续写（-6 生命，获得一瓶药水）',f:r=>{hurt(6);return '损失 6 点生命。'+gainP(r)}}]},
  {id:'charm',kind:'mixed',title:'无良商贩',text:'一个人悄悄向你兜售「包过的符咒」，开价 100 金币。',opts:[
    {t:'买下（-100 金币，保险药水 ×2）',need:100,f:()=>{run.gold-=100;return givePotion('insure')+' '+givePotion('insure')}},
    {t:'举报他（+40 金币）',f:()=>{run.gold+=40;return '官府奖励了你 40 金币。'}}]},
  {id:'provincial',kind:'mixed',title:'校内选拔',text:'报名费 40 金币，据说名列前茅者有神秘奖赏。',opts:[
    {t:'报名（-40 金币；55%：罕见遗物，45%：药水）',need:40,f:r=>{run.gold-=40;if(r()<0.55)return gainR(r,'uncommon');return gainP(r)}},
    {t:'不报名',f:()=>'你没有去。'}]},
  {id:'shade',kind:'mixed',title:'学长的幽灵',text:'回廊尽头站着一个半透明的身影，说想考考你。',opts:[
    {t:'接受考较（-15 生命，最大生命 +10）',needHp:15,f:()=>{hurt(15);gainMax(10);return '你答得颇有章法，最大生命 +10。'}},
    {t:'婉拒',f:()=>'残影叹了口气，渐渐散去。'}]},
  {id:'manuscript',kind:'mixed',title:'祖传代码',text:'你翻出一份几年前的手稿，页眉写着「勿动，能用」。',opts:[
    {t:'照样誊抄（50%：+160 金币；50%：-18 生命）',f:r=>{if(r()<0.5){run.gold+=160;return '居然真的灵验，获得 160 金币。'}hurt(18);return '时过境迁，反受其累，损失 18 点生命。'}},
    {t:'重新誊写（+20 金币）',f:()=>{run.gold+=20;return '你重新整理了一遍，顺手换了点润笔，获得 20 金币。'}}]},
  {id:'altar',kind:'mixed',title:'算法祭坛',text:'祭坛上刻着一行小字：献上药水，换取遗物。',opts:[
    {t:'献上一瓶药水（换取罕见或稀有遗物）',needPot:true,f:r=>{const p=run.potions.pop();const s='献出「'+POTIONS[p].n+'」。';return s+gainR(r,r()<0.35?'rare':'uncommon')}},
    {t:'转身离开',f:()=>'你没有碰它。'}]},
  {id:'wheel',kind:'mixed',title:'幸运抽奖',text:'城门口摆着一只彩绘转盘，一次 30 金币。',opts:[
    {t:'转一次（-30 金币；40% 稀有遗物，60% 两瓶药水）',need:30,f:r=>{run.gold-=30;if(r()<0.4)return '中了大奖！'+gainR(r,'rare');return gainP(r)+' '+gainP(r)}},
    {t:'不转',f:()=>'你没有被诱惑。'}]},
  {id:'allnight',kind:'mixed',title:'通宵赶工',text:'截稿前一夜，你还有一大摞文稿要重新整理。',opts:[
    {t:'通宵达旦（-20 生命，稀有遗物）',needHp:20,f:r=>{hurt(20);return '损失 20 点生命。'+gainR(r,'rare')}},
    {t:'早些歇息（回复 10 点生命）',f:()=>'回复 '+heal(10)+' 点生命。'}]},
  {id:'blackmarket',kind:'mixed',title:'黑市',text:'巷子深处有人低声报价：一件稀罕货，150 金币。',opts:[
    {t:'买下（-150 金币，稀有遗物）',need:150,f:r=>{run.gold-=150;return gainR(r,'rare')}},
    {t:'走开',f:()=>'你转身离开。'}]},
  {id:'wishpool',kind:'mixed',title:'许愿池',text:'庭院里有一方小池，池底铺着不少铜钱。',opts:[
    {t:'投 50 金币许愿（回满生命，最大生命 +5）',need:50,f:()=>{run.gold-=50;run.maxHp+=5;run.hp=run.maxHp;return '生命完全恢复，最大生命 +5。'}},
    {t:'打捞几枚铜钱（+30 金币，-5 生命）',f:()=>{hurt(5);run.gold+=30;return '获得 30 金币，损失 5 点生命。'}}]},
  {id:'notebook',kind:'mixed',title:'整理笔记',text:'你整理出一套提升效率的笔记，可要为此耗费不少心力。',opts:[
    {t:'倾注心力（-15 生命；本幕内超时每次扣血 -5）',needHp:15,f:()=>{hurt(15);run.actCut=(run.actCut||0)+5;return '本幕内超时每次扣血 -5。'}},
    {t:'随手翻翻',f:()=>'没什么收获。'}]},
  {id:'clockman',kind:'mixed',title:'沙漏商人',text:'商人托着一只漏刻，说它能让时间走得慢一点。',opts:[
    {t:'买下漏刻（-120 金币，获得「沙漏」）',need:120,f:()=>{if(run.relics.includes('clepsydra'))return '你已经有这件遗物了。';run.gold-=120;gainRelic('clepsydra');return '获得遗物「沙漏」。'}},
    {t:'算了',f:()=>'你没有买。'}]},
  /* 新增（更强，也更凶险） */
  {id:'gambler',kind:'mixed',title:'赌场',text:'骰盅在桌上摇得哗哗作响，庄家抬眼看你：「敢不敢？」',opts:[
    {t:'押上 100 金币（50%：赢回 280 金币并得一瓶药水；50%：血本无归）',need:100,f:r=>{run.gold-=100;if(r()<0.5){run.gold+=280;return '骰盅一开，你赢了！获得 280 金币。'+gainP(r)}return '骰盅一开，输了。'}},
    {t:'掉头就走',f:()=>'你没有理会。'}]},
  {id:'cursedblade',kind:'mixed',title:'锈蚀之剑',text:'剑身锈迹斑斑，却隐隐透出寒光，似在召唤你。',opts:[
    {t:'执剑在手（-25 生命，稀有遗物，最大生命 +8）',needHp:25,f:r=>{hurt(25);gainMax(8);return '剑气入体，损失 25 点生命，最大生命 +8。'+gainR(r,'rare')}},
    {t:'不去碰它',f:()=>'你转身离开。'}]},
  {id:'bloodpact',kind:'mixed',title:'血之契约',text:'一页泛黄的契约摊在案上，墨迹未干，旁边放着一枚银针。',opts:[
    {t:'滴血为契（-30 生命，两件遗物）',needHp:30,f:r=>{hurt(30);return '损失 30 点生命。'+gainR(r,'uncommon')+' '+gainR(r)}},
    {t:'撕毁契约',f:()=>'契约化为灰烬。'}]},
  {id:'mirror',kind:'mixed',title:'魔镜',text:'古镜蒙着一层雾，你伸手抹开，镜中的人却先对你笑了。',opts:[
    {t:'直视镜中人（50%：回满生命；50%：-20 生命）',f:r=>{if(r()<0.5){run.hp=run.maxHp;return '镜光洗过全身，生命完全恢复。'}hurt(20);return '镜中人冷冷地看着你，损失 20 点生命。'}},
    {t:'蒙上镜面',f:()=>'你把镜子盖了起来。'}]},
  {id:'innerdemon',kind:'mixed',title:'心魔',text:'夜深人静，你听见自己的声音在耳边低语。',opts:[
    {t:'直面心魔（-20 生命；最大生命 +10，本幕内超时每次扣血 -8）',needHp:20,f:()=>{hurt(20);gainMax(10);run.actCut=(run.actCut||0)+8;return '心魔溃散，最大生命 +10；本幕内超时每次扣血 -8。'}},
    {t:'避而不见（-30 金币）',f:()=>{run.gold=Math.max(0,run.gold-30);return '破财消灾，损失 30 金币。'}}]},
  {id:'tycoon',kind:'mixed',title:'大富翁',text:'一位巨贾愿以重利相邀，但要你先出一笔本钱。',opts:[
    {t:'出资 200 金币（稀有遗物与 2 瓶药水）',need:200,f:r=>{run.gold-=200;return gainR(r,'rare')+' '+gainP(r)+' '+gainP(r)}},
    {t:'婉言谢绝',f:()=>'你婉言谢绝了。'}]},
  {id:'rift',kind:'mixed',title:'时间裂隙',text:'空气里裂开一道细缝，缝那头的时间似乎流得很慢。',opts:[
    {t:'踏入其中（-18 生命；接下来 4 场战斗时限 +15 分钟）',needHp:18,f:()=>{hurt(18);run.fightBoon=4;run.fightBonusMin=15;return '损失 18 点生命；接下来 4 场战斗时限 +15 分钟。'}},
    {t:'退后一步',f:()=>'缝隙缓缓合上了。'}]},
  {id:'lots',kind:'mixed',title:'求签',text:'庙里的签筒摇得哗啦作响，掉出一支竹签。',opts:[
    {t:'摇签问卜（三分之一：稀有遗物；三分之一：+200 金币；三分之一：-15 生命）',f:r=>{const v=r();if(v<1/3)return '上上签！'+gainR(r,'rare');if(v<2/3){run.gold+=200;return '中平之签，获得 200 金币。'}hurt(15);return '下下签，损失 15 点生命。'}},
    {t:'不信这些',f:()=>'你笑了笑，走开了。'}]}
];
/* 先古之民：每座塔塔底，三选一 */
const BOONS=[
  {id:'hp',n:'生命涌动',d:'最大生命 +15，并回复 15 点。',f:()=>{gainMax(15)}},
  {id:'gold',n:'行囊',d:'获得 150 金币。',f:()=>{run.gold+=150}},
  {id:'relic',n:'旧物',d:'获得一件随机普通遗物。',f:r=>gainR(r,'common')},
  {id:'rare',n:'传家宝',d:'获得一件随机罕见或稀有遗物。',f:r=>gainR(r,r()<0.4?'rare':'uncommon')},
  {id:'potions',n:'药水箱',d:'获得 3 瓶随机药水。',f:r=>[0,1,2].map(()=>givePotion(randPotion(r))).join(' ')},
  {id:'full',n:'整装待发',d:'回满生命，最大生命 +6。',f:()=>{run.maxHp+=6;run.hp=run.maxHp}},
  {id:'grace',n:'先古的耐心',d:'接下来 3 场战斗时限 +8 分钟。',f:()=>{run.fightBoon=3;run.fightBonusMin=8}},
  {id:'slot',n:'扩容',d:'药水栏位 +1。',f:()=>{run.extraSlots=(run.extraSlots||0)+1}},
  {id:'cut',n:'坚韧',d:'本幕内，超时每次扣血 -5。',f:()=>{run.actCut=(run.actCut||0)+5}},
  {id:'shop',n:'商会推荐信',d:'本幕内，商店价格 -30%。',f:()=>{run.actShopDisc=0.3}},
  {id:'aid',n:'急救包',d:'获得大治疗药水与创可贴各一瓶。',f:()=>givePotion('bigheal')+' '+givePotion('bandage')},
  {id:'kit',n:'提神套装',d:'获得 2 杯咖啡和一瓶镇静药水。',f:()=>[givePotion('coffee'),givePotion('coffee'),givePotion('recover')].join(' ')},
  {id:'tick',n:'先古的沙漏',d:'本幕内，超时扣血的间隔 +2 分钟。',f:()=>{run.actTick=(run.actTick||0)+2}},
  {id:'free',n:'先古的庇护',d:'接下来 3 场战斗不受超时扣血。',f:()=>{run.freeFights=(run.freeFights||0)+3}},
  {id:'two',n:'双重馈赠',d:'获得两件随机普通遗物。',f:r=>gainR(r,'common')+' '+gainR(r,'common')},
  {id:'hp2',n:'不朽之躯',d:'最大生命 +30，并回复 30 点。',f:()=>{gainMax(30)}},
  {id:'rich',n:'先古的宝库',d:'获得 250 金币。',f:()=>{run.gold+=250}},
  {id:'heir',n:'祖传秘宝',d:'获得一件稀有遗物。',f:r=>gainR(r,'rare')},
  {id:'oath',n:'先古之誓',d:'本幕内，超时每次扣血 -8。',f:()=>{run.actCut=(run.actCut||0)+8}},
  {id:'elixir',n:'涅槃',d:'获得完全治疗药水一瓶，并回复 20 点生命。',f:()=>givePotion('fullheal')+' 回复 '+heal(20)+' 点生命。'}
];
function eventChoose(i){
  const rm=run.room,ev=EVENTS.find(e=>e.id===rm.event);
  const rr=rngFor(run.seed,'ev'+nodeKey(rm.node)+'_'+i);
  const opts=ev.dyn?ev.dyn(rngFor(run.seed,'evd'+nodeKey(rm.node))):ev.opts;
  const o=opts[i];if(!o||(o.need&&run.gold<o.need)||(o.needPot&&!run.potions.length)||(o.needHp&&run.hp<=o.needHp))return;
  rm.result=o.f(rr);
  const eg=E('eventGold');if(eg){run.gold+=eg;rm.result+=' 家传玉佩：+'+eg+' 金币。'}
  const eh=E('eventHeal');if(eh){rm.result+=' 风铃：回复 '+heal(eh)+' 点生命。'}
  rm.phase='result';save();render();
}
function ancientPick(i){
  const rm=run.room,b=BOONS.find(x=>x.id===rm.choices[i]);
  const rr=rngFor(run.seed,'ancb'+run.act+'_'+i);
  const m=b.f(rr);
  rm.result=b.n+'：'+(m||b.d);rm.phase='result';save();render();
}
function claim(what,idx){
  const rw=run.room.rewards;
  if(what==='potion'&&rw.potion){
    if(!addPotion(rw.potion)){toast('药水栏已满：请先在顶部使用或丢弃一瓶药水');return}rw.potion=null;
  }else if(what==='relic'&&rw.relic){gainRelic(rw.relic);rw.relic=null}
  else if(what==='choice'){gainRelic(rw.choices[idx]);rw.choices=null}
  else if(what==='skip'){rw.choices=null}
  save();render();
}

/* =====================================================================
   四、联机（WebSocket 房间）
   ===================================================================== */
const net={ws:null,connected:false,reconnecting:false,want:null,joinedOnce:false,retry:0,rt:null,lastRx:0,outbox:[],id:null,room:'',host:null,members:{},started:false,config:null,chat:[],err:'',spectate:false,url:'',g:null};
const netActive=()=>!!(net.connected||net.reconnecting);
function getCid(){let c=ssGet('oi_cid');if(!c){c=Array.from({length:14},()=>'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random()*36)]).join('');ssSet('oi_cid',c)}return c}
function defaultWs(){
  if(location.protocol==='http:'||location.protocol==='https:')return (location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws';
  return 'ws://localhost:8787/ws';
}
function myStatus(){
  if(!run)return{st:'未开局'};
  const rm=run.room,c=cb();
  const KN={monster:'普通战斗',elite:'精英战斗',boss:'首领战斗',shop:'商店',rest:'休息处',treasure:'宝箱',event:'事件',ancient:'先古之民'};
  let st='地图';
  if(run.victory)st='已通关';else if(run.over)st='已死亡';else if(rm)st=KN[rm.kind]||'地图';
  const loc=rm&&rm.node?rm.node:run.pos;
  return{d:run.difficulty,tier:run.tier||0,act:run.act,floor:loc&&loc.r>=0?loc.r+1:0,pos:loc?{r:loc.r,c:loc.c}:null,hp:run.hp,max:run.maxHp,gold:run.gold,rel:run.relics.length,st,
    rem:(c&&c.started&&!c.done&&!run.over)?remainingMs(c):null,over:run.over,win:run.victory,wins:run.stats.wins};
}
let syncT=0;
function syncStatus(){
  if(!net.connected||!run||syncT)return;
  syncT=setTimeout(()=>{syncT=0;if(net.connected){const s=myStatus();net.members[net.id]&&(net.members[net.id].s=s,net.members[net.id].at=Date.now());netSend({t:'status',s});renderSide()}},250);
}
/* 关键消息在断线期间先存起来，重连成功后补发 */
const CRIT=['done','dead','psolve','vote'];
function netSend(o){
  if(net.ws&&net.ws.readyState===1){try{net.ws.send(JSON.stringify(o))}catch(e){}return}
  if(net.want&&CRIT.includes(o.t)){net.outbox=net.outbox.filter(x=>!(x.t===o.t&&(o.t!=='psolve'||x.pid===o.pid)));net.outbox.push(o)}
}
function mpSave(){if(run&&run.mp&&net.room&&net.config)lsSet(LS_MPRUN,JSON.stringify({room:net.room,seed:net.config.seed,run}))}
function mpLoad(){try{return JSON.parse(lsGet(LS_MPRUN))}catch(e){return null}}
function netConnect(url,room,name,resume){
  net.err='';net.url=url;net.want={url,room,name};net.joinedOnce=!!resume;net.retry=0;net.reconnecting=!!resume;
  ssSet('oi_net',JSON.stringify(net.want));
  doConnect();
}
function doConnect(){
  clearTimeout(net.rt);net.rt=null;
  const w=net.want;if(!w)return;
  if(net.ws){const o=net.ws;o.onclose=null;o.onmessage=null;try{o.close()}catch(e){}net.ws=null}
  let ws;try{ws=new WebSocket(w.url)}catch(e){net.err='服务器地址无效';dropWant();render();return}
  net.ws=ws;
  ws.onopen=()=>{net.lastRx=Date.now();try{ws.send(JSON.stringify({t:'join',room:w.room,name:w.name,cid:getCid(),vjToken:vjBinding&&vjBinding.token}))}catch(e){}};
  ws.onmessage=ev=>{net.lastRx=Date.now();let m;try{m=JSON.parse(ev.data)}catch(e){return}onNet(m)};
  ws.onerror=()=>{};
  ws.onclose=()=>{if(net.ws!==ws)return;net.ws=null;net.connected=false;linkLost()};
}
function dropWant(){net.want=null;net.reconnecting=false;clearTimeout(net.rt);net.rt=null;ssDel('oi_net')}
function linkLost(){
  if(!net.want){render();return}
  if(!net.joinedOnce){net.err='无法连接服务器。请确认已运行 node server.js，并检查地址。';dropWant();render();return}
  net.reconnecting=true;
  const d=Math.min(8000,1000*Math.pow(2,Math.min(net.retry,3)));net.retry++;
  clearTimeout(net.rt);net.rt=setTimeout(doConnect,d);
  render();
}
function forceReconnect(){
  if(!net.want)return;
  const ws=net.ws;if(ws){ws.onclose=null;ws.onmessage=null;try{ws.close()}catch(e){}}
  net.ws=null;net.connected=false;net.retry=0;net.reconnecting=true;
  clearTimeout(net.rt);net.rt=setTimeout(doConnect,200);render();
}
function netLeave(){
  const ws=net.ws;
  if(ws){try{ws.send(JSON.stringify({t:'bye'}))}catch(e){}try{ws.onclose=null;ws.close()}catch(e){}}
  dropWant();net.ws=null;net.connected=false;net.members={};net.started=false;net.chat=[];net.err='';net.spectate=false;net.g=null;net.outbox=[];net.joinedOnce=false;
  lsDel(LS_MPRUN);if(run&&run.mp)run.mp=false;render();
}
function setMembers(list){
  const old=net.members;net.members={};
  list.forEach(m=>{net.members[m.id]={name:m.name,o:m.o!==false,s:m.s||(old[m.id]&&old[m.id].s)||null,until:m.until||null,at:Date.now()}});
}
function onNet(m){
  if(m.t==='joined'){
    const again=net.joinedOnce;
    net.connected=true;net.reconnecting=false;net.joinedOnce=true;net.retry=0;net.err='';
    net.id=m.you;net.room=m.room;net.host=m.host;net.started=m.started;net.config=m.config;net.g=m.g||null;
    if(vjBinding&&!m.vjBound){vjForgetBinding();toast('VJudge 服务器绑定已失效，请重新绑定')}
    if(!again)net.chat=[];
    setMembers(m.members);
    let inGame=false;
    if(m.started&&m.config){
      if(m.player){
        if(m.config.mode==='team_race'){
          let saved=null;try{saved=JSON.parse(lsGet(LS_RUN)||'null')}catch(e){}
          if(saved&&saved.mode==='team_race'&&String(saved.seed)===String(m.config.seed)&&!saved.over&&!saved.victory){run=saved;inGame=true;view='game'}
        }else if(run&&run.mp&&String(run.seed)===String(m.config.seed))inGame=true;
        else{const sv=mpLoad();if(sv&&sv.room===m.room&&String(sv.seed)===String(m.config.seed)&&sv.run&&!sv.run.over&&!sv.run.victory){run=sv.run;run.mp=true;lastMapAct=null;inGame=true;view='game'}}
      }
      if(inGame){net.spectate=false;if(!again)view='game'}
      else{net.spectate=true;if(m.player)netSend({t:'spectate'});view='lobby'}
    }else{
      net.spectate=false;if(run&&run.mp)run.mp=false;view='lobby';
    }
    const ob=net.outbox;net.outbox=[];ob.forEach(netSend);
    syncStatus();render();
  }else if(m.t==='members'){net.host=m.host;setMembers(m.members);renderSide();if(view==='lobby')render()}
  else if(m.t==='status'){if(net.members[m.id]){net.members[m.id].s=m.s;net.members[m.id].at=Date.now()}if(view==='game'&&net.config&&net.config.mode==='team_race')render();else renderSide()}
  else if(m.t==='chat'){net.chat.push({n:m.name,x:m.text});if(net.chat.length>80)net.chat.shift();renderSide()}
  else if(m.t==='start'){
    net.started=true;net.config=m.config;net.g=null;
    const gi=cfgGi(m.config);
    if(!isUnlocked(gi)){net.spectate=true;netSend({t:'spectate'});view='lobby';render();toast('你尚未解锁「'+giName(gi)+'」，本局只能观战')}
    else if(m.config.mode==='team_race'){net.spectate=false;startRun(gi,m.config.seed,false,null,'team_race');toast('团队竞速开始：'+giName(gi)+'，种子 '+m.config.seed)}
    else{net.spectate=false;startRun(gi,m.config.seed,true);toast('对局开始：'+giName(gi)+'，种子 '+m.config.seed)}
  }
  else if(m.t==='g'){net.g=m.g;onGUpdate()}
  else if(m.t==='go'){
    if(isMP()&&!run.over&&!run.victory&&!run.room){view='game';enterNode(m.r,m.c)}
  }
  else if(m.t==='lobby'){net.started=false;net.g=null;net.spectate=false;lsDel(LS_MPRUN);if(run&&run.mp){run.mp=false}view='lobby';render()}
  else if(m.t==='finished'){lsDel(LS_MPRUN);toast('全队通关！');render()}
  else if(m.t==='wiped'){lsDel(LS_MPRUN);toast('全队死亡……');render()}
  else if(m.t==='gift'){
    if(run&&!run.over&&!run.victory){const msg=givePotion(m.potion);toast(m.name+' 送来了「'+(POTIONS[m.potion]?POTIONS[m.potion].n:'药水')+'」。'+msg);save();render()}
  }
  else if(m.t==='draw'){
    if(run&&run.map&&run.map.draw&&m.act===run.act&&m.stroke&&Array.isArray(m.stroke.p)){run.map.draw.push({id:m.stroke.id,by:m.from,c:String(m.stroke.c).slice(0,9),p:m.stroke.p});redrawLayer()}
  }
  else if(m.t==='drawundo'){if(run&&run.map&&m.act===run.act){run.map.draw=run.map.draw.filter(x=>x.id!==m.id||x.by!==m.from);redrawLayer()}}
  else if(m.t==='drawclear'){if(run&&run.map&&m.act===run.act){run.map.draw=run.map.draw.filter(x=>x.by!==m.from);redrawLayer()}}
  else if(m.t==='kicked'){
    const ws=net.ws;if(ws){ws.onclose=null;try{ws.close()}catch(e){}}
    dropWant();net.ws=null;net.connected=false;net.started=false;net.err='这个席位已在另一个页面登录，本页面已退出房间。';if(run&&run.mp)run.mp=false;view='lobby';render();
  }
  else if(m.t==='error'){
    net.err=m.msg;toast(m.msg);
    if(!net.connected){const ws=net.ws;if(ws){ws.onclose=null;try{ws.close()}catch(e){}}net.ws=null;dropWant();render()}
  }
}
const cfgGi=cfg=>giOf(Math.max(0,Math.min(TIERS.length-1,cfg.tier||0)),Math.max(0,Math.min(10,cfg.difficulty||0)));
/* 联机战斗：题目、计时开始、做出题目都由服务器统一广播 */
const fightOf=()=>(isMP()&&net.g&&net.g.fight)||null;
function curProblems(){
  const rm=run&&run.room;if(!rm)return [];
  if(isMP()){const f=fightOf();return (f&&f.problems)||[]}
  return rm.problem?[rm.problem]:[];
}
function onGUpdate(){
  if(isMP()&&run&&!run.over&&run.room&&run.room.combat){
    const f=net.g&&net.g.fight,rm=run.room;
    if(f&&f.solved)Object.keys(f.solved).forEach(pid=>{if(!lgDone.has(pid))lgMarkDone(pid)});
    if(f&&f.startedAt)rm.combat.vjStartedAt=f.startedAt;
    if(f&&f.started&&rm.phase==='prep'){startCombat();return}                      // 有人点了开始：全队同时开始计时
    if(f&&f.won&&rm.phase==='fight'&&!rm.combat.done){winCombat();return}          // 所有题目都被击败
  }
  if(view==='game')render();else renderSide();
}
function giftPotion(toId){
  const sel=document.getElementById('gift_'+toId);if(!sel||sel.value==='')return;
  const i=+sel.value,id=run.potions[i];if(!id)return;
  run.potions.splice(i,1);netSend({t:'gift',to:toId,potion:id});toast('已赠送「'+POTIONS[id].n+'」');save();render();
}

/* =====================================================================
   五、界面渲染
   ===================================================================== */
const KIND_NAME={ancient:'先古之民',monster:'普通战斗',elite:'精英战斗',boss:'首领战斗',unknown:'未知之地',rest:'休息处',shop:'商店',treasure:'宝箱',event:'事件'};
const KIND_GLYPH={ancient:'古',monster:'怪',elite:'精',boss:'魔',unknown:'?',rest:'休',shop:'店',treasure:'宝'};
let lastMapAct=null, mapScroll=0;
function withPreserve(fn){
  const vals={};let focus=null,ss=0,se=0;
  document.querySelectorAll('input[id],select[id],textarea[id]').forEach(e=>{vals[e.id]=e.value});
  const a=document.activeElement;
  if(a&&a.id&&(a.tagName==='INPUT'||a.tagName==='SELECT'||a.tagName==='TEXTAREA')){focus=a.id;try{ss=a.selectionStart;se=a.selectionEnd}catch(e){}}
  fn();
  for(const id in vals){const e=document.getElementById(id);if(e&&e.tagName!=='SELECT')e.value=vals[id];else if(e&&[...e.options].some(o=>o.value===vals[id]))e.value=vals[id]}
  if(focus){const e=document.getElementById(focus);if(e){e.focus();try{e.setSelectionRange(ss,se)}catch(x){}}}
}
function render(){
  withPreserve(()=>{
    const mw=document.getElementById('mapwrap');if(mw)mapScroll=mw.scrollTop;
    const rc0=document.getElementById('roomcard');rcScroll=rc0?rc0.scrollTop:0;
    if(view==='menu')$app.innerHTML=menuHTML();
    else if(view==='history')$app.innerHTML=historyHTML();
    else if(view==='rules')$app.innerHTML=rulesHTML();
    else if(view==='select')$app.innerHTML=selectHTML();
    else if(view==='custom')$app.innerHTML=customHTML();
    else if(view==='lobby')$app.innerHTML=lobbyHTML();
    else if(view==='game'&&run)$app.innerHTML=gameHTML();
    else $app.innerHTML=menuHTML();
    if(lgPanel&&view!=='game')$app.insertAdjacentHTML('beforeend',lgPanelHTML());
    if(vjPanel)$app.insertAdjacentHTML('beforeend',vjPanelHTML());
    if(savePanel)$app.insertAdjacentHTML('beforeend',savePanelHTML());
    $app.insertAdjacentHTML('beforeend','<button class="themefab" data-a="theme">'+(theme==='dark'?'浅色模式':'深色模式')+'</button>');
  });
  const mw=document.getElementById('mapwrap');
  if(mw){
    if(lastMapAct!==run.act+'_'+run.seed){mw.scrollTop=mw.scrollHeight;lastMapAct=run.act+'_'+run.seed}
    else mw.scrollTop=mapScroll;
  }
  const rc1=document.getElementById('roomcard');if(rc1)rc1.scrollTop=rcScroll;
  const ch=document.querySelector('.chat');if(ch)ch.scrollTop=ch.scrollHeight;
  tick();
}
function renderSide(){
  const el=document.getElementById('side');
  if(el&&(view==='game'||view==='lobby')){withPreserve(()=>{el.innerHTML=sideInner()});const ch=el.querySelector('.chat');if(ch)ch.scrollTop=ch.scrollHeight;tick()}
}

function tierBar(t){let x='';for(let v=t.lo;v<=t.hi;v++)x+=`<i class="sw" style="background:var(--lv${v})"></i>`;return `<span class="swrow">${x}</span> ${LV[t.lo].c} → ${LV[t.hi].c}`}

/* ---------- 自定义模式：自行设定各类战斗的时限、超时扣血与题目难度，以及若干全局参数。不计入进度，仅限单人 ---------- */
const CUST_DEF={m:{grace:20,tick:5,drain:10,lo:1,hi:3},e:{grace:40,tick:5,drain:10,lo:2,hi:4},b:{grace:60,tick:5,drain:20,lo:3,hi:5},
  hp:100,gold:99,slots:3,goldPct:100,shopPct:100,restPct:30,eliteW:9,actHeal:100,starter:true,seed:''};
const CUST_PRESETS={
  easy:{m:{grace:40,tick:10,drain:5,lo:1,hi:2},e:{grace:70,tick:10,drain:5,lo:1,hi:3},b:{grace:100,tick:10,drain:10,lo:2,hi:4},hp:150,gold:200,slots:4,goldPct:150,shopPct:80,restPct:40,eliteW:6,actHeal:100,starter:true},
  normal:CUST_DEF,
  hard:{m:{grace:12,tick:3,drain:15,lo:3,hi:5},e:{grace:25,tick:3,drain:20,lo:4,hi:6},b:{grace:45,tick:3,drain:35,lo:5,hi:7},hp:80,gold:50,slots:2,goldPct:70,shopPct:130,restPct:15,eliteW:16,actHeal:40,starter:false}
};
const cloneC=o=>JSON.parse(JSON.stringify(o));
let cust=(()=>{const d=cloneC(CUST_DEF);try{const x=JSON.parse(lsGet('oi3_custom'));if(x&&x.m&&x.e&&x.b){for(const k of['m','e','b'])Object.assign(d[k],x[k]);for(const k of Object.keys(d))if(!['m','e','b'].includes(k)&&x[k]!==undefined)d[k]=x[k]}}catch(e){}return d})();
const cgetP=(o,p)=>p.split('.').reduce((a,k)=>a[k],o);
const csetP=(o,p,v)=>{const ks=p.split('.');const l=ks.pop();ks.reduce((a,k)=>a[k],o)[l]=v};
const CNUM=[['m.grace',1,600],['m.tick',1,120],['m.drain',0,200],['m.lo',0,7],['m.hi',0,7],['e.grace',1,600],['e.tick',1,120],['e.drain',0,200],['e.lo',0,7],['e.hi',0,7],
  ['b.grace',1,600],['b.tick',1,120],['b.drain',0,200],['b.lo',0,7],['b.hi',0,7],['hp',10,9999],['gold',0,99999],['slots',0,10],['goldPct',0,1000],['shopPct',10,1000],['restPct',0,100],['eliteW',0,60],['actHeal',0,100]];
function custReadDom(){
  for(const [p,lo,hi] of CNUM){const el=document.getElementById('cf_'+p);if(!el)continue;let v=Math.round(Number(el.value));if(!isFinite(v))v=cgetP(CUST_DEF,p);csetP(cust,p,Math.max(lo,Math.min(hi,v)))}
  for(const k of['m','e','b'])if(cust[k].lo>cust[k].hi){const t=cust[k].lo;cust[k].lo=cust[k].hi;cust[k].hi=t}
  const st=document.getElementById('cf_starter');if(st)cust.starter=st.checked;
  const sd=document.getElementById('cf_seed');if(sd)cust.seed=sd.value.trim().slice(0,20);
  lsSet('oi3_custom',JSON.stringify(cust));
}
function custWriteDom(){
  for(const [p] of CNUM){const el=document.getElementById('cf_'+p);if(el)el.value=cgetP(cust,p)}
  const st=document.getElementById('cf_starter');if(st)st.checked=!!cust.starter;
}
function buildCustom(){
  const k=x=>({grace:x.grace,tick:x.tick,drain:x.drain,lo:x.lo,hi:x.hi});
  return {kinds:{monster:k(cust.m),elite:k(cust.e),boss:k(cust.b)},gold:cust.gold,
    pr:{startMax:cust.hp,slots:cust.slots,goldMult:cust.goldPct/100,shopMult:cust.shopPct/100,restPct:cust.restPct/100,eliteW:cust.eliteW/100,actHeal:cust.actHeal/100,noStarter:!cust.starter,failMult:1,bossFailMult:1,badEvent:0}};
}
function customHTML(){
  const num=(p,lo,hi)=>`<input type="number" id="cf_${p}" min="${lo}" max="${hi}" step="1" value="${cgetP(cust,p)}" style="width:5.5em">`;
  const row=(k,name)=>`<tr><th style="text-align:left">${name}</th><td>${num(k+'.grace',1,600)}</td><td>${num(k+'.tick',1,120)}</td><td>${num(k+'.drain',0,200)}</td><td>${num(k+'.lo',0,7)} ~ ${num(k+'.hi',0,7)}</td></tr>`;
  return `<div class="wrap"><div class="row" style="margin-bottom:12px"><button data-a="goMenu">返回</button><h2>自定义模式</h2><span class="spacer"></span>
    <button data-a="custPreset" data-p="easy">宽松</button><button data-a="custPreset" data-p="normal">默认</button><button data-a="custPreset" data-p="hard">严苛</button></div>
  <div class="panel" style="display:flex;flex-direction:column;gap:12px">
    <p class="dim" style="margin:0">自行设定各类战斗的时限、超时扣血与题目难度（洛谷难度 0 未评定 ~ 7 黑），再配上若干全局参数。自定义的对局不计入解锁进度，仅限单人。超时扣血填 0 表示不会因超时掉生命。</p>
    <div style="overflow-x:auto"><table style="border-collapse:separate;border-spacing:8px 6px">
      <thead><tr class="dim"><th></th><th>时限（分钟）</th><th>超时间隔（分钟）</th><th>每次扣血（生命）</th><th>题目难度（0~7）</th></tr></thead>
      <tbody>${row('m','普通战斗')}${row('e','精英战斗')}${row('b','首领战斗')}</tbody></table></div>
    <div class="row" style="gap:10px 20px">
      <label>初始生命 ${num('hp',10,9999)}</label><label>初始金币 ${num('gold',0,99999)}</label><label>药水栏位 ${num('slots',0,10)}</label>
      <label>金币奖励 % ${num('goldPct',0,1000)}</label><label>商店价格 % ${num('shopPct',10,1000)}</label>
      <label>休息处回复 % ${num('restPct',0,100)}</label><label>精英出现率 % ${num('eliteW',0,60)}</label><label>重间回复 % ${num('actHeal',0,100)}</label>
      <label class="chk"><input type="checkbox" id="cf_starter" ${cust.starter?'checked':''}> 携带初燃之血</label></div>
    <div class="field"><label for="cf_seed" class="dim">种子（可留空）</label><input id="cf_seed" maxlength="20" value="${esc(cust.seed||'')}" placeholder="随机" style="max-width:240px"></div>
    <div><button class="primary" data-a="custStart">开始爬塔</button></div></div></div>`;
}

function menuHTML(){
  const saved=lsGet(LS_RUN),nUnl=unlockedList().length;
  const testRow=testMode
    ?'<span class="chip">测试模式已开启</span><button data-a="testOff">退出测试模式</button>'
    :testAsk?'<input id="testPw" type="password" placeholder="请输入口令" autocomplete="off"><button data-a="testGo">确认</button><button data-a="testCancel">取消</button>'
    :'<button data-a="testAsk" style="border-style:dashed">测试模式</button>';
  return `<div class="menu">
    <div class="logo">OI 尖塔 <span>II</span></div>
    <p class="tagline">把每一场战斗，换成一道题。时限内不扣血，超时后每 5 分钟失去生命。</p>
    <div class="menu-btns">
      ${saved?'<button class="primary" data-a="continue">继续上次的爬塔</button>':''}
      <button data-a="openArchive">存档 / 导入</button>
      <button class="${saved?'':'primary'}" data-a="goSelect">单人爬塔</button>
      <button data-a="goCustom">自定义模式</button>
      <button data-a="goLobby">多人联机</button>
      <button data-a="goHistory">战绩复盘</button>
      <button data-a="vjPanel">${vjBinding?'VJudge：'+esc(vjBinding.username):'绑定 VJudge'}</button>
      <button data-a="lgPanel">题库 / 题单设置</button>
      <button data-a="goRules">规则说明</button>
    </div>
    <div class="legend-row">${TIERS.map(t=>`<span class="chip">${t.n} · ${tierBar(t)}</span>`).join('')}</div>
    <p class="dim mono">已解锁 ${nUnl} / ${GI_MAX+1} 个进阶${testMode?'（测试模式：全部开放，不计入进度）':''}</p>
    <div class="row">${testRow}</div>
    ${testErr?`<p style="color:var(--bad);margin:0">${esc(testErr)}</p>`:''}
  </div>`;
}
function rulesHTML(){
  return `<div class="wrap"><div class="panel" style="display:flex;flex-direction:column;gap:10px;max-width:760px;margin:20px auto">
    <h2>规则说明</h2>
    <p><b>总览</b>：设「普及」「提高」「省选」三大难度，每个大难度各含进阶 0 至 10 共 11 级。每级须依次闯过三幕，每幕是一座十五层的高塔，塔顶有首领镇守。击败三幕首领即为通关。各大难度的进阶 0 一开始即可挑战；通关某一级后，同一大难度的下一级随之解锁。各大难度的进阶 10，第三幕须连续击败两位首领。</p>
    <p><b>先古之民</b>：每座塔的塔底都有一位先古之民，须先领受一份馈赠（随机三选一），方可踏上第一层。</p>
    <p><b>题目颜色</b>：沿用洛谷难度颜色：红（入门）、橙（普及-）、黄（普及/提高-）、绿（普及+/提高）、蓝（提高+/省选-）、紫（省选/NOI-）、黑（NOI/NOI+/CTSC）。普及：红至绿；提高：黄至蓝；省选：蓝至黑。同一大难度中，难度级别越高、所在重数越靠后，题目越接近色带上端；同一重内，首领战斗最难，精英战斗次之，普通战斗最易。</p>
    <p><b>战斗</b>：进入战斗后，页面给出所需的题目颜色。可点「随机跳题」从洛谷离线题库（或你指定的题单）中抽题，也可自行跳题。绑定 VJudge 后，单人战斗须先选题，开始计时后在 VJudge 提交洛谷题目，再点「验证 VJudge AC」；联机时，绑定账号提交的 AC 也会由服务器核验。未绑定账号仍可手动确认。战斗没有退路：要么AC，要么生命耗尽。</p>
    <p><b>时限与超时</b>：时限之内不扣生命。普及、提高难度下，普通战斗 20 分钟、精英战斗 40 分钟、首领战斗 60 分钟；省选难度下分别为 60、90、120 分钟。超时之后，每满 5 分钟失去一次生命（普通 10、精英 10、首领 20，随幕数与难度递增），直至 AC。生命归零则本次爬塔结束。计时依系统时间，刷新页面不会重置。</p>
    <p><b>题单</b>：在「题库 / 题单设置」中可添加一个或多个洛谷题单（填写编号或链接），勾选后随机跳题只会从其中抽取。抓取题单须经由 <span class="mono">node server.js</span>，亦可手动粘贴题号导入。</p>
    <p><b>存档</b>：在主菜单打开「存档 / 导入」，复制存档字符串或下载文件；存档会记录已解锁的进阶，以及当前进行中的单人对局。导入会保留本机已有的更高解锁进度，并可恢复存档中的单人对局。</p>
    <p><b>规划路径</b>：点「规划路径」，即可在地图上自由描画；多人联机时，同伴也能看到你的笔迹。</p>
    <p><b>关卡</b>：普通战斗、精英战斗、未知之地（开启后有 10% 概率变为普通战斗、15% 商店、15% 宝箱、60% 随机事件）、休息处、商店、宝箱。精英战斗必掉遗物，首领战斗可三选一。</p>
    <p><b>药水栏</b>：药水栏已满时，新得的药水会暂存在顶部的「待取」处；你可以随时在顶部使用、丢弃已有的药水，再将其收入。各类弹出的关卡面板不会遮挡顶部栏位。</p>
    <p><b>自定义模式</b>：可自行设定普通、精英、首领战斗各自的时限、超时间隔、每次扣血与题目难度范围，并调整初始生命、金币、药水栏位、金币奖励、商店价格、休息处回复、精英出现率等。自定义对局不计入解锁进度，仅限单人。</p>
    <p><b>多人联机</b>：合作爬塔中，全队共用地图并投票选路，战斗题目也由全队共享。团队竞速中，玩家使用相同种子和地图，但各自推进、选路与战斗，不需要投票；地图上的彩色标记显示队友所在节点，侧栏显示各自进度。竞速时每个人独立结算，先通关者可在房间状态中看到。掉线后席位会保留一段时间，刷新页面或网络恢复后会自动重连；服务器进程重启仍会清空房间。</p>
    <div class="row"><button data-a="goMenu">返回</button><button class="danger" data-a="resetProg">清空所有进度</button></div>
  </div></div>`;
}
function selectHTML(){
  const gi=selDiff,tier=Math.floor(gi/11),d=gi%11,t=TIERS[tier];
  const tabs=TIERS.map((x,i)=>`<button class="${i===tier?'primary':''}" data-a="pickTier" data-t="${i}">${x.n}</button>`).join('');
  const cards=[];
  for(let i=0;i<=10;i++){
    const g=tier*11+i,lock=!isUnlocked(g),b=prog.best[g]||0,cl=prog.cleared[g];
    cards.push(`<button class="dcard ${g===gi?'on':''} ${lock?'lock':''}" data-a="pickDiff" data-d="${g}">
      <span class="row"><b class="mono">进阶 ${i}</b><span>${DNAMES[i]}</span>${lock?'<span class="dim">未解锁</span>':cl?'<span class="chip">已通关</span>':''}</span>
      <span class="dots">${[1,2,3].map(s=>`<i class="${cl||s<b?'f':''}"></i>`).join('')}</span></button>`);
  }
  const mods=MODS.slice(0,d+1).map((m,i)=>`<li class="${i===d?'new':''}">${m}</li>`).join('');
  const locked=!isUnlocked(gi);
  return `<div class="wrap"><div class="row" style="margin-bottom:12px"><button data-a="goMenu">返回</button><h2>选择进阶</h2><span class="spacer"></span><div class="row">${tabs}</div></div>
  <div class="sel"><div class="dgrid">${cards.join('')}</div>
  <div class="panel"><h2>${t.n} · 进阶 ${d} · ${DNAMES[d]}</h2>
    <p style="margin:6px 0">题目颜色范围：${tierBar(t)}（洛谷 ${LV[t.lo].n} ~ ${LV[t.hi].n}）</p>
    <p class="dim" style="margin:4px 0">${locked?'通关「'+t.n+' · 进阶 '+(d-1)+'」后解锁。':'依次闯过三幕。'}${testMode?'（测试模式：全部开放）':''}</p>
    <ul class="modlist">${mods}</ul>
    <div class="field" style="margin-top:14px"><label for="seedIn" class="dim">种子（可留空；相同种子得到相同地图）</label><input id="seedIn" maxlength="20" placeholder="随机"></div>
    <button class="primary" data-a="startSolo" ${locked?'disabled':''}>开始爬塔</button></div></div></div>`;
}
function testPanelHTML(){
  const kinds=[['monster','普通战斗'],['elite','精英战斗'],['boss','首领战斗'],['shop','商店'],['rest','休息处'],['treasure','宝箱'],['ancient','先古之民'],['unknown','未知之地']];
  const evs=EVENTS.map(e=>`<option value="${e.id}">${e.kind==='good'?'［吉］':'［险］'}${e.title}</option>`).join('');
  const rels=Object.keys(RELICS).filter(k=>k!=='starter').map(k=>`<option value="${k}">${RARITY_NAME[RELICS[k].r]} · ${RELICS[k].n}</option>`).join('');
  const pots=Object.keys(POTIONS).map(k=>`<option value="${k}">${POTIONS[k].n}</option>`).join('');
  const boons=BOONS.map(b=>`<option value="${b.id}">${b.n}</option>`).join('');
  return `<details class="panel testp" id="testDet" ${testDetOpen?'open':''}><summary><b>测试面板</b> <span class="dim">（仅测试模式；打开的关卡不会推进地图）</span></summary>
    <div class="row" style="margin-top:8px"><span class="dim">立即开启</span>${kinds.map(k=>`<button data-a="testRoom" data-k="${k[0]}">${k[1]}</button>`).join('')}</div>
    <div class="row" style="margin-top:6px"><select id="testEv">${evs}</select><button data-a="testEvt">打开此事件</button>
      <select id="testBoon">${boons}</select><button data-a="testBoon">试用此馈赠</button></div>
    <div class="row" style="margin-top:6px"><select id="testRel">${rels}</select><button data-a="testRelic">获得遗物</button>
      <select id="testPot">${pots}</select><button data-a="testPotion">获得药水</button></div>
    <div class="row" style="margin-top:6px"><button data-a="testGold">+500 金币</button><button data-a="testHeal">回满生命</button><button data-a="testMax">最大生命 +20</button><button data-a="testSlot">药水栏位 +1</button>
      <span class="dim">跳到</span>${[1,2,3].map(a=>`<button data-a="testAct" data-n="${a}">第 ${a} 幕</button>`).join('')}<button data-a="testClose">关闭当前关卡</button></div></details>`;
}
function hudHTML(){
  const n=slotCount();
  const rel=run.relics.map(id=>`<span class="relic r-${RELICS[id].r}" title="${esc(RELICS[id].n+'（'+RARITY_NAME[RELICS[id].r]+'）：'+RELICS[id].d)}">${RELICS[id].n[0]}</span>`).join('');
  let pots='';
  for(let i=0;i<n;i++){
    const id=run.potions[i];
    pots+=id?`<span class="row" style="gap:2px"><button class="pot" data-a="usePotion" data-i="${i}" title="${esc(POTIONS[id].d)}">${POTIONS[id].n}</button><button class="pot" style="min-width:0;padding:.25em .4em" data-a="dropPotion" data-i="${i}" title="丢弃">×</button></span>`:'<span class="pot empty">空</span>';
  }
  const pend=(run.pending||[]).map((id,i)=>`<span class="row" style="gap:2px"><span class="chip" title="${esc(POTIONS[id].d)}">待取：${POTIONS[id].n}</span><button class="pot" data-a="takePending" data-i="${i}" ${run.potions.length>=n?'disabled':''} title="需要先腾出栏位">收入</button><button class="pot" style="min-width:0;padding:.25em .4em" data-a="dropPending" data-i="${i}" title="舍弃">×</button></span>`).join('');
  return `<div class="hud">
    <div class="grp">${run.custom?'<b class="mono">自定义</b>':`<b class="mono">${TIERS[run.tier||0].n} A${run.difficulty}</b><span>${DNAMES[run.difficulty]}</span>`}<span class="chip">${STAGE_NAMES[run.act-1]}</span>${run.test?'<span class="chip">测试</span>':''}</div>
    <div class="grp"><span>生命</span><div class="hpbar"><i style="width:${Math.max(0,run.hp/run.maxHp*100)}%"></i></div><span class="mono">${run.hp}/${run.maxHp}</span></div>
    <div class="grp"><span>金币</span><b class="mono">${run.gold}</b></div>
    <div class="grp pots">${pots}</div>
    ${pend?`<div class="grp pots">${pend}</div>`:''}
    <div class="grp relics">${rel||'<span class="dim">暂无遗物</span>'}</div>
    <span class="spacer"></span>
    <div class="grp"><button data-a="vjPanel">${vjBinding?'VJudge '+esc(vjBinding.username):'绑定 VJudge'}</button><span class="dim mono">种子 ${esc(run.seed)}</span><button data-a="toLobby">联机</button><button data-a="goMenu">菜单</button></div></div>`;
}
const PENS=['#ff5252','#ffd166','#4ade80','#38bdf8','#e879f9'];
const PCOL=['#ff6b6b','#4cc9f0','#ffd166','#b794f6','#4ade80','#fb923c','#f472b6','#94a3b8','#22d3ee','#a3e635','#f87171','#c084fc'];
function memberColor(id){const i=Object.keys(net.members).indexOf(id);return PCOL[(i<0?0:i)%PCOL.length]}
const isMP=()=>!!(run&&run.mp&&netActive()&&net.started);
function strokesHTML(){
  const d=(run&&run.map&&run.map.draw)||[];
  return d.map(st=>{const p=st.p.length===1?[st.p[0],st.p[0]]:st.p;return `<polyline points="${p.map(q=>q.join(',')).join(' ')}" fill="none" stroke="${esc(st.c)}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`}).join('');
}
function nodeShape(type){
  switch(type){
    case 'elite':return '<polygon class="ring" points="0,-30 30,0 0,30 -30,0"/>';
    case 'boss':return '<circle class="ring" r="36"/><circle class="ring2" r="29"/>';
    case 'unknown':return '<circle class="ring dashed" r="23"/>';
    case 'rest':return '<rect class="ring" x="-22" y="-22" width="44" height="44" rx="10"/>';
    case 'shop':return '<polygon class="ring" points="-26,0 -13,-23 13,-23 26,0 13,23 -13,23"/>';
    case 'treasure':return '<rect class="ring" x="-25" y="-18" width="50" height="36" rx="3"/><line class="ring2" x1="-25" y1="-6" x2="25" y2="-6"/>';
    case 'ancient':return '<circle class="ring" r="31"/><circle class="ring2" r="25"/>';
    default:return '<circle class="ring" r="23"/>';
  }
}
const legendHTML=()=>['ancient','monster','elite','unknown','rest','shop','treasure','boss'].map(t=>`<span class="lgi"><svg width="24" height="24" viewBox="-40 -40 80 80" aria-hidden="true">${nodeShape(t)}<text class="gl">${KIND_GLYPH[t]}</text></svg>${KIND_NAME[t]}</span>`).join('');
function mapHTML(){
  const nodes=run.map.nodes,TOP=nodes.length-1,av=availNodes(),anc=run.map.ancient;
  const X=c=>60+c*96, Y=r=>50+(TOP-r)*78;
  const jr=(r,c)=>{const g=rngFor(run.seed,'j'+run.act+'_'+r+'_'+c);return[(g()-0.5)*26,(g()-0.5)*22]};
  const pos={};
  for(let r=0;r<=TOP;r++)for(let c=0;c<W;c++)if(nodes[r][c]){const j=r>=ROWS?[0,0]:jr(r,c);pos[r+','+c]=[X(c)+j[0],Y(r)+j[1]]}
  const ap=[X(3),Y(-1)],H=Y(-1)+50;
  const mp=isMP();
  const canPick=!run.room&&(!mp||(net.g&&net.g.phase==='vote'&&net.g.players.includes(net.id)));
  const vmap={};
  if(mp&&net.g&&net.g.phase==='vote')for(const id in net.g.votes){const v=net.g.votes[id];(vmap[v.r+','+v.c]=vmap[v.r+','+v.c]||[]).push(id)}
  const locmap={};
  if(net.started&&net.config&&net.config.mode==='team_race')for(const id in net.members){
    const s=net.members[id].s,p=s&&s.pos;
    if(id!==net.id&&s&&s.act===run.act&&p&&Number.isInteger(p.r)&&Number.isInteger(p.c)){
      const key=p.r+','+p.c;(locmap[key]=locmap[key]||[]).push(id);
    }
  }
  let edges='',ns='';
  for(let c=0;c<W;c++)if(nodes[0][c]){const b=pos['0,'+c];edges+=`<line class="edge ${anc.done?'on':''}" x1="${ap[0]}" y1="${ap[1]}" x2="${b[0]}" y2="${b[1]}"/>`}
  for(let r=0;r<TOP;r++)for(let c=0;c<W;c++){
    const n=nodes[r][c];if(!n)continue;
    for(const nc of n.next){
      const a=pos[r+','+c],b=pos[(r+1)+','+nc];
      const on=run.visited[r+','+c]&&run.visited[(r+1)+','+nc];
      edges+=`<line class="edge ${on?'on':''}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
    }
  }
  for(let r=0;r<=TOP;r++)for(let c=0;c<W;c++){
    const n=nodes[r][c];if(!n)continue;
    const p=pos[r+','+c],vis=run.visited[r+','+c],isAv=av.includes(n)&&canPick,cur=run.pos&&run.pos.r===r&&run.pos.c===c;
    const rad=n.type==='boss'?36:(n.type==='elite'?30:24);
    const vs=(vmap[r+','+c]||[]).map((id,i)=>`<circle cx="${-14+i*13}" cy="${-rad-8}" r="6" fill="${memberColor(id)}" stroke="var(--panel)" stroke-width="1.5"><title>${esc((net.members[id]||{}).name||'')}</title></circle>`).join('');
    const racers=(locmap[r+','+c]||[]).map((id,i)=>`<circle cx="${-12+i*13}" cy="${rad+9}" r="7" fill="${memberColor(id)}" stroke="var(--panel)" stroke-width="2"><title>${esc((net.members[id]||{}).name||'')} 的位置</title></circle>`).join('');
    ns+=`<g class="node ${vis?'visited':''} ${isAv?'avail':''} ${cur?'cur':''}" ${isAv?`data-a="node" data-r="${r}" data-c="${c}"`:''} transform="translate(${p[0]},${p[1]})">
      <title>${KIND_NAME[n.type]}</title>
      ${nodeShape(n.type)}
      <text style="font-size:${n.type==='boss'?20:15}px">${KIND_GLYPH[n.type]}</text>${vs}${racers}</g>`;
  }
  const ancRacers=(locmap['-1,3']||[]).map((id,i)=>`<circle cx="${-12+i*13}" cy="38" r="7" fill="${memberColor(id)}" stroke="var(--panel)" stroke-width="2"><title>${esc((net.members[id]||{}).name||'')} 的位置</title></circle>`).join('');
  const ancAv=!anc.done&&!run.room&&!mp;
  ns+=`<g class="node ${anc.done?'visited':''} ${ancAv?'avail':''}" ${ancAv?'data-a="node" data-r="-1" data-c="3"':''} transform="translate(${ap[0]},${ap[1]})">
    <title>先古之民</title>${nodeShape('ancient')}<text style="font-size:18px">古</text>${ancRacers}</g>`;
  const layer=drawMode?`<rect id="drawlayer" x="0" y="0" width="700" height="${H}" fill="transparent" style="cursor:crosshair"/>`:'';
  return `<svg class="${drawMode?'drawing':''}" viewBox="0 0 700 ${H}" role="img" aria-label="第 ${run.act} 幕地图">${edges}${ns}<g id="drawg" style="pointer-events:none">${strokesHTML()}</g>${layer}</svg>`;
}
function drawbarHTML(){
  const sw=PENS.map(c=>`<button class="swatch ${c===penColor?'on':''}" data-a="pen" data-c="${c}" style="background:${c}" aria-label="笔迹颜色"></button>`).join('');
  return `<div class="drawbar"><button class="${drawMode?'primary':''}" data-a="drawToggle">${drawMode?'结束绘制':'规划路径'}</button>${drawMode?sw+'<button data-a="drawUndo">撤销</button><button data-a="drawClear">清空我的笔迹</button>':`<span class="dim">在地图上画线来规划路线${net.connected?'，队友也能看到':''}。</span>`}</div>`;
}
function mpBanner(){
  if(net.reconnecting&&!net.connected)return '<div class="banner">连接已断开，正在自动重连……（你的计时仍在本地继续，重连后会自动接回对局）</div>';
  if(run&&run.mode==='team_race')return '<div class="banner">团队竞速：独立选路，无需投票。地图上的彩色标记显示队友位置。</div>';
  if(!isMP())return '';
  const g=net.g;
  if(!g)return '<div class="banner">联机中……</div>';
  if(g.over)return '<div class="banner">本局已结束。</div>';
  if(!g.players.includes(net.id))return '<div class="banner">你已死亡，正在观战同伴。</div>';
  const n=g.players.length;
  if(g.phase==='vote')return `<div class="banner">全队共同选路：点击发光的节点投票，所有人投完后得票最多的节点胜出（平票随机）。已投票 ${Object.keys(g.votes).length}/${n}。</div>`;
  return `<div class="banner">全队同处一间，已完成 ${g.done.length}/${n}。${run.room?'':'待同伴完成后，再一起选路。'}</div>`;
}
function gmark(id){
  const g=net.g;if(!g||g.over||!g.players.includes(id))return '';
  if(g.phase==='vote')return g.votes[id]?' · 已投票':' · 选路中';
  return g.done.includes(id)?' · 已完成':'';
}
function voteNode(r,c){
  if(run.room||run.over||run.victory)return;
  if(!net.g||net.g.phase!=='vote'){toast('请先等队友完成当前房间');return}
  if(!availNodes().includes(nodeAt(r,c)))return;
  netSend({t:'vote',r,c});
}
function sendDead(){if(run.deadSent)return;run.deadSent=true;netSend({t:'dead'})}
function gameHTML(){
  const inNet=netActive();
  return `<div class="wrap">${hudHTML()}${testMode&&!run.mp?testPanelHTML():''}
  ${run.over?endHTML(false):run.victory?endHTML(true):''}
  ${!run.over&&!run.victory&&run.room?roomHTML():''}
  <div class="game ${inNet?'':'solo'}">
    <div>${mpBanner()}${drawbarHTML()}<div id="mapwrap">${mapHTML()}</div>
      <div class="mapnote">${legendHTML()}</div></div>
    ${inNet?`<aside class="side" id="side">${sideInner()}</aside>`:''}
  </div></div>${lgPanel?lgPanelHTML():''}`;
}
/* ---------- 规划路径（涂鸦） ---------- */
function redrawLayer(){const g=document.getElementById('drawg');if(g)g.innerHTML=strokesHTML()}
function svgPoint(ev){
  const svg=document.querySelector('#mapwrap svg'),pt=svg.createSVGPoint();
  pt.x=ev.clientX;pt.y=ev.clientY;
  const q=pt.matrixTransform(svg.getScreenCTM().inverse());
  return [Math.round(q.x*10)/10,Math.round(q.y*10)/10];
}
const myId=()=>net.id||'me';
function endStroke(){
  if(!curStroke)return;
  const st=curStroke;curStroke=null;save();
  if(net.connected)netSend({t:'draw',act:run.act,stroke:{id:st.id,c:st.c,p:st.p}});
}
function drawUndo(){
  const d=run.map.draw;
  for(let i=d.length-1;i>=0;i--)if(d[i].by===myId()){const id=d[i].id;d.splice(i,1);redrawLayer();save();if(net.connected)netSend({t:'drawundo',act:run.act,id});return}
}
function drawClear(){
  run.map.draw=run.map.draw.filter(x=>x.by!==myId());redrawLayer();save();
  if(net.connected)netSend({t:'drawclear',act:run.act});
}
function endHTML(win){
  const st=run.stats,mins=Math.round((Date.now()-st.startedAt)/60000),last=run.difficulty>=10||!!run.custom;
  return `<div class="modal-bg"><div class="modal">
    <h2>${win?(run.custom?'自定义模式':giName(run.gi))+' 通关！':'爬塔终止'}</h2>
    <p>${win?(last?'你已通关本大难度的全部十一级。':'下一进阶「'+giName(run.gi+1)+'」已解锁。')+(run.test||run.custom?'（不计入进度）':''):'生命耗尽，你死亡于'+STAGE_NAMES[run.act-1]+'。'}</p>
    <div class="msg mono">取胜 ${st.wins} 场 · 超时扣血 ${st.drain} 点 · 精英 ${st.elites} 位 · 遗物 ${run.relics.length} 件 · 用时约 ${mins} 分钟</div>
    <div class="row"><button class="primary" data-a="endBack">返回菜单</button><button data-a="endHistory">查看战绩复盘</button>${win&&!last&&!run.mp?`<button data-a="nextDiff">挑战下一进阶</button>`:''}</div></div></div>`;
}
function relicLine(id){const r=RELICS[id];return `<b>${r.n}</b> <span class="chip">${RARITY_NAME[r.r]}</span> <span class="dim">${r.d}</span>`}
function roomHTML(){
  const rm=run.room,k=rm.kind;
  let body='',title='';
  if(k==='monster'||k==='elite'||k==='boss'){
    const c=rm.combat,levels=hintLevels(rm),mp=isMP(),f=fightOf();
    title=`<span class="chip">${KIND_NAME[k]}</span> ${esc(rm.name)}`;
    const lim=Math.round(c.graceMs/60000);
    const lvTag=lvChips(levels);
    const tt=rm.test?`<div class="row"><button data-a="testWin">［测试］直接取胜</button>${rm.phase==='fight'?'<button data-a="testOver">［测试］推到超时前 3 秒</button>':''}</div>`:'';
    if(rm.phase==='prep'){
      const dm=drainDmg({},k),probs=curProblems(),need=mp?((f&&f.need)||1):1;
      body=`<p>${mp?'本场全队共用同一组题':'请择定一道题'}，难度 ${lvTag}，建议题型：<b>${esc(rm.topic)}</b>。${mp?`按人数需 <b>${need}</b> 道：任何一人AC某题，该题即告击败；全部击败方可通过。`:''}</p>
      <div class="msg mono">时限 ${lim} 分钟${c.bonusMin?`（基础 ${c.baseMin}，加成 +${c.bonusMin}）`:''}。超时后每 ${tickMs()/60000} 分钟失去 ${dm} 点生命，直至${mp?'全部题目被击败':'你 AC 该题'}。</div>
      ${lgHintHTML(rm,levels)}
      ${mp?probListHTML(probs,false)+manualHTML(need):(rm.problem?probLink(rm):'')}
      ${vjBinding&&!mp&&rm.problem?`<div class="msg">绑定账号的 AC 需在本场计时开始后，通过 <a href="${vjudgeProblemUrl(rm.problem.pid)}" target="_blank" rel="noopener">VJudge 提交这道洛谷题目</a>。</div>`:''}
      <p class="dim" style="margin:0">战斗没有退路：要么AC，要么生命耗尽。</p>
      <button class="primary" data-a="startCombat" ${(mp&&!probs.length)||(!mp&&vjBinding&&!rm.problem)||c.vjStarting?'disabled':''}>${c.vjStarting?'正在连接 VJudge…':mp?'开始计时（全队同时开始）':'择定了，开始计时'}</button>${tt}`;
    }else if(rm.phase==='fight'){
      const pb=run.potions.map((id,i)=>`<button class="pot" data-a="usePotion" data-i="${i}" title="${esc(POTIONS[id].d)}">${POTIONS[id].n}</button>`).join('');
      const flags=[c.insured?'无忧':'',c.partial?'化解':'',c.lucky?'福运':'',c.shielded?'护符':'',c.guard?'金刚':''].filter(Boolean).map(x=>`<span class="chip">${x}</span>`).join(' ');
      body=`<div class="timer" id="cdTimer">--:--</div>
      <div class="bar"><i id="cdBar" style="width:100%"></i></div>
      <p class="dim" id="cdSub" style="margin:0;text-align:center"></p>
      <p class="dim" style="margin:0;text-align:center">题目难度 ${lvTag} · 建议题型 ${esc(rm.topic)} ${flags}</p>
      ${pb?`<div class="row"><span class="dim">药水</span>${pb}</div>`:''}
      ${mp?probListHTML(curProblems(),true):probHTML(rm)}
      ${vjBinding&&mp?`<p class="dim" style="margin:0;text-align:center">点击各题旁的 VJudge 直链提交；服务器会核对本场开始后的提交。</p>`:''}
      ${mp?'':`<div class="row" style="justify-content:center"><button class="primary" data-a="${vjBinding?'verifySoloAc':'ac'}" ${c.vjChecking?'disabled':''}>${c.vjChecking?'正在查询 VJudge…':vjBinding?'验证 VJudge AC':'AC 了'}</button></div>`}${tt}`;
    }else if(rm.phase==='won'){
      const rw=rm.rewards,full=run.potions.length>=slotCount();
      body=`<div class="msg">题目已击败。获得 <b>${rw.gold}</b> 金币${rw.heal?`，回复 ${rw.heal} 点生命`:''}。${c.lost?`本场超时共失去 ${c.lost} 点生命。`:''}</div>`;
      if(rw.potion)body+=`<div class="item"><span>药水 <b>${POTIONS[rw.potion].n}</b> <span class="dim">${POTIONS[rw.potion].d}</span></span><div class="row"><button data-a="claim" data-w="potion">收入</button>${full?'<span class="dim">药水栏已满：可先在顶部使用或丢弃一瓶</span>':''}</div></div>`;
      if(rw.relic)body+=`<div class="item"><span>遗物 ${relicLine(rw.relic)}</span><div class="row"><button data-a="claim" data-w="relic">收下</button></div></div>`;
      if(rw.choices)body+=`<h3>择一件首领遗物</h3>`+rw.choices.map((id,i)=>`<div class="item"><span>${relicLine(id)}</span><div class="row"><button data-a="claim" data-w="choice" data-i="${i}">选择</button></div></div>`).join('')+`<button data-a="claim" data-w="skip">放弃</button>`;
      const last=k==='boss'&&(run.act<3||(run.difficulty===10&&rm.node.r===ROWS));
      body+=`<button class="primary" data-a="leave">${rm.test?'关闭':k==='boss'?(run.act<3?'前往下一幕':(last?'迎战第二位首领':'完成')):'继续'}</button>`;
    }
  }else if(k==='ancient'){
    title=`<span class="chip">先古</span> 先古之民`;
    if(rm.phase==='choose'){
      body=`<p>一位先古之民坐在塔底的篝火旁，说：「欲登此塔，先带走一份礼物。」三选一。</p><div class="opts">`+
        rm.choices.map((id,i)=>{const b=BOONS.find(x=>x.id===id);return `<button data-a="ancient" data-i="${i}"><b>${b.n}</b><br><span class="dim">${b.d}</span></button>`}).join('')+`</div>`;
    }else body=`<div class="msg">${esc(rm.result)}</div><button class="primary" data-a="leave">${rm.test?'关闭':'踏上征途'}</button>`;
  }else if(k==='shop'){
    title=`<span class="chip">商店</span> 山道驿馆`;
    body=`<p class="mono">金币 ${run.gold}</p><div class="shopgrid">`+run.room.shop.items.map((it,i)=>{
      let nm='',ds='';
      if(it.t==='relic'){nm=RELICS[it.id].n+'（'+RARITY_NAME[RELICS[it.id].r]+'）';ds=RELICS[it.id].d}
      else if(it.t==='potion'){nm=POTIONS[it.id].n;ds=POTIONS[it.id].d}
      else if(it.t==='heal'){nm='医馆';ds='回复 20 点生命。'}
      else{nm='武馆';ds='最大生命 +6。'}
      return `<div class="item ${it.sold?'sold':''}"><b>${nm}</b><span class="dim">${ds}</span><button data-a="buy" data-i="${i}" ${it.sold||run.gold<it.price?'disabled':''}>${it.sold?'已售出':it.price+' 金币'}</button></div>`;
    }).join('')+`</div><button class="primary" data-a="leave">${rm.test?'关闭':'离开商店'}</button>`;
  }else if(k==='rest'){
    title=`<span class="chip">休息处</span> 竹林小筑`;
    if(rm.phase==='choose'){
      const pct=Math.round(PR().restPct*100),h=Math.round(run.maxHp*PR().restPct)+E('restHeal');
      const np=1+(E('restPotion')||0);
      body=`<div class="opts"><button data-a="rest" data-k="sleep">小憩：回复 ${h} 点生命（${pct}% 上限${E('restHeal')?'+'+E('restHeal'):''}）${E('restMaxHp')?'，最大生命 +'+E('restMaxHp'):''}</button>
      <button data-a="rest" data-k="drill">温习：下一场战斗时限 +10 分钟</button>
      <button data-a="rest" data-k="potion">炮制：获得 ${np} 瓶随机药水</button></div>`;
    }else body=`<div class="msg">${esc(rm.result)}</div><button class="primary" data-a="leave">${rm.test?'关闭':'继续'}</button>`;
  }else if(k==='treasure'){
    title=`<span class="chip">宝箱</span> 一只旧木匣`;
    body=rm.phase==='open'?`<p>角落里放着一只落满灰尘的木匣。</p><button class="primary" data-a="chest">开启</button>`:`<div class="msg">${esc(rm.result)}</div><button class="primary" data-a="leave">${rm.test?'关闭':'继续'}</button>`;
  }else if(k==='event'){
    const ev=EVENTS.find(e=>e.id===rm.event);
    title=`<span class="chip">事件</span> ${ev.title}`;
    if(rm.phase==='choose'){
      const opts=ev.dyn?ev.dyn(rngFor(run.seed,'evd'+nodeKey(rm.node))):ev.opts;
      body=`<p>${ev.text}</p><div class="opts">`+opts.map((o,i)=>`<button data-a="evt" data-i="${i}" ${(o.need&&run.gold<o.need)||(o.needPot&&!run.potions.length)||(o.needHp&&run.hp<=o.needHp)?'disabled':''}>${o.t}</button>`).join('')+`</div>`;
    }else body=`<div class="msg">${esc(rm.result)}</div><button class="primary" data-a="leave">${rm.test?'关闭':'继续'}</button>`;
  }
  const key=run.seed+'|'+run.act+'|'+rm.node.r+','+rm.node.c+'|'+(run.testN||0);
  if(key!==roomKey){roomKey=key;roomPos=null;roomFold=false}
  const st=roomPos?`left:${roomPos.x}px;top:${roomPos.y}px;transform:none`:'';
  return `<section class="roomcard" id="roomcard" style="${st}"><div class="row rchead" title="拖动标题可移动"><h2>${title}</h2>${rm.test?'<span class="chip">测试</span>':''}<span class="spacer"></span><button data-a="rcFold">${roomFold?'展开':'收起'}</button></div>${roomFold?'':body}</section>`;
}
let roomPos=null,roomKey='',roomFold=false,rcScroll=0;
function focusRoom(){return;setTimeout(()=>{const rc=document.getElementById('roomcard');if(rc&&rc.scrollIntoView)rc.scrollIntoView({block:'nearest',behavior:'smooth'})},30)}

/* ---------- 测试模式 ---------- */
function testOpenRoom(kind,evId){
  if(!run||run.mp||!run.test)return;
  run.testN=(run.testN||0)+1;
  const rr=rngFor(run.seed,'test'+run.testN+kind+(evId||'')+Date.now());
  const pos={r:7,c:100+run.testN};
  if(kind==='ancient'){
    const ids=BOONS.map(b=>b.id);
    for(let i=ids.length-1;i>0;i--){const j=Math.floor(rr()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}
    run.room={node:pos,kind:'ancient',phase:'choose',choices:ids.slice(0,3)};
  }else makeRoom(kind==='unknown'?resolveUnknown(rr):kind,pos,rr,evId);
  run.room.test=true;save();render();focusRoom();
}
function testWin(){if(run&&run.room&&run.room.combat&&run.room.phase!=='won'){if(!run.room.combat.started){run.room.combat.started=true;run.room.combat.startAt=Date.now()}winCombat()}}
function testOver(){const c=cb();if(c&&c.started&&!c.done){c.startAt=Date.now()-(c.graceMs+c.extraMs)+3000;render()}}

/* ---------- 洛谷随机跳题（离线题库；思路参照 karsl 的 Tampermonkey 脚本） ---------- */
const LG_DB='OISpireLuoguDB',LG_STORE='problems';
const LG_URL='https://cdn.luogu.com.cn/problemset-open/latest.ndjson.gz';
const LG_TYPES={'洛谷':'luogu','主题库':'P','入门与面试':'B'};
const LG_DIMS={algorithm:'算法',source:'来源',time:'时间',region:'区域',special:'特殊题目'};
let lg=(()=>{const d={types:[],tags:{algorithm:[],source:[],time:[],region:[],special:[]},exclude:true,useRec:true,lists:[],listOn:[],useLists:false,listLv:true};
  try{const x=JSON.parse(lsGet('oi2_lg'));if(x){d.useRec=x.useRec!==false;d.types=x.types||[];for(const k in d.tags)d.tags[k]=(x.tags&&x.tags[k])||[];d.exclude=x.exclude!==false;
    d.lists=Array.isArray(x.lists)?x.lists:[];d.listOn=Array.isArray(x.listOn)?x.listOn:[];d.useLists=!!x.useLists;d.listLv=x.listLv!==false}}catch(e){}return d})();
let lgDone=(()=>{try{return new Set(JSON.parse(lsGet('oi2_lgdone')||'[]'))}catch(e){return new Set()}})();
let lgCount=null,lgBusy='',lgErr='';
const lgSave=()=>{lsSet('oi2_lg',JSON.stringify(lg));lsSet('oi2_lgdone',JSON.stringify([...lgDone]))};
function lgMarkDone(pid){lgDone.add(pid);lgSave()}
function lgOpenDB(){return new Promise((res,rej)=>{const q=indexedDB.open(LG_DB,1);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains(LG_STORE))db.createObjectStore(LG_STORE,{keyPath:'pid'})};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function lgTx(mode,fn){const db=await lgOpenDB();return new Promise((res,rej)=>{const tx=db.transaction(LG_STORE,mode);const r=fn(tx.objectStore(LG_STORE));tx.oncomplete=()=>res(r&&r.result);tx.onerror=()=>rej(tx.error)})}
const lgCountNow=()=>lgTx('readonly',st=>st.count());
const lgAll=()=>lgTx('readonly',st=>st.getAll());
async function lgImport(buf){
  const u8=new Uint8Array(buf);let text;
  if(u8[0]===0x1f&&u8[1]===0x8b){
    if(typeof DecompressionStream==='undefined')throw new Error('当前浏览器不支持解压 gzip，请先解压成 .ndjson 再导入。');
    text=await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }else text=new TextDecoder().decode(u8);
  const lines=text.split('\n').filter(l=>l.trim());
  await lgTx('readwrite',st=>{st.clear()});
  let n=0;
  for(let i=0;i<lines.length;i+=2000){
    const batch=[];
    for(const ln of lines.slice(i,i+2000)){try{const o=JSON.parse(ln);if(o.pid)batch.push({pid:o.pid,title:o.title,difficulty:o.difficulty,type:o.type,tags:o.tags||[]})}catch(e){}}
    await lgTx('readwrite',st=>{batch.forEach(p=>st.put(p))});
    n+=batch.length;lgBusy='导入中 '+n+'/'+lines.length;if(lgPanel)render();
  }
  lgBusy='';lgCount=n;
}
async function lgDownload(){
  lgBusy='正在下载题库……';lgErr='';render();
  try{
    const res=await fetch(LG_URL);
    if(!res.ok)throw new Error('HTTP '+res.status);
    await lgImport(await res.arrayBuffer());
    toast('题库已导入：'+lgCount+' 题');render();return true;
  }catch(e){
    lgBusy='';
    lgErr='无法直接下载（常见原因是浏览器的跨域限制）。请手动下载 '+LG_URL+' ，再用下方的「导入文件」选择它。';
    render();return false;
  }
}
const TOPIC_TAGS={
  '数据结构':['线段树','树状数组','并查集','平衡树','堆','ST 表','分块','莫队','单调栈','单调队列','树形数据结构','线性数据结构','暴力数据结构'],
  '动态规划':['动态规划 DP'],'图论':['图论'],'数学 / 数论':['数学','数论'],'字符串':['字符串'],'贪心':['贪心'],
  '搜索 / 剪枝':['搜索','剪枝'],'构造':['构造'],'二分 / 三分':['二分','三分'],'计算几何':['计算几何'],'模拟':['模拟'],'博弈论':['博弈论']};
// 默认标签：没有手动选算法标签、且开启了“默认使用推荐算法”时，才使用建议题型对应的标签
function recTags(topic){
  if(lg.useRec===false||lg.tags.algorithm.length)return [];
  return (TOPIC_TAGS[topic]||[]).filter(t=>LG_TAGS.algorithm.includes(t));
}
const lgUsingLists=()=>!!(lg.useLists&&lg.lists.some(l=>lg.listOn.includes(l.id)));
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
/* 候选题目：勾选了题单就只从题单里抽，否则从离线题库抽。返回 {pool, note} */
async function lgPool(levels,topic){
  if(lgUsingLists()){
    const seen=new Map();
    lg.lists.filter(l=>lg.listOn.includes(l.id)).forEach(l=>l.problems.forEach(p=>{if(!seen.has(p.pid))seen.set(p.pid,p)}));
    let db=null;
    try{if(await lgCountNow())db=new Map((await lgAll()).map(x=>[x.pid,x]))}catch(e){}
    let arr=[...seen.values()].map(p=>{const d=db&&db.get(p.pid);return{pid:p.pid,title:(d&&d.title)||p.title||'',difficulty:d?d.difficulty:(Number.isInteger(p.diff)?p.diff:-1)}});
    if(lg.exclude)arr=arr.filter(p=>!lgDone.has(p.pid));
    if(lg.listLv!==false&&arr.length){
      const hit=arr.filter(p=>levels.includes(p.difficulty));
      if(hit.length)return{pool:hit,note:''};
      return{pool:arr,note:'题单里没有对应难度的题，已放宽难度'};
    }
    return{pool:arr,note:''};
  }
  let res=(await lgAll()).filter(p=>levels.includes(p.difficulty));
  if(lg.types.length)res=res.filter(p=>lg.types.includes(p.type));
  const tags=[].concat(...Object.values(lg.tags));
  if(tags.length)res=res.filter(p=>p.tags&&tags.every(t=>p.tags.includes(t)));
  if(lg.exclude)res=res.filter(p=>!lgDone.has(p.pid));
  const rec=recTags(topic);
  if(rec.length){
    const hit=res.filter(p=>p.tags&&rec.some(t=>p.tags.includes(t)));
    if(hit.length)return{pool:hit,note:''};
    if(res.length)return{pool:res,note:'推荐算法下没有合适的题，已放宽标签'};
  }
  return{pool:res,note:''};
}
async function lgEnsure(){
  if(lgUsingLists())return true;
  if(await lgCountNow())return true;
  return await lgDownload();
}
/* 联机时由抽题的人把整组题发给服务器，全队看到同一组；单人时直接打开题目 */
async function lgJump(){
  const rm=run&&run.room;if(!rm||!rm.combat||rm.phase==='won')return;
  const mp=isMP(),f=fightOf();
  if(mp){if(f&&f.started){toast('计时已经开始，不能换题');return}}
  else if(rm.phase==='fight'&&rm.problem)return;
  const k=mp?Math.max(1,(f&&f.need)||1):1;
  const w=mp?null:window.open('','_blank');
  try{
    if(!(await lgEnsure())){if(w)w.close();lgPanel=true;render();return}
    const {pool,note}=await lgPool(hintLevels(rm),rm.topic);
    if(!pool.length){if(w)w.close();toast('没有符合条件的题目，请调整题库或题单设置');return}
    const picks=shuffle(pool).slice(0,k).map(p=>({pid:p.pid,title:p.title||'',diff:p.difficulty}));
    if(note)toast(note);
    if(mp){
      netSend({t:'pset',problems:picks});
      if(picks.length<k)toast('候选题不足，只抽到 '+picks.length+' 道');
    }else{
      rm.problem=picks[0];save();
      const url='https://www.luogu.com.cn/problem/'+picks[0].pid;
      if(w)w.location.href=url;else toast('浏览器拦截了新窗口，请点击题目链接');
      render();
    }
  }catch(e){if(w)w.close();toast('跳题失败：'+e.message)}
}
/* ---------- 题单：通过 server.js 的 /api/training 抓取 ---------- */
function apiBase(){
  if(/^https?:$/.test(location.protocol))return '';
  try{const u=new URL(net.url||defaultWs());return (u.protocol==='wss:'?'https://':'http://')+u.host}catch(e){return 'http://localhost:8787'}
}
async function vjPost(route,body){
  const res=await fetch(apiBase()+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||('HTTP '+res.status));
  return data;
}
function vjPanelHTML(){
  const bound=vjBinding;
  let content='';
  if(bound){
    content=`<div class="msg">已绑定 VJudge 账号 <b>${esc(bound.username)}</b>。单人战斗会核对本场开始后的洛谷 AC；联机时，绑定账号提交的 AC 也会由服务器核验。</div>
      <p class="dim" style="margin:0">验证使用 VJudge 公开提交记录，不需要提供洛谷密码或 Cookie。解除绑定后将恢复手动确认。</p>
      <div class="row"><a href="https://vjudge.net/user/${encodeURIComponent(bound.username)}" target="_blank" rel="noopener">打开 VJudge 个人资料</a><span class="spacer"></span><button class="danger" data-a="vjLogout" ${vjBusy?'disabled':''}>解除绑定</button></div>`;
  }else{
    content=`<p class="dim" style="margin:0">不需要把密码交给本游戏。服务器会给出一道随机洛谷题；请在 VJudge 对这道题提交一次代码（不必 AC），服务器通过公开提交记录确认账号归属。</p>
      <div class="field"><label class="dim" for="vjName">VJudge 用户名</label><input id="vjName" maxlength="40" value="${esc(vjUsernameInput)}" placeholder="你的 VJudge 用户名"></div>
      <div class="row"><button class="primary" data-a="vjChallenge" ${vjBusy?'disabled':''}>${vjBusy?'处理中…':'生成验证题'}</button></div>
      ${vjChallengeId?`<div class="msg"><b>验证题号：<span class="mono">${esc(vjProblemId)}</span></b><br>请在 10 分钟内通过 VJudge 向这道洛谷题提交一次代码。提交结果不要求 AC。</div>
        <div class="row"><a href="${vjudgeProblemUrl(vjProblemId)}" target="_blank" rel="noopener">打开 VJudge 验证题</a><button class="primary" data-a="vjVerify" ${vjBusy?'disabled':''}>已提交，验证账号</button></div>`:''}
      ${vjMessage?`<p class="dim" style="margin:0">${esc(vjMessage)}</p>`:''}`;
  }
  return `<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="vjTitle">
    <div class="row"><h2 id="vjTitle">VJudge 账号验证</h2><span class="spacer"></span><button data-a="vjClose" aria-label="关闭">关闭</button></div>
    ${content}
  </div></div>`;
}
async function vjGenerateChallenge(){
  const field=document.getElementById('vjName');
  vjUsernameInput=((field&&field.value)||'').trim();vjChallengeId='';vjProblemId='';vjMessage='';vjBusy=true;render();
  try{
    const data=await vjPost('/api/vjudge/challenge',{username:vjUsernameInput});
    vjUsernameInput=data.username;vjChallengeId=data.challengeId;vjProblemId=data.problemId;vjMessage='验证题已生成，有效期 10 分钟。';toast('验证题已生成');
  }catch(e){vjMessage=e.message||'生成验证题失败'}
  finally{vjBusy=false;render()}
}
async function vjVerifyBinding(){
  vjBusy=true;vjMessage='正在查询验证题的 VJudge 提交记录…';render();
  try{
    const data=await vjPost('/api/vjudge/verify',{username:vjUsernameInput,challengeId:vjChallengeId});
    vjBinding={username:data.username,token:data.token};lsSet(LS_VJ,JSON.stringify(vjBinding));
    vjChallengeId='';vjProblemId='';vjMessage='';if(net.connected)netSend({t:'vbind',token:vjBinding.token});
    toast('VJudge 账号绑定成功');
  }catch(e){vjMessage=e.message||'绑定验证失败'}
  finally{vjBusy=false;render()}
}
async function vjUnbind(){
  if(!vjBinding)return;
  const token=vjBinding.token;
  vjBinding=null;lsDel(LS_VJ);vjChallengeId='';vjProblemId='';vjMessage='';if(net.connected)netSend({t:'vbind',token:''});
  vjBusy=true;render();
  try{await vjPost('/api/vjudge/logout',{token})}
  catch(e){vjMessage='本地已解除绑定，但服务器注销失败：'+(e.message||'请求失败')}
  finally{vjBusy=false;render()}
}
async function verifySoloAc(){
  const r=run,rm=r&&r.room,c=rm&&rm.combat;
  if(!vjBinding||!c)return;
  if(!c.vjBattleId){toast('本场没有验证记录，请退出后重新进入战斗再开始计时');return}
  if(c.vjChecking)return;
  c.vjChecking=true;render();
  try{
    const data=await vjPost('/api/vjudge/check',{token:vjBinding.token,battleId:c.vjBattleId});
    if(run!==r||r.room!==rm)return;
    if(data.accepted){toast('VJudge 已确认本场 AC');winCombat()}
    else toast(data.pending?'VJudge 仍在判题，请稍后重试':'暂未找到本场开始后的 AC 记录');
  }catch(e){if((e.message||'').includes('绑定已失效'))vjForgetBinding();toast(e.message||'VJudge 查询失败')}
  finally{if(run===r&&r.room===rm){c.vjChecking=false;if(rm.phase==='fight')render()}}
}
async function lgListAdd(){
  const el=document.getElementById('lgListIn'),raw=((el&&el.value)||'').trim();
  const m=raw.match(/training\/(\d+)/)||raw.match(/^(\d+)$/);
  if(!m){lgErr='请输入题单编号（数字）或题单链接。';render();return}
  lgBusy='正在抓取题单 '+m[1]+' ……';lgErr='';render();
  try{
    const r=await fetch(apiBase()+'/api/training?id='+m[1]);
    const j=await r.json().catch(()=>({}));
    if(!r.ok||!Array.isArray(j.problems))throw new Error(j.error||('HTTP '+r.status));
    const l={id:String(m[1]),name:j.name||('题单 '+m[1]),problems:j.problems};
    lg.lists=lg.lists.filter(x=>x.id!==l.id).concat([l]);
    if(!lg.listOn.includes(l.id))lg.listOn.push(l.id);
    lg.useLists=true;lgSave();lgBusy='';
    toast('已添加题单「'+l.name+'」，共 '+l.problems.length+' 题');render();
  }catch(e){lgBusy='';lgErr='抓取题单失败：'+e.message+'。请确认 server.js 正在运行，或在下方手动导入题号。';render()}
}
function lgListManual(){
  const nm=document.getElementById('lgListName'),ta=document.getElementById('lgListPaste');
  const ids=[...new Set(((ta&&ta.value)||'').toUpperCase().match(/[A-Z]+\d+/g)||[])];
  if(!ids.length){toast('没有识别到题号');return}
  const l={id:'m'+Date.now().toString(36),name:((nm&&nm.value)||'').trim()||'手动题单',problems:ids.map(pid=>({pid,title:'',diff:-1}))};
  lg.lists.push(l);lg.listOn.push(l.id);lg.useLists=true;lgSave();
  if(ta)ta.value='';toast('已导入 '+ids.length+' 个题号');render();
}
function vjudgeProblemUrl(pid){return 'https://vjudge.net/problem/'+encodeURIComponent('洛谷-'+pid)}
function probLink(rm){return `<div class="hint">当前题目：<a href="https://www.luogu.com.cn/problem/${esc(rm.problem.pid)}" target="_blank" rel="noopener">${esc(rm.problem.pid)} ${esc(rm.problem.title||'')}</a>${vjBinding?` · <a href="${vjudgeProblemUrl(rm.problem.pid)}" target="_blank" rel="noopener">在 VJudge 提交</a>`:''}</div>`}
function lgHintHTML(rm,levels){
  const rt=recTags(rm.topic),mp=isMP(),f=fightOf();
  const names=levels.map(v=>LV[v].c+'（'+LV[v].n+'）').join(' / ');
  const src=lgUsingLists()?`<br>抽题来源：题单（${esc(lg.lists.filter(l=>lg.listOn.includes(l.id)).map(l=>l.name||l.id).join('、'))}）`:(rt.length?`<br>默认标签：${esc(rm.topic)}（${esc(rt.join('、'))}），可在题库设置里关闭`:'');
  const has=mp?!!(f&&f.problems):!!rm.problem,need=mp?((f&&f.need)||1):1;
  return `<div class="msg">洛谷难度：${names}${src}</div>
    <div class="row"><button data-a="jump">${has?'重新抽题':'随机跳题'}${mp?'（共 '+need+' 道）':''}</button><button data-a="lgPanel">题库 / 题单设置</button></div>`;
}
function probHTML(rm){
  if(rm.problem)return probLink(rm);
  return `<div class="row"><button data-a="jump">随机跳题</button><button data-a="lgPanel">题库 / 题单设置</button></div>`;
}
/* 联机：题目列表，每道题显示是谁做出来的 */
function probListHTML(probs,fight){
  const f=fightOf(),solved=(f&&f.solved)||{};
  if(!probs.length)return `<div class="msg">还没有抽题。任何一个人点「随机跳题」即可，全队都会看到同一组题。</div>`;
  const n=probs.filter(p=>solved[p.pid]).length;
  return `<div class="probs"><div class="dim">已击败 ${n}/${probs.length}</div>`+probs.map(p=>{
    const sv=solved[p.pid];
    return `<div class="prob ${sv?'ok':''}"><span class="pt"><a href="https://www.luogu.com.cn/problem/${esc(p.pid)}" target="_blank" rel="noopener">${esc(p.pid)} ${esc(p.title||'')}</a> ${p.diff>=0&&LV[p.diff]?lvChip(p.diff):''}${vjBinding?` · <a href="${vjudgeProblemUrl(p.pid)}" target="_blank" rel="noopener">VJudge</a>`:''}</span>
      <span>${sv?'已被 '+esc(sv.name)+' 击败':(fight?`<button data-a="psolve" data-pid="${esc(p.pid)}">${vjBinding?'验证 VJudge AC':'我AC了'}</button>`:'')}</span></div>`;
  }).join('')+`</div>`;
}
function manualHTML(need){
  return `<div class="field"><label class="dim" for="mpPids">或者手动指定题号（空格分隔，最多 ${need} 道）</label>
    <div class="row"><input id="mpPids" placeholder="例如 P1001 P1002" style="flex:1"><button data-a="pManual">提交题目</button></div></div>`;
}
function lgListsHTML(){
  const rows=lg.lists.map(l=>`<div class="prob"><label class="chk"><input type="checkbox" data-a="lgListOn" data-id="${esc(l.id)}" ${lg.listOn.includes(l.id)?'checked':''}> ${esc(l.name||('题单 '+l.id))} <span class="dim">（${l.problems.length} 题）</span></label><button data-a="lgListDel" data-id="${esc(l.id)}">删除</button></div>`).join('');
  return `<div class="field"><b>题单</b>
    <label class="chk"><input type="checkbox" data-a="lgUseLists" ${lg.useLists?'checked':''}> 从勾选的题单里抽题（不勾则用离线题库）</label>
    <label class="chk"><input type="checkbox" data-a="lgListLv" ${lg.listLv!==false?'checked':''}> 题单内也按战斗难度颜色筛选（没有对应难度时自动放宽）</label>
    <div class="probs">${rows||'<span class="dim">还没有题单。输入题单编号或链接来添加，可以添加多个。</span>'}</div>
    <div class="row"><input id="lgListIn" placeholder="题单编号或链接，例如 https://www.luogu.com.cn/training/1" style="flex:1"><button data-a="lgListAdd">添加</button></div>
    <details><summary class="dim">抓取失败？手动导入题号</summary>
      <div class="field" style="margin-top:6px"><input id="lgListName" placeholder="题单名称（可选）"><textarea id="lgListPaste" placeholder="粘贴题号，例如 P1001 P1002 B2002"></textarea><div><button data-a="lgListManual">导入为题单</button></div></div></details></div>`;
}
function lgPanelHTML(){
  const types=Object.entries(LG_TYPES).map(([n,v])=>`<label class="chk"><input type="checkbox" data-a="lgType" data-v="${v}" ${lg.types.includes(v)?'checked':''}> ${n}</label>`).join('');
  const dims=Object.keys(LG_DIMS).map(k=>`<div class="field"><span class="dim">${LG_DIMS[k]}</span>
    <div class="row">${lg.tags[k].map(t=>`<span class="chip">${esc(t)} <span data-a="lgTagDel" data-k="${k}" data-t="${esc(t)}" style="cursor:pointer">×</span></span>`).join('')}</div>
    <div class="row"><input id="lgt_${k}" list="lgl_${k}" placeholder="搜索${LG_DIMS[k]}标签" style="flex:1"><button data-a="lgTagAdd" data-k="${k}">添加</button></div>
    <datalist id="lgl_${k}">${LG_TAGS[k].map(t=>`<option value="${esc(t)}"></option>`).join('')}</datalist></div>`).join('');
  return `<div class="modal-bg" style="z-index:30"><div class="modal"><h2>洛谷随机跳题</h2>
    <p class="dim" style="margin:0">跳题时会根据当前战斗的难度颜色，从离线题库（或你勾选的题单）里随机抽题。题库来自洛谷开放数据，只保存在你的浏览器里。</p>
    <div class="msg">题库：${lgCount==null?'尚未检测':lgCount+' 题'} ${lgBusy?' · '+esc(lgBusy):''}</div>
    ${lgErr?`<div class="msg" style="border-color:var(--bad);word-break:break-all">${esc(lgErr)}</div>`:''}
    ${lgListsHTML()}
    <div class="row"><button data-a="lgDownload">下载 / 更新题库</button><input type="file" id="lgFile" accept=".gz,.ndjson,.json,.txt"></div>
    <div><b>题库</b><div class="row" style="margin-top:6px">${types}<span class="dim">（不选表示全部；使用题单时不按这些筛选）</span></div></div>
    ${dims}
    <div class="field"><label class="chk"><input type="checkbox" data-a="lgRec" ${lg.useRec!==false?'checked':''}> 默认使用战斗建议的算法标签（手动选了算法标签时以手动为准）</label>
      <label class="chk"><input type="checkbox" data-a="lgExcl" ${lg.exclude?'checked':''}> 不再抽到已 AC 的题（共 ${lgDone.size} 道）</label>
      <textarea id="lgPaste" placeholder="可以粘贴你已做过的题号，例如 P1001 P1002 B2002"></textarea>
      <div class="row"><button data-a="lgPasteImport">记录这些题号</button><button data-a="lgClearDone">清空已做记录</button></div></div>
    <button class="primary" data-a="lgClose">完成</button></div></div>`;
}

/* ---------- 侧栏 / 大厅 ---------- */
function scoreOf(s){if(!s)return -1;if(s.win)return 1e6+(s.wins||0);return (s.d||0)*0+(s.act||0)*100+(s.floor||0)+(s.over?-500:0)}
function sideInner(){
  const ids=Object.keys(net.members).sort((a,b)=>scoreOf(net.members[b].s)-scoreOf(net.members[a].s));
  const mypots=run?run.potions.map((id,i)=>`<option value="${i}">${POTIONS[id].n}</option>`).join(''):'';
  const rows=ids.map(id=>{
    const m=net.members[id],s=m.s,me=id===net.id;
    const prog_=s&&s.act?`${TIERS[s.tier||0].n} A${s.d} · 第${s.act}幕 · ${s.floor}/${ROWS}层${net.config&&net.config.mode==='team_race'&&s.pos&&s.pos.r>=0?' · 第'+(s.pos.c+1)+'列':''}`:'未开局';
    const rem=s&&s.rem!=null?(s.rem>0?` · <span class="mono" data-end="${m.at+s.rem}">${fmtTime(s.rem)}</span>`:' · <span style="color:var(--bad)">超时</span>'):'';
    const offline=m.o===false?` <span class="dim">（重连中${m.until?`，剩余 <span class="mono" data-end="${m.until}"></span>`:''}）</span>`:'';
    return `<div class="pl ${me?'me':''}"><div class="top"><b><span class="dot" style="background:${memberColor(id)}"></span>${esc(m.name)}${id===net.host?' <span class="dim">房主</span>':''}${offline}${me?' <span class="dim">我</span>':''}</b><span class="dim">${s?esc(s.st):''}${rem}${gmark(id)}</span></div>
      <div class="top"><span>${prog_}</span>${s&&s.max?`<span class="mono">${s.hp}/${s.max}</span>`:''}</div>
      ${s&&s.max?`<div class="bar"><i style="width:${Math.max(0,s.hp/s.max*100)}%;background:var(--bad)"></i></div>`:''}
      ${!me&&run&&run.potions.length&&!run.over?`<div class="row"><select id="gift_${id}">${mypots}</select><button data-a="gift" data-to="${id}">赠药</button></div>`:''}</div>`;
  }).join('');
  const chat=net.chat.map(c=>`<div><b>${esc(c.n)}</b>：${esc(c.x)}</div>`).join('');
  return `<h3>房间 <span class="mono">${esc(net.room)}</span> · ${ids.length} 人</h3>
    <div class="plist">${rows}</div>
    <div class="chat">${chat||'<span class="dim">还没有消息</span>'}</div>
    <div class="chatin"><input id="chatIn" maxlength="120" placeholder="发送消息" autocomplete="off"><button data-a="chat">发送</button></div>`;
}
function lobbyHTML(){
  if(!net.connected&&net.reconnecting){
    return `<div class="wrap"><div class="row" style="margin-bottom:12px"><button data-a="goMenu">返回菜单</button><button data-a="leaveNet">放弃重连并离开</button><h2>多人联机</h2></div><div class="panel"><p>连接已断开，正在自动重连……</p><p class="dim">席位会在服务器上保留一小段时间；恢复连接后将自动接回房间 <span class="mono">${esc(net.room)}</span>。</p></div></div>`;
  }
  if(!net.connected){
    return `<div class="wrap"><div class="row" style="margin-bottom:12px"><button data-a="goMenu">返回</button><h2>多人联机</h2></div>
    <div class="panel" style="max-width:560px">
      <p class="dim" style="margin-top:0">先在电脑上运行 <span class="mono">node server.js</span>，其他人用浏览器打开同一地址（局域网请填服务器所在机器的 IP）。输入相同房间号即可加入，房间不存在会自动创建。</p>
      <div class="field"><label for="nameIn" class="dim">昵称</label><input id="nameIn" maxlength="12" value="${esc(lsGet(LS_NAME)||'')}" placeholder="你的名字"></div>
      <div class="field"><label for="roomIn" class="dim">房间号</label><input id="roomIn" maxlength="16" value="${esc(net.room)}" placeholder="例如 NOI2026"></div>
      <div class="field"><label for="urlIn" class="dim">服务器地址</label><input id="urlIn" value="${esc(net.url||defaultWs())}"></div>
      ${net.err?`<p style="color:var(--bad)">${esc(net.err)}</p>`:''}
      <button class="primary" data-a="join">加入 / 创建房间</button></div></div>`;
  }
  const isHost=net.host===net.id;
  const opts=unlockedList().map(i=>`<option value="${i}">${giName(i)}</option>`).join('');
  let ctl;
  if(net.spectate)ctl=`<div class="msg">你没有参与本局（未解锁「${giName(cfgGi(net.config))}」，或是中途加入），只能观战队友。</div>`;
  else if(net.started)ctl=`<div class="msg">对局已开始（${giName(cfgGi(net.config))}，${net.config.mode==='team_race'?'团队竞速':'合作爬塔'}，种子 ${esc(net.config.seed)}）。</div>
    <div class="row">${(run&&run.mp)||(run&&run.mode==='team_race')?'<button class="primary" data-a="toGame">回到对局</button>':'<span class="dim">对局已开始，你只能观战队友。</span>'}</div>`;
  else ctl=isHost?`<div class="field"><label for="hostD" class="dim">进阶（仅可选择你已解锁的）</label><select id="hostD">${opts}</select></div>
      <div class="field"><label for="hostMode" class="dim">多人玩法</label><select id="hostMode"><option value="cooperative">合作爬塔（共同选路）</option><option value="team_race">团队竞速（各自选路，地图显示位置）</option></select></div>
      <div class="field"><label for="hostSeed" class="dim">种子（留空则随机）</label><input id="hostSeed" maxlength="20"></div>
      <button class="primary" data-a="hostStart">开始对局</button>`:`<div class="msg">等待房主开始对局……</div>`;
  return `<div class="wrap"><div class="row" style="margin-bottom:12px"><button data-a="goMenu">返回菜单</button><button data-a="leaveNet">离开房间</button><h2>房间 <span class="mono">${esc(net.room)}</span></h2></div>
    <div class="lobby"><div class="panel"><h3 style="margin-bottom:10px">对局设置</h3>${ctl}
      ${isHost&&net.started?'<div class="row" style="margin-top:10px"><button data-a="hostReset">结束当前对局，回到大厅</button></div>':''}
      <p class="dim">${net.config&&net.config.mode==='team_race'?'竞速时每人独立选择路线、战斗和结算；地图标记会显示队友所在节点。':'合作模式下玩家共用路线和战斗。'} 团队竞速使用相同种子，便于比较进度。</p></div>
    <div class="side" id="side" style="max-height:none">${sideInner()}</div></div></div>`;
}

/* ---------- 计时 ---------- */
function tick(){
  if(!savePanel&&run&&!run.over&&run.room&&run.room.combat&&run.room.phase==='fight'){
    const c=run.room.combat;
    applyOvertime();
    if(run.over)return;
    const rem=remainingMs(c),t=document.getElementById('cdTimer');
    if(t){
      const tk=tickMs(),dm=drainDmg(c,run.room.kind),over=-rem;
      if(rem>0){t.textContent=fmtTime(rem);t.className='timer'+(rem<5*60000?' warn':'')}
      else{t.textContent=fmtTime(tk-(over%tk));t.className='timer crit'}
      const sub=document.getElementById('cdSub');
      if(sub)sub.textContent=rem>0?'时限剩余。超时后每 '+tk/60000+' 分钟失去 '+dm+' 点生命。':'已超时 '+fmtTime(over)+'，上方倒计时结束时失去 '+dm+' 点生命。';
      const b=document.getElementById('cdBar');
      if(b)b.style.width=(rem>0?Math.min(100,rem/(c.graceMs+c.extraMs)*100):100-(over%tk)/tk*100)+'%';
    }
  }
  document.querySelectorAll('[data-end]').forEach(e=>{e.textContent=fmtTime(+e.dataset.end-Date.now())});
}
setInterval(tick,500);
setInterval(()=>{if(net.connected&&run&&cb()&&cb().started&&!cb().done){syncStatus()}},5000);

/* ---------- 事件分发 ---------- */
$app.addEventListener('click',e=>{
  const t=e.target.closest('[data-a]');if(!t||t.disabled)return;
  const a=t.dataset.a,d=t.dataset;
  switch(a){
    case 'goMenu':view='menu';render();break;
    case 'openArchive':{
      savePanel=true;saveError='';
      try{saveCode=encodeRunArchive(archiveSource())}
      catch(x){saveCode='';saveError=x.message||'无法生成存档'}
      if(saveCode&&run&&!run.mp&&!net.connected&&!net.want)pauseArchiveTimer();
      render();break;
    }
    case 'closeArchive':savePanel=false;resumeArchiveTimer();saveError='';render();break;
    case 'copyArchive':{
      const el=document.getElementById('saveArchiveText'),text=((el&&el.value)||'').trim();
      if(!text)toast('没有可复制的存档字符串');else copyArchiveText(text);
      break;
    }
    case 'downloadArchive':{
      const el=document.getElementById('saveArchiveText'),text=((el&&el.value)||'').trim();
      if(!text){toast('没有可下载的存档字符串');break}
      const blob=new Blob([text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download='oi-spire-save.oisave';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('存档文件已下载');break;
    }
    case 'importArchive':{
      const el=document.getElementById('saveArchiveText');
      try{
        const archive=decodeRunArchive(el&&el.value);
        mergeArchiveProgress(archive.progress);
        savePanel=false;saveError='';
        if(archive.run){
          savePausedCombat=null;run=archive.run;curStroke=null;drawMode=false;lastMapAct=null;
          view='game';save();render();toast('存档和解锁进度已恢复');
        }else{
          resumeArchiveTimer();view='menu';render();toast('解锁进度已导入');
        }
      }catch(x){saveError=x.message||'导入存档失败';render()}
      break;
    }
    case 'goRules':view='rules';render();break;
    case 'goHistory':view='history';render();break;
    case 'endHistory':run=null;view='history';render();break;
    case 'historySeed':if(d.seed)shareSeed(d.seed);else toast('这条战绩没有种子记录');break;
    case 'historyClear':if(window.confirm('确定清空所有本地战绩吗？此操作无法撤销。')){lsDel(LS_HISTORY);render();toast('战绩已清空')}break;
    case 'rcFold':roomFold=!roomFold;render();break;
    case 'goCustom':view='custom';render();break;
    case 'custPreset':{cust=Object.assign(cloneC(CUST_DEF),cloneC(CUST_PRESETS[d.p]||CUST_DEF),{seed:cust.seed});custWriteDom();lsSet('oi3_custom',JSON.stringify(cust));render();break}
    case 'custStart':custReadDom();startRun(0,cust.seed||null,false,buildCustom());break;
    case 'goSelect':if(!isUnlocked(selDiff))selDiff=0;view='select';render();break;
    case 'pickDiff':selDiff=+d.d;render();break;
    case 'pickTier':selDiff=+d.t*11+(selDiff%11);render();break;
    case 'theme':theme=theme==='dark'?'light':'dark';lsSet('oi_theme',theme);applyTheme();render();break;
    case 'vjPanel':vjPanel=true;vjMessage='';render();break;
    case 'vjClose':vjPanel=false;render();break;
    case 'vjChallenge':vjGenerateChallenge();break;
    case 'vjVerify':vjVerifyBinding();break;
    case 'vjLogout':vjUnbind();break;
    case 'startSolo':{const s=(document.getElementById('seedIn')||{}).value;startRun(selDiff,(s||'').trim()||null);break}
    case 'continue':try{const r=JSON.parse(lsGet(LS_RUN));if(r&&r.v===5&&!r.mp&&!r.over&&!r.victory&&(!r.test||testMode)){run=r;view='game';lastMapAct=null;render();break}}catch(x){}lsDel(LS_RUN);toast('没有可继续的存档');render();break;
    case 'node':if(isMP())voteNode(+d.r,+d.c);else enterNode(+d.r,+d.c);break;
    case 'startCombat':if(run&&run.mp)netSend({t:'pstart'});else startCombat();break;
    case 'ac':winCombat();break;
    case 'verifySoloAc':verifySoloAc();break;
    case 'ancient':ancientPick(+d.i);break;
    case 'jump':lgJump();break;
    case 'lgPanel':lgPanel=true;lgCountNow().then(n=>{lgCount=n;if(lgPanel)render()}).catch(()=>{});render();break;
    case 'lgClose':lgPanel=false;render();break;
    case 'lgDownload':lgDownload();break;
    case 'lgType':{const v=d.v,i=lg.types.indexOf(v);if(t.checked&&i<0)lg.types.push(v);else if(!t.checked&&i>=0)lg.types.splice(i,1);lgSave();break}
    case 'lgTagAdd':{const el=document.getElementById('lgt_'+d.k);const v=el?el.value.trim():'';if(v&&LG_TAGS[d.k].includes(v)){if(!lg.tags[d.k].includes(v))lg.tags[d.k].push(v);lgSave();if(el)el.value='';render()}else toast('请从候选里选择一个标签');break}
    case 'lgTagDel':{const a2=lg.tags[d.k],i=a2.indexOf(d.t);if(i>=0)a2.splice(i,1);lgSave();render();break}
    case 'lgExcl':lg.exclude=t.checked;lgSave();break;
    case 'lgRec':lg.useRec=t.checked;lgSave();render();break;
    case 'lgPasteImport':{const el=document.getElementById('lgPaste');const ids=((el&&el.value)||'').toUpperCase().match(/[A-Z]+\d+/g)||[];ids.forEach(x=>lgDone.add(x));lgSave();if(el)el.value='';toast('已记录 '+ids.length+' 个题号');render();break}
    case 'lgClearDone':lgDone.clear();lgSave();render();break;
    case 'lgUseLists':lg.useLists=t.checked;lgSave();render();break;
    case 'lgListLv':lg.listLv=t.checked;lgSave();break;
    case 'lgListOn':{const i=lg.listOn.indexOf(d.id);if(t.checked&&i<0)lg.listOn.push(d.id);else if(!t.checked&&i>=0)lg.listOn.splice(i,1);lgSave();break}
    case 'lgListDel':lg.lists=lg.lists.filter(l=>l.id!==d.id);lg.listOn=lg.listOn.filter(x=>x!==d.id);lgSave();render();break;
    case 'lgListAdd':lgListAdd();break;
    case 'lgListManual':lgListManual();break;
    case 'psolve':netSend({t:'psolve',pid:d.pid,vjToken:vjBinding&&vjBinding.token});break;
    case 'pManual':{
      const el=document.getElementById('mpPids'),f=fightOf(),need=(f&&f.need)||1;
      const ids=[...new Set(((el&&el.value)||'').toUpperCase().match(/[A-Z]+\d+/g)||[])].slice(0,need);
      if(!ids.length){toast('请输入题号，例如 P1001');break}
      netSend({t:'pset',problems:ids.map(pid=>({pid,title:'',diff:-1}))});break}
    case 'drawToggle':drawMode=!drawMode;render();break;
    case 'pen':penColor=d.c;render();break;
    case 'drawUndo':drawUndo();break;
    case 'drawClear':drawClear();break;
    case 'leave':leaveRoom();break;
    case 'claim':claim(d.w,+d.i);break;
    case 'usePotion':usePotion(+d.i);break;
    case 'dropPotion':dropPotion(+d.i);break;
    case 'buy':buy(+d.i);break;
    case 'rest':rest(d.k);break;
    case 'chest':openChest();break;
    case 'evt':eventChoose(+d.i);break;
    case 'endBack':if(run&&run.over){lsDel(LS_RUN);if(run.mp)lsDel(LS_MPRUN)}run=null;view=net.connected?'lobby':'menu';render();break;
    case 'nextDiff':startRun(run.gi+1,null);break;
    case 'resetProg':if(d.sure){prog={unl:[0,0,0],best:{},cleared:{}};saveProg();lsDel(LS_RUN);toast('进度已清空');view='menu';render()}else{t.dataset.sure=1;t.textContent='再点一次确认清空'}break;
    case 'toLobby':case 'goLobby':view='lobby';render();break;
    case 'toGame':view='game';render();break;
    case 'join':{
      const name=(document.getElementById('nameIn').value||'').trim()||('玩家'+Math.floor(Math.random()*900+100));
      const room=(document.getElementById('roomIn').value||'').trim().toUpperCase();
      const url=(document.getElementById('urlIn').value||'').trim();
      if(!room){net.err='请输入房间号';render();break}
      lsSet(LS_NAME,name);net.room=room;netConnect(url,room,name);break}
    case 'leaveNet':netLeave();break;
    case 'hostStart':{
      const gi=+document.getElementById('hostD').value,s=(document.getElementById('hostSeed').value||'').trim()||Math.random().toString(36).slice(2,8);
      const mode=(document.getElementById('hostMode')||{}).value||'cooperative';
      netSend({t:'start',tier:Math.floor(gi/11),difficulty:gi%11,seed:s,mode});break}
    case 'hostReset':netSend({t:'reset'});break;
    case 'chat':{const i=document.getElementById('chatIn');if(i&&i.value.trim()){netSend({t:'chat',text:i.value.trim()});i.value=''}break}
    case 'gift':giftPotion(d.to);break;
    case 'takePending':takePending(+d.i);break;
    case 'dropPending':dropPending(+d.i);break;
    case 'testAsk':testAsk=true;testErr='';render();setTimeout(()=>{const i=document.getElementById('testPw');if(i)i.focus()},30);break;
    case 'testCancel':testAsk=false;testErr='';render();break;
    case 'testGo':{const v=(document.getElementById('testPw')||{}).value||'';if(testPwOk(v)){testMode=true;ssSet('oi_test','1');testAsk=false;testErr='';toast('测试模式已开启')}else testErr='口令不正确。';render();break}
    case 'testOff':testMode=false;ssDel('oi_test');if(run&&run.test){run=null}if(selDiff>0&&!isUnlocked(selDiff))selDiff=0;view='menu';render();break;
    case 'testRoom':testOpenRoom(d.k);break;
    case 'testEvt':{const v=(document.getElementById('testEv')||{}).value;if(v)testOpenRoom('event',v);break}
    case 'testBoon':{const v=(document.getElementById('testBoon')||{}).value,b=BOONS.find(x=>x.id===v);if(b&&run&&run.test){const m=b.f(rngFor(run.seed,'tb'+Date.now()));toast(b.n+'：'+(m||b.d));save();render()}break}
    case 'testRelic':{const v=(document.getElementById('testRel')||{}).value;if(v&&run&&run.test){if(run.relics.includes(v))toast('已拥有该遗物');else{gainRelic(v);toast('获得遗物：'+RELICS[v].n);save();render()}}break}
    case 'testPotion':{const v=(document.getElementById('testPot')||{}).value;if(v&&run&&run.test){toast(givePotion(v));save();render()}break}
    case 'testGold':if(run&&run.test){run.gold+=500;save();render()}break;
    case 'testHeal':if(run&&run.test){run.hp=run.maxHp;save();render()}break;
    case 'testMax':if(run&&run.test){run.maxHp+=20;run.hp+=20;save();render()}break;
    case 'testSlot':if(run&&run.test){run.extraSlots=(run.extraSlots||0)+1;save();render()}break;
    case 'testAct':if(run&&run.test){run.room=null;run.act=+d.n;startAct();save();render()}break;
    case 'testClose':if(run&&run.test){run.room=null;save();render()}break;
    case 'testWin':testWin();break;
    case 'testOver':testOver();break;
  }
});
$app.addEventListener('change',async e=>{
  if(e.target.id==='saveArchiveFile'&&e.target.files&&e.target.files[0]){
    try{saveCode=(await e.target.files[0].text()).trim();saveError='';render();const area=document.getElementById('saveArchiveText');if(area)area.value=saveCode}
    catch(x){saveError='读取存档文件失败：'+(x.message||'未知错误');render()}
    return;
  }
  if(e.target.id==='lgFile'&&e.target.files&&e.target.files[0]){
    try{lgBusy='读取文件中……';lgErr='';render();await lgImport(await e.target.files[0].arrayBuffer());toast('题库已导入：'+lgCount+' 题')}
    catch(x){lgBusy='';lgErr='导入失败：'+x.message}
    render();
  }
});
$app.addEventListener('pointerdown',e=>{
  if(e.target.id!=='drawlayer'||!run||!run.map)return;
  e.preventDefault();try{e.target.setPointerCapture(e.pointerId)}catch(x){}
  curStroke={id:'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),by:myId(),c:penColor,p:[svgPoint(e)]};
  run.map.draw.push(curStroke);redrawLayer();
});
$app.addEventListener('pointermove',e=>{
  if(!curStroke)return;
  const q=svgPoint(e),l=curStroke.p[curStroke.p.length-1];
  if(Math.hypot(q[0]-l[0],q[1]-l[1])<3)return;
  if(curStroke.p.length<500)curStroke.p.push(q);
  redrawLayer();
});
let rcDrag=null;
$app.addEventListener('pointerdown',e=>{
  const h=e.target.closest&&e.target.closest('.rchead');if(!h||e.target.closest('button'))return;
  const card=document.getElementById('roomcard');if(!card)return;
  const r=card.getBoundingClientRect();rcDrag={dx:e.clientX-r.left,dy:e.clientY-r.top,w:r.width,card};
  card.style.transform='none';card.style.left=r.left+'px';card.style.top=r.top+'px';
  try{h.setPointerCapture(e.pointerId)}catch(x){}e.preventDefault();
});
$app.addEventListener('pointermove',e=>{
  if(!rcDrag)return;
  const x=Math.max(8-rcDrag.w+80,Math.min(window.innerWidth-80,e.clientX-rcDrag.dx)),y=Math.max(0,Math.min(window.innerHeight-40,e.clientY-rcDrag.dy));
  roomPos={x,y};rcDrag.card.style.left=x+'px';rcDrag.card.style.top=y+'px';
});
const rcEnd=()=>{rcDrag=null};
$app.addEventListener('pointerup',rcEnd);$app.addEventListener('pointercancel',rcEnd);
$app.addEventListener('pointerup',endStroke);
$app.addEventListener('pointercancel',endStroke);
$app.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.id==='chatIn'){e.preventDefault();const b=document.querySelector('[data-a="chat"]');if(b)b.click()}
  if(e.key==='Enter'&&e.target.id==='testPw'){e.preventDefault();const b=document.querySelector('[data-a="testGo"]');if(b)b.click()}
});
$app.addEventListener('toggle',e=>{if(e.target.id==='testDet')testDetOpen=e.target.open},true);
window.addEventListener('beforeunload',()=>{if(run&&!run.mp)lsSet(LS_RUN,JSON.stringify(run));else if(run&&run.mp)mpSave()});
/* 联机稳定性：页面关闭时通知服务器（缩短宽限）；心跳超时、切回页面、网络恢复时主动重连 */
window.addEventListener('pagehide',()=>{if(net.ws&&net.ws.readyState===1){try{net.ws.send('{"t":"away"}')}catch(e){}}});
setInterval(()=>{if(net.want&&net.connected&&Date.now()-net.lastRx>55000)forceReconnect()},5000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&net.want){if(!net.connected&&!net.ws)forceReconnect();else if(net.connected&&Date.now()-net.lastRx>45000)forceReconnect()}});
window.addEventListener('online',()=>{if(net.want&&!net.connected)forceReconnect()});
(()=>{const sn=ssGet('oi_net');if(!sn)return;try{const o=JSON.parse(sn);if(o&&o.url&&o.room){net.room=o.room;view='lobby';netConnect(o.url,o.room,o.name,true)}}catch(e){}})();
render();
