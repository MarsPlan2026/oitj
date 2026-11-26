'use strict';
/* =====================================================================
   涓€銆佺函閫昏緫锛氶殢鏈烘暟銆佸湴鍥俱€佹暟鎹畾涔夛紙鏃?DOM 渚濊禆锛?   ===================================================================== */
function hashStr(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h>>>0}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function rngFor(seed,key){return mulberry32(hashStr(seed+'|'+key))}
const pick=(r,a)=>a[Math.floor(r()*a.length)];
const ri=(r,a,b)=>a+Math.floor(r()*(b-a+1));

const W=7, ROWS=15;           // 7 鍒楋紝15 灞傦紝绗?16 灞備负 棣栭
const SPECIAL=['elite','rest','shop'];

/* ---------- 闅惧害 ---------- */
const DNAMES=['璧锋','鐑韩','鍒濊瘯','灏忚瘯鐗涘垁','娓愬叆浣冲','涓鑰冮獙','娣辨按鍖?,'鏀€鐧?,'鏋侀檺','宸呭嘲','鍏堝彜璇曠偧'];

/* 涓変釜澶ч毦搴︼紝姣忎釜閮芥湁 0~10 鍏?11 涓繘闃躲€俵o/hi 鏄澶ч毦搴︾殑棰樼洰闅惧害鑼冨洿锛堟礇璋烽毦搴︽暟鍊硷級 */
const TIERS=[{n:'鏅強',lo:1,hi:4},{n:'鎻愰珮',lo:3,hi:5},{n:'鐪侀€?,lo:5,hi:7}];
/* 娲涜胺闅惧害鏁板€?-> 棰滆壊涓庡悕绉帮紙c锛氶鑹诧紝n锛氬畼鏂瑰悕绉帮級 */
const LV=[{c:'鐏?,n:'鏈瘎瀹?},{c:'绾?,n:'鍏ラ棬'},{c:'姗?,n:'鏅強-'},{c:'榛?,n:'鏅強/鎻愰珮-'},{c:'缁?,n:'鏅強+/鎻愰珮'},{c:'钃?,n:'鎻愰珮+/鐪侀€?'},{c:'绱?,n:'鐪侀€?NOI-'},{c:'榛?,n:'NOI/NOI+/CTSC'}];
const GI_MAX=TIERS.length*11-1;            // 鍏ㄥ眬闅惧害搴忓彿 0..32锛屽簭鍙?= 澶ч毦搴?11 + 闅惧害
const giOf=(tier,d)=>tier*11+d;
const giName=gi=>TIERS[Math.floor(gi/11)].n+' 路 杩涢樁 '+(gi%11)+' 路 '+DNAMES[gi%11];
const lvChip=v=>`<span class="chip lv lv${v}">${v===0?LV[v].n:LV[v].c}</span>`;
const lvChips=a=>a.map(lvChip).join('<span class="dim">~</span>');
const needCount=n=>Math.max(1,Math.floor(n*2/3));   // 鑱旀満鏃舵瘡涓垬鏂楁埧闂撮渶瑕佹娊鐨勯鏁帮細floor(浜烘暟/3*2)锛岃嚦灏?1
const MODS=[
  '鍩虹瑙勫垯锛氬叡涓夊箷锛屽嚮璐ユ瘡骞曞敖澶寸殑棣栭鏂瑰彲閫氬叧銆傛櫘鍙?鎻愰珮鏃堕檺锛氭櫘閫?20 鍒嗛挓銆佺簿鑻?40 鍒嗛挓銆侀棰?60 鍒嗛挓锛涚渷閫夋椂闄愶細鏅€?60 鍒嗛挓銆佺簿鑻?90 鍒嗛挓銆侀棰?120 鍒嗛挓銆傝秴鏃跺悗姣?5 鍒嗛挓鎵ｈ銆?,
  '绮捐嫳鎴樻枟鏇翠负甯歌銆?,
  '浼戞伅澶勭殑鍥炲姣斾緥鐢?30% 闄嶄负 20%銆?,
  '鎴樻枟鎵€寰楅噾甯?-25%銆?,
  '鑽按鏍忎綅 -1銆?,
  '鍒濆鏈€澶х敓鍛?-10銆?,
  '鍟嗗簵浠锋牸 +25%銆?,
  '瓒呮椂鎵ｈ +25%銆?,
  '骞曚笌骞曚箣闂村彧鎭㈠涓€鍗婄敓鍛姐€?,
  '棣栭鎴樻枟鐨勮秴鏃舵墸琛€ +50%锛涗笉鍐嶆惡甯﹀垵鐕冧箣琛€銆?,
  '鏈煡涔嬪湴鏇存槗閬亣鍑堕櫓锛涚涓夊箷椤昏繛缁嚮璐ヤ袱浣嶉棰嗐€?
];
function P(d){return{
  eliteW:d>=1?0.14:0.09, restPct:d>=2?0.2:0.3, goldMult:d>=3?0.75:1, slots:d>=4?2:3,
  startMax:100-(d>=5?10:0), shopMult:d>=6?1.25:1, failMult:d>=7?1.25:1, actHeal:d>=8?0.5:1,
  bossFailMult:d>=9?1.5:1, noStarter:d>=9, badEvent:d>=10?0.25:0 }}

/* ---------- 鍦板浘鐢熸垚锛堜豢鏉€鎴皷濉旓細6 鏉′笉浜ゅ弶璺緞锛?---------- */
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
  // 椤跺眰鑺傜偣姹囧叆 棣栭
  for(let c=0;c<W;c++){const n=nodes[ROWS-1][c];if(n)n.next=[3]}
  nodes[ROWS][3]={r:ROWS,c:3,next:dbl?[3]:[],type:'boss'};
  if(dbl)nodes[ROWS+1][3]={r:ROWS+1,c:3,next:[],type:'boss'};
  // 鎴块棿绫诲瀷
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

/* ---------- 棰樼洰闅惧害鎻愮ず ---------- */
const KIND_WIN={monster:[0,0.6],elite:[0.2,0.8],boss:[0.45,1]};   // 鍚勭被鎴块棿鍦ㄥぇ闅惧害棰滆壊鑼冨洿閲屽崰鐨勫尯闂?/* 杩斿洖 {lv:[娲涜胺闅惧害鏁板€?..]}锛氳秺楂樼殑闅惧害涓庨噸瓒婇潬杩戣寖鍥翠笂闄愶紝鍚岄噸閲?棣栭 > 绮捐嫳 > 鏅€?*/
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
const TOPICS=['鏁版嵁缁撴瀯','鍔ㄦ€佽鍒?,'鍥捐','鏁板 / 鏁拌','瀛楃涓?,'璐績','鎼滅储 / 鍓灊','鏋勯€?,'浜屽垎 / 涓夊垎','璁＄畻鍑犱綍','妯℃嫙','鍗氬紙璁?];
const MONSTER_NAMES=['姘撮鍙茶幈濮?,'妯℃澘鍌€鍎?,'璐績灏忓','DP 骞艰嫍','瀛楃涓茶潤铦?,'鍥捐铚樿洓','鏁板骞界伒','浜屽垎鍦扮簿','鏆村姏鍝ュ竷鏋?];
const ELITE_NAMES=['鍗″父鎬?,'杈圭晫鏁版嵁','姣掔槫鏋勯€?,'鍙嶅搱甯岄瓟鍍?,'澶фā鎷?,'浜や簰棰樻伓榄?];
const BOSS_NAMES=['鏆村姏鏉€鎵?,'姣掔槫鏁版嵁缁撴瀯','鍑洪浜烘湰浜?];
const BOSS2_NAME='鍛介缁勭粍闀?;
const STAGE_NAMES=['绗竴骞?路 鍒濊禌','绗簩骞?路 澶嶈禌','绗笁骞?路 鍐宠禌'];

/* ---------- 閬楃墿 ----------
   e锛氭晥鏋滐紱鎻忚堪 d 鐢辨晥鏋滆嚜鍔ㄧ敓鎴愶紝淇濊瘉璇存槑涓庡疄闄呮暟鍊间竴鑷淬€俽锛氬搧闃讹紙common 鏅€?/ uncommon 缃曡 / rare 绋€鏈夛級 */
const RELICS={
  starter:{n:'鍒濈噧涔嬭',r:'starter',e:{winHeal:2}},
  brush:{n:'鏈烘閿洏',r:'common',e:{timeAll:5}},
  tea:{n:'淇濇俯鏉?,r:'common',e:{restHeal:8}},
  abacus:{n:'瀵规媿鍣?,r:'uncommon',e:{failMult:-0.2}},
  scroll:{n:'鏉垮瓙搴?,r:'common',e:{goldMult:0.5}},
  ginkgo:{n:'姊?,r:'uncommon',e:{maxHp:12}},
  pavilion:{n:'绌鸿皟',r:'uncommon',e:{time_elite:10}},
  divine:{n:'鐜勫缃楃洏',r:'common',e:{goodEvent:0.25}},
  bill:{n:'浼氬憳鍗?,r:'common',e:{shopDiscount:0.2}},
  draft:{n:'鑽夌绾?,r:'common',e:{potionDrop:0.35}},
  gourd:{n:'鑽按鑵板甫',r:'uncommon',e:{slots:1}},
  teapot:{n:'鍜栧暋鏈?,r:'uncommon',e:{actCoffee:1}},
  lamp:{n:'闃茶摑鍏夌溂闀?,r:'uncommon',e:{time_boss:10}},
  jade:{n:'鑷姩鏈烘姢绗?,r:'rare',e:{actShield:1}},
  purse:{n:'娌夐噸閽辫',r:'common',e:{gold:150}},
  bamboo:{n:'骞歌繍鏄?,r:'rare',e:{timeAll:3,slots:1}},
  cricket:{n:'姗＄毊楦?,r:'common',e:{time_monster:4}},
  errata:{n:'閿欓鏈?,r:'common',e:{drainCut:2}},
  pillow:{n:'棰堟鎸夋懇浠?,r:'uncommon',e:{drainCut:3}},
  couch:{n:'杞灂',r:'uncommon',e:{restHeal:15}},
  ginseng:{n:'鑳介噺楗枡',r:'uncommon',e:{winHeal:4}},
  midas:{n:'閲戞墜鎸?,r:'rare',e:{goldMult:1}},
  coinjar:{n:'瀛橀挶缃?,r:'common',e:{gold:80,shopDiscount:0.1}},
  inkstone:{n:'鏃ч敭鐩?,r:'common',e:{timeAll:3}},
  screen:{n:'闄嶅櫔鑰虫満',r:'uncommon',e:{time_elite:8,time_boss:8}},
  toolkit:{n:'涓囪兘宸ュ叿绠?,r:'common',e:{goldMult:0.2,potionDrop:0.2}},
  seal:{n:'鑽夎帗',r:'common',e:{maxHp:8}},
  compass:{n:'鏍￠獙缃楃洏',r:'uncommon',e:{failMult:-0.15}},
  sachet:{n:'姣涚粧鐜╁叿',r:'common',e:{goodEvent:0.15}},
  ration:{n:'鍔犵彮椁?,r:'common',e:{potionHeal:10}},
  notes:{n:'绾歌川璁蹭箟',r:'uncommon',e:{restPotion:1}},
  heirloom:{n:'绁栦紶U鐩?,r:'common',e:{eventGold:30}},
  trophy:{n:'閲戞澂',r:'rare',e:{maxHp:20}},
  tripod:{n:'閲戣壊灏忓儚',r:'uncommon',e:{winGold:15}},
  library:{n:'涓囪兘妯℃澘搴?,r:'rare',e:{timeAll:10}},
  nightoil:{n:'鑲濆笣濂楄',r:'rare',e:{drainCut:5}},
  swift:{n:'閫熼€氶敭鐩?,r:'rare',e:{time_elite:15,time_boss:15}},
  treasury:{n:'姘噾鍗?,r:'rare',e:{gold:300,shopDiscount:0.2}},
  medbox:{n:'鎬ユ晳鑽',r:'rare',e:{restHeal:25}},
  dragonblood:{n:'鑲句笂鑵虹礌',r:'rare',e:{winHeal:8}},
  alchemy:{n:'鐐奸噾鍙?,r:'rare',e:{potionDrop:0.5,slots:1}},
  ganoderma:{n:'钀ュ吇琛ュ墏',r:'uncommon',e:{potionHeal:20}},
  fortune:{n:'骞歌繍涔嬫墜',r:'rare',e:{goodEvent:0.4}},
  twinjade:{n:'鍙屽眰鎶ょ',r:'rare',e:{actShield:2}},
  boxing:{n:'锜犳',r:'rare',e:{maxHp:25}},
  seclusion:{n:'闂叧淇偧',r:'uncommon',e:{winMaxHp:1}},
  clepsydra:{n:'娌欐紡',r:'rare',e:{tickMin:2}},
  ember:{n:'涓嶇伃鐨勭伅',r:'uncommon',e:{timeAll:4,drainCut:2}},
  mentor:{n:'瀵煎笀绗旇',r:'uncommon',e:{maxHp:10,slots:1}},
  /* 浠ヤ笅涓烘柊澧?*/
  inkslab:{n:'纾ㄥ垁鐭?,r:'common',e:{eliteMaxHp:2}},
  windchime:{n:'椋庨搩',r:'common',e:{eventHeal:6}},
  pine:{n:'浣欑儸',r:'uncommon',e:{actHeal:15}},
  ironbrush:{n:'灞犻瓟涔嬪垉',r:'uncommon',e:{drainCut_boss:6}},
  tally:{n:'鐚庢墜寰借',r:'uncommon',e:{drainCut_elite:4}},
  bronzemirror:{n:'骞歌繍纭竵',r:'common',e:{winGold:8}},
  vaultkey:{n:'瀹濈閽ュ寵',r:'uncommon',e:{chestGold:60}},
  laurel:{n:'鑳滃埄妗傚啝',r:'rare',e:{bossHeal:30,bossMaxHp:6}},
  dragonseal:{n:'榫欎箣鍗拌',r:'rare',e:{timeAll:6,drainCut:3}},
  cloudrobe:{n:'鍟嗕汉闀胯',r:'uncommon',e:{shopDiscount:0.15,maxHp:6}},
  phoenix:{n:'娑呮涔嬬窘',r:'rare',e:{revive:1}},
  tortoise:{n:'榫熷３',r:'rare',e:{failMult:-0.25}},
  silkmap:{n:'鍦板浘纰庣墖',r:'common',e:{timeAll:2,goodEvent:0.1}},
  bell:{n:'鍙敜閾冮摏',r:'common',e:{gold:60,maxHp:5}},
  sword:{n:'鍖曢',r:'uncommon',e:{time_monster:8,time_elite:8}},
  elixirbox:{n:'鑽按鍖?,r:'uncommon',e:{slots:1,potionDrop:0.2}},
  harvest:{n:'涓版敹',r:'uncommon',e:{goldMult:0.4,winHeal:2}},
  spring:{n:'鍦ｆ硥',r:'rare',e:{restHeal:20,restMaxHp:3}},
  goldabacus:{n:'閲戣壊绠楃洏',r:'rare',e:{shopDiscount:0.25,goldMult:0.3}},
  armillary:{n:'鏄熻薄浠?,r:'rare',e:{timeAll:8,goodEvent:0.2}},
  slips:{n:'绔圭畝',r:'common',e:{drainCut:1,timeAll:2}},
  inkwash:{n:'灏忔按鐡?,r:'common',e:{winHeal:3}},
  moon:{n:'鏈堝厜鎶ょ',r:'uncommon',e:{actPotion:1}},
  stele:{n:'涓嶆溄涔嬬',r:'rare',e:{maxHp:15,winHeal:5}},
  decree:{n:'鐜嬩护',r:'rare',e:{timeAll:5,tickMin:1}}
};
/* 鐢辨晥鏋滅敓鎴愭弿杩?*/
(function(){
  const pc=v=>Math.round(Math.abs(v)*100)+'%';
  const F={
    timeAll:v=>'鎵€鏈夋垬鏂楁椂闄?+'+v+' 鍒嗛挓', time_monster:v=>'鏅€氭垬鏂楁椂闄?+'+v+' 鍒嗛挓', time_elite:v=>'绮捐嫳鎴樻枟鏃堕檺 +'+v+' 鍒嗛挓', time_boss:v=>'棣栭鎴樻枟鏃堕檺 +'+v+' 鍒嗛挓',
    failMult:v=>'瓒呮椂鎵ｈ '+(v<0?'-':'+')+pc(v), drainCut:v=>'瓒呮椂姣忔鎵ｈ -'+v, drainCut_boss:v=>'棣栭鎴樻枟瓒呮椂姣忔鎵ｈ -'+v, drainCut_elite:v=>'绮捐嫳鎴樻枟瓒呮椂姣忔鎵ｈ -'+v,
    tickMin:v=>'瓒呮椂鎵ｈ鐨勯棿闅?+'+v+' 鍒嗛挓', actShield:v=>v>1?'姣忎竴骞曞墠 '+v+' 鍦烘垬鏂椾笉鍙楄秴鏃舵墸琛€':'姣忎竴骞曠殑绗竴鍦烘垬鏂椾笉鍙楄秴鏃舵墸琛€',
    winHeal:v=>'姣忓満鎴樻枟鍙栬儨鍚庡洖澶?'+v+' 鐐圭敓鍛?, winMaxHp:v=>'姣忓満鎴樻枟鍙栬儨鍚庢渶澶х敓鍛?+'+v, winGold:v=>'姣忓満鎴樻枟鍙栬儨鍚庨澶?+'+v+' 閲戝竵',
    goldMult:v=>'鎴樻枟閲戝竵濂栧姳 +'+pc(v), potionDrop:v=>'鑽按鎺夎惤鐜?+'+pc(v), slots:v=>'鑽按鏍忎綅 +'+v,
    maxHp:v=>'鑾峰緱鏃舵渶澶х敓鍛?+'+v+'锛屽苟鍥炲绛夐噺鐢熷懡', gold:v=>'鑾峰緱鏃跺緱鍒?'+v+' 閲戝竵', shopDiscount:v=>'鍟嗗簵浠锋牸 -'+pc(v),
    goodEvent:v=>'鏈煡涔嬪湴鏇存槗鍑虹幇鍚変簨锛?'+pc(v)+'锛?, restHeal:v=>'鍦ㄤ紤鎭棰濆鍥炲 '+v+' 鐐圭敓鍛?, restPotion:v=>'鍦ㄤ紤鎭銆岀偖鍒躲€嶆椂澶氬緱 '+v+' 鐡惰嵂姘?, restMaxHp:v=>'姣忔鍦ㄤ紤鎭姝囨伅锛屾渶澶х敓鍛?+'+v,
    potionHeal:v=>'鍥炲绫昏嵂姘撮澶栧洖澶?'+v+' 鐐圭敓鍛?, eventGold:v=>'姣忔浜嬩欢缁撴潫棰濆 +'+v+' 閲戝竵', eventHeal:v=>'姣忔浜嬩欢缁撴潫鍥炲 '+v+' 鐐圭敓鍛?,
    actHeal:v=>'姣忚繘鍏ユ柊鐨勪竴骞曪紝鍥炲 '+v+' 鐐圭敓鍛?, actCoffee:()=>'姣忚繘鍏ユ柊鐨勪竴骞曪紝鑾峰緱涓€鏉挅鍟?, actPotion:()=>'姣忚繘鍏ユ柊鐨勪竴骞曪紝鑾峰緱涓€鐡堕殢鏈鸿嵂姘?,
    eliteMaxHp:v=>'姣忓満绮捐嫳鎴樻枟鍙栬儨鍚庢渶澶х敓鍛?+'+v, chestGold:v=>'寮€鍚疂绠辨椂棰濆 +'+v+' 閲戝竵', bossHeal:v=>'鍑昏触棣栭鍚庡洖澶?'+v+' 鐐圭敓鍛?, bossMaxHp:v=>'鍑昏触棣栭鍚庢渶澶х敓鍛?+'+v,
    revive:()=>'鐢熷懡褰掗浂鏃讹紝浠ヤ竴鍗婄敓鍛介噸鏂扮珯璧凤紙浠呬竴娆★級'
  };
  for(const k in RELICS){const r=RELICS[k];r.d=Object.keys(r.e).map(x=>F[x]?F[x](r.e[x]):x).join('锛?)+'銆?}
})();
const RELIC_PRICE={common:140,uncommon:220,rare:320,starter:0};
const RARITY_NAME={common:'鏅€?,uncommon:'缃曡',rare:'绋€鏈?,starter:'鍒濆'};

/* ---------- 鑽按 ---------- */
const POTIONS={
  coffee:{n:'鍜栧暋',d:'鎴樻枟涓娇鐢細鏈満鏃堕檺 +10 鍒嗛挓銆?,w:3,price:55,combat:true},
  espresso:{n:'娴撶缉鍜栧暋',d:'鎴樻枟涓娇鐢細鏈満鏃堕檺 +20 鍒嗛挓銆?,w:1,price:95,combat:true},
  heal:{n:'娌荤枟鑽按',d:'鍥炲 25 鐐圭敓鍛姐€?,w:3,price:60},
  insure:{n:'淇濋櫓鑽按',d:'鎴樻枟涓娇鐢細鏈満涓嶅啀鍙楄秴鏃舵墸琛€銆?,w:2,price:90,combat:true},
  partial:{n:'鏆村姏鍒嗚嵂姘?,d:'鎴樻枟涓娇鐢細鏈満瓒呮椂鎵ｈ鍑忓崐銆?,w:2,price:60,combat:true},
  lucky:{n:'骞歌繍鑽按',d:'鎴樻枟涓娇鐢細鏈満鍙栬儨鎵€寰楅噾甯佺炕鍊嶃€?,w:2,price:50,combat:true},
  chosen:{n:'澶╅€変箣瀛?,d:'鑾峰緱涓€浠堕殢鏈洪仐鐗┿€?,w:0,price:200},
  bandage:{n:'鍒涘彲璐?,d:'鍥炲 15 鐐圭敓鍛姐€?,w:3,price:35},
  bigheal:{n:'澶ф不鐤楄嵂姘?,d:'鍥炲 50 鐐圭敓鍛姐€?,w:1,price:100},
  vital:{n:'娲诲姏鑽按',d:'鏈€澶х敓鍛?+6锛屽苟鍥炲 6 鐐广€?,w:1,price:90},
  guard:{n:'鎶や綋鑽按',d:'鎴樻枟涓娇鐢細鏈満瓒呮椂姣忔鎵ｈ -10锛堣嚦灏?1 鐐癸級銆?,w:2,price:70,combat:true},
  fullheal:{n:'瀹屽叏娌荤枟鑽按',d:'鍥炲 100 鐐圭敓鍛姐€?,w:0.6,price:160},
  timewarp:{n:'鏃堕棿鑽按',d:'鎴樻枟涓娇鐢細鏈満鏃堕檺 +30 鍒嗛挓銆?,w:0.8,price:140,combat:true},
  recover:{n:'闀囬潤鑽按',d:'鎴樻枟涓娇鐢細鍥炲 20 鐐圭敓鍛斤紝骞朵娇鏈満鏃堕檺 +5 鍒嗛挓銆?,w:1.5,price:80,combat:true},
  greed:{n:'璐㈠瘜鑽按',d:'绔嬪嵆鑾峰緱 120 閲戝竵銆?,w:1.5,price:70},
  tonic:{n:'鎴愰暱鑽按',d:'鏈€澶х敓鍛?+12锛屽苟鍥炲 12 鐐广€?,w:0.5,price:160}
};

/* ---------- 闅忔満閫夋嫨 ---------- */
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

const LG_TAGS={"algorithm":["璇█鍏ラ棬","瀛楃涓?,"鍚庣紑鑷姩鏈?SAM","瀛楀吀鏍?Trie","AC 鑷姩鏈?,"KMP 绠楁硶","鍚庣紑鏁扮粍 SA","鍚庣紑鏍?,"鏈夐檺鐘舵€佽嚜鍔ㄦ満","鍥炴枃鑷姩鏈?PAM","Manacher 绠楁硶","椤哄簭缁撴瀯","鍒嗘敮缁撴瀯","寰幆缁撴瀯","鏁扮粍","瀛楃涓诧紙鍏ラ棬锛?,"缁撴瀯浣?,"鍑芥暟涓庨€掑綊","Lyndon 鍒嗚В","Z 鍑芥暟","鍔ㄦ€佽鍒?DP","鎼滅储","骞垮害浼樺厛鎼滅储 BFS","娣卞害浼樺厛鎼滅储 DFS","鍓灊","璁板繂鍖栨悳绱?,"鍚彂寮忔悳绱?,"杩唬鍔犳繁鎼滅储","鍚彂寮忚凯浠ｅ姞娣辨悳绱?IDA*","Dancing Links","鐖北绠楁硶 Local search","妯℃嫙閫€鐏?,"鑳屽寘 DP","鏁颁綅 DP","鍖洪棿 DP","鏍戝舰 DP","杞粨绾?DP","绾挎€?DP","鐘跺帇 DP","鍚庣紑骞宠　鏍?,"鏁板","鍥捐","Kruskal 閲嶆瀯鏍?,"缃戠粶娴?,"淇℃伅璁?,"闅忔満璋冩暣","閬椾紶绠楁硶","鍥捐寤烘ā","鍥鹃亶鍘?,"鎷撴墤鎺掑簭","鏈€鐭矾","鐢熸垚鏍?,"骞抽潰鍥?,"鏈€灏忕幆","A*  绠楁硶","鎶樺崐鎼滅储 meet in the middle","姊害涓嬮檷娉?,"鎷夋牸鏈楁棩涔樻暟娉?,"鎷夋牸鏈楁棩鎻掑€兼硶","鍗曚綅鏍瑰弽婕?,"璐熸潈鐜?,"杩為€氬潡","2-SAT","骞抽潰鍥炬鎷夊叕寮?,"寮鸿繛閫氬垎閲?,"Tarjan","鍙岃繛閫氬垎閲?,"娆ф媺鍥炶矾","宸垎绾︽潫","浠欎汉鎺?,"浜屽垎鍥?,"涓€鑸浘鐨勬渶澶у尮閰?,"涓婁笅鐣岀綉缁滄祦","鏈€灏忓壊","璐圭敤娴?,"鍦嗘柟鏍?,"寮﹀浘","Floyd 绠楁硶","骞夸箟涓插苟鑱斿浘","Hall 瀹氱悊","璁＄畻鍑犱綍","鏍戝舰鏁版嵁缁撴瀯","绾挎鏍?,"骞舵煡闆?,"骞宠　鏍?,"鍫?,"鏍戠姸鏁扮粍","cdq 鍒嗘不","鍙苟鍫?,"鍔ㄦ€佹爲 LCT","涓夌淮璁＄畻鍑犱綍","鍚戦噺","鍑稿寘","鍙夌Н","绾挎鐩镐氦","鍗婂钩闈氦","鏃嬭浆鍗″３","鏋佽鎺掑簭","骞抽潰鍑犱綍","闂靛彲澶柉鍩哄拰 Minkowski sum","鍗氬紙璁?,"绾挎€ф暟鎹粨鏋?,"鍗曡皟闃熷垪","棰滆壊娈靛潎鎽婏紙鐝傛湹鑾夋爲 ODT锛?,"鏍戝鏍?,"鍙寔涔呭寲绾挎鏍?,"鍙寔涔呭寲","鍓嶇紑鍜?,"鏍?,"闃熷垪","鍗氬紙鏍?,"鏁翠綋浜屽垎","K-D Tree","Nim 绉?,"鏉庤秴绾挎鏍?,"鍚夊徃鏈虹嚎娈垫爲 segment tree beats","绾挎鏍戝悎骞?,"SG 鍑芥暟","浜屽尯闂村悎骞讹紙鐚爲鍒嗘不锛?,"KTT / Kinetic Tournament Tree","鍘熸牴","澶氶」寮?,"鏁拌","绱犳暟鍒ゆ柇","鏈€澶у叕绾︽暟 gcd","鎵╁睍娆у嚑閲屽痉绠楁硶","涓嶅畾鏂圭▼","杩涘埗","鍒嗗潡","ST 琛?,"蹇€熷倕閲屽彾鍙樻崲 FFT","蹇€熸暟璁哄彉鎹?NTT","蹇€熸矁灏斾粈鍙樻崲 FWT","蹇€熻帿姣斾箤鏂彉鎹?FMT","宸垎","閾捐〃","鍗曡皟鏍?,"Berlekamp-Massey(BM) 绠楁硶","闆嗗悎骞傜骇鏁帮紝瀛愰泦鍗风Н","鍝堝笇琛?,"妯℃嫙","璐績","鍩虹绠楁硶","涓浗鍓╀綑瀹氱悊 CRT","鑾瘮涔屾柉鍙嶆紨","閫嗗厓","Lucas 瀹氱悊","绫绘鍑犻噷寰楃畻娉?,"璋冨拰绾ф暟","娆ф媺闄嶅箓","Stern-Brocot 鏍?,"鏁撮櫎鍒嗗潡","Dirichlet 鍗风Н","澶ф灏忔绠楁硶 BSGS","浜屾鍓╀綑","B茅zout 瀹氱悊","鏉滄暀绛?,"娆ф媺鍑芥暟","绾挎€х瓫娉?,"浜氱嚎鎬у揩閫熸眰鍜岀畻娉?,"閫掓帹","鍊嶅","浜屽垎","閫掑綊","鏋氫妇","鍒嗘不","鎺掑簭","鍔ㄦ€佽鍒掍紭鍖?,"浼樺厛闃熷垪","鐭╅樀鍔犻€?,"鏂滅巼浼樺寲","鐘舵€佸悎骞?,"鍑稿畬鍏ㄥ崟璋冩€э紙wqs 浜屽垎锛?,"鍥涜竟褰笉绛夊紡","DP 濂?DP","鍔ㄦ€?DP","鍐崇瓥鍗曡皟鎬?,"STL","鏁翠綋杞Щ","鏂滅巼缁存姢鎶€宸?slope trick","鐐瑰垎娌?,"鏍戜笂鍚彂寮忓悎骞?,"鏍戠殑閬嶅巻","鏈€杩戝叕鍏辩鍏?LCA","鏍戠殑鐩村緞","鏍戦摼鍓栧垎","鏍戣","缇よ","缃崲","P贸lya 瀹氱悊","铏氭爲","缁勫悎鏁板","鎺掑垪缁勫悎","浜岄」寮忓畾鐞?,"搴锋墭灞曞紑","鍩虹幆鏍?,"鍔ㄦ€佹爲鍒嗘不","Pr眉fer 搴忓垪","鍏ㄥ眬骞宠　浜屽弶鏍?,"鏍戠殑閲嶅績","LGV 寮曠悊","鐭╅樀鏍戝畾鐞?,"鐭╅樀杩愮畻","楦界鍘熺悊","瀹规枼鍘熺悊","Fibonacci 鏁板垪","Catalan 鏁?,"Stirling 鏁?,"鐢熸垚鍑芥暟","姒傜巼璁?,"鏈熸湜","绾挎€т唬鏁?,"鐭╅樀涔樻硶","绾挎€ч€掓帹","楂樻柉娑堝厓","Dilworth 瀹氱悊","鎷夋牸鏈楁棩鍙嶆紨","鏉ㄨ〃","闅忔満娓歌蛋 Markov Chain","闉呯殑鍋滄椂瀹氱悊","鏆村姏鏁版嵁缁撴瀯","楂樼簿搴?,"鑾槦","涓夊垎","绂绘暎鍖?,"闇嶅か鏇兼爲","鍝堝笇 hashing","绾挎€у熀","寰Н鍒?,"瀵兼暟","绉垎","瀹氱Н鍒?,"绾ф暟","鎵弿绾?,"鍏跺畠鎶€宸?,"闅忔満鍖?,"浣嶈繍绠?,"鏋勯€?,"琛屽垪寮?,"鐗瑰緛鍊?,"鍒嗘暟瑙勫垝","绾挎€ц鍒?,"鍙屾寚閽?two-pointer","Ad-hoc","绗涘崱灏旀爲","鎷熼樀","鏍瑰彿鍒嗘不","妯℃嫙璐圭敤娴?,"鍒嗘暎灞傚彔","鍧囨憡鍒嗘瀽","鍒嗙被璁ㄨ","杩戜技绠楁硶","绾挎鏍戝垎娌?,"绂荤嚎澶勭悊","bitset","缁勫悎浼樺寲","鏁存暟瑙勫垝","鍘熷瀵瑰伓","鍚彂寮忓悎骞?,"鍙嶆倲璐績","鏈€澶ф祦鏈€灏忓壊瀹氱悊","淇濆簭鍥炲綊"],"source":["鍚勭渷鐪侀€?,"闆嗚闃熶簰娴?,"绂忓缓鐪佸巻灞婂浠よ惀","NOI","NOIP 鏅強缁?,"NOIP 鎻愰珮缁?,"APIO","NOI 瀵煎垔","CTT锛堟竻鍗庨泦璁?鍖楀ぇ闆嗚锛?,"缃戠粶娴佷笌绾挎€ц鍒?24 棰?,"CSP-S 鎻愰珮绾?,"CSP-J 鍏ラ棬绾?,"NOI Online","Ynoi","NOI 绯诲垪璧涗簨","缁忓吀濂楅","鍥介檯鐭ュ悕璧涗簨","WC","CTSC/CTS","妯℃澘棰?,"USACO","POI锛堟尝鍏帮級","IOI","CCO锛堝姞鎷垮ぇ锛?,"CCC锛堝姞鎷垮ぇ锛?,"CEOI锛堜腑娆э級","eJOI锛堟娲诧級","COCI锛堝厠缃楀湴浜氾級","BalticOI锛堟尝缃楃殑娴凤級","JOI锛堟棩鏈級","AGM","PA锛堟尝鍏帮級","ROI锛堜縿缃楁柉锛?,"EGOI锛堟娲?濂崇敓锛?,"NOISG锛堟柊鍔犲潯锛?,"NordicOI锛堝寳娆э級","BalkanOI锛堝反灏斿共鍗婂矝锛?,"KOI锛堥煩鍥斤級","RMI锛堢綏椹凹浜氾級","COI锛堝厠缃楀湴浜氾級","娲涜胺鍘熷垱","ICPC","娲涜胺鏈堣禌","璇█鏈堣禌","娲涜胺姣旇禌","澶у绔炶禌","ROIR锛堜縿缃楁柉锛?,"INOI锛堜紛鏈楋級","UOI锛堜箤鍏嬪叞锛?,"JOISC/JOIST锛堟棩鏈級","COTS锛堝厠缃楀湴浜氾級","Google Code Jam","Moscow Olympiad","PO锛堢憺鍏革級","PAIO","MCC/MCO锛堥┈鏉ヨタ浜氾級","KTSC锛堥煩鍥斤級","IATI锛堜繚鍔犲埄浜?涓滄锛?,"Google Kick Start","鍏ラ棬璧?,"钃濇ˉ鏉浗璧?,"钃濇ˉ鏉渷璧?,"鐪佽禌/閭€璇疯禌","浼犳櫤鏉?,"THUPC","GESP","鍏朵粬绔炶禌","THUSC","楂樻牎鏍¤禌","THUWC","CSP-X 灏忓缁?,"Code+","姊︾唺姣旇禌","淇℃伅涓庢湭鏉?,"绉戝垱娲诲姩","BCSP-X","灏忓娲诲姩","鍒濅腑娲诲姩","CSPro","CCPC","绉戝ぇ鍥藉垱鏉?,"钃濇ˉ鏉潚灏戝勾缁?],"time":["1996","1997","1998","1999","2000","2001","2002","2003","2004","2005","2006","2007","2008","2009","2010","2011","2012","2013","2014","2015","2016","2017","2018","2019","2020","2021","2022","2023","2024","2025","2026","2027","2028","2029","2077","2078","2079"],"region":["閲嶅簡","鍥涘窛","娌冲崡","娴欐睙","涓婃捣","绂忓缓","姹熻嫃","瀹夊窘","婀栧崡","鍖椾含","娌冲寳","骞夸笢","灞变笢","鍚夋灄","灞辫タ","姹熻タ","璐靛窞","骞胯タ","闄曡タ","鍥藉唴鐪佸競","杈藉畞","浜戝崡","澶╂触","婀栧寳","榛戦緳姹?,"娴峰崡","鐢樿們","闈掓捣","鍙版咕","鍐呰挋鍙?,"瑗胯棌","瀹佸","鏂扮枂","棣欐腐","婢抽棬","娴庡崡","鍗椾含","闈掑矝","鍥藉唴璧涚珯","EC Final","鍥介檯璧涘尯","NERC/NEERC","SEERC","CERC","NWRRC","WF","NAC","鏉窞","鏄嗘槑","瑗垮畨","鍝堝皵婊?,"棣栧皵","妯禍","SWERC","鎴愰兘","闆呭姞杈?],"special":["浜や簰棰?,"鎻愪氦绛旀","Special Judge","O2浼樺寲","閫氫俊棰?]};
//==UI==
/* =====================================================================
   浜屻€佺姸鎬佷笌瀛樻。
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
let theme=lsGet('oi_theme')==='dark'?'dark':'light';      // 榛樿娴呰壊
function applyTheme(){document.documentElement.setAttribute('data-theme',theme)}
applyTheme();
function ssGet(k){try{return sessionStorage.getItem(k)}catch(e){return null}}
function ssSet(k,v){try{sessionStorage.setItem(k,v)}catch(e){}}
function ssDel(k){try{sessionStorage.removeItem(k)}catch(e){}}
/* 杩涘害锛歶nl[t] 涓哄悇澶ч毦搴﹀凡瑙ｉ攣鐨勬渶楂樼骇鍒紙0~10锛夈€備笁涓ぇ闅惧害鐨勮繘闃?0 涓€寮€濮嬪嵆瑙ｉ攣 */
let prog=(()=>{let p=null;try{p=JSON.parse(lsGet(LS_PROG))}catch(e){}
  if(p&&Array.isArray(p.unl)&&p.unl.length===3)return{unl:p.unl,best:p.best||{},cleared:p.cleared||{}};
  if(p&&typeof p.unlocked==='number')return{unl:[0,1,2].map(t=>Math.max(0,Math.min(10,p.unlocked-t*11))),best:p.best||{},cleared:p.cleared||{}};
  return{unl:[0,0,0],best:{},cleared:{}}})();
/* 娴嬭瘯妯″紡锛氬彛浠ゅ彧鍦ㄦ湰椤甸潰鏍￠獙锛堝苟闈炵湡姝ｇ殑瀹夊叏鏈哄埗锛夛紝寮€鍚悗鎵€鏈夐毦搴﹀紑鏀撅紝涓斾笉鍐欏叆鐪熷疄杩涘害 */
let testMode=ssGet('oi_test')==='1',testAsk=false,testErr='',testDetOpen=true;
const TPW=[1695867148,2200767075];
const testPwOk=p=>hashStr('oi-spire-test|'+p)===TPW[0]&&hashStr('灏栧|'+p+'|II')===TPW[1];
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
  if(!validArchiveProgress(progress))throw new Error('瑙ｉ攣杩涘害鏃犳晥锛屾棤娉曠敓鎴愬瓨妗?);
  let copy=data.run?JSON.parse(JSON.stringify(data.run)):null;
  if(copy){
    if(copy.mp||copy.over||copy.victory)throw new Error('澶氫汉銆佸凡缁撴潫鐨勫灞€涓嶆斁鍏ュ崟浜哄瓨妗?);
    const c=copy.room&&copy.room.combat;
    if(c&&c.started&&!c.done){
      const rem=remainingMs(data.run.room.combat);
      if(!Number.isFinite(rem))throw new Error('鎴樻枟璁℃椂鐘舵€佹棤鏁堬紝鏃犳硶瀛樻。');
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
  if(!code.startsWith(SAVE_PREFIX))throw new Error('瀛樻。瀛楃涓叉牸寮忎笉姝ｇ‘');
  if(code.length>1000000)throw new Error('瀛樻。鏂囦欢杩囧ぇ');
  const b64=code.slice(SAVE_PREFIX.length).replace(/-/g,'+').replace(/_/g,'/');
  const binary=atob(b64+'='.repeat((4-b64.length%4)%4)),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  const data=JSON.parse(new TextDecoder().decode(bytes));
  if(!data||data.format!=='oi-spire-save'||![1,2].includes(data.version)||!Object.prototype.hasOwnProperty.call(data,'run'))
    throw new Error('涓嶆敮鎸佹鐗堟湰鐨勫瓨妗?);
  const progress=data.version===2?data.progress:JSON.parse(JSON.stringify(prog));
  if(!validArchiveProgress(progress))throw new Error('瀛樻。涓殑瑙ｉ攣杩涘害鏃犳晥');
  const r=data.run;
  if(r!==null){
    if(!r||r.v!==5)throw new Error('涓嶆敮鎸佹鐗堟湰鐨勫灞€瀛樻。');
    if(r.mp||r.over||r.victory)throw new Error('璇ュ瓨妗ｄ笉鏄彲鎭㈠鐨勫崟浜鸿繘琛屼腑瀛樻。');
    if(r.test&&!testMode)throw new Error('娴嬭瘯妯″紡瀛樻。闇€瑕佸厛寮€鍚祴璇曟ā寮?);
    if(typeof r.seed!=='string'||r.seed.length>20||!Number.isInteger(r.gi)||r.gi<0||r.gi>GI_MAX||
      r.tier!==Math.floor(r.gi/11)||r.difficulty!==r.gi%11||!Number.isInteger(r.act)||r.act<1||r.act>3||
      !Number.isFinite(r.hp)||!Number.isFinite(r.maxHp)||!Number.isFinite(r.gold)||
      !Array.isArray(r.relics)||r.relics.some(id=>!Object.prototype.hasOwnProperty.call(RELICS,id))||
      !Array.isArray(r.potions)||r.potions.some(id=>!Object.prototype.hasOwnProperty.call(POTIONS,id))||
      !Array.isArray(r.pending)||r.pending.some(id=>!Object.prototype.hasOwnProperty.call(POTIONS,id))||
      !r.map||typeof r.map!=='object'||!r.map.ancient||!Array.isArray(r.map.draw)||
      !r.visited||typeof r.visited!=='object'||!r.stats||typeof r.stats!=='object')
      throw new Error('瀛樻。鍐呭鏃犳晥鎴栧凡鎹熷潖');
    if(r.custom&&typeof r.custom!=='object')throw new Error('鑷畾涔夊瓨妗ｅ唴瀹规棤鏁?);
    if(r.room){
      const kinds=['monster','elite','boss','ancient','shop','rest','treasure','event'];
      const phases=['prep','fight','won','choose','result','open'];
      if(typeof r.room!=='object'||!kinds.includes(r.room.kind)||!r.room.node||
        !Number.isFinite(r.room.node.r)||!Number.isFinite(r.room.node.c)||!phases.includes(r.room.phase))
        throw new Error('瀛樻。涓殑褰撳墠鍏冲崱鏃犳晥');
      if(['monster','elite','boss'].includes(r.room.kind)&&
        (!r.room.combat||typeof r.room.combat!=='object'||!Number.isFinite(r.room.combat.graceMs)||
        !Number.isFinite(r.room.combat.extraMs)||typeof r.room.combat.started!=='boolean'||typeof r.room.combat.done!=='boolean'))
        throw new Error('瀛樻。涓殑鎴樻枟鐘舵€佹棤鏁?);
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
  return `<div class="modal-bg"><div class="modal"><h2>娓告垙杩涘害瀛樻。</h2>
    <p class="dim" style="margin:0">瀛樻。鍖呭惈宸茶В閿佽繘搴︼紝浠ュ強褰撳墠杩涜涓殑鍗曚汉瀵瑰眬锛堝鏋滄湁锛夈€傚鍏ヤ細淇濈暀浣犲凡鏈夌殑鏇撮珮瑙ｉ攣杩涘害锛涘惈瀵瑰眬鐨勫瓨妗ｄ細鎭㈠鍒颁繚瀛樻椂鐨勭姸鎬佸拰鍓╀綑鎴樻枟鏃堕棿銆?/p>
    ${hint}<textarea id="saveArchiveText" spellcheck="false" placeholder="绮樿创 OISP2: 寮€澶寸殑瀛樻。瀛楃涓?>${esc(saveCode)}</textarea>
    <div class="row"><button data-a="copyArchive">澶嶅埗瀛楃涓?/button><button data-a="downloadArchive">涓嬭浇瀛樻。鏂囦欢</button><label class="row">璇诲彇瀛樻。鏂囦欢 <input type="file" id="saveArchiveFile" accept=".oisave,.txt"></label></div>
    <div class="row"><button class="primary" data-a="importArchive">瀵煎叆瀛樻。</button><button data-a="closeArchive">鍏抽棴</button></div>
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
  const fallback=()=>{const el=document.createElement('textarea');el.value=text;el.setAttribute('readonly','');el.style.position='fixed';el.style.opacity='0';document.body.appendChild(el);el.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}el.remove();toast(ok?'瀛樻。瀛楃涓插凡澶嶅埗':'澶嶅埗澶辫触锛岃鎵嬪姩閫夋嫨瀛樻。瀛楃涓?)};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(()=>toast('瀛樻。瀛楃涓插凡澶嶅埗')).catch(fallback);
  else fallback();
}
function runModeName(mode){
  return ({practice:'no-timer practice',list:'fixed-list challenge',team_race:'team race',custom:'custom'})[mode]||'standard';
}
function historyRuns(){try{const h=JSON.parse(lsGet(LS_HISTORY));return Array.isArray(h)?h:[]}catch(e){return[]}}
function finishRun(){
  if(!run||run.historySaved)return;
  run.historySaved=true;
  const duration=Math.max(0,Math.floor((Date.now()-(run.stats.startedAt||Date.now()))/1000));
  const row={seed:String(run.seed),gi:run.gi,tier:run.tier||0,difficulty:run.difficulty,mode:run.mode||'standard',
    result:run.victory?'win':'loss',act:run.act||1,floor:run.pos?run.pos.r+1:0,duration,
    wins:run.stats.wins||0,drain:run.stats.drain||0,at:Date.now()};
  const history=historyRuns();history.unshift(row);lsSet(LS_HISTORY,JSON.stringify(history.slice(0,20)));
  lsDel(LS_RUN);lsDel(LS_MPRUN);
  if(lsGet(LS_STATS_CONSENT)==='1')submitDifficultyStats(row);
}
async function submitDifficultyStats(row){
  telemetryMsg='Submitting opted-in anonymous difficulty stats鈥?;render();
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
   涓夈€佺埇濉旀祦绋?   ===================================================================== */
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
  if(!custom&&!isUnlocked(gi)){toast('璇ヨ繘闃跺皻鏈В閿?);return}
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
function resolveUnknown(rr){const v=rr();return v<0.22?'monster':v<0.32?'shop':v<0.42?'treasure':'event'}
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
  const rm=run.room,n=rm.node,is棣栭=rm.kind==='boss';
  let next='vote';
  if(rm.kind==='ancient'){
    run.map.ancient.done=true;run.room=null;save();render();
    if(isMP())netSend({t:'done',next:'vote'});
    return;
  }
  run.pos={r:n.r,c:n.c};run.visited[n.r+','+n.c]=1;run.room=null;
  if(is棣栭){
    if(run.act<3){
      const pr=PR();
      run.hp=Math.min(run.maxHp,run.hp+Math.round((run.maxHp-run.hp)*pr.actHeal));
      run.act++;startAct();next='ancient';toast('杩涘叆 '+STAGE_NAMES[run.act-1]);
    }else if(run.difficulty===10&&n.r===ROWS){
      toast('绗簩浣嶉棰?鍑虹幇浜嗭紝娌℃湁鍠樻伅鐨勬満浼氥€?);
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
  if(addPotion(id))return '鑾峰緱鑽按锛?+POTIONS[id].n+'銆?;
  (run.pending=run.pending||[]).push(id);
  return '鑽按鏍忓凡婊★紝銆?+POTIONS[id].n+'銆嶆殏瀛樺湪椤堕儴鐨勫緟鍙栧锛堝厛涓㈠純鎴栫敤鎺変竴鐡讹紝鍐嶇偣銆屾敹鍏ャ€嶏級銆?;
}
function takePending(i){const id=(run.pending||[])[i];if(!id)return;if(!addPotion(id)){toast('鑽按鏍忎粛鐒舵槸婊＄殑');return}run.pending.splice(i,1);save();render()}
function dropPending(i){(run.pending||[]).splice(i,1);save();render()}
function damage(base,boss){
  const pr=PR();
  const d=base*(1+0.15*(run.act-1))*pr.failMult*(boss?pr.bossFailMult:1)*Math.max(0.3,1+E('failMult'));
  return Math.round(d);
}
function heal(n){const b=run.hp;run.hp=Math.min(run.maxHp,run.hp+n);return run.hp-b}

/* ---------- 鎴樻枟 ---------- */
const cb=()=>run&&run.room&&run.room.combat;
const GRACE={monster:20,elite:40,boss:60};
const GRACE_PROVINCIAL={monster:60,elite:90,boss:120};
const graceOf=k=>run.custom?run.custom.kinds[k].grace:((run.tier||0)===2?GRACE_PROVINCIAL[k]:GRACE[k]);      // 鏃堕檺锛堝垎閽燂級
const DRAIN={monster:10,elite:10,boss:20};      // 瓒呮椂鍚庢瘡 5 鍒嗛挓鎵ｈ锛堝熀纭€鍊硷級
const tickMs=k=>((run.custom?run.custom.kinds[k||run.room.kind].tick:5)+E('tickMin')+(run.actTick||0))*60000;
const remainingMs=c=>c.graceMs+c.extraMs-(Date.now()-c.startAt);   // 璺濇椂闄愮粨鏉燂紝璐熸暟琛ㄧず宸茶秴鏃?function drainDmg(c,kind){
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
    if(!rm.problem){toast('璇峰厛閫夊畾棰樼洰锛屽啀寮€濮?VJudge 楠岃瘉璁℃椂');return}
    c.vjStarting=true;render();
    try{
      const data=await vjPost('/api/vjudge/start',{token:vjBinding.token,pid:rm.problem.pid});
      if(run!==r||r.room!==rm||rm.combat!==c)return;
      c.vjBattleId=data.battleId;c.vjStartedAt=data.startedAt;
    }catch(e){
      if((e.message||'').includes('缁戝畾宸插け鏁?))vjForgetBinding();
      if(run===r&&r.room===rm){c.vjStarting=false;render();toast('鏃犳硶寮€濮?VJudge 楠岃瘉锛?+(e.message||'璇锋眰澶辫触'))}
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
      if(E('revive')&&!run.reviveUsed){run.reviveUsed=true;run.hp=Math.ceil(run.maxHp/2);toast('娑呮涔嬬窘閲嶇噧锛屼綘閲嶆柊绔欎簡璧锋潵銆?)}
      else run.over=true;
    }
  }
  if(hit>0){
    toast(run.over?'鐢熷懡鑰楀敖鈥︹€?:'瓒呮椂鎵ｈ -'+hit);save();
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
  if(def.combat&&!(c&&c.started&&!c.done)){toast('杩欑摱鑽按鍙兘鍦ㄦ垬鏂楄鏃朵腑浣跨敤');return}
  let msg='';const ph=E('potionHeal');
  if(id==='coffee'){c.extraMs+=10*60000;msg='鏃堕檺 +10 鍒嗛挓'}
  else if(id==='espresso'){c.extraMs+=20*60000;msg='鏃堕檺 +20 鍒嗛挓'}
  else if(id==='bandage'){msg='鍥炲 '+heal(15+ph)+' 鐐圭敓鍛?}
  else if(id==='heal'){msg='鍥炲 '+heal(25+ph)+' 鐐圭敓鍛?}
  else if(id==='bigheal'){msg='鍥炲 '+heal(50+ph)+' 鐐圭敓鍛?}
  else if(id==='vital'){run.maxHp+=6;run.hp+=6;msg='鏈€澶х敓鍛?+6'}
  else if(id==='guard'){c.guard=(c.guard||0)+10;msg='鏈満瓒呮椂姣忔鎵ｈ -10'}
  else if(id==='insure'){c.insured=true;msg='鏈満涓嶅啀鍙楄秴鏃舵墸琛€'}
  else if(id==='partial'){c.partial=true;msg='鏈満瓒呮椂鎵ｈ鍑忓崐'}
  else if(id==='lucky'){c.lucky=true;msg='鏈満閲戝竵缈诲€?}
  else if(id==='fullheal'){msg='鍥炲 '+heal(100+ph)+' 鐐圭敓鍛?}
  else if(id==='timewarp'){c.extraMs+=30*60000;msg='鏃堕檺 +30 鍒嗛挓'}
  else if(id==='recover'){c.extraMs+=5*60000;msg='鍥炲 '+heal(20+ph)+' 鐐圭敓鍛斤紝鏃堕檺 +5 鍒嗛挓'}
  else if(id==='greed'){run.gold+=120;msg='鑾峰緱 120 閲戝竵'}
  else if(id==='tonic'){run.maxHp+=12;run.hp+=12;msg='鏈€澶х敓鍛?+12'}
  else if(id==='chosen'){const x=randRelic(Math.random,run.relics);if(x){gainRelic(x);msg='鑾峰緱閬楃墿锛?+RELICS[x].n}else msg='宸叉嫢鏈夊叏閮ㄩ仐鐗?}
  run.potions.splice(i,1);toast(def.n+'锛?+msg);save();render();
}
function dropPotion(i){run.potions.splice(i,1);save();render()}

/* ---------- 鍟嗗簵 ---------- */
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
  if(it.t==='potion'&&run.potions.length>=slotCount()){toast('鑽按鏍忓凡婊?);return}
  run.gold-=it.price;it.sold=true;
  if(it.t==='relic')gainRelic(it.id);
  else if(it.t==='potion')addPotion(it.id);
  else if(it.t==='heal')heal(20);
  else if(it.t==='maxhp'){run.maxHp+=6;run.hp+=6}
  save();render();
}

/* ---------- 浼戞伅 / 瀹濈 / 浜嬩欢 ---------- */
function rest(kind){
  const rm=run.room;
  if(kind==='sleep'){const n=heal(Math.round(run.maxHp*PR().restPct)+E('restHeal'));const mx=E('restMaxHp');if(mx)gainMax(mx);rm.result='灏忔啯鐗囧埢锛屽洖澶?'+n+' 鐐圭敓鍛姐€?+(mx?'鏈€澶х敓鍛?+'+mx+'銆?:'')}
  else if(kind==='drill'){run.nextFightMs+=10*60000;rm.result='浣犳俯涔犱簡鍑犻亾鏃ч銆備笅涓€鍦烘垬鏂楁椂闄?+10 鍒嗛挓銆?}
  else{const k=1+(E('restPotion')||0);rm.result=Array.from({length:k},()=>givePotion(randPotion(Math.random))).join(' ')}
  rm.phase='result';save();render();
}
function openChest(){
  const rm=run.room,rr=rngFor(run.seed,'tc'+nodeKey(rm.node));
  const v=rr();const id=randRelic(rr,run.relics,v<0.15?'rare':v<0.5?'uncommon':'common')||randRelic(rr,run.relics);
  const g=ri(rr,25,40)+E('chestGold');run.gold+=g;
  if(id)gainRelic(id);
  rm.result=(id?'瀹濈閲屾湁閬楃墿銆?+RELICS[id].n+'銆嶏紝'+RELICS[id].d+' ':'')+'鍙﹀鑾峰緱 '+g+' 閲戝竵銆?;
  rm.phase='result';save();render();
}
const hurt=n=>{run.hp=Math.max(1,run.hp-n)};
const gainMax=n=>{run.maxHp+=n;run.hp+=n};
const gainR=(r,rar)=>{const x=randRelic(r,run.relics,rar)||randRelic(r,run.relics);if(x){gainRelic(x);return '鑾峰緱閬楃墿銆?+RELICS[x].n+'銆嶃€?}return '宸茬粡娌℃湁鍙緱鐨勯仐鐗╀簡銆?};
const gainP=(r,id)=>givePotion(id||randPotion(r));
/* 浜嬩欢锛歡ood 涓哄悏浜嬶紱mixed 甯︽湁椋庨櫓鎴栦唬浠枫€傞€夐」閲?need 涓烘墍闇€閲戝竵锛宯eedPot 闇€瑕佽嚦灏戜竴鐡惰嵂姘达紝needHp 闇€瑕佺敓鍛介珮浜庤鍊?*/
const EVENTS=[
  /* ---- 鍚変簨 ---- */
  {id:'rain',kind:'good',title:'瀵瑰紙',text:'闆ㄨ惤妾愬墠锛屼竴浣嶈€佽€呭湪浜腑鐙嚜瀵瑰紙锛屾姮鎵嬮個浣犲悓鍧愩€?,opts:[
    {t:'瑙傛涓嶈锛堟帴涓嬫潵 3 鍦烘垬鏂楁椂闄?+8 鍒嗛挓锛?,f:()=>{run.fightBoon=3;run.fightBonusMin=8;return '鎺ヤ笅鏉?3 鍦烘垬鏂楁椂闄?+8 鍒嗛挓銆?}},
    {t:'钀藉瓙瀵瑰紙锛堟渶澶х敓鍛?+6锛?,f:()=>{gainMax(6);return '涓€灞€缁堜簡锛屾渶澶х敓鍛?+6銆?}}]},
  {id:'senior',kind:'good',title:'绁炵瀛﹂暱',text:'澶氬勾鍓嶇殑甯堝厔浠庡北閬撲笂璧版潵锛岀湅浜嗙湅浣犵殑琛屽泭锛岀瑧鐫€閫掕繃涓€鍙摲鐡躲€?,opts:[
    {t:'鏀朵笅鑽按',f:r=>gainP(r)},
    {t:'璇风泭瑙ｆ儜锛堟渶澶х敓鍛?+5锛?,f:()=>{gainMax(5);return '鏈€澶х敓鍛?+5銆?}}]},
  {id:'garden',kind:'good',title:'鑽按鎽?,text:'鑽渻涓讳汉鏅剧潃涓ゅ懗鏂扮偧鐨勮嵂姘达紝璇存湁缂樿€呭彲浠诲彇鍏朵竴銆?,opts:null,dyn:r=>{
    const a=randPotion(r),b=randPotion(r);
    return [a,b].map(id=>({t:'鍙栥€?+POTIONS[id].n+'銆嶏細'+POTIONS[id].d,f:()=>givePotion(id)}))}},
  {id:'teahouse',kind:'good',title:'鍜栧暋搴?,text:'鎺屾煖璁ゅ嚭浜嗕綘锛岃浠婃棩澶翠竴鏉尪锛屼笉鏀堕噾甯併€?,opts:[
    {t:'甯﹁蛋涓€鏉挅鍟?,f:()=>givePotion('coffee')},
    {t:'鍧愪笅姝囪剼锛堝洖澶?20 鐐圭敓鍛斤級',f:()=>'鍥炲 '+heal(20)+' 鐐圭敓鍛姐€?}]},
  {id:'crane',kind:'good',title:'鐧介工',text:'涓€鍙櫧楣ょ珛浜庡涵涓紝姝ご鐪嬬潃浣犮€?,opts:[
    {t:'杞绘姎缇界考锛堝洖澶?12 鐐圭敓鍛斤級',f:()=>'鍥炲 '+heal(12)+' 鐐圭敓鍛姐€?},
    {t:'鎶曞杺楸煎共锛?30 閲戝竵锛屾渶澶х敓鍛?+8锛?,need:30,f:()=>{run.gold-=30;gainMax(8);return '鐧介工娓呭敵涓€澹帮紝鏈€澶х敓鍛?+8銆?}}]},
  {id:'inkwall',kind:'good',title:'鐧芥澘',text:'鐭冲涓婄暀鐫€鍓嶄汉鏈摝鐨勬帹婕旓紝瀛楄抗渚濇棫娓呮櫚銆?,opts:[
    {t:'鍑濈缁嗚锛堟帴涓嬫潵 3 鍦烘垬鏂楁椂闄?+8 鍒嗛挓锛?,f:()=>{run.fightBoon=3;run.fightBonusMin=8;return '鎺ヤ笅鏉?3 鍦烘垬鏂楁椂闄?+8 鍒嗛挓銆?}},
    {t:'鎷撳嵃甯﹁蛋锛?90 閲戝竵锛?,f:()=>{run.gold+=90;return '鑾峰緱 90 閲戝竵銆?}}]},
  {id:'teacher',kind:'good',title:'闆嗚闃熸暀缁?,text:'鎭╁笀缈荤湅浜嗕綘杩戞潵鐨勭瑪璁帮紝閫掔粰浣犱竴浠戒慨涔犱箣娉曘€?,opts:[
    {t:'渚濇硶淇範锛堟渶澶х敓鍛?+6锛?,f:()=>{gainMax(6);return '鏈€澶х敓鍛?+6銆?}},
    {t:'鎹竴鍙ぇ琛屽泭锛堣嵂姘存爮浣?+1锛?,f:()=>{run.extraSlots=(run.extraSlots||0)+1;return '鑽按鏍忎綅 +1銆?}}]},
  {id:'merchant',kind:'good',title:'璧炲姪鍟?,text:'涓€浣嶈豹鍟嗙湅涓簡浣犵殑鍚嶅０锛屾効鎰忓嚭璧勭浉鍔┿€?,opts:[
    {t:'鎺ュ彈璧勫姪锛?200 閲戝竵锛?,f:()=>{run.gold+=200;return '鑾峰緱 200 閲戝竵銆?}},
    {t:'璇蜂粬璧犱竴浠朵俊鐗╋紙缃曡閬楃墿锛?,f:r=>gainR(r,'uncommon')}]},
  {id:'lecture',kind:'good',title:'澶у笀璇?,text:'涓€浣嶉€€闅愮殑鍥芥墜鍦ㄤ功闄㈠紑浜嗕竴鍫傚叕寮€璇俱€?,opts:[
    {t:'鍑濈鑱嗗惉锛堟帴涓嬫潵 5 鍦烘垬鏂楁椂闄?+10 鍒嗛挓锛?,f:()=>{run.fightBoon=5;run.fightBonusMin=10;return '鎺ヤ笅鏉?5 鍦烘垬鏂楁椂闄?+10 鍒嗛挓銆?}},
    {t:'璇惧悗璇锋暀锛堟渶澶х敓鍛?+10锛?,f:()=>{gainMax(10);return '鏈€澶х敓鍛?+10銆?}}]},
  {id:'physician',kind:'good',title:'鏍″尰瀹?,text:'閮庝腑鐪嬩簡鐪嬩綘鐨勮劯鑹诧紝鐨辫捣浜嗙湁銆?,opts:[
    {t:'鎺ュ彈璇婃不锛堝洖婊＄敓鍛斤級',f:()=>'鍥炲 '+heal(run.maxHp)+' 鐐圭敓鍛姐€?},
    {t:'棰嗕竴鍓ˉ鑽紙鏈€澶х敓鍛?+8锛?,f:()=>{gainMax(8);return '鏈€澶х敓鍛?+8銆?}}]},
  {id:'erratum',kind:'good',title:'瀹樻柟鏁版嵁鏈夎',text:'浣犳寚鍑轰簡鍏哥睄閲岀殑涓€澶勮垱璇紝涓讳簨鍚戜綘閮戦噸閬撹阿銆?,opts:[
    {t:'棰嗗彇閰阿锛堟櫘閫氶仐鐗╋級',f:r=>gainR(r,'common')},
    {t:'棰嗗彇璧忛噾锛?100 閲戝竵锛?,f:()=>{run.gold+=100;return '鑾峰緱 100 閲戝竵銆?}}]},
  {id:'elder',kind:'good',title:'鐑績鐨勫甯?,text:'涓€浣嶅墠杈堟妸鑷繁鐢ㄤ笉涓婄殑涓滆タ閮藉缁欎簡浣犮€?,opts:[
    {t:'鏀朵笅鑽按锛? 鐡讹級',f:r=>gainP(r)+' '+gainP(r)},
    {t:'鏀朵笅琛屽泭锛堣嵂姘存爮浣?+1锛?,f:()=>{run.extraSlots=(run.extraSlots||0)+1;return '鑽按鏍忎綅 +1銆?}}]},
  {id:'lostfound',kind:'good',title:'澶辩墿鎷涢',text:'椹块闂ㄥ彛鐨勬湪绠遍噷锛屾湁鍑犳牱涓滆タ鏃犱汉璁ら銆?,opts:[
    {t:'鍙栬蛋涓€浠堕仐鐗?,f:r=>gainR(r,'common')},
    {t:'鍙栬蛋鐜伴摱锛?120 閲戝竵锛?,f:()=>{run.gold+=120;return '鑾峰緱 120 閲戝竵銆?}}]},
  {id:'parcel',kind:'good',title:'闃熷弸鐨勫寘瑁?,text:'鍚岀獥鎵樹汉鎹庢潵涓€鍙寘瑁癸紝閲岄潰鏄负浣犲涓嬬殑琛ョ粰銆?,opts:[
    {t:'鎷嗗紑锛? 鐡惰嵂姘翠笌 50 閲戝竵锛?,f:r=>{run.gold+=50;return '鑾峰緱 50 閲戝竵銆?+gainP(r)+' '+gainP(r)}},
    {t:'鍙彇淇＄墿锛堥殢鏈洪仐鐗╋級',f:r=>gainR(r)}]},
  /* 鏂板鍚変簨锛堟洿寮猴級 */
  {id:'spring',kind:'good',title:'娉夋按',text:'宀╃紳閲屾秾鍑轰竴鐪兼竻娉夛紝姘撮潰娴潃娣℃贰鐨勫厜銆?,opts:[
    {t:'鎺按鑰岄ギ锛堝洖婊＄敓鍛斤紝鏈€澶х敓鍛?+8锛?,f:()=>{run.maxHp+=8;run.hp=run.maxHp;return '鐢熷懡瀹屽叏鎭㈠锛屾渶澶х敓鍛?+8銆?}},
    {t:'鍙栨按甯﹁蛋锛堝ぇ娌荤枟鑽按 脳1锛屾不鐤楄嵂姘?脳2锛?,f:()=>givePotion('bigheal')+' '+givePotion('heal')+' '+givePotion('heal')}]},
  {id:'vault',kind:'good',title:'鍥句功棣?,text:'涔﹂榿鐨勫畧闃佷汉浠婃棩涓嶅湪锛岄棬鎵夎櫄鎺╋紝婊℃灦鍏哥睄钀界潃钖勭伆銆?,opts:[
    {t:'缈婚槄绉樺吀锛堢█鏈夐仐鐗╋級',f:r=>gainR(r,'rare')},
    {t:'鎶勫綍瑕佽瘈锛堟帴涓嬫潵 6 鍦烘垬鏂楁椂闄?+6 鍒嗛挓锛?,f:()=>{run.fightBoon=6;run.fightBonusMin=6;return '鎺ヤ笅鏉?6 鍦烘垬鏂楁椂闄?+6 鍒嗛挓銆?}}]},
  {id:'treasuremap',kind:'good',title:'钘忓疂鍥?,text:'鏃т功澶归〉閲屾帀鍑轰竴寮犳硾榛勭殑鍦板浘锛屽ⅷ杩规寚鍚戜竴澶勪笉杩滅殑鎵€鍦ㄣ€?,opts:[
    {t:'寰浘瀵诲疂锛堢綍瑙侀仐鐗╀笌 80 閲戝竵锛?,f:r=>{run.gold+=80;return '鑾峰緱 80 閲戝竵銆?+gainR(r,'uncommon')}},
    {t:'杞墜鍗栫粰琛屽锛?220 閲戝竵锛?,f:()=>{run.gold+=220;return '鑾峰緱 220 閲戝竵銆?}}]},
  {id:'ancestors',kind:'good',title:'绁為緵',text:'绁犱腑棣欑伀涓嶇粷锛屾鍓嶆憜鐫€鍘嗕唬鍚嶅鐨勭墝浣嶃€?,opts:[
    {t:'涓婇绁嫓锛堝洖澶?10 鐐圭敓鍛斤紱鏈箷鍐呰秴鏃舵瘡娆℃墸琛€ -6锛?,f:()=>{run.actCut=(run.actCut||0)+6;return '鍥炲 '+heal(10)+' 鐐圭敓鍛斤紱鏈箷鍐呰秴鏃舵瘡娆℃墸琛€ -6銆?}},
    {t:'鍙╅鎭锛堟渶澶х敓鍛?+15锛屽洖婊＄敓鍛斤級',f:()=>{run.maxHp+=15;run.hp=run.maxHp;return '鏈€澶х敓鍛?+15锛岀敓鍛藉畬鍏ㄦ仮澶嶃€?}}]},
  {id:'alchemist',kind:'good',title:'鐐奸噾鏈＋',text:'涓€浣嶇偧涓瑰笀姝ｅ畧鐫€涓圭倝锛岃浣犺矾杩囷紝鎶ご閬擄細銆岀紭鍒嗗埌浜嗐€傘€?,opts:[
    {t:'姹備竴鐐変腹锛堝畬鍏ㄦ不鐤楄嵂姘?脳1锛屽ぇ娌荤枟鑽按 脳1锛?,f:()=>givePotion('fullheal')+' '+givePotion('bigheal')},
    {t:'姹備竴鐐夎ˉ鑽紙鏈€澶х敓鍛?+12锛屽苟鍥炲 12 鐐癸級',f:()=>{gainMax(12);return '鏈€澶х敓鍛?+12銆?}}]},
  {id:'oracle',kind:'good',title:'绁炶皶',text:'棣欑儫琚呰涔嬩腑锛屼技鏈変竴閬撹韩褰卞瀭鐩湅浣犮€?,opts:[
    {t:'鍙楀叾鐐瑰寲锛堢█鏈夐仐鐗╋紝鍥炲 20 鐐圭敓鍛斤級',f:r=>gainR(r,'rare')+' 鍥炲 '+heal(20)+' 鐐圭敓鍛姐€?},
    {t:'绁堟眰搴囦綉锛堟帴涓嬫潵 4 鍦烘垬鏂椾笉鍙楄秴鏃舵墸琛€锛?,f:()=>{run.freeFights=(run.freeFights||0)+4;return '鎺ヤ笅鏉?4 鍦烘垬鏂椾笉鍙楄秴鏃舵墸琛€銆?}}]},
  /* ---- 鍑跺悏鍙傚崐 ---- */
  {id:'night',kind:'mixed',title:'鍗婂鐨勭伒鎰?,text:'涓夋洿鏃跺垎锛屼綘蹇界劧鐪嬫噦浜嗕竴绫婚鐨勬湰璐紝鍙槑鏃ヨ繕瑕佽刀璺€?,opts:[
    {t:'绉夌儧杈炬棪锛?10 鐢熷懡锛岀綍瑙佹垨绋€鏈夐仐鐗╋級',needHp:10,f:r=>{hurt(10);return '鎹熷け 10 鐐圭敓鍛姐€?+gainR(r,r()<0.3?'rare':'uncommon')}},
    {t:'灏辨瀹夋瓏锛堝洖澶?15 鐐圭敓鍛斤級',f:()=>'鍥炲 '+heal(15)+' 鐐圭敓鍛姐€?}]},
  {id:'postal',kind:'mixed',title:'璇勬祴鏈哄崱姝?,text:'浣犳姇閫掔殑鏂囦功宸插湪鍟嗗簵鍘嬩簡璁镐箙锛屼粛鏃犲洖闊炽€?,opts:[
    {t:'鍐嶉€掍竴娆★紙50%锛?130 閲戝竵锛?0%锛?12 鐢熷懡锛?,f:r=>{if(r()<0.5){run.gold+=130;return '缁堜簬鏈変簡鍥為煶锛岃幏寰?130 閲戝竵銆?}hurt(12);return '椹块┈鍙堣浜嗘椂杈帮紝鎹熷け 12 鐐圭敓鍛姐€?}},
    {t:'鐓尪闈欏€欙紙鍥炲 5 鐐圭敓鍛斤級',f:()=>'鍥炲 '+heal(5)+' 鐐圭敓鍛姐€?}]},
  {id:'market',kind:'mixed',title:'浜ゆ槗鍖?,text:'鏈変汉鍘嬩綆澹伴煶璇达紝浠栨墜閲屾湁涓€浠跺ソ涓滆タ锛岃浠?60 閲戝竵銆?,opts:[
    {t:'涔颁笅锛?60 閲戝竵锛岀綍瑙侀仐鐗╋級',need:60,f:r=>{run.gold-=60;return gainR(r,'uncommon')}},
    {t:'涓€绗戣€岃繃',f:()=>'浣犳病鏈夌悊浼氥€?}]},
  {id:'duel',kind:'mixed',title:'鎿傚彴',text:'绌哄湴涓婃惌浜嗘搨鍙帮紝鏈変汉楂樺０鍙樀锛岃儨鑰呮湁璧忋€?,opts:[
    {t:'涓婂彴搴旀垬锛?0%锛?110 閲戝竵锛?0%锛?15 鐢熷懡锛?,f:r=>{if(r()<0.6){run.gold+=110;return '浣犳妧楂樹竴绛癸紝鑾峰緱 110 閲戝竵銆?}hurt(15);return '鎯滆触涓€鎷涳紝鎹熷け 15 鐐圭敓鍛姐€?}},
    {t:'琚栨墜瑙傛垬',f:()=>'浣犳妸绮惧姏鐣欑粰浜嗘浜嬨€?}]},
  {id:'mock',kind:'mixed',title:'鏍″唴妯℃嫙璧?,text:'鍚岀獥涓存椂鍑戜簡涓€鍦烘ā鎷燂紝鍚嶆闈犲墠鑰呮湁濂栥€?,opts:[
    {t:'鍙傚姞锛?10 鐢熷懡锛?100 閲戝竵骞跺緱涓€鐡惰嵂姘达級',needHp:10,f:r=>{hurt(10);run.gold+=100;return '鎹熷け 10 鐐圭敓鍛斤紝鑾峰緱 100 閲戝竵銆?+gainP(r)}},
    {t:'涓嶅弬鍔?,f:()=>'浣犻€夋嫨涓撳績鍑嗗姝ｈ禌銆?}]},
  {id:'blackout',kind:'mixed',title:'鏈烘埧鍋滅數',text:'涓€闃甸杩囷紝婊″眿鐑涚伀灏界伃锛屼綘鐨勬枃绋胯繕鎽婂湪妗屼笂銆?,opts:[
    {t:'鍑洪棬涔扮伅娌癸紙-20 閲戝竵锛屽洖澶?20 鐐圭敓鍛斤級',need:20,f:()=>{run.gold-=20;return '鑺变簡 20 閲戝竵锛屽洖澶?'+heal(20)+' 鐐圭敓鍛姐€?}},
    {t:'鎽搁粦缁啓锛?6 鐢熷懡锛岃幏寰椾竴鐡惰嵂姘达級',f:r=>{hurt(6);return '鎹熷け 6 鐐圭敓鍛姐€?+gainP(r)}}]},
  {id:'charm',kind:'mixed',title:'鏃犺壇鍟嗚穿',text:'涓€涓汉鎮勬倓鍚戜綘鍏滃敭銆屽寘杩囩殑绗﹀拻銆嶏紝寮€浠?100 閲戝竵銆?,opts:[
    {t:'涔颁笅锛?100 閲戝竵锛屼繚闄╄嵂姘?脳2锛?,need:100,f:()=>{run.gold-=100;return givePotion('insure')+' '+givePotion('insure')}},
    {t:'涓炬姤浠栵紙+40 閲戝竵锛?,f:()=>{run.gold+=40;return '瀹樺簻濂栧姳浜嗕綘 40 閲戝竵銆?}}]},
  {id:'provincial',kind:'mixed',title:'鏍″唴閫夋嫈',text:'鎶ュ悕璐?40 閲戝竵锛屾嵁璇村悕鍒楀墠鑼呰€呮湁绁炵濂栬祻銆?,opts:[
    {t:'鎶ュ悕锛?40 閲戝竵锛?5%锛氱綍瑙侀仐鐗╋紝45%锛氳嵂姘达級',need:40,f:r=>{run.gold-=40;if(r()<0.55)return gainR(r,'uncommon');return gainP(r)}},
    {t:'涓嶆姤鍚?,f:()=>'浣犳病鏈夊幓銆?}]},
  {id:'shade',kind:'mixed',title:'瀛﹂暱鐨勫菇鐏?,text:'鍥炲粖灏藉ご绔欑潃涓€涓崐閫忔槑鐨勮韩褰憋紝璇存兂鑰冭€冧綘銆?,opts:[
    {t:'鎺ュ彈鑰冭緝锛?15 鐢熷懡锛屾渶澶х敓鍛?+10锛?,needHp:15,f:()=>{hurt(15);gainMax(10);return '浣犵瓟寰楅鏈夌珷娉曪紝鏈€澶х敓鍛?+10銆?}},
    {t:'濠夋嫆',f:()=>'娈嬪奖鍙逛簡鍙ｆ皵锛屾笎娓愭暎鍘汇€?}]},
  {id:'manuscript',kind:'mixed',title:'绁栦紶浠ｇ爜',text:'浣犵炕鍑轰竴浠藉嚑骞村墠鐨勬墜绋匡紝椤电湁鍐欑潃銆屽嬁鍔紝鑳界敤銆嶃€?,opts:[
    {t:'鐓ф牱瑾婃妱锛?0%锛?160 閲戝竵锛?0%锛?18 鐢熷懡锛?,f:r=>{if(r()<0.5){run.gold+=160;return '灞呯劧鐪熺殑鐏甸獙锛岃幏寰?160 閲戝竵銆?}hurt(18);return '鏃惰繃澧冭縼锛屽弽鍙楀叾绱紝鎹熷け 18 鐐圭敓鍛姐€?}},
    {t:'閲嶆柊瑾婂啓锛?20 閲戝竵锛?,f:()=>{run.gold+=20;return '浣犻噸鏂版暣鐞嗕簡涓€閬嶏紝椤烘墜鎹簡鐐规鼎绗旓紝鑾峰緱 20 閲戝竵銆?}}]},
  {id:'altar',kind:'mixed',title:'绠楁硶绁潧',text:'绁潧涓婂埢鐫€涓€琛屽皬瀛楋細鐚笂鑽按锛屾崲鍙栭仐鐗┿€?,opts:[
    {t:'鐚笂涓€鐡惰嵂姘达紙鎹㈠彇缃曡鎴栫█鏈夐仐鐗╋級',needPot:true,f:r=>{const p=run.potions.pop();const s='鐚嚭銆?+POTIONS[p].n+'銆嶃€?;return s+gainR(r,r()<0.35?'rare':'uncommon')}},
    {t:'杞韩绂诲紑',f:()=>'浣犳病鏈夌瀹冦€?}]},
  {id:'wheel',kind:'mixed',title:'骞歌繍鎶藉',text:'鍩庨棬鍙ｆ憜鐫€涓€鍙僵缁樿浆鐩橈紝涓€娆?30 閲戝竵銆?,opts:[
    {t:'杞竴娆★紙-30 閲戝竵锛?0% 绋€鏈夐仐鐗╋紝60% 涓ょ摱鑽按锛?,need:30,f:r=>{run.gold-=30;if(r()<0.4)return '涓簡澶у锛?+gainR(r,'rare');return gainP(r)+' '+gainP(r)}},
    {t:'涓嶈浆',f:()=>'浣犳病鏈夎璇辨儜銆?}]},
  {id:'allnight',kind:'mixed',title:'閫氬璧跺伐',text:'鎴鍓嶄竴澶滐紝浣犺繕鏈変竴澶ф憺鏂囩瑕侀噸鏂版暣鐞嗐€?,opts:[
    {t:'閫氬杈炬棪锛?20 鐢熷懡锛岀█鏈夐仐鐗╋級',needHp:20,f:r=>{hurt(20);return '鎹熷け 20 鐐圭敓鍛姐€?+gainR(r,'rare')}},
    {t:'鏃╀簺姝囨伅锛堝洖澶?10 鐐圭敓鍛斤級',f:()=>'鍥炲 '+heal(10)+' 鐐圭敓鍛姐€?}]},
  {id:'blackmarket',kind:'mixed',title:'榛戝競',text:'宸峰瓙娣卞鏈変汉浣庡０鎶ヤ环锛氫竴浠剁█缃曡揣锛?50 閲戝竵銆?,opts:[
    {t:'涔颁笅锛?150 閲戝竵锛岀█鏈夐仐鐗╋級',need:150,f:r=>{run.gold-=150;return gainR(r,'rare')}},
    {t:'璧板紑',f:()=>'浣犺浆韬寮€銆?}]},
  {id:'wishpool',kind:'mixed',title:'璁告効姹?,text:'搴櫌閲屾湁涓€鏂瑰皬姹狅紝姹犲簳閾虹潃涓嶅皯閾滈挶銆?,opts:[
    {t:'鎶?50 閲戝竵璁告効锛堝洖婊＄敓鍛斤紝鏈€澶х敓鍛?+5锛?,need:50,f:()=>{run.gold-=50;run.maxHp+=5;run.hp=run.maxHp;return '鐢熷懡瀹屽叏鎭㈠锛屾渶澶х敓鍛?+5銆?}},
    {t:'鎵撴崬鍑犳灇閾滈挶锛?30 閲戝竵锛?5 鐢熷懡锛?,f:()=>{hurt(5);run.gold+=30;return '鑾峰緱 30 閲戝竵锛屾崯澶?5 鐐圭敓鍛姐€?}}]},
  {id:'notebook',kind:'mixed',title:'鏁寸悊绗旇',text:'浣犳暣鐞嗗嚭涓€濂楁彁鍗囨晥鐜囩殑绗旇锛屽彲瑕佷负姝よ€楄垂涓嶅皯蹇冨姏銆?,opts:[
    {t:'鍊炬敞蹇冨姏锛?15 鐢熷懡锛涙湰骞曞唴瓒呮椂姣忔鎵ｈ -5锛?,needHp:15,f:()=>{hurt(15);run.actCut=(run.actCut||0)+5;return '鏈箷鍐呰秴鏃舵瘡娆℃墸琛€ -5銆?}},
    {t:'闅忔墜缈荤炕',f:()=>'娌′粈涔堟敹鑾枫€?}]},
  {id:'clockman',kind:'mixed',title:'娌欐紡鍟嗕汉',text:'鍟嗕汉鎵樼潃涓€鍙紡鍒伙紝璇村畠鑳借鏃堕棿璧板緱鎱竴鐐广€?,opts:[
    {t:'涔颁笅婕忓埢锛?120 閲戝竵锛岃幏寰椼€屾矙婕忋€嶏級',need:120,f:()=>{if(run.relics.includes('clepsydra'))return '浣犲凡缁忔湁杩欎欢閬楃墿浜嗐€?;run.gold-=120;gainRelic('clepsydra');return '鑾峰緱閬楃墿銆屾矙婕忋€嶃€?}},
    {t:'绠椾簡',f:()=>'浣犳病鏈変拱銆?}]},
  /* 鏂板锛堟洿寮猴紝涔熸洿鍑堕櫓锛?*/
  {id:'gambler',kind:'mixed',title:'璧屽満',text:'楠扮泤鍦ㄦ涓婃憞寰楀摋鍝椾綔鍝嶏紝搴勫鎶溂鐪嬩綘锛氥€屾暍涓嶆暍锛熴€?,opts:[
    {t:'鎶间笂 100 閲戝竵锛?0%锛氳耽鍥?280 閲戝竵骞跺緱涓€鐡惰嵂姘达紱50%锛氳鏈棤褰掞級',need:100,f:r=>{run.gold-=100;if(r()<0.5){run.gold+=280;return '楠扮泤涓€寮€锛屼綘璧簡锛佽幏寰?280 閲戝竵銆?+gainP(r)}return '楠扮泤涓€寮€锛岃緭浜嗐€?}},
    {t:'鎺夊ご灏辫蛋',f:()=>'浣犳病鏈夌悊浼氥€?}]},
  {id:'cursedblade',kind:'mixed',title:'閿堣殌涔嬪墤',text:'鍓戣韩閿堣抗鏂戞枒锛屽嵈闅愰殣閫忓嚭瀵掑厜锛屼技鍦ㄥ彫鍞や綘銆?,opts:[
    {t:'鎵у墤鍦ㄦ墜锛?25 鐢熷懡锛岀█鏈夐仐鐗╋紝鏈€澶х敓鍛?+8锛?,needHp:25,f:r=>{hurt(25);gainMax(8);return '鍓戞皵鍏ヤ綋锛屾崯澶?25 鐐圭敓鍛斤紝鏈€澶х敓鍛?+8銆?+gainR(r,'rare')}},
    {t:'涓嶅幓纰板畠',f:()=>'浣犺浆韬寮€銆?}]},
  {id:'bloodpact',kind:'mixed',title:'琛€涔嬪绾?,text:'涓€椤垫硾榛勭殑濂戠害鎽婂湪妗堜笂锛屽ⅷ杩规湭骞诧紝鏃佽竟鏀剧潃涓€鏋氶摱閽堛€?,opts:[
    {t:'婊磋涓哄锛?30 鐢熷懡锛屼袱浠堕仐鐗╋級',needHp:30,f:r=>{hurt(30);return '鎹熷け 30 鐐圭敓鍛姐€?+gainR(r,'uncommon')+' '+gainR(r)}},
    {t:'鎾曟瘉濂戠害',f:()=>'濂戠害鍖栦负鐏扮儸銆?}]},
  {id:'mirror',kind:'mixed',title:'榄旈暅',text:'鍙ら暅钂欑潃涓€灞傞浘锛屼綘浼告墜鎶瑰紑锛岄暅涓殑浜哄嵈鍏堝浣犵瑧浜嗐€?,opts:[
    {t:'鐩磋闀滀腑浜猴紙50%锛氬洖婊＄敓鍛斤紱50%锛?20 鐢熷懡锛?,f:r=>{if(r()<0.5){run.hp=run.maxHp;return '闀滃厜娲楄繃鍏ㄨ韩锛岀敓鍛藉畬鍏ㄦ仮澶嶃€?}hurt(20);return '闀滀腑浜哄喎鍐峰湴鐪嬬潃浣狅紝鎹熷け 20 鐐圭敓鍛姐€?}},
    {t:'钂欎笂闀滈潰',f:()=>'浣犳妸闀滃瓙鐩栦簡璧锋潵銆?}]},
  {id:'innerdemon',kind:'mixed',title:'蹇冮瓟',text:'澶滄繁浜洪潤锛屼綘鍚鑷繁鐨勫０闊冲湪鑰宠竟浣庤銆?,opts:[
    {t:'鐩撮潰蹇冮瓟锛?20 鐢熷懡锛涙渶澶х敓鍛?+10锛屾湰骞曞唴瓒呮椂姣忔鎵ｈ -8锛?,needHp:20,f:()=>{hurt(20);gainMax(10);run.actCut=(run.actCut||0)+8;return '蹇冮瓟婧冩暎锛屾渶澶х敓鍛?+10锛涙湰骞曞唴瓒呮椂姣忔鎵ｈ -8銆?}},
    {t:'閬胯€屼笉瑙侊紙-30 閲戝竵锛?,f:()=>{run.gold=Math.max(0,run.gold-30);return '鐮磋储娑堢伨锛屾崯澶?30 閲戝竵銆?}}]},
  {id:'tycoon',kind:'mixed',title:'澶у瘜缈?,text:'涓€浣嶅法璐炬効浠ラ噸鍒╃浉閭€锛屼絾瑕佷綘鍏堝嚭涓€绗旀湰閽便€?,opts:[
    {t:'鍑鸿祫 200 閲戝竵锛堢█鏈夐仐鐗╀笌 2 鐡惰嵂姘达級',need:200,f:r=>{run.gold-=200;return gainR(r,'rare')+' '+gainP(r)+' '+gainP(r)}},
    {t:'濠夎█璋㈢粷',f:()=>'浣犲瑷€璋㈢粷浜嗐€?}]},
  {id:'rift',kind:'mixed',title:'鏃堕棿瑁傞殭',text:'绌烘皵閲岃寮€涓€閬撶粏缂濓紝缂濋偅澶寸殑鏃堕棿浼间箮娴佸緱寰堟參銆?,opts:[
    {t:'韪忓叆鍏朵腑锛?18 鐢熷懡锛涙帴涓嬫潵 4 鍦烘垬鏂楁椂闄?+15 鍒嗛挓锛?,needHp:18,f:()=>{hurt(18);run.fightBoon=4;run.fightBonusMin=15;return '鎹熷け 18 鐐圭敓鍛斤紱鎺ヤ笅鏉?4 鍦烘垬鏂楁椂闄?+15 鍒嗛挓銆?}},
    {t:'閫€鍚庝竴姝?,f:()=>'缂濋殭缂撶紦鍚堜笂浜嗐€?}]},
  {id:'lots',kind:'mixed',title:'姹傜',text:'搴欓噷鐨勭绛掓憞寰楀摋鍟︿綔鍝嶏紝鎺夊嚭涓€鏀绛俱€?,opts:[
    {t:'鎽囩闂崪锛堜笁鍒嗕箣涓€锛氱█鏈夐仐鐗╋紱涓夊垎涔嬩竴锛?200 閲戝竵锛涗笁鍒嗕箣涓€锛?15 鐢熷懡锛?,f:r=>{const v=r();if(v<1/3)return '涓婁笂绛撅紒'+gainR(r,'rare');if(v<2/3){run.gold+=200;return '涓钩涔嬬锛岃幏寰?200 閲戝竵銆?}hurt(15);return '涓嬩笅绛撅紝鎹熷け 15 鐐圭敓鍛姐€?}},
    {t:'涓嶄俊杩欎簺',f:()=>'浣犵瑧浜嗙瑧锛岃蛋寮€浜嗐€?}]}
];
/* 鍏堝彜涔嬫皯锛氭瘡搴у濉斿簳锛屼笁閫変竴 */
const BOONS=[
  {id:'hp',n:'鐢熷懡娑屽姩',d:'鏈€澶х敓鍛?+15锛屽苟鍥炲 15 鐐广€?,f:()=>{gainMax(15)}},
  {id:'gold',n:'琛屽泭',d:'鑾峰緱 150 閲戝竵銆?,f:()=>{run.gold+=150}},
  {id:'relic',n:'鏃х墿',d:'鑾峰緱涓€浠堕殢鏈烘櫘閫氶仐鐗┿€?,f:r=>gainR(r,'common')},
  {id:'rare',n:'浼犲瀹?,d:'鑾峰緱涓€浠堕殢鏈虹綍瑙佹垨绋€鏈夐仐鐗┿€?,f:r=>gainR(r,r()<0.4?'rare':'uncommon')},
  {id:'potions',n:'鑽按绠?,d:'鑾峰緱 3 鐡堕殢鏈鸿嵂姘淬€?,f:r=>[0,1,2].map(()=>givePotion(randPotion(r))).join(' ')},
  {id:'full',n:'鏁磋寰呭彂',d:'鍥炴弧鐢熷懡锛屾渶澶х敓鍛?+6銆?,f:()=>{run.maxHp+=6;run.hp=run.maxHp}},
  {id:'grace',n:'鍏堝彜鐨勮€愬績',d:'鎺ヤ笅鏉?3 鍦烘垬鏂楁椂闄?+8 鍒嗛挓銆?,f:()=>{run.fightBoon=3;run.fightBonusMin=8}},
  {id:'slot',n:'鎵╁',d:'鑽按鏍忎綅 +1銆?,f:()=>{run.extraSlots=(run.extraSlots||0)+1}},
  {id:'cut',n:'鍧氶煣',d:'鏈箷鍐咃紝瓒呮椂姣忔鎵ｈ -5銆?,f:()=>{run.actCut=(run.actCut||0)+5}},
  {id:'shop',n:'鍟嗕細鎺ㄨ崘淇?,d:'鏈箷鍐咃紝鍟嗗簵浠锋牸 -30%銆?,f:()=>{run.actShopDisc=0.3}},
  {id:'aid',n:'鎬ユ晳鍖?,d:'鑾峰緱澶ф不鐤楄嵂姘翠笌鍒涘彲璐村悇涓€鐡躲€?,f:()=>givePotion('bigheal')+' '+givePotion('bandage')},
  {id:'kit',n:'鎻愮濂楄',d:'鑾峰緱 2 鏉挅鍟″拰涓€鐡堕晣闈欒嵂姘淬€?,f:()=>[givePotion('coffee'),givePotion('coffee'),givePotion('recover')].join(' ')},
  {id:'tick',n:'鍏堝彜鐨勬矙婕?,d:'鏈箷鍐咃紝瓒呮椂鎵ｈ鐨勯棿闅?+2 鍒嗛挓銆?,f:()=>{run.actTick=(run.actTick||0)+2}},
  {id:'free',n:'鍏堝彜鐨勫簢鎶?,d:'鎺ヤ笅鏉?3 鍦烘垬鏂椾笉鍙楄秴鏃舵墸琛€銆?,f:()=>{run.freeFights=(run.freeFights||0)+3}},
  {id:'two',n:'鍙岄噸棣堣禒',d:'鑾峰緱涓や欢闅忔満鏅€氶仐鐗┿€?,f:r=>gainR(r,'common')+' '+gainR(r,'common')},
  {id:'hp2',n:'涓嶆溄涔嬭函',d:'鏈€澶х敓鍛?+30锛屽苟鍥炲 30 鐐广€?,f:()=>{gainMax(30)}},
  {id:'rich',n:'鍏堝彜鐨勫疂搴?,d:'鑾峰緱 250 閲戝竵銆?,f:()=>{run.gold+=250}},
  {id:'heir',n:'绁栦紶绉樺疂',d:'鑾峰緱涓€浠剁█鏈夐仐鐗┿€?,f:r=>gainR(r,'rare')},
  {id:'oath',n:'鍏堝彜涔嬭獡',d:'鏈箷鍐咃紝瓒呮椂姣忔鎵ｈ -8銆?,f:()=>{run.actCut=(run.actCut||0)+8}},
  {id:'elixir',n:'娑呮',d:'鑾峰緱瀹屽叏娌荤枟鑽按涓€鐡讹紝骞跺洖澶?20 鐐圭敓鍛姐€?,f:()=>givePotion('fullheal')+' 鍥炲 '+heal(20)+' 鐐圭敓鍛姐€?}
];
function eventChoose(i){
  const rm=run.room,ev=EVENTS.find(e=>e.id===rm.event);
  const rr=rngFor(run.seed,'ev'+nodeKey(rm.node)+'_'+i);
  const opts=ev.dyn?ev.dyn(rngFor(run.seed,'evd'+nodeKey(rm.node))):ev.opts;
  const o=opts[i];if(!o||(o.need&&run.gold<o.need)||(o.needPot&&!run.potions.length)||(o.needHp&&run.hp<=o.needHp))return;
  rm.result=o.f(rr);
  const eg=E('eventGold');if(eg){run.gold+=eg;rm.result+=' 瀹朵紶鐜変僵锛?'+eg+' 閲戝竵銆?}
  const eh=E('eventHeal');if(eh){rm.result+=' 椋庨搩锛氬洖澶?'+heal(eh)+' 鐐圭敓鍛姐€?}
  rm.phase='result';save();render();
}
function ancientPick(i){
  const rm=run.room,b=BOONS.find(x=>x.id===rm.choices[i]);
  const rr=rngFor(run.seed,'ancb'+run.act+'_'+i);
  const m=b.f(rr);
  rm.result=b.n+'锛?+(m||b.d);rm.phase='result';save();render();
}
function claim(what,idx){
  const rw=run.room.rewards;
  if(what==='potion'&&rw.potion){
    if(!addPotion(rw.potion)){toast('鑽按鏍忓凡婊★細璇峰厛鍦ㄩ《閮ㄤ娇鐢ㄦ垨涓㈠純涓€鐡惰嵂姘?);return}rw.potion=null;
  }else if(what==='relic'&&rw.relic){gainRelic(rw.relic);rw.relic=null}
  else if(what==='choice'){gainRelic(rw.choices[idx]);rw.choices=null}
  else if(what==='skip'){rw.choices=null}
  save();render();
}

/* =====================================================================
   鍥涖€佽仈鏈猴紙WebSocket 鎴块棿锛?   ===================================================================== */
const net={ws:null,connected:false,reconnecting:false,want:null,joinedOnce:false,retry:0,rt:null,lastRx:0,outbox:[],id:null,room:'',host:null,members:{},started:false,config:null,chat:[],err:'',spectate:false,url:'',g:null};
const netActive=()=>!!(net.connected||net.reconnecting);
function getCid(){let c=ssGet('oi_cid');if(!c){c=Array.from({length:14},()=>'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random()*36)]).join('');ssSet('oi_cid',c)}return c}
function defaultWs(){
  if(location.protocol==='http:'||location.protocol==='https:')return (location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws';
  return 'ws://localhost:8787/ws';
}
function myStatus(){
  if(!run)return{st:'鏈紑灞€'};
  const rm=run.room,c=cb();
  const KN={monster:'鏅€氭垬鏂?,elite:'绮捐嫳鎴樻枟',boss:'棣栭鎴樻枟',shop:'鍟嗗簵',rest:'浼戞伅澶?,treasure:'瀹濈',event:'浜嬩欢',ancient:'鍏堝彜涔嬫皯'};
  let st='鍦板浘';
  if(run.victory)st='宸查€氬叧';else if(run.over)st='宸叉浜?;else if(rm)st=KN[rm.kind]||'鍦板浘';
  const loc=rm&&rm.node?rm.node:run.pos;
  return{d:run.difficulty,tier:run.tier||0,act:run.act,floor:loc&&loc.r>=0?loc.r+1:0,pos:loc?{r:loc.r,c:loc.c}:null,hp:run.hp,max:run.maxHp,gold:run.gold,rel:run.relics.length,st,
    rem:(c&&c.started&&!c.done&&!run.over)?remainingMs(c):null,over:run.over,win:run.victory,wins:run.stats.wins};
}
let syncT=0;
function syncStatus(){
  if(!net.connected||!run||syncT)return;
  syncT=setTimeout(()=>{syncT=0;if(net.connected){const s=myStatus();net.members[net.id]&&(net.members[net.id].s=s,net.members[net.id].at=Date.now());netSend({t:'status',s});renderSide()}},250);
}
/* 鍏抽敭娑堟伅鍦ㄦ柇绾挎湡闂村厛瀛樿捣鏉ワ紝閲嶈繛鎴愬姛鍚庤ˉ鍙?*/
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
  let ws;try{ws=new WebSocket(w.url)}catch(e){net.err='鏈嶅姟鍣ㄥ湴鍧€鏃犳晥';dropWant();render();return}
  net.ws=ws;
  ws.onopen=()=>{net.lastRx=Date.now();try{ws.send(JSON.stringify({t:'join',room:w.room,name:w.name,cid:getCid(),vjToken:vjBinding&&vjBinding.token}))}catch(e){}};
  ws.onmessage=ev=>{net.lastRx=Date.now();let m;try{m=JSON.parse(ev.data)}catch(e){return}onNet(m)};
  ws.onerror=()=>{};
  ws.onclose=()=>{if(net.ws!==ws)return;net.ws=null;net.connected=false;linkLost()};
}
function dropWant(){net.want=null;net.reconnecting=false;clearTimeout(net.rt);net.rt=null;ssDel('oi_net')}
function linkLost(){
  if(!net.want){render();return}
  if(!net.joinedOnce){net.err='鏃犳硶杩炴帴鏈嶅姟鍣ㄣ€傝纭宸茶繍琛?node server.js锛屽苟妫€鏌ュ湴鍧€銆?;dropWant();render();return}
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
    if(vjBinding&&!m.vjBound){vjForgetBinding();toast('VJudge 鏈嶅姟鍣ㄧ粦瀹氬凡澶辨晥锛岃閲嶆柊缁戝畾')}
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
    if(!isUnlocked(gi)){net.spectate=true;netSend({t:'spectate'});view='lobby';render();toast('浣犲皻鏈В閿併€?+giName(gi)+'銆嶏紝鏈眬鍙兘瑙傛垬')}
    else if(m.config.mode==='team_race'){net.spectate=false;startRun(gi,m.config.seed,false,null,'team_race');toast('鍥㈤槦绔為€熷紑濮嬶細'+giName(gi)+'锛岀瀛?'+m.config.seed)}
    else{net.spectate=false;startRun(gi,m.config.seed,true);toast('瀵瑰眬寮€濮嬶細'+giName(gi)+'锛岀瀛?'+m.config.seed)}
  }
  else if(m.t==='g'){net.g=m.g;onGUpdate()}
  else if(m.t==='go'){
    if(isMP()&&!run.over&&!run.victory&&!run.room){view='game';enterNode(m.r,m.c)}
  }
  else if(m.t==='lobby'){net.started=false;net.g=null;net.spectate=false;lsDel(LS_MPRUN);if(run&&run.mp){run.mp=false}view='lobby';render()}
  else if(m.t==='finished'){lsDel(LS_MPRUN);toast('鍏ㄩ槦閫氬叧锛?);render()}
  else if(m.t==='wiped'){lsDel(LS_MPRUN);toast('鍏ㄩ槦姝讳骸鈥︹€?);render()}
  else if(m.t==='gift'){
    if(run&&!run.over&&!run.victory){const msg=givePotion(m.potion);toast(m.name+' 閫佹潵浜嗐€?+(POTIONS[m.potion]?POTIONS[m.potion].n:'鑽按')+'銆嶃€?+msg);save();render()}
  }
  else if(m.t==='draw'){
    if(run&&run.map&&run.map.draw&&m.act===run.act&&m.stroke&&Array.isArray(m.stroke.p)){run.map.draw.push({id:m.stroke.id,by:m.from,c:String(m.stroke.c).slice(0,9),p:m.stroke.p});redrawLayer()}
  }
  else if(m.t==='drawundo'){if(run&&run.map&&m.act===run.act){run.map.draw=run.map.draw.filter(x=>x.id!==m.id||x.by!==m.from);redrawLayer()}}
  else if(m.t==='drawclear'){if(run&&run.map&&m.act===run.act){run.map.draw=run.map.draw.filter(x=>x.by!==m.from);redrawLayer()}}
  else if(m.t==='kicked'){
    const ws=net.ws;if(ws){ws.onclose=null;try{ws.close()}catch(e){}}
    dropWant();net.ws=null;net.connected=false;net.started=false;net.err='杩欎釜甯綅宸插湪鍙︿竴涓〉闈㈢櫥褰曪紝鏈〉闈㈠凡閫€鍑烘埧闂淬€?;if(run&&run.mp)run.mp=false;view='lobby';render();
  }
  else if(m.t==='error'){
    net.err=m.msg;toast(m.msg);
    if(!net.connected){const ws=net.ws;if(ws){ws.onclose=null;try{ws.close()}catch(e){}}net.ws=null;dropWant();render()}
  }
}
const cfgGi=cfg=>giOf(Math.max(0,Math.min(TIERS.length-1,cfg.tier||0)),Math.max(0,Math.min(10,cfg.difficulty||0)));
/* 鑱旀満鎴樻枟锛氶鐩€佽鏃跺紑濮嬨€佸仛鍑洪鐩兘鐢辨湇鍔″櫒缁熶竴骞挎挱 */
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
    if(f&&f.started&&rm.phase==='prep'){startCombat();return}                      // 鏈変汉鐐逛簡寮€濮嬶細鍏ㄩ槦鍚屾椂寮€濮嬭鏃?    if(f&&f.won&&rm.phase==='fight'&&!rm.combat.done){winCombat();return}          // 鎵€鏈夐鐩兘琚嚮璐?  }
  if(view==='game')render();else renderSide();
}
function giftPotion(toId){
  const sel=document.getElementById('gift_'+toId);if(!sel||sel.value==='')return;
  const i=+sel.value,id=run.potions[i];if(!id)return;
  run.potions.splice(i,1);netSend({t:'gift',to:toId,potion:id});toast('宸茶禒閫併€?+POTIONS[id].n+'銆?);save();render();
}

/* =====================================================================
   浜斻€佺晫闈㈡覆鏌?   ===================================================================== */
const KIND_NAME={ancient:'鍏堝彜涔嬫皯',monster:'鏅€氭垬鏂?,elite:'绮捐嫳鎴樻枟',boss:'棣栭鎴樻枟',unknown:'鏈煡涔嬪湴',rest:'浼戞伅澶?,shop:'鍟嗗簵',treasure:'瀹濈',event:'浜嬩欢'};
const KIND_GLYPH={ancient:'鍙?,monster:'鎬?,elite:'绮?,boss:'榄?,unknown:'?',rest:'浼?,shop:'搴?,treasure:'瀹?};
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
    else if(view==='rules')$app.innerHTML=rulesHTML();
    else if(view==='select')$app.innerHTML=selectHTML();
    else if(view==='custom')$app.innerHTML=customHTML();
    else if(view==='lobby')$app.innerHTML=lobbyHTML();
    else if(view==='game'&&run)$app.innerHTML=gameHTML();
    else $app.innerHTML=menuHTML();
    if(lgPanel&&view!=='game')$app.insertAdjacentHTML('beforeend',lgPanelHTML());
    if(vjPanel)$app.insertAdjacentHTML('beforeend',vjPanelHTML());
    if(savePanel)$app.insertAdjacentHTML('beforeend',savePanelHTML());
    $app.insertAdjacentHTML('beforeend','<button class="themefab" data-a="theme">'+(theme==='dark'?'娴呰壊妯″紡':'娣辫壊妯″紡')+'</button>');
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

function tierBar(t){let x='';for(let v=t.lo;v<=t.hi;v++)x+=`<i class="sw" style="background:var(--lv${v})"></i>`;return `<span class="swrow">${x}</span> ${LV[t.lo].c} 鈫?${LV[t.hi].c}`}

/* ---------- 鑷畾涔夋ā寮忥細鑷璁惧畾鍚勭被鎴樻枟鐨勬椂闄愩€佽秴鏃舵墸琛€涓庨鐩毦搴︼紝浠ュ強鑻ュ共鍏ㄥ眬鍙傛暟銆備笉璁″叆杩涘害锛屼粎闄愬崟浜?---------- */
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
  return `<div class="wrap"><div class="row" style="margin-bottom:12px"><button data-a="goMenu">杩斿洖</button><h2>鑷畾涔夋ā寮?/h2><span class="spacer"></span>
    <button data-a="custPreset" data-p="easy">瀹芥澗</button><button data-a="custPreset" data-p="normal">榛樿</button><button data-a="custPreset" data-p="hard">涓ヨ嫑</button></div>
  <div class="panel" style="display:flex;flex-direction:column;gap:12px">
    <p class="dim" style="margin:0">鑷璁惧畾鍚勭被鎴樻枟鐨勬椂闄愩€佽秴鏃舵墸琛€涓庨鐩毦搴︼紙娲涜胺闅惧害 0 鏈瘎瀹?~ 7 榛戯級锛屽啀閰嶄笂鑻ュ共鍏ㄥ眬鍙傛暟銆傝嚜瀹氫箟鐨勫灞€涓嶈鍏ヨВ閿佽繘搴︼紝浠呴檺鍗曚汉銆傝秴鏃舵墸琛€濉?0 琛ㄧず涓嶄細鍥犺秴鏃舵帀鐢熷懡銆?/p>
    <div style="overflow-x:auto"><table style="border-collapse:separate;border-spacing:8px 6px">
      <thead><tr class="dim"><th></th><th>鏃堕檺锛堝垎閽燂級</th><th>瓒呮椂闂撮殧锛堝垎閽燂級</th><th>姣忔鎵ｈ锛堢敓鍛斤級</th><th>棰樼洰闅惧害锛?~7锛?/th></tr></thead>
      <tbody>${row('m','鏅€氭垬鏂?)}${row('e','绮捐嫳鎴樻枟')}${row('b','棣栭鎴樻枟')}</tbody></table></div>
    <div class="row" style="gap:10px 20px">
      <label>鍒濆鐢熷懡 ${num('hp',10,9999)}</label><label>鍒濆閲戝竵 ${num('gold',0,99999)}</label><label>鑽按鏍忎綅 ${num('slots',0,10)}</label>
      <label>閲戝竵濂栧姳 % ${num('goldPct',0,1000)}</label><label>鍟嗗簵浠锋牸 % ${num('shopPct',10,1000)}</label>
      <label>浼戞伅澶勫洖澶?% ${num('restPct',0,100)}</label><label>绮捐嫳鍑虹幇鐜?% ${num('eliteW',0,60)}</label><label>閲嶉棿鍥炲 % ${num('actHeal',0,100)}</label>
      <label class="chk"><input type="checkbox" id="cf_starter" ${cust.starter?'checked':''}> 鎼哄甫鍒濈噧涔嬭</label></div>
    <div class="field"><label for="cf_seed" class="dim">绉嶅瓙锛堝彲鐣欑┖锛?/label><input id="cf_seed" maxlength="20" value="${esc(cust.seed||'')}" placeholder="闅忔満" style="max-width:240px"></div>
    <div><button class="primary" data-a="custStart">寮€濮嬬埇濉?/button></div></div></div>`;
}

function menuHTML(){
  const saved=lsGet(LS_RUN),nUnl=unlockedList().length;
  const testRow=testMode
    ?'<span class="chip">娴嬭瘯妯″紡宸插紑鍚?/span><button data-a="testOff">閫€鍑烘祴璇曟ā寮?/button>'
    :testAsk?'<input id="testPw" type="password" placeholder="璇疯緭鍏ュ彛浠? autocomplete="off"><button data-a="testGo">纭</button><button data-a="testCancel">鍙栨秷</button>'
    :'<button data-a="testAsk" style="border-style:dashed">娴嬭瘯妯″紡</button>';
  return `<div class="menu">
    <div class="logo">OI 灏栧 <span>II</span></div>
    <p class="tagline">鎶婃瘡涓€鍦烘垬鏂楋紝鎹㈡垚涓€閬撻銆傛椂闄愬唴涓嶆墸琛€锛岃秴鏃跺悗姣?5 鍒嗛挓澶卞幓鐢熷懡銆?/p>
    <div class="menu-btns">
      ${saved?'<button class="primary" data-a="continue">缁х画涓婃鐨勭埇濉?/button>':''}
      <button data-a="openArchive">瀛樻。 / 瀵煎叆</button>
      <button class="${saved?'':'primary'}" data-a="goSelect">鍗曚汉鐖</button>
      <button data-a="goCustom">鑷畾涔夋ā寮?/button>
      <button data-a="goLobby">澶氫汉鑱旀満</button>
      <button data-a="vjPanel">${vjBinding?'VJudge锛?+esc(vjBinding.username):'缁戝畾 VJudge'}</button>
      <button data-a="lgPanel">棰樺簱 / 棰樺崟璁剧疆</button>
      <button data-a="goRules">瑙勫垯璇存槑</button>
    </div>
    <div class="legend-row">${TIERS.map(t=>`<span class="chip">${t.n} 路 ${tierBar(t)}</span>`).join('')}</div>
    <p class="dim mono">宸茶В閿?${nUnl} / ${GI_MAX+1} 涓繘闃?{testMode?'锛堟祴璇曟ā寮忥細鍏ㄩ儴寮€鏀撅紝涓嶈鍏ヨ繘搴︼級':''}</p>
    <div class="row">${testRow}</div>
    ${testErr?`<p style="color:var(--bad);margin:0">${esc(testErr)}</p>`:''}
  </div>`;
}
function rulesHTML(){
  return `<div class="wrap"><div class="panel" style="display:flex;flex-direction:column;gap:10px;max-width:760px;margin:20px auto">
    <h2>瑙勫垯璇存槑</h2>
    <p><b>鎬昏</b>锛氳銆屾櫘鍙娿€嶃€屾彁楂樸€嶃€岀渷閫夈€嶄笁澶ч毦搴︼紝姣忎釜澶ч毦搴﹀悇鍚繘闃?0 鑷?10 鍏?11 绾с€傛瘡绾ч』渚濇闂繃涓夊箷锛屾瘡骞曟槸涓€搴у崄浜斿眰鐨勯珮濉旓紝濉旈《鏈夐棰嗛晣瀹堛€傚嚮璐ヤ笁骞曢棰嗗嵆涓洪€氬叧銆傚悇澶ч毦搴︾殑杩涢樁 0 涓€寮€濮嬪嵆鍙寫鎴橈紱閫氬叧鏌愪竴绾у悗锛屽悓涓€澶ч毦搴︾殑涓嬩竴绾ч殢涔嬭В閿併€傚悇澶ч毦搴︾殑杩涢樁 10锛岀涓夊箷椤昏繛缁嚮璐ヤ袱浣嶉棰嗐€?/p>
    <p><b>鍏堝彜涔嬫皯</b>锛氭瘡搴у鐨勫搴曢兘鏈変竴浣嶅厛鍙や箣姘戯紝椤诲厛棰嗗彈涓€浠介璧狅紙闅忔満涓夐€変竴锛夛紝鏂瑰彲韪忎笂绗竴灞傘€?/p>
    <p><b>棰樼洰棰滆壊</b>锛氭部鐢ㄦ礇璋烽毦搴﹂鑹诧細绾紙鍏ラ棬锛夈€佹锛堟櫘鍙?锛夈€侀粍锛堟櫘鍙?鎻愰珮-锛夈€佺豢锛堟櫘鍙?/鎻愰珮锛夈€佽摑锛堟彁楂?/鐪侀€?锛夈€佺传锛堢渷閫?NOI-锛夈€侀粦锛圢OI/NOI+/CTSC锛夈€傛櫘鍙婏細绾㈣嚦缁匡紱鎻愰珮锛氶粍鑷宠摑锛涚渷閫夛細钃濊嚦榛戙€傚悓涓€澶ч毦搴︿腑锛岄毦搴︾骇鍒秺楂樸€佹墍鍦ㄩ噸鏁拌秺闈犲悗锛岄鐩秺鎺ヨ繎鑹插甫涓婄锛涘悓涓€閲嶅唴锛岄棰嗘垬鏂楁渶闅撅紝绮捐嫳鎴樻枟娆′箣锛屾櫘閫氭垬鏂楁渶鏄撱€?/p>
    <p><b>鎴樻枟</b>锛氳繘鍏ユ垬鏂楀悗锛岄〉闈㈢粰鍑烘墍闇€鐨勯鐩鑹层€傚彲鐐广€岄殢鏈鸿烦棰樸€嶄粠娲涜胺绂荤嚎棰樺簱锛堟垨浣犳寚瀹氱殑棰樺崟锛変腑鎶介锛屼篃鍙嚜琛岃烦棰樸€傜粦瀹?VJudge 鍚庯紝鍗曚汉鎴樻枟椤诲厛閫夐锛屽紑濮嬭鏃跺悗鍦?VJudge 鎻愪氦娲涜胺棰樼洰锛屽啀鐐广€岄獙璇?VJudge AC銆嶏紱鑱旀満鏃讹紝缁戝畾璐﹀彿鎻愪氦鐨?AC 涔熶細鐢辨湇鍔″櫒鏍搁獙銆傛湭缁戝畾璐﹀彿浠嶅彲鎵嬪姩纭銆傛垬鏂楁病鏈夐€€璺細瑕佷箞AC锛岃涔堢敓鍛借€楀敖銆?/p>
    <p><b>鏃堕檺涓庤秴鏃?/b>锛氭椂闄愪箣鍐呬笉鎵ｇ敓鍛姐€傛櫘鍙娿€佹彁楂橀毦搴︿笅锛屾櫘閫氭垬鏂?20 鍒嗛挓銆佺簿鑻辨垬鏂?40 鍒嗛挓銆侀棰嗘垬鏂?60 鍒嗛挓锛涚渷閫夐毦搴︿笅鍒嗗埆涓?60銆?0銆?20 鍒嗛挓銆傝秴鏃朵箣鍚庯紝姣忔弧 5 鍒嗛挓澶卞幓涓€娆＄敓鍛斤紙鏅€?10銆佺簿鑻?10銆侀棰?20锛岄殢骞曟暟涓庨毦搴﹂€掑锛夛紝鐩磋嚦 AC銆傜敓鍛藉綊闆跺垯鏈鐖缁撴潫銆傝鏃朵緷绯荤粺鏃堕棿锛屽埛鏂伴〉闈笉浼氶噸缃€?/p>
    <p><b>棰樺崟</b>锛氬湪銆岄搴?/ 棰樺崟璁剧疆銆嶄腑鍙坊鍔犱竴涓垨澶氫釜娲涜胺棰樺崟锛堝～鍐欑紪鍙锋垨閾炬帴锛夛紝鍕鹃€夊悗闅忔満璺抽鍙細浠庡叾涓娊鍙栥€傛姄鍙栭鍗曢』缁忕敱 <span class="mono">node server.js</span>锛屼害鍙墜鍔ㄧ矘璐撮鍙峰鍏ャ€?/p>
    <p><b>瀛樻。</b>锛氬湪涓昏彍鍗曟墦寮€銆屽瓨妗?/ 瀵煎叆銆嶏紝澶嶅埗瀛樻。瀛楃涓叉垨涓嬭浇鏂囦欢锛涘瓨妗ｄ細璁板綍宸茶В閿佺殑杩涢樁锛屼互鍙婂綋鍓嶈繘琛屼腑鐨勫崟浜哄灞€銆傚鍏ヤ細淇濈暀鏈満宸叉湁鐨勬洿楂樿В閿佽繘搴︼紝骞跺彲鎭㈠瀛樻。涓殑鍗曚汉瀵瑰眬銆?/p>
    <p><b>瑙勫垝璺緞</b>锛氱偣銆岃鍒掕矾寰勩€嶏紝鍗冲彲鍦ㄥ湴鍥句笂鑷敱鎻忕敾锛涘浜鸿仈鏈烘椂锛屽悓浼翠篃鑳界湅鍒颁綘鐨勭瑪杩广€?/p>
    <p><b>鍏冲崱</b>锛氭櫘閫氭垬鏂椼€佺簿鑻辨垬鏂椼€佹湭鐭ヤ箣鍦帮紙鍥涘崄浣欑浜嬩欢锛屼篃鍙兘鍖栦綔鎴樻枟銆佸晢搴楁垨瀹濈锛夈€佷紤鎭銆佸晢搴椼€佸疂绠便€傜簿鑻辨垬鏂楀繀鎺夐仐鐗╋紝棣栭鎴樻枟鍙笁閫変竴銆?/p>
    <p><b>鑽按鏍?/b>锛氳嵂姘存爮宸叉弧鏃讹紝鏂板緱鐨勮嵂姘翠細鏆傚瓨鍦ㄩ《閮ㄧ殑銆屽緟鍙栥€嶅锛涗綘鍙互闅忔椂鍦ㄩ《閮ㄤ娇鐢ㄣ€佷涪寮冨凡鏈夌殑鑽按锛屽啀灏嗗叾鏀跺叆銆傚悇绫诲脊鍑虹殑鍏冲崱闈㈡澘涓嶄細閬尅椤堕儴鏍忎綅銆?/p>
    <p><b>鑷畾涔夋ā寮?/b>锛氬彲鑷璁惧畾鏅€氥€佺簿鑻便€侀棰嗘垬鏂楀悇鑷殑鏃堕檺銆佽秴鏃堕棿闅斻€佹瘡娆℃墸琛€涓庨鐩毦搴﹁寖鍥达紝骞惰皟鏁村垵濮嬬敓鍛姐€侀噾甯併€佽嵂姘存爮浣嶃€侀噾甯佸鍔便€佸晢搴椾环鏍笺€佷紤鎭鍥炲銆佺簿鑻卞嚭鐜扮巼绛夈€傝嚜瀹氫箟瀵瑰眬涓嶈鍏ヨВ閿佽繘搴︼紝浠呴檺鍗曚汉銆?/p>
    <p><b>澶氫汉鑱旀満</b>锛氬悎浣滅埇濉斾腑锛屽叏闃熷叡鐢ㄥ湴鍥惧苟鎶曠エ閫夎矾锛屾垬鏂楅鐩篃鐢卞叏闃熷叡浜€傚洟闃熺珵閫熶腑锛岀帺瀹朵娇鐢ㄧ浉鍚岀瀛愬拰鍦板浘锛屼絾鍚勮嚜鎺ㄨ繘銆侀€夎矾涓庢垬鏂楋紝涓嶉渶瑕佹姇绁紱鍦板浘涓婄殑褰╄壊鏍囪鏄剧ず闃熷弸鎵€鍦ㄨ妭鐐癸紝渚ф爮鏄剧ず鍚勮嚜杩涘害銆傜珵閫熸椂姣忎釜浜虹嫭绔嬬粨绠楋紝鍏堥€氬叧鑰呭彲鍦ㄦ埧闂寸姸鎬佷腑鐪嬪埌銆傛帀绾垮悗甯綅浼氫繚鐣欎竴娈垫椂闂达紝鍒锋柊椤甸潰鎴栫綉缁滄仮澶嶅悗浼氳嚜鍔ㄩ噸杩烇紱鏈嶅姟鍣ㄨ繘绋嬮噸鍚粛浼氭竻绌烘埧闂淬€?/p>
    <div class="row"><button data-a="goMenu">杩斿洖</button><button class="danger" data-a="resetProg">娓呯┖鎵€鏈夎繘搴?/button></div>
  </div></div>`;
}
function selectHTML(){
  const gi=selDiff,tier=Math.floor(gi/11),d=gi%11,t=TIERS[tier];
  const tabs=TIERS.map((x,i)=>`<button class="${i===tier?'primary':''}" data-a="pickTier" data-t="${i}">${x.n}</button>`).join('');
  const cards=[];
  for(let i=0;i<=10;i++){
    const g=tier*11+i,lock=!isUnlocked(g),b=prog.best[g]||0,cl=prog.cleared[g];
    cards.push(`<button class="dcard ${g===gi?'on':''} ${lock?'lock':''}" data-a="pickDiff" data-d="${g}">
      <span class="row"><b class="mono">杩涢樁 ${i}</b><span>${DNAMES[i]}</span>${lock?'<span class="dim">鏈В閿?/span>':cl?'<span class="chip">宸查€氬叧</span>':''}</span>
      <span class="dots">${[1,2,3].map(s=>`<i class="${cl||s<b?'f':''}"></i>`).join('')}</span></button>`);
  }
  const mods=MODS.slice(0,d+1).map((m,i)=>`<li class="${i===d?'new':''}">${m}</li>`).join('');
  const locked=!isUnlocked(gi);
  return `<div class="wrap"><div class="row" style="margin-bottom:12px"><button data-a="goMenu">杩斿洖</button><h2>閫夋嫨杩涢樁</h2><span class="spacer"></span><div class="row">${tabs}</div></div>
  <div class="sel"><div class="dgrid">${cards.join('')}</div>
  <div class="panel"><h2>${t.n} 路 杩涢樁 ${d} 路 ${DNAMES[d]}</h2>
    <p style="margin:6px 0">棰樼洰棰滆壊鑼冨洿锛?{tierBar(t)}锛堟礇璋?${LV[t.lo].n} ~ ${LV[t.hi].n}锛?/p>
    <p class="dim" style="margin:4px 0">${locked?'閫氬叧銆?+t.n+' 路 杩涢樁 '+(d-1)+'銆嶅悗瑙ｉ攣銆?:'渚濇闂繃涓夊箷銆?}${testMode?'锛堟祴璇曟ā寮忥細鍏ㄩ儴寮€鏀撅級':''}</p>
    <ul class="modlist">${mods}</ul>
    <div class="field" style="margin-top:14px"><label for="seedIn" class="dim">绉嶅瓙锛堝彲鐣欑┖锛涚浉鍚岀瀛愬緱鍒扮浉鍚屽湴鍥撅級</label><input id="seedIn" maxlength="20" placeholder="闅忔満"></div>
    <button class="primary" data-a="startSolo" ${locked?'disabled':''}>寮€濮嬬埇濉?/button></div></div></div>`;
}
function testPanelHTML(){
  const kinds=[['monster','鏅€氭垬鏂?],['elite','绮捐嫳鎴樻枟'],['boss','棣栭鎴樻枟'],['shop','鍟嗗簵'],['rest','浼戞伅澶?],['treasure','瀹濈'],['ancient','鍏堝彜涔嬫皯'],['unknown','鏈煡涔嬪湴']];
  const evs=EVENTS.map(e=>`<option value="${e.id}">${e.kind==='good'?'锛诲悏锛?:'锛婚櫓锛?}${e.title}</option>`).join('');
  const rels=Object.keys(RELICS).filter(k=>k!=='starter').map(k=>`<option value="${k}">${RARITY_NAME[RELICS[k].r]} 路 ${RELICS[k].n}</option>`).join('');
  const pots=Object.keys(POTIONS).map(k=>`<option value="${k}">${POTIONS[k].n}</option>`).join('');
  const boons=BOONS.map(b=>`<option value="${b.id}">${b.n}</option>`).join('');
  return `<details class="panel testp" id="testDet" ${testDetOpen?'open':''}><summary><b>娴嬭瘯闈㈡澘</b> <span class="dim">锛堜粎娴嬭瘯妯″紡锛涙墦寮€鐨勫叧鍗′笉浼氭帹杩涘湴鍥撅級</span></summary>
    <div class="row" style="margin-top:8px"><span class="dim">绔嬪嵆寮€鍚?/span>${kinds.map(k=>`<button data-a="testRoom" data-k="${k[0]}">${k[1]}</button>`).join('')}</div>
    <div class="row" style="margin-top:6px"><select id="testEv">${evs}</select><button data-a="testEvt">鎵撳紑姝や簨浠?/button>
      <select id="testBoon">${boons}</select><button data-a="testBoon">璇曠敤姝ら璧?/button></div>
    <div class="row" style="margin-top:6px"><select id="testRel">${rels}</select><button data-a="testRelic">鑾峰緱閬楃墿</button>
      <select id="testPot">${pots}</select><button data-a="testPotion">鑾峰緱鑽按</button></div>
    <div class="row" style="margin-top:6px"><button data-a="testGold">+500 閲戝竵</button><button data-a="testHeal">鍥炴弧鐢熷懡</button><button data-a="testMax">鏈€澶х敓鍛?+20</button><button data-a="testSlot">鑽按鏍忎綅 +1</button>
      <span class="dim">璺冲埌</span>${[1,2,3].map(a=>`<button data-a="testAct" data-n="${a}">绗?${a} 骞?/button>`).join('')}<button data-a="testClose">鍏抽棴褰撳墠鍏冲崱</button></div></details>`;
}
function hudHTML(){
  const n=slotCount();
  const rel=run.relics.map(id=>`<span class="relic r-${RELICS[id].r}" title="${esc(RELICS[id].n+'锛?+RARITY_NAME[RELICS[id].r]+'锛夛細'+RELICS[id].d)}">${RELICS[id].n[0]}</span>`).join('');
  let pots='';
  for(let i=0;i<n;i++){
    const id=run.potions[i];
    pots+=id?`<span class="row" style="gap:2px"><button class="pot" data-a="usePotion" data-i="${i}" title="${esc(POTIONS[id].d)}">${POTIONS[id].n}</button><button class="pot" style="min-width:0;padding:.25em .4em" data-a="dropPotion" data-i="${i}" title="涓㈠純">脳</button></span>`:'<span class="pot empty">绌?/span>';
  }
  const pend=(run.pending||[]).map((id,i)=>`<span class="row" style="gap:2px"><span class="chip" title="${esc(POTIONS[id].d)}">寰呭彇锛?{POTIONS[id].n}</span><button class="pot" data-a="takePending" data-i="${i}" ${run.potions.length>=n?'disabled':''} title="闇€瑕佸厛鑵惧嚭鏍忎綅">鏀跺叆</button><button class="pot" style="min-width:0;padding:.25em .4em" data-a="dropPending" data-i="${i}" title="鑸嶅純">脳</button></span>`).join('');
  return `<div class="hud">
    <div class="grp">${run.custom?'<b class="mono">鑷畾涔?/b>':`<b class="mono">${TIERS[run.tier||0].n} A${run.difficulty}</b><span>${DNAMES[run.difficulty]}</span>`}<span class="chip">${STAGE_NAMES[run.act-1]}</span>${run.test?'<span class="chip">娴嬭瘯</span>':''}</div>
    <div class="grp"><span>鐢熷懡</span><div class="hpbar"><i style="width:${Math.max(0,run.hp/run.maxHp*100)}%"></i></div><span class="mono">${run.hp}/${run.maxHp}</span></div>
    <div class="grp"><span>閲戝竵</span><b class="mono">${run.gold}</b></div>
    <div class="grp pots">${pots}</div>
    ${pend?`<div class="grp pots">${pend}</div>`:''}
    <div class="grp relics">${rel||'<span class="dim">鏆傛棤閬楃墿</span>'}</div>
    <span class="spacer"></span>
    <div class="grp"><button data-a="vjPanel">${vjBinding?'VJudge '+esc(vjBinding.username):'缁戝畾 VJudge'}</button><span class="dim mono">绉嶅瓙 ${esc(run.seed)}</span><button data-a="toLobby">鑱旀満</button><button data-a="goMenu">鑿滃崟</button></div></div>`;
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
    const racers=(locmap[r+','+c]||[]).map((id,i)=>`<circle cx="${-12+i*13}" cy="${rad+9}" r="7" fill="${memberColor(id)}" stroke="var(--panel)" stroke-width="2"><title>${esc((net.members[id]||{}).name||'')} 鐨勪綅缃?/title></circle>`).join('');
    ns+=`<g class="node ${vis?'visited':''} ${isAv?'avail':''} ${cur?'cur':''}" ${isAv?`data-a="node" data-r="${r}" data-c="${c}"`:''} transform="translate(${p[0]},${p[1]})">
      <title>${KIND_NAME[n.type]}</title>
      ${nodeShape(n.type)}
      <text style="font-size:${n.type==='boss'?20:15}px">${KIND_GLYPH[n.type]}</text>${vs}${racers}</g>`;
  }
  const ancRacers=(locmap['-1,3']||[]).map((id,i)=>`<circle cx="${-12+i*13}" cy="38" r="7" fill="${memberColor(id)}" stroke="var(--panel)" stroke-width="2"><title>${esc((net.members[id]||{}).name||'')} 鐨勪綅缃?/title></circle>`).join('');
  const ancAv=!anc.done&&!run.room&&!mp;
  ns+=`<g class="node ${anc.done?'visited':''} ${ancAv?'avail':''}" ${ancAv?'data-a="node" data-r="-1" data-c="3"':''} transform="translate(${ap[0]},${ap[1]})">
    <title>鍏堝彜涔嬫皯</title>${nodeShape('ancient')}<text style="font-size:18px">鍙?/text>${ancRacers}</g>`;
  const layer=drawMode?`<rect id="drawlayer" x="0" y="0" width="700" height="${H}" fill="transparent" style="cursor:crosshair"/>`:'';
  return `<svg class="${drawMode?'drawing':''}" viewBox="0 0 700 ${H}" role="img" aria-label="绗?${run.act} 骞曞湴鍥?>${edges}${ns}<g id="drawg" style="pointer-events:none">${strokesHTML()}</g>${layer}</svg>`;
}
function drawbarHTML(){
  const sw=PENS.map(c=>`<button class="swatch ${c===penColor?'on':''}" data-a="pen" data-c="${c}" style="background:${c}" aria-label="绗旇抗棰滆壊"></button>`).join('');
  return `<div class="drawbar"><button class="${drawMode?'primary':''}" data-a="drawToggle">${drawMode?'缁撴潫缁樺埗':'瑙勫垝璺緞'}</button>${drawMode?sw+'<button data-a="drawUndo">鎾ら攢</button><button data-a="drawClear">娓呯┖鎴戠殑绗旇抗</button>':`<span class="dim">鍦ㄥ湴鍥句笂鐢荤嚎鏉ヨ鍒掕矾绾?{net.connected?'锛岄槦鍙嬩篃鑳界湅鍒?:''}銆?/span>`}</div>`;
}
function mpBanner(){
  if(net.reconnecting&&!net.connected)return '<div class="banner">杩炴帴宸叉柇寮€锛屾鍦ㄨ嚜鍔ㄩ噸杩炩€︹€︼紙浣犵殑璁℃椂浠嶅湪鏈湴缁х画锛岄噸杩炲悗浼氳嚜鍔ㄦ帴鍥炲灞€锛?/div>';
  if(run&&run.mode==='team_race')return '<div class="banner">鍥㈤槦绔為€燂細鐙珛閫夎矾锛屾棤闇€鎶曠エ銆傚湴鍥句笂鐨勫僵鑹叉爣璁版樉绀洪槦鍙嬩綅缃€?/div>';
  if(!isMP())return '';
  const g=net.g;
  if(!g)return '<div class="banner">鑱旀満涓€︹€?/div>';
  if(g.over)return '<div class="banner">鏈眬宸茬粨鏉熴€?/div>';
  if(!g.players.includes(net.id))return '<div class="banner">浣犲凡姝讳骸锛屾鍦ㄨ鎴樺悓浼淬€?/div>';
  const n=g.players.length;
  if(g.phase==='vote')return `<div class="banner">鍏ㄩ槦鍏卞悓閫夎矾锛氱偣鍑诲彂鍏夌殑鑺傜偣鎶曠エ锛屾墍鏈変汉鎶曞畬鍚庡緱绁ㄦ渶澶氱殑鑺傜偣鑳滃嚭锛堝钩绁ㄩ殢鏈猴級銆傚凡鎶曠エ ${Object.keys(g.votes).length}/${n}銆?/div>`;
  return `<div class="banner">鍏ㄩ槦鍚屽涓€闂达紝宸插畬鎴?${g.done.length}/${n}銆?{run.room?'':'寰呭悓浼村畬鎴愬悗锛屽啀涓€璧烽€夎矾銆?}</div>`;
}
function gmark(id){
  const g=net.g;if(!g||g.over||!g.players.includes(id))return '';
  if(g.phase==='vote')return g.votes[id]?' 路 宸叉姇绁?:' 路 閫夎矾涓?;
  return g.done.includes(id)?' 路 宸插畬鎴?:'';
}
function voteNode(r,c){
  if(run.room||run.over||run.victory)return;
  if(!net.g||net.g.phase!=='vote'){toast('璇峰厛绛夐槦鍙嬪畬鎴愬綋鍓嶆埧闂?);return}
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
/* ---------- 瑙勫垝璺緞锛堟秱楦︼級 ---------- */
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
    <h2>${win?(run.custom?'鑷畾涔夋ā寮?:giName(run.gi))+' 閫氬叧锛?:'鐖缁堟'}</h2>
    <p>${win?(last?'浣犲凡閫氬叧鏈ぇ闅惧害鐨勫叏閮ㄥ崄涓€绾с€?:'涓嬩竴杩涢樁銆?+giName(run.gi+1)+'銆嶅凡瑙ｉ攣銆?)+(run.test||run.custom?'锛堜笉璁″叆杩涘害锛?:''):'鐢熷懡鑰楀敖锛屼綘姝讳骸浜?+STAGE_NAMES[run.act-1]+'銆?}</p>
    <div class="msg mono">鍙栬儨 ${st.wins} 鍦?路 瓒呮椂鎵ｈ ${st.drain} 鐐?路 绮捐嫳 ${st.elites} 浣?路 閬楃墿 ${run.relics.length} 浠?路 鐢ㄦ椂绾?${mins} 鍒嗛挓</div>
    <div class="row"><button class="primary" data-a="endBack">杩斿洖鑿滃崟</button>${win&&!last&&!run.mp?`<button data-a="nextDiff">鎸戞垬涓嬩竴杩涢樁</button>`:''}</div></div></div>`;
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
    const tt=rm.test?`<div class="row"><button data-a="testWin">锛绘祴璇曪冀鐩存帴鍙栬儨</button>${rm.phase==='fight'?'<button data-a="testOver">锛绘祴璇曪冀鎺ㄥ埌瓒呮椂鍓?3 绉?/button>':''}</div>`:'';
    if(rm.phase==='prep'){
      const dm=drainDmg({},k),probs=curProblems(),need=mp?((f&&f.need)||1):1;
      body=`<p>${mp?'鏈満鍏ㄩ槦鍏辩敤鍚屼竴缁勯':'璇锋嫨瀹氫竴閬撻'}锛岄毦搴?${lvTag}锛屽缓璁鍨嬶細<b>${esc(rm.topic)}</b>銆?{mp?`鎸変汉鏁伴渶 <b>${need}</b> 閬擄細浠讳綍涓€浜篈C鏌愰锛岃棰樺嵆鍛婂嚮璐ワ紱鍏ㄩ儴鍑昏触鏂瑰彲閫氳繃銆俙:''}</p>
      <div class="msg mono">鏃堕檺 ${lim} 鍒嗛挓${c.bonusMin?`锛堝熀纭€ ${c.baseMin}锛屽姞鎴?+${c.bonusMin}锛塦:''}銆傝秴鏃跺悗姣?${tickMs()/60000} 鍒嗛挓澶卞幓 ${dm} 鐐圭敓鍛斤紝鐩磋嚦${mp?'鍏ㄩ儴棰樼洰琚嚮璐?:'浣?AC 璇ラ'}銆?/div>
      ${lgHintHTML(rm,levels)}
      ${mp?probListHTML(probs,false)+manualHTML(need):(rm.problem?probLink(rm):'')}
      ${vjBinding&&!mp&&rm.problem?`<div class="msg">缁戝畾璐﹀彿鐨?AC 闇€鍦ㄦ湰鍦鸿鏃跺紑濮嬪悗锛岄€氳繃 <a href="${vjudgeProblemUrl(rm.problem.pid)}" target="_blank" rel="noopener">VJudge 鎻愪氦杩欓亾娲涜胺棰樼洰</a>銆?/div>`:''}
      <p class="dim" style="margin:0">鎴樻枟娌℃湁閫€璺細瑕佷箞AC锛岃涔堢敓鍛借€楀敖銆?/p>
      <button class="primary" data-a="startCombat" ${(mp&&!probs.length)||(!mp&&vjBinding&&!rm.problem)||c.vjStarting?'disabled':''}>${c.vjStarting?'姝ｅ湪杩炴帴 VJudge鈥?:mp?'寮€濮嬭鏃讹紙鍏ㄩ槦鍚屾椂寮€濮嬶級':'鎷╁畾浜嗭紝寮€濮嬭鏃?}</button>${tt}`;
    }else if(rm.phase==='fight'){
      const pb=run.potions.map((id,i)=>`<button class="pot" data-a="usePotion" data-i="${i}" title="${esc(POTIONS[id].d)}">${POTIONS[id].n}</button>`).join('');
      const flags=[c.insured?'鏃犲咖':'',c.partial?'鍖栬В':'',c.lucky?'绂忚繍':'',c.shielded?'鎶ょ':'',c.guard?'閲戝垰':''].filter(Boolean).map(x=>`<span class="chip">${x}</span>`).join(' ');
      body=`<div class="timer" id="cdTimer">--:--</div>
      <div class="bar"><i id="cdBar" style="width:100%"></i></div>
      <p class="dim" id="cdSub" style="margin:0;text-align:center"></p>
      <p class="dim" style="margin:0;text-align:center">棰樼洰闅惧害 ${lvTag} 路 寤鸿棰樺瀷 ${esc(rm.topic)} ${flags}</p>
      ${pb?`<div class="row"><span class="dim">鑽按</span>${pb}</div>`:''}
      ${mp?probListHTML(curProblems(),true):probHTML(rm)}
      ${vjBinding&&mp?`<p class="dim" style="margin:0;text-align:center">鐐瑰嚮鍚勯鏃佺殑 VJudge 鐩撮摼鎻愪氦锛涙湇鍔″櫒浼氭牳瀵规湰鍦哄紑濮嬪悗鐨勬彁浜ゃ€?/p>`:''}
      ${mp?'':`<div class="row" style="justify-content:center"><button class="primary" data-a="${vjBinding?'verifySoloAc':'ac'}" ${c.vjChecking?'disabled':''}>${c.vjChecking?'姝ｅ湪鏌ヨ VJudge鈥?:vjBinding?'楠岃瘉 VJudge AC':'AC 浜?}</button></div>`}${tt}`;
    }else if(rm.phase==='won'){
      const rw=rm.rewards,full=run.potions.length>=slotCount();
      body=`<div class="msg">棰樼洰宸插嚮璐ャ€傝幏寰?<b>${rw.gold}</b> 閲戝竵${rw.heal?`锛屽洖澶?${rw.heal} 鐐圭敓鍛絗:''}銆?{c.lost?`鏈満瓒呮椂鍏卞け鍘?${c.lost} 鐐圭敓鍛姐€俙:''}</div>`;
      if(rw.potion)body+=`<div class="item"><span>鑽按 <b>${POTIONS[rw.potion].n}</b> <span class="dim">${POTIONS[rw.potion].d}</span></span><div class="row"><button data-a="claim" data-w="potion">鏀跺叆</button>${full?'<span class="dim">鑽按鏍忓凡婊★細鍙厛鍦ㄩ《閮ㄤ娇鐢ㄦ垨涓㈠純涓€鐡?/span>':''}</div></div>`;
      if(rw.relic)body+=`<div class="item"><span>閬楃墿 ${relicLine(rw.relic)}</span><div class="row"><button data-a="claim" data-w="relic">鏀朵笅</button></div></div>`;
      if(rw.choices)body+=`<h3>鎷╀竴浠堕棰嗛仐鐗?/h3>`+rw.choices.map((id,i)=>`<div class="item"><span>${relicLine(id)}</span><div class="row"><button data-a="claim" data-w="choice" data-i="${i}">閫夋嫨</button></div></div>`).join('')+`<button data-a="claim" data-w="skip">鏀惧純</button>`;
      const last=k==='boss'&&(run.act<3||(run.difficulty===10&&rm.node.r===ROWS));
      body+=`<button class="primary" data-a="leave">${rm.test?'鍏抽棴':k==='boss'?(run.act<3?'鍓嶅線涓嬩竴骞?:(last?'杩庢垬绗簩浣嶉棰?:'瀹屾垚')):'缁х画'}</button>`;
    }
  }else if(k==='ancient'){
    title=`<span class="chip">鍏堝彜</span> 鍏堝彜涔嬫皯`;
    if(rm.phase==='choose'){
      body=`<p>涓€浣嶅厛鍙や箣姘戝潗鍦ㄥ搴曠殑绡濈伀鏃侊紝璇达細銆屾鐧绘濉旓紝鍏堝甫璧颁竴浠界ぜ鐗┿€傘€嶄笁閫変竴銆?/p><div class="opts">`+
        rm.choices.map((id,i)=>{const b=BOONS.find(x=>x.id===id);return `<button data-a="ancient" data-i="${i}"><b>${b.n}</b><br><span class="dim">${b.d}</span></button>`}).join('')+`</div>`;
    }else body=`<div class="msg">${esc(rm.result)}</div><button class="primary" data-a="leave">${rm.test?'鍏抽棴':'韪忎笂寰侀€?}</button>`;
  }else if(k==='shop'){
    title=`<span class="chip">鍟嗗簵</span> 灞遍亾椹块`;
    body=`<p class="mono">閲戝竵 ${run.gold}</p><div class="shopgrid">`+run.room.shop.items.map((it,i)=>{
      let nm='',ds='';
      if(it.t==='relic'){nm=RELICS[it.id].n+'锛?+RARITY_NAME[RELICS[it.id].r]+'锛?;ds=RELICS[it.id].d}
      else if(it.t==='potion'){nm=POTIONS[it.id].n;ds=POTIONS[it.id].d}
      else if(it.t==='heal'){nm='鍖婚';ds='鍥炲 20 鐐圭敓鍛姐€?}
      else{nm='姝﹂';ds='鏈€澶х敓鍛?+6銆?}
      return `<div class="item ${it.sold?'sold':''}"><b>${nm}</b><span class="dim">${ds}</span><button data-a="buy" data-i="${i}" ${it.sold||run.gold<it.price?'disabled':''}>${it.sold?'宸插敭鍑?:it.price+' 閲戝竵'}</button></div>`;
    }).join('')+`</div><button class="primary" data-a="leave">${rm.test?'鍏抽棴':'绂诲紑鍟嗗簵'}</button>`;
  }else if(k==='rest'){
    title=`<span class="chip">浼戞伅澶?/span> 绔规灄灏忕瓚`;
    if(rm.phase==='choose'){
      const pct=Math.round(PR().restPct*100),h=Math.round(run.maxHp*PR().restPct)+E('restHeal');
      const np=1+(E('restPotion')||0);
      body=`<div class="opts"><button data-a="rest" data-k="sleep">灏忔啯锛氬洖澶?${h} 鐐圭敓鍛斤紙${pct}% 涓婇檺${E('restHeal')?'+'+E('restHeal'):''}锛?{E('restMaxHp')?'锛屾渶澶х敓鍛?+'+E('restMaxHp'):''}</button>
      <button data-a="rest" data-k="drill">娓╀範锛氫笅涓€鍦烘垬鏂楁椂闄?+10 鍒嗛挓</button>
      <button data-a="rest" data-k="potion">鐐埗锛氳幏寰?${np} 鐡堕殢鏈鸿嵂姘?/button></div>`;
    }else body=`<div class="msg">${esc(rm.result)}</div><button class="primary" data-a="leave">${rm.test?'鍏抽棴':'缁х画'}</button>`;
  }else if(k==='treasure'){
    title=`<span class="chip">瀹濈</span> 涓€鍙棫鏈ㄥ專`;
    body=rm.phase==='open'?`<p>瑙掕惤閲屾斁鐫€涓€鍙惤婊＄伆灏樼殑鏈ㄥ專銆?/p><button class="primary" data-a="chest">寮€鍚?/button>`:`<div class="msg">${esc(rm.result)}</div><button class="primary" data-a="leave">${rm.test?'鍏抽棴':'缁х画'}</button>`;
  }else if(k==='event'){
    const ev=EVENTS.find(e=>e.id===rm.event);
    title=`<span class="chip">浜嬩欢</span> ${ev.title}`;
    if(rm.phase==='choose'){
      const opts=ev.dyn?ev.dyn(rngFor(run.seed,'evd'+nodeKey(rm.node))):ev.opts;
      body=`<p>${ev.text}</p><div class="opts">`+opts.map((o,i)=>`<button data-a="evt" data-i="${i}" ${(o.need&&run.gold<o.need)||(o.needPot&&!run.potions.length)||(o.needHp&&run.hp<=o.needHp)?'disabled':''}>${o.t}</button>`).join('')+`</div>`;
    }else body=`<div class="msg">${esc(rm.result)}</div><button class="primary" data-a="leave">${rm.test?'鍏抽棴':'缁х画'}</button>`;
  }
  const key=run.seed+'|'+run.act+'|'+rm.node.r+','+rm.node.c+'|'+(run.testN||0);
  if(key!==roomKey){roomKey=key;roomPos=null;roomFold=false}
  const st=roomPos?`left:${roomPos.x}px;top:${roomPos.y}px;transform:none`:'';
  return `<section class="roomcard" id="roomcard" style="${st}"><div class="row rchead" title="鎷栧姩鏍囬鍙Щ鍔?><h2>${title}</h2>${rm.test?'<span class="chip">娴嬭瘯</span>':''}<span class="spacer"></span><button data-a="rcFold">${roomFold?'灞曞紑':'鏀惰捣'}</button></div>${roomFold?'':body}</section>`;
}
let roomPos=null,roomKey='',roomFold=false,rcScroll=0;
function focusRoom(){return;setTimeout(()=>{const rc=document.getElementById('roomcard');if(rc&&rc.scrollIntoView)rc.scrollIntoView({block:'nearest',behavior:'smooth'})},30)}

/* ---------- 娴嬭瘯妯″紡 ---------- */
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

/* ---------- 娲涜胺闅忔満璺抽锛堢绾块搴擄紱鎬濊矾鍙傜収 karsl 鐨?Tampermonkey 鑴氭湰锛?---------- */
const LG_DB='OISpireLuoguDB',LG_STORE='problems';
const LG_URL='https://cdn.luogu.com.cn/problemset-open/latest.ndjson.gz';
const LG_TYPES={'娲涜胺':'luogu','涓婚搴?:'P','鍏ラ棬涓庨潰璇?:'B'};
const LG_DIMS={algorithm:'绠楁硶',source:'鏉ユ簮',time:'鏃堕棿',region:'鍖哄煙',special:'鐗规畩棰樼洰'};
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
    if(typeof DecompressionStream==='undefined')throw new Error('褰撳墠娴忚鍣ㄤ笉鏀寔瑙ｅ帇 gzip锛岃鍏堣В鍘嬫垚 .ndjson 鍐嶅鍏ャ€?);
    text=await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }else text=new TextDecoder().decode(u8);
  const lines=text.split('\n').filter(l=>l.trim());
  await lgTx('readwrite',st=>{st.clear()});
  let n=0;
  for(let i=0;i<lines.length;i+=2000){
    const batch=[];
    for(const ln of lines.slice(i,i+2000)){try{const o=JSON.parse(ln);if(o.pid)batch.push({pid:o.pid,title:o.title,difficulty:o.difficulty,type:o.type,tags:o.tags||[]})}catch(e){}}
    await lgTx('readwrite',st=>{batch.forEach(p=>st.put(p))});
    n+=batch.length;lgBusy='瀵煎叆涓?'+n+'/'+lines.length;if(lgPanel)render();
  }
  lgBusy='';lgCount=n;
}
async function lgDownload(){
  lgBusy='姝ｅ湪涓嬭浇棰樺簱鈥︹€?;lgErr='';render();
  try{
    const res=await fetch(LG_URL);
    if(!res.ok)throw new Error('HTTP '+res.status);
    await lgImport(await res.arrayBuffer());
    toast('棰樺簱宸插鍏ワ細'+lgCount+' 棰?);render();return true;
  }catch(e){
    lgBusy='';
    lgErr='鏃犳硶鐩存帴涓嬭浇锛堝父瑙佸師鍥犳槸娴忚鍣ㄧ殑璺ㄥ煙闄愬埗锛夈€傝鎵嬪姩涓嬭浇 '+LG_URL+' 锛屽啀鐢ㄤ笅鏂圭殑銆屽鍏ユ枃浠躲€嶉€夋嫨瀹冦€?;
    render();return false;
  }
}
const TOPIC_TAGS={
  '鏁版嵁缁撴瀯':['绾挎鏍?,'鏍戠姸鏁扮粍','骞舵煡闆?,'骞宠　鏍?,'鍫?,'ST 琛?,'鍒嗗潡','鑾槦','鍗曡皟鏍?,'鍗曡皟闃熷垪','鏍戝舰鏁版嵁缁撴瀯','绾挎€ф暟鎹粨鏋?,'鏆村姏鏁版嵁缁撴瀯'],
  '鍔ㄦ€佽鍒?:['鍔ㄦ€佽鍒?DP'],'鍥捐':['鍥捐'],'鏁板 / 鏁拌':['鏁板','鏁拌'],'瀛楃涓?:['瀛楃涓?],'璐績':['璐績'],
  '鎼滅储 / 鍓灊':['鎼滅储','鍓灊'],'鏋勯€?:['鏋勯€?],'浜屽垎 / 涓夊垎':['浜屽垎','涓夊垎'],'璁＄畻鍑犱綍':['璁＄畻鍑犱綍'],'妯℃嫙':['妯℃嫙'],'鍗氬紙璁?:['鍗氬紙璁?]};
// 榛樿鏍囩锛氭病鏈夋墜鍔ㄩ€夌畻娉曟爣绛俱€佷笖寮€鍚簡鈥滈粯璁や娇鐢ㄦ帹鑽愮畻娉曗€濇椂锛屾墠浣跨敤寤鸿棰樺瀷瀵瑰簲鐨勬爣绛?function recTags(topic){
  if(lg.useRec===false||lg.tags.algorithm.length)return [];
  return (TOPIC_TAGS[topic]||[]).filter(t=>LG_TAGS.algorithm.includes(t));
}
const lgUsingLists=()=>!!(lg.useLists&&lg.lists.some(l=>lg.listOn.includes(l.id)));
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
/* 鍊欓€夐鐩細鍕鹃€変簡棰樺崟灏卞彧浠庨鍗曢噷鎶斤紝鍚﹀垯浠庣绾块搴撴娊銆傝繑鍥?{pool, note} */
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
      return{pool:arr,note:'棰樺崟閲屾病鏈夊搴旈毦搴︾殑棰橈紝宸叉斁瀹介毦搴?};
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
    if(res.length)return{pool:res,note:'鎺ㄨ崘绠楁硶涓嬫病鏈夊悎閫傜殑棰橈紝宸叉斁瀹芥爣绛?};
  }
  return{pool:res,note:''};
}
async function lgEnsure(){
  if(lgUsingLists())return true;
  if(await lgCountNow())return true;
  return await lgDownload();
}
/* 鑱旀満鏃剁敱鎶介鐨勪汉鎶婃暣缁勯鍙戠粰鏈嶅姟鍣紝鍏ㄩ槦鐪嬪埌鍚屼竴缁勶紱鍗曚汉鏃剁洿鎺ユ墦寮€棰樼洰 */
async function lgJump(){
  const rm=run&&run.room;if(!rm||!rm.combat||rm.phase==='won')return;
  const mp=isMP(),f=fightOf();
  if(mp){if(f&&f.started){toast('璁℃椂宸茬粡寮€濮嬶紝涓嶈兘鎹㈤');return}}
  else if(rm.phase==='fight'&&rm.problem)return;
  const k=mp?Math.max(1,(f&&f.need)||1):1;
  const w=mp?null:window.open('','_blank');
  try{
    if(!(await lgEnsure())){if(w)w.close();lgPanel=true;render();return}
    const {pool,note}=await lgPool(hintLevels(rm),rm.topic);
    if(!pool.length){if(w)w.close();toast('娌℃湁绗﹀悎鏉′欢鐨勯鐩紝璇疯皟鏁撮搴撴垨棰樺崟璁剧疆');return}
    const picks=shuffle(pool).slice(0,k).map(p=>({pid:p.pid,title:p.title||'',diff:p.difficulty}));
    if(note)toast(note);
    if(mp){
      netSend({t:'pset',problems:picks});
      if(picks.length<k)toast('鍊欓€夐涓嶈冻锛屽彧鎶藉埌 '+picks.length+' 閬?);
    }else{
      rm.problem=picks[0];save();
      const url='https://www.luogu.com.cn/problem/'+picks[0].pid;
      if(w)w.location.href=url;else toast('娴忚鍣ㄦ嫤鎴簡鏂扮獥鍙ｏ紝璇风偣鍑婚鐩摼鎺?);
      render();
    }
  }catch(e){if(w)w.close();toast('璺抽澶辫触锛?+e.message)}
}
/* ---------- 棰樺崟锛氶€氳繃 server.js 鐨?/api/training 鎶撳彇 ---------- */
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
    content=`<div class="msg">宸茬粦瀹?VJudge 璐﹀彿 <b>${esc(bound.username)}</b>銆傚崟浜烘垬鏂椾細鏍稿鏈満寮€濮嬪悗鐨勬礇璋?AC锛涜仈鏈烘椂锛岀粦瀹氳处鍙锋彁浜ょ殑 AC 涔熶細鐢辨湇鍔″櫒鏍搁獙銆?/div>
      <p class="dim" style="margin:0">楠岃瘉浣跨敤 VJudge 鍏紑鎻愪氦璁板綍锛屼笉闇€瑕佹彁渚涙礇璋峰瘑鐮佹垨 Cookie銆傝В闄ょ粦瀹氬悗灏嗘仮澶嶆墜鍔ㄧ‘璁ゃ€?/p>
      <div class="row"><a href="https://vjudge.net/user/${encodeURIComponent(bound.username)}" target="_blank" rel="noopener">鎵撳紑 VJudge 涓汉璧勬枡</a><span class="spacer"></span><button class="danger" data-a="vjLogout" ${vjBusy?'disabled':''}>瑙ｉ櫎缁戝畾</button></div>`;
  }else{
    content=`<p class="dim" style="margin:0">涓嶉渶瑕佹妸瀵嗙爜浜ょ粰鏈父鎴忋€傛湇鍔″櫒浼氱粰鍑轰竴閬撻殢鏈烘礇璋烽锛涜鍦?VJudge 瀵硅繖閬撻鎻愪氦涓€娆′唬鐮侊紙涓嶅繀 AC锛夛紝鏈嶅姟鍣ㄩ€氳繃鍏紑鎻愪氦璁板綍纭璐﹀彿褰掑睘銆?/p>
      <div class="field"><label class="dim" for="vjName">VJudge 鐢ㄦ埛鍚?/label><input id="vjName" maxlength="40" value="${esc(vjUsernameInput)}" placeholder="浣犵殑 VJudge 鐢ㄦ埛鍚?></div>
      <div class="row"><button class="primary" data-a="vjChallenge" ${vjBusy?'disabled':''}>${vjBusy?'澶勭悊涓€?:'鐢熸垚楠岃瘉棰?}</button></div>
      ${vjChallengeId?`<div class="msg"><b>楠岃瘉棰樺彿锛?span class="mono">${esc(vjProblemId)}</span></b><br>璇峰湪 10 鍒嗛挓鍐呴€氳繃 VJudge 鍚戣繖閬撴礇璋烽鎻愪氦涓€娆′唬鐮併€傛彁浜ょ粨鏋滀笉瑕佹眰 AC銆?/div>
        <div class="row"><a href="${vjudgeProblemUrl(vjProblemId)}" target="_blank" rel="noopener">鎵撳紑 VJudge 楠岃瘉棰?/a><button class="primary" data-a="vjVerify" ${vjBusy?'disabled':''}>宸叉彁浜わ紝楠岃瘉璐﹀彿</button></div>`:''}
      ${vjMessage?`<p class="dim" style="margin:0">${esc(vjMessage)}</p>`:''}`;
  }
  return `<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="vjTitle">
    <div class="row"><h2 id="vjTitle">VJudge 璐﹀彿楠岃瘉</h2><span class="spacer"></span><button data-a="vjClose" aria-label="鍏抽棴">鍏抽棴</button></div>
    ${content}
  </div></div>`;
}
async function vjGenerateChallenge(){
  const field=document.getElementById('vjName');
  vjUsernameInput=((field&&field.value)||'').trim();vjChallengeId='';vjProblemId='';vjMessage='';vjBusy=true;render();
  try{
    const data=await vjPost('/api/vjudge/challenge',{username:vjUsernameInput});
    vjUsernameInput=data.username;vjChallengeId=data.challengeId;vjProblemId=data.problemId;vjMessage='楠岃瘉棰樺凡鐢熸垚锛屾湁鏁堟湡 10 鍒嗛挓銆?;toast('楠岃瘉棰樺凡鐢熸垚');
  }catch(e){vjMessage=e.message||'鐢熸垚楠岃瘉棰樺け璐?}
  finally{vjBusy=false;render()}
}
async function vjVerifyBinding(){
  vjBusy=true;vjMessage='姝ｅ湪鏌ヨ楠岃瘉棰樼殑 VJudge 鎻愪氦璁板綍鈥?;render();
  try{
    const data=await vjPost('/api/vjudge/verify',{username:vjUsernameInput,challengeId:vjChallengeId});
    vjBinding={username:data.username,token:data.token};lsSet(LS_VJ,JSON.stringify(vjBinding));
    vjChallengeId='';vjProblemId='';vjMessage='';if(net.connected)netSend({t:'vbind',token:vjBinding.token});
    toast('VJudge 璐﹀彿缁戝畾鎴愬姛');
  }catch(e){vjMessage=e.message||'缁戝畾楠岃瘉澶辫触'}
  finally{vjBusy=false;render()}
}
async function vjUnbind(){
  if(!vjBinding)return;
  const token=vjBinding.token;
  vjBinding=null;lsDel(LS_VJ);vjChallengeId='';vjProblemId='';vjMessage='';if(net.connected)netSend({t:'vbind',token:''});
  vjBusy=true;render();
  try{await vjPost('/api/vjudge/logout',{token})}
  catch(e){vjMessage='鏈湴宸茶В闄ょ粦瀹氾紝浣嗘湇鍔″櫒娉ㄩ攢澶辫触锛?+(e.message||'璇锋眰澶辫触')}
  finally{vjBusy=false;render()}
}
async function verifySoloAc(){
  const r=run,rm=r&&r.room,c=rm&&rm.combat;
  if(!vjBinding||!c)return;
  if(!c.vjBattleId){toast('鏈満娌℃湁楠岃瘉璁板綍锛岃閫€鍑哄悗閲嶆柊杩涘叆鎴樻枟鍐嶅紑濮嬭鏃?);return}
  if(c.vjChecking)return;
  c.vjChecking=true;render();
  try{
    const data=await vjPost('/api/vjudge/check',{token:vjBinding.token,battleId:c.vjBattleId});
    if(run!==r||r.room!==rm)return;
    if(data.accepted){toast('VJudge 宸茬‘璁ゆ湰鍦?AC');winCombat()}
    else toast(data.pending?'VJudge 浠嶅湪鍒ら锛岃绋嶅悗閲嶈瘯':'鏆傛湭鎵惧埌鏈満寮€濮嬪悗鐨?AC 璁板綍');
  }catch(e){if((e.message||'').includes('缁戝畾宸插け鏁?))vjForgetBinding();toast(e.message||'VJudge 鏌ヨ澶辫触')}
  finally{if(run===r&&r.room===rm){c.vjChecking=false;if(rm.phase==='fight')render()}}
}
async function lgListAdd(){
  const el=document.getElementById('lgListIn'),raw=((el&&el.value)||'').trim();
  const m=raw.match(/training\/(\d+)/)||raw.match(/^(\d+)$/);
  if(!m){lgErr='璇疯緭鍏ラ鍗曠紪鍙凤紙鏁板瓧锛夋垨棰樺崟閾炬帴銆?;render();return}
  lgBusy='姝ｅ湪鎶撳彇棰樺崟 '+m[1]+' 鈥︹€?;lgErr='';render();
  try{
    const r=await fetch(apiBase()+'/api/training?id='+m[1]);
    const j=await r.json().catch(()=>({}));
    if(!r.ok||!Array.isArray(j.problems))throw new Error(j.error||('HTTP '+r.status));
    const l={id:String(m[1]),name:j.name||('棰樺崟 '+m[1]),problems:j.problems};
    lg.lists=lg.lists.filter(x=>x.id!==l.id).concat([l]);
    if(!lg.listOn.includes(l.id))lg.listOn.push(l.id);
    lg.useLists=true;lgSave();lgBusy='';
    toast('宸叉坊鍔犻鍗曘€?+l.name+'銆嶏紝鍏?'+l.problems.length+' 棰?);render();
  }catch(e){lgBusy='';lgErr='鎶撳彇棰樺崟澶辫触锛?+e.message+'銆傝纭 server.js 姝ｅ湪杩愯锛屾垨鍦ㄤ笅鏂规墜鍔ㄥ鍏ラ鍙枫€?;render()}
}
function lgListManual(){
  const nm=document.getElementById('lgListName'),ta=document.getElementById('lgListPaste');
  const ids=[...new Set(((ta&&ta.value)||'').toUpperCase().match(/[A-Z]+\d+/g)||[])];
  if(!ids.length){toast('娌℃湁璇嗗埆鍒伴鍙?);return}
  const l={id:'m'+Date.now().toString(36),name:((nm&&nm.value)||'').trim()||'鎵嬪姩棰樺崟',problems:ids.map(pid=>({pid,title:'',diff:-1}))};
  lg.lists.push(l);lg.listOn.push(l.id);lg.useLists=true;lgSave();
  if(ta)ta.value='';toast('宸插鍏?'+ids.length+' 涓鍙?);render();
}
function vjudgeProblemUrl(pid){return 'https://vjudge.net/problem/'+encodeURIComponent('娲涜胺-'+pid)}
function probLink(rm){return `<div class="hint">褰撳墠棰樼洰锛?a href="https://www.luogu.com.cn/problem/${esc(rm.problem.pid)}" target="_blank" rel="noopener">${esc(rm.problem.pid)} ${esc(rm.problem.title||'')}</a>${vjBinding?` 路 <a href="${vjudgeProblemUrl(rm.problem.pid)}" target="_blank" rel="noopener">鍦?VJudge 鎻愪氦</a>`:''}</div>`}
function lgHintHTML(rm,levels){
  const rt=recTags(rm.topic),mp=isMP(),f=fightOf();
  const names=levels.map(v=>LV[v].c+'锛?+LV[v].n+'锛?).join(' / ');
  const src=lgUsingLists()?`<br>鎶介鏉ユ簮锛氶鍗曪紙${esc(lg.lists.filter(l=>lg.listOn.includes(l.id)).map(l=>l.name||l.id).join('銆?))}锛塦:(rt.length?`<br>榛樿鏍囩锛?{esc(rm.topic)}锛?{esc(rt.join('銆?))}锛夛紝鍙湪棰樺簱璁剧疆閲屽叧闂璥:'');
  const has=mp?!!(f&&f.problems):!!rm.problem,need=mp?((f&&f.need)||1):1;
  return `<div class="msg">娲涜胺闅惧害锛?{names}${src}</div>
    <div class="row"><button data-a="jump">${has?'閲嶆柊鎶介':'闅忔満璺抽'}${mp?'锛堝叡 '+need+' 閬擄級':''}</button><button data-a="lgPanel">棰樺簱 / 棰樺崟璁剧疆</button></div>`;
}
function probHTML(rm){
  if(rm.problem)return probLink(rm);
  return `<div class="row"><button data-a="jump">闅忔満璺抽</button><button data-a="lgPanel">棰樺簱 / 棰樺崟璁剧疆</button></div>`;
}
/* 鑱旀満锛氶鐩垪琛紝姣忛亾棰樻樉绀烘槸璋佸仛鍑烘潵鐨?*/
function probListHTML(probs,fight){
  const f=fightOf(),solved=(f&&f.solved)||{};
  if(!probs.length)return `<div class="msg">杩樻病鏈夋娊棰樸€備换浣曚竴涓汉鐐广€岄殢鏈鸿烦棰樸€嶅嵆鍙紝鍏ㄩ槦閮戒細鐪嬪埌鍚屼竴缁勯銆?/div>`;
  const n=probs.filter(p=>solved[p.pid]).length;
  return `<div class="probs"><div class="dim">宸插嚮璐?${n}/${probs.length}</div>`+probs.map(p=>{
    const sv=solved[p.pid];
    return `<div class="prob ${sv?'ok':''}"><span class="pt"><a href="https://www.luogu.com.cn/problem/${esc(p.pid)}" target="_blank" rel="noopener">${esc(p.pid)} ${esc(p.title||'')}</a> ${p.diff>=0&&LV[p.diff]?lvChip(p.diff):''}${vjBinding?` 路 <a href="${vjudgeProblemUrl(p.pid)}" target="_blank" rel="noopener">VJudge</a>`:''}</span>
      <span>${sv?'宸茶 '+esc(sv.name)+' 鍑昏触':(fight?`<button data-a="psolve" data-pid="${esc(p.pid)}">${vjBinding?'楠岃瘉 VJudge AC':'鎴慉C浜?}</button>`:'')}</span></div>`;
  }).join('')+`</div>`;
}
function manualHTML(need){
  return `<div class="field"><label class="dim" for="mpPids">鎴栬€呮墜鍔ㄦ寚瀹氶鍙凤紙绌烘牸鍒嗛殧锛屾渶澶?${need} 閬擄級</label>
    <div class="row"><input id="mpPids" placeholder="渚嬪 P1001 P1002" style="flex:1"><button data-a="pManual">鎻愪氦棰樼洰</button></div></div>`;
}
function lgListsHTML(){
  const rows=lg.lists.map(l=>`<div class="prob"><label class="chk"><input type="checkbox" data-a="lgListOn" data-id="${esc(l.id)}" ${lg.listOn.includes(l.id)?'checked':''}> ${esc(l.name||('棰樺崟 '+l.id))} <span class="dim">锛?{l.problems.length} 棰橈級</span></label><button data-a="lgListDel" data-id="${esc(l.id)}">鍒犻櫎</button></div>`).join('');
  return `<div class="field"><b>棰樺崟</b>
    <label class="chk"><input type="checkbox" data-a="lgUseLists" ${lg.useLists?'checked':''}> 浠庡嬀閫夌殑棰樺崟閲屾娊棰橈紙涓嶅嬀鍒欑敤绂荤嚎棰樺簱锛?/label>
    <label class="chk"><input type="checkbox" data-a="lgListLv" ${lg.listLv!==false?'checked':''}> 棰樺崟鍐呬篃鎸夋垬鏂楅毦搴﹂鑹茬瓫閫夛紙娌℃湁瀵瑰簲闅惧害鏃惰嚜鍔ㄦ斁瀹斤級</label>
    <div class="probs">${rows||'<span class="dim">杩樻病鏈夐鍗曘€傝緭鍏ラ鍗曠紪鍙锋垨閾炬帴鏉ユ坊鍔狅紝鍙互娣诲姞澶氫釜銆?/span>'}</div>
    <div class="row"><input id="lgListIn" placeholder="棰樺崟缂栧彿鎴栭摼鎺ワ紝渚嬪 https://www.luogu.com.cn/training/1" style="flex:1"><button data-a="lgListAdd">娣诲姞</button></div>
    <details><summary class="dim">鎶撳彇澶辫触锛熸墜鍔ㄥ鍏ラ鍙?/summary>
      <div class="field" style="margin-top:6px"><input id="lgListName" placeholder="棰樺崟鍚嶇О锛堝彲閫夛級"><textarea id="lgListPaste" placeholder="绮樿创棰樺彿锛屼緥濡?P1001 P1002 B2002"></textarea><div><button data-a="lgListManual">瀵煎叆涓洪鍗?/button></div></div></details></div>`;
}
function lgPanelHTML(){
  const types=Object.entries(LG_TYPES).map(([n,v])=>`<label class="chk"><input type="checkbox" data-a="lgType" data-v="${v}" ${lg.types.includes(v)?'checked':''}> ${n}</label>`).join('');
  const dims=Object.keys(LG_DIMS).map(k=>`<div class="field"><span class="dim">${LG_DIMS[k]}</span>
    <div class="row">${lg.tags[k].map(t=>`<span class="chip">${esc(t)} <span data-a="lgTagDel" data-k="${k}" data-t="${esc(t)}" style="cursor:pointer">脳</span></span>`).join('')}</div>
    <div class="row"><input id="lgt_${k}" list="lgl_${k}" placeholder="鎼滅储${LG_DIMS[k]}鏍囩" style="flex:1"><button data-a="lgTagAdd" data-k="${k}">娣诲姞</button></div>
    <datalist id="lgl_${k}">${LG_TAGS[k].map(t=>`<option value="${esc(t)}"></option>`).join('')}</datalist></div>`).join('');
  return `<div class="modal-bg" style="z-index:30"><div class="modal"><h2>娲涜胺闅忔満璺抽</h2>
    <p class="dim" style="margin:0">璺抽鏃朵細鏍规嵁褰撳墠鎴樻枟鐨勯毦搴﹂鑹诧紝浠庣绾块搴擄紙鎴栦綘鍕鹃€夌殑棰樺崟锛夐噷闅忔満鎶介銆傞搴撴潵鑷礇璋峰紑鏀炬暟鎹紝鍙繚瀛樺湪浣犵殑娴忚鍣ㄩ噷銆?/p>
    <div class="msg">棰樺簱锛?{lgCount==null?'灏氭湭妫€娴?:lgCount+' 棰?} ${lgBusy?' 路 '+esc(lgBusy):''}</div>
    ${lgErr?`<div class="msg" style="border-color:var(--bad);word-break:break-all">${esc(lgErr)}</div>`:''}
    ${lgListsHTML()}
    <div class="row"><button data-a="lgDownload">涓嬭浇 / 鏇存柊棰樺簱</button><input type="file" id="lgFile" accept=".gz,.ndjson,.json,.txt"></div>
    <div><b>棰樺簱</b><div class="row" style="margin-top:6px">${types}<span class="dim">锛堜笉閫夎〃绀哄叏閮紱浣跨敤棰樺崟鏃朵笉鎸夎繖浜涚瓫閫夛級</span></div></div>
    ${dims}
    <div class="field"><label class="chk"><input type="checkbox" data-a="lgRec" ${lg.useRec!==false?'checked':''}> 榛樿浣跨敤鎴樻枟寤鸿鐨勭畻娉曟爣绛撅紙鎵嬪姩閫変簡绠楁硶鏍囩鏃朵互鎵嬪姩涓哄噯锛?/label>
      <label class="chk"><input type="checkbox" data-a="lgExcl" ${lg.exclude?'checked':''}> 涓嶅啀鎶藉埌宸?AC 鐨勯锛堝叡 ${lgDone.size} 閬擄級</label>
      <textarea id="lgPaste" placeholder="鍙互绮樿创浣犲凡鍋氳繃鐨勯鍙凤紝渚嬪 P1001 P1002 B2002"></textarea>
      <div class="row"><button data-a="lgPasteImport">璁板綍杩欎簺棰樺彿</button><button data-a="lgClearDone">娓呯┖宸插仛璁板綍</button></div></div>
    <button class="primary" data-a="lgClose">瀹屾垚</button></div></div>`;
}

/* ---------- 渚ф爮 / 澶у巺 ---------- */
function scoreOf(s){if(!s)return -1;if(s.win)return 1e6+(s.wins||0);return (s.d||0)*0+(s.act||0)*100+(s.floor||0)+(s.over?-500:0)}
function sideInner(){
  const ids=Object.keys(net.members).sort((a,b)=>scoreOf(net.members[b].s)-scoreOf(net.members[a].s));
  const mypots=run?run.potions.map((id,i)=>`<option value="${i}">${POTIONS[id].n}</option>`).join(''):'';
  const rows=ids.map(id=>{
    const m=net.members[id],s=m.s,me=id===net.id;
    const prog_=s&&s.act?`${TIERS[s.tier||0].n} A${s.d} 路 绗?{s.act}骞?路 ${s.floor}/${ROWS}灞?{net.config&&net.config.mode==='team_race'&&s.pos&&s.pos.r>=0?' 路 绗?+(s.pos.c+1)+'鍒?:''}`:'鏈紑灞€';
    const rem=s&&s.rem!=null?(s.rem>0?` 路 <span class="mono" data-end="${m.at+s.rem}">${fmtTime(s.rem)}</span>`:' 路 <span style="color:var(--bad)">瓒呮椂</span>'):'';
    const offline=m.o===false?` <span class="dim">锛堥噸杩炰腑${m.until?`锛屽墿浣?<span class="mono" data-end="${m.until}"></span>`:''}锛?/span>`:'';
    return `<div class="pl ${me?'me':''}"><div class="top"><b><span class="dot" style="background:${memberColor(id)}"></span>${esc(m.name)}${id===net.host?' <span class="dim">鎴夸富</span>':''}${offline}${me?' <span class="dim">鎴?/span>':''}</b><span class="dim">${s?esc(s.st):''}${rem}${gmark(id)}</span></div>
      <div class="top"><span>${prog_}</span>${s&&s.max?`<span class="mono">${s.hp}/${s.max}</span>`:''}</div>
      ${s&&s.max?`<div class="bar"><i style="width:${Math.max(0,s.hp/s.max*100)}%;background:var(--bad)"></i></div>`:''}
      ${!me&&run&&run.potions.length&&!run.over?`<div class="row"><select id="gift_${id}">${mypots}</select><button data-a="gift" data-to="${id}">璧犺嵂</button></div>`:''}</div>`;
  }).join('');
  const chat=net.chat.map(c=>`<div><b>${esc(c.n)}</b>锛?{esc(c.x)}</div>`).join('');
  return `<h3>鎴块棿 <span class="mono">${esc(net.room)}</span> 路 ${ids.length} 浜?/h3>
    <div class="plist">${rows}</div>
    <div class="chat">${chat||'<span class="dim">杩樻病鏈夋秷鎭?/span>'}</div>
    <div class="chatin"><input id="chatIn" maxlength="120" placeholder="鍙戦€佹秷鎭? autocomplete="off"><button data-a="chat">鍙戦€?/button></div>`;
}
function lobbyHTML(){
  if(!net.connected&&net.reconnecting){
    return `<div class="wrap"><div class="row" style="margin-bottom:12px"><button data-a="goMenu">杩斿洖鑿滃崟</button><button data-a="leaveNet">鏀惧純閲嶈繛骞剁寮€</button><h2>澶氫汉鑱旀満</h2></div><div class="panel"><p>杩炴帴宸叉柇寮€锛屾鍦ㄨ嚜鍔ㄩ噸杩炩€︹€?/p><p class="dim">甯綅浼氬湪鏈嶅姟鍣ㄤ笂淇濈暀涓€灏忔鏃堕棿锛涙仮澶嶈繛鎺ュ悗灏嗚嚜鍔ㄦ帴鍥炴埧闂?<span class="mono">${esc(net.room)}</span>銆?/p></div></div>`;
  }
  if(!net.connected){
    return `<div class="wrap"><div class="row" style="margin-bottom:12px"><button data-a="goMenu">杩斿洖</button><h2>澶氫汉鑱旀満</h2></div>
    <div class="panel" style="max-width:560px">
      <p class="dim" style="margin-top:0">鍏堝湪鐢佃剳涓婅繍琛?<span class="mono">node server.js</span>锛屽叾浠栦汉鐢ㄦ祻瑙堝櫒鎵撳紑鍚屼竴鍦板潃锛堝眬鍩熺綉璇峰～鏈嶅姟鍣ㄦ墍鍦ㄦ満鍣ㄧ殑 IP锛夈€傝緭鍏ョ浉鍚屾埧闂村彿鍗冲彲鍔犲叆锛屾埧闂翠笉瀛樺湪浼氳嚜鍔ㄥ垱寤恒€?/p>
      <div class="field"><label for="nameIn" class="dim">鏄电О</label><input id="nameIn" maxlength="12" value="${esc(lsGet(LS_NAME)||'')}" placeholder="浣犵殑鍚嶅瓧"></div>
      <div class="field"><label for="roomIn" class="dim">鎴块棿鍙?/label><input id="roomIn" maxlength="16" value="${esc(net.room)}" placeholder="渚嬪 NOI2026"></div>
      <div class="field"><label for="urlIn" class="dim">鏈嶅姟鍣ㄥ湴鍧€</label><input id="urlIn" value="${esc(net.url||defaultWs())}"></div>
      ${net.err?`<p style="color:var(--bad)">${esc(net.err)}</p>`:''}
      <button class="primary" data-a="join">鍔犲叆 / 鍒涘缓鎴块棿</button></div></div>`;
  }
  const isHost=net.host===net.id;
  const opts=unlockedList().map(i=>`<option value="${i}">${giName(i)}</option>`).join('');
  let ctl;
  if(net.spectate)ctl=`<div class="msg">浣犳病鏈夊弬涓庢湰灞€锛堟湭瑙ｉ攣銆?{giName(cfgGi(net.config))}銆嶏紝鎴栨槸涓€斿姞鍏ワ級锛屽彧鑳借鎴橀槦鍙嬨€?/div>`;
  else if(net.started)ctl=`<div class="msg">瀵瑰眬宸插紑濮嬶紙${giName(cfgGi(net.config))}锛?{net.config.mode==='team_race'?'鍥㈤槦绔為€?:'鍚堜綔鐖'}锛岀瀛?${esc(net.config.seed)}锛夈€?/div>
    <div class="row">${(run&&run.mp)||(run&&run.mode==='team_race')?'<button class="primary" data-a="toGame">鍥炲埌瀵瑰眬</button>':'<span class="dim">瀵瑰眬宸插紑濮嬶紝浣犲彧鑳借鎴橀槦鍙嬨€?/span>'}</div>`;
  else ctl=isHost?`<div class="field"><label for="hostD" class="dim">杩涢樁锛堜粎鍙€夋嫨浣犲凡瑙ｉ攣鐨勶級</label><select id="hostD">${opts}</select></div>
      <div class="field"><label for="hostMode" class="dim">澶氫汉鐜╂硶</label><select id="hostMode"><option value="cooperative">鍚堜綔鐖锛堝叡鍚岄€夎矾锛?/option><option value="team_race">鍥㈤槦绔為€燂紙鍚勮嚜閫夎矾锛屽湴鍥炬樉绀轰綅缃級</option></select></div>
      <div class="field"><label for="hostSeed" class="dim">绉嶅瓙锛堢暀绌哄垯闅忔満锛?/label><input id="hostSeed" maxlength="20"></div>
      <button class="primary" data-a="hostStart">寮€濮嬪灞€</button>`:`<div class="msg">绛夊緟鎴夸富寮€濮嬪灞€鈥︹€?/div>`;
  return `<div class="wrap"><div class="row" style="margin-bottom:12px"><button data-a="goMenu">杩斿洖鑿滃崟</button><button data-a="leaveNet">绂诲紑鎴块棿</button><h2>鎴块棿 <span class="mono">${esc(net.room)}</span></h2></div>
    <div class="lobby"><div class="panel"><h3 style="margin-bottom:10px">瀵瑰眬璁剧疆</h3>${ctl}
      ${isHost&&net.started?'<div class="row" style="margin-top:10px"><button data-a="hostReset">缁撴潫褰撳墠瀵瑰眬锛屽洖鍒板ぇ鍘?/button></div>':''}
      <p class="dim">${net.config&&net.config.mode==='team_race'?'绔為€熸椂姣忎汉鐙珛閫夋嫨璺嚎銆佹垬鏂楀拰缁撶畻锛涘湴鍥炬爣璁颁細鏄剧ず闃熷弸鎵€鍦ㄨ妭鐐广€?:'鍚堜綔妯″紡涓嬬帺瀹跺叡鐢ㄨ矾绾垮拰鎴樻枟銆?} 鍥㈤槦绔為€熶娇鐢ㄧ浉鍚岀瀛愶紝渚夸簬姣旇緝杩涘害銆?/p></div>
    <div class="side" id="side" style="max-height:none">${sideInner()}</div></div></div>`;
}

/* ---------- 璁℃椂 ---------- */
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
      if(sub)sub.textContent=rem>0?'鏃堕檺鍓╀綑銆傝秴鏃跺悗姣?'+tk/60000+' 鍒嗛挓澶卞幓 '+dm+' 鐐圭敓鍛姐€?:'宸茶秴鏃?'+fmtTime(over)+'锛屼笂鏂瑰€掕鏃剁粨鏉熸椂澶卞幓 '+dm+' 鐐圭敓鍛姐€?;
      const b=document.getElementById('cdBar');
      if(b)b.style.width=(rem>0?Math.min(100,rem/(c.graceMs+c.extraMs)*100):100-(over%tk)/tk*100)+'%';
    }
  }
  document.querySelectorAll('[data-end]').forEach(e=>{e.textContent=fmtTime(+e.dataset.end-Date.now())});
}
setInterval(tick,500);
setInterval(()=>{if(net.connected&&run&&cb()&&cb().started&&!cb().done){syncStatus()}},5000);

/* ---------- 浜嬩欢鍒嗗彂 ---------- */
$app.addEventListener('click',e=>{
  const t=e.target.closest('[data-a]');if(!t||t.disabled)return;
  const a=t.dataset.a,d=t.dataset;
  switch(a){
    case 'goMenu':view='menu';render();break;
    case 'openArchive':{
      savePanel=true;saveError='';
      try{saveCode=encodeRunArchive(archiveSource())}
      catch(x){saveCode='';saveError=x.message||'鏃犳硶鐢熸垚瀛樻。'}
      if(saveCode&&run&&!run.mp&&!net.connected&&!net.want)pauseArchiveTimer();
      render();break;
    }
    case 'closeArchive':savePanel=false;resumeArchiveTimer();saveError='';render();break;
    case 'copyArchive':{
      const el=document.getElementById('saveArchiveText'),text=((el&&el.value)||'').trim();
      if(!text)toast('娌℃湁鍙鍒剁殑瀛樻。瀛楃涓?);else copyArchiveText(text);
      break;
    }
    case 'downloadArchive':{
      const el=document.getElementById('saveArchiveText'),text=((el&&el.value)||'').trim();
      if(!text){toast('娌℃湁鍙笅杞界殑瀛樻。瀛楃涓?);break}
      const blob=new Blob([text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download='oi-spire-save.oisave';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('瀛樻。鏂囦欢宸蹭笅杞?);break;
    }
    case 'importArchive':{
      const el=document.getElementById('saveArchiveText');
      try{
        const archive=decodeRunArchive(el&&el.value);
        mergeArchiveProgress(archive.progress);
        savePanel=false;saveError='';
        if(archive.run){
          savePausedCombat=null;run=archive.run;curStroke=null;drawMode=false;lastMapAct=null;
          view='game';save();render();toast('瀛樻。鍜岃В閿佽繘搴﹀凡鎭㈠');
        }else{
          resumeArchiveTimer();view='menu';render();toast('瑙ｉ攣杩涘害宸插鍏?);
        }
      }catch(x){saveError=x.message||'瀵煎叆瀛樻。澶辫触';render()}
      break;
    }
    case 'goRules':view='rules';render();break;
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
    case 'continue':try{const r=JSON.parse(lsGet(LS_RUN));if(r&&r.v===5&&!r.mp&&!r.over&&!r.victory&&(!r.test||testMode)){run=r;view='game';lastMapAct=null;render();break}}catch(x){}lsDel(LS_RUN);toast('娌℃湁鍙户缁殑瀛樻。');render();break;
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
    case 'lgTagAdd':{const el=document.getElementById('lgt_'+d.k);const v=el?el.value.trim():'';if(v&&LG_TAGS[d.k].includes(v)){if(!lg.tags[d.k].includes(v))lg.tags[d.k].push(v);lgSave();if(el)el.value='';render()}else toast('璇蜂粠鍊欓€夐噷閫夋嫨涓€涓爣绛?);break}
    case 'lgTagDel':{const a2=lg.tags[d.k],i=a2.indexOf(d.t);if(i>=0)a2.splice(i,1);lgSave();render();break}
    case 'lgExcl':lg.exclude=t.checked;lgSave();break;
    case 'lgRec':lg.useRec=t.checked;lgSave();render();break;
    case 'lgPasteImport':{const el=document.getElementById('lgPaste');const ids=((el&&el.value)||'').toUpperCase().match(/[A-Z]+\d+/g)||[];ids.forEach(x=>lgDone.add(x));lgSave();if(el)el.value='';toast('宸茶褰?'+ids.length+' 涓鍙?);render();break}
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
      if(!ids.length){toast('璇疯緭鍏ラ鍙凤紝渚嬪 P1001');break}
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
    case 'resetProg':if(d.sure){prog={unl:[0,0,0],best:{},cleared:{}};saveProg();lsDel(LS_RUN);toast('杩涘害宸叉竻绌?);view='menu';render()}else{t.dataset.sure=1;t.textContent='鍐嶇偣涓€娆＄‘璁ゆ竻绌?}break;
    case 'toLobby':case 'goLobby':view='lobby';render();break;
    case 'toGame':view='game';render();break;
    case 'join':{
      const name=(document.getElementById('nameIn').value||'').trim()||('鐜╁'+Math.floor(Math.random()*900+100));
      const room=(document.getElementById('roomIn').value||'').trim().toUpperCase();
      const url=(document.getElementById('urlIn').value||'').trim();
      if(!room){net.err='璇疯緭鍏ユ埧闂村彿';render();break}
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
    case 'testGo':{const v=(document.getElementById('testPw')||{}).value||'';if(testPwOk(v)){testMode=true;ssSet('oi_test','1');testAsk=false;testErr='';toast('娴嬭瘯妯″紡宸插紑鍚?)}else testErr='鍙ｄ护涓嶆纭€?;render();break}
    case 'testOff':testMode=false;ssDel('oi_test');if(run&&run.test){run=null}if(selDiff>0&&!isUnlocked(selDiff))selDiff=0;view='menu';render();break;
    case 'testRoom':testOpenRoom(d.k);break;
    case 'testEvt':{const v=(document.getElementById('testEv')||{}).value;if(v)testOpenRoom('event',v);break}
    case 'testBoon':{const v=(document.getElementById('testBoon')||{}).value,b=BOONS.find(x=>x.id===v);if(b&&run&&run.test){const m=b.f(rngFor(run.seed,'tb'+Date.now()));toast(b.n+'锛?+(m||b.d));save();render()}break}
    case 'testRelic':{const v=(document.getElementById('testRel')||{}).value;if(v&&run&&run.test){if(run.relics.includes(v))toast('宸叉嫢鏈夎閬楃墿');else{gainRelic(v);toast('鑾峰緱閬楃墿锛?+RELICS[v].n);save();render()}}break}
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
    catch(x){saveError='璇诲彇瀛樻。鏂囦欢澶辫触锛?+(x.message||'鏈煡閿欒');render()}
    return;
  }
  if(e.target.id==='lgFile'&&e.target.files&&e.target.files[0]){
    try{lgBusy='璇诲彇鏂囦欢涓€︹€?;lgErr='';render();await lgImport(await e.target.files[0].arrayBuffer());toast('棰樺簱宸插鍏ワ細'+lgCount+' 棰?)}
    catch(x){lgBusy='';lgErr='瀵煎叆澶辫触锛?+x.message}
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
/* 鑱旀満绋冲畾鎬э細椤甸潰鍏抽棴鏃堕€氱煡鏈嶅姟鍣紙缂╃煭瀹介檺锛夛紱蹇冭烦瓒呮椂銆佸垏鍥為〉闈€佺綉缁滄仮澶嶆椂涓诲姩閲嶈繛 */
window.addEventListener('pagehide',()=>{if(net.ws&&net.ws.readyState===1){try{net.ws.send('{"t":"away"}')}catch(e){}}});
setInterval(()=>{if(net.want&&net.connected&&Date.now()-net.lastRx>55000)forceReconnect()},5000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&net.want){if(!net.connected&&!net.ws)forceReconnect();else if(net.connected&&Date.now()-net.lastRx>45000)forceReconnect()}});
window.addEventListener('online',()=>{if(net.want&&!net.connected)forceReconnect()});
(()=>{const sn=ssGet('oi_net');if(!sn)return;try{const o=JSON.parse(sn);if(o&&o.url&&o.room){net.room=o.room;view='lobby';netConnect(o.url,o.room,o.name,true)}}catch(e){}})();
render();

