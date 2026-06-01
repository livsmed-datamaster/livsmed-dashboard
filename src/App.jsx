import { useState, useEffect, useCallback, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, Cell, ComposedChart, AreaChart, Area, ReferenceLine } from "recharts";
import Papa from "papaparse";

// ── Mobile Detection Hook ──
function useIsMobile(breakpoint=768){
  const [isMobile,setIsMobile]=useState(()=>typeof window!=="undefined"&&window.innerWidth<breakpoint);
  useEffect(()=>{
    const mq=window.matchMedia(`(max-width:${breakpoint-1}px)`);
    const handler=e=>setIsMobile(e.matches);
    mq.addEventListener("change",handler);
    setIsMobile(mq.matches);
    return()=>mq.removeEventListener("change",handler);
  },[breakpoint]);
  return isMobile;
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  LIVSMED Executive Dashboard v5.2.1                                      ║
// ║  — v5.2.1: Runway 빈 값 처리 (직전 3개월 데이터 부재 행 "—" 표시)        ║
// ║      · mergeTreasury: runway pN→pNNull (빈 셀=null, 0 아님)              ║
// ║      · A3 자금 카드: runway null이면 "—" (구 "0개월" 오표시 방지)        ║
// ║  — v5.2.0: 해외 지사국·대리점국 사업계획 분리 표시 (A2-1, A2-2)          ║
// ║  — per-channel ProgressBar 추가 (국내 패턴 일치)                         ║
// ║  — 0/null 목표 "—" 표시 처리                                             ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const DASHBOARD_PASSWORD = "livsmed1000jo";

// ── Targets (하드코딩 — 사업계획 변경 시만 수정) ──
const Targets={
  qty:{domestic:{ArtiSential:[6685,6595,7465,6356,6434,6899,10521,11701,13379,14059,14828,16267],ArtiSeal:[1310,1490,1730,985,1015,1145,1715,1930,2190,2950,3145,3395],ArtiStapler:[0,0,0,0,0,0,100,100,200,400,600,600]},
    domDealer:{ArtiSential:[5925,5955,6445,5236,5230,5679,9197,10371,12069,12689,13388,14617],ArtiSeal:[1255,1415,1610,735,720,830,1325,1480,1640,2375,2565,2785]},
    domDirect:{ArtiSential:[760,640,1020,1120,1204,1220,1324,1330,1310,1370,1440,1650],ArtiSeal:[55,75,120,250,295,315,390,450,550,575,580,610]},
    overseas:{ArtiSential:[851,5008,6160,5243,5888,8298,7293,9408,19083,9019,10039,29759],ArtiSeal:[370,845,1235,895,1025,1475,1344,1386,4435,1451,2731,7772],ArtiStapler:[0,0,0,0,0,0,0,0,0,0,0,0]},
    ovsCorp:{ArtiSential:[851,4543,4545,4703,4758,4758,4793,4888,5023,5119,5119,5349],ArtiSeal:[370,845,1175,895,975,1250,970,1050,1235,1045,1182,1472]},
    ovsDist:{ArtiSential:[0,465,1615,540,1130,3540,2500,4520,14060,3900,4920,24410],ArtiSeal:[0,0,60,0,50,225,374,336,3200,406,1549,6300]}},
  amt:{domestic:[3223,3239,3757,3095,3166,3401,5131,5677,6510,7239,7786,8481],overseas:[568,2753,3500,2875,3231,4546,3987,4902,10776,4758,5921,17201],combined:[3791,5992,7257,5970,6396,7947,9118,10580,17286,11997,13707,25682],
    regions:{us:[335,2311,2345,2312,2345,2345,2312,2345,2345,2312,2379,2443],de:[59,59,237,89,118,296,89,89,232,118,118,262],jp:[173,185,196,244,257,269,309,352,392,436,448,519],other:[1,198,722,230,511,1636,1277,2116,7807,1892,2976,13977]}}
};
const getTT=(r,mi)=>(Targets.qty[r]?.ArtiSential?.[mi]||0)+(Targets.qty[r]?.ArtiSeal?.[mi]||0)+(Targets.qty[r]?.ArtiStapler?.[mi]||0);
const sum2=o=>o?(o.AS||0)+(o.Seal||0):0;

// ── Fallback Data ──
const fallbackWeekly={"2026.03 W4":{label:"2026.03 W4",updated:"2026.04.06",monthIndex:2,daysInWeek:7,orders:{domDealer:{w:{AS:1680,Seal:60},m:{AS:14240,Seal:902}},domDirect:{w:{AS:37,Seal:20},m:{AS:862,Seal:300}},ovsCorp:{w:{AS:0,Seal:0},m:{AS:980,Seal:0}},ovsDist:{w:{AS:0,Seal:0},m:{AS:180,Seal:50}}},shipments:{domDealer:{w:{AS:1680,Seal:60},m:{AS:14240,Seal:902}},domDirect:{w:{AS:37,Seal:20},m:{AS:862,Seal:300}},ovsCorp:{w:{AS:0,Seal:0},m:{AS:340,Seal:0},country:{w_us:0,w_de:0,w_jp:0,m_us:240,m_de:50,m_jp:50}},ovsDist:{w:{AS:0,Seal:0},m:{AS:25,Seal:30}}},inmarket:{w:{us:71,de:116,jp:115},m:{us:117,de:201,jp:179}},treasury:{cashBalance:13800,deposits:110000,elb:0,foreignCurrency:625,borrowings:3000,netCash:121425,weeklyFlow:-315,prevFlow:-1970,runway:24.2,trend:[{wk:"03 W1",flow:566},{wk:"03 W2",flow:-200},{wk:"03 W3",flow:-400},{wk:"03 W4",flow:-315}]}}};
const fallbackMonthly={"2025-11":{label:"FY2025 11월 가결산 (REV01)",updated:"2025.12.16",monthIndex:10,revenue:{actual:4583,plan:7013,prev:3830,domActual:4346,ovsActual:237},pl:{cogs:1930,grossProfit:2653,grossMarginPct:57.9,opLoss:{actual:-1478,plan:277},ebitda:{actual:-1398,plan:310},netLoss:{actual:-1556,plan:282},costGroups:[{name:"인건비",actual:1560,plan:1543},{name:"R&D",actual:858,plan:970},{name:"영업활동",actual:765,plan:974},{name:"해외시장개척",actual:0,plan:31},{name:"기타",actual:948,plan:501}]},qtyActual:{domestic:{ArtiSential:5820,ArtiSeal:1050,ArtiStapler:0},overseas:{ArtiSential:620,ArtiSeal:280,ArtiStapler:0}},standalone:5569,consolidated:4583,regions:[{name:"🇰🇷 국내",data:[{m:"9월",v:4173},{m:"10월",v:3512},{m:"11월",v:4346}],target:5333,color:"#3b82f6"},{name:"🇺🇸 미국",data:[{m:"9월",v:246},{m:"10월",v:181},{m:"11월",v:46}],target:1434,color:"#ef4444"},{name:"🇩🇪 독일",data:[{m:"9월",v:56},{m:"10월",v:82},{m:"11월",v:95}],target:111,color:"#10b981"},{name:"🇯🇵 일본",data:[{m:"9월",v:36},{m:"10월",v:20},{m:"11월",v:32}],target:46,color:"#f59e0b"},{name:"🌍 대리점국",data:[{m:"9월",v:89},{m:"10월",v:36},{m:"11월",v:65}],target:89,color:"#a78bfa"}],ar:{balance:4250,collectionRate:88.5,longOverdue:99,detail:"국내 연체 47백만, 해외 연체 52백만"},inventory:{domestic:1297,overseas:3838,domesticDetail:{fiveMm:685,eightMm:561,trocar:7,artiSeal:44},overseasDetail:{LMJ:1454,LMG:2384,LMUS:"미수신"},lmusNote:"LMUS 재고: 추후 수령 예정"},arTrend:[{m:"9월",rate:91.2,overdue:85},{m:"10월",rate:89.3,overdue:92},{m:"11월",rate:88.5,overdue:99}],invTrend:[{m:"9월",dom:1350,ovs:3920},{m:"10월",dom:1320,ovs:3870},{m:"11월",dom:1297,ovs:3838}],forecast:[{m:"1월",fcQty:10275,ti:1},{m:"2월",fcQty:10648,ti:2},{m:"3월",fcQty:12785,ti:3}]}};
const fallbackQuarterly={"FY25-Q3":{label:"FY2025 3Q 확정 (2025.07~09)",updated:"2025.11.14",plTrend:[{q:"24.4Q",rev:95.8,opLoss:-62.6},{q:"25.1Q",rev:97.3,opLoss:-66.6},{q:"25.2Q",rev:114.1,opLoss:-54.3},{q:"25.3Q",rev:134.4,opLoss:-45.5}],cumRevenue:441.6,cumOpLoss:-229.0,entities:[{name:"LMUS (미국)",rev:"26.2억",gp:"7.3억",sga:"85.8억",opLoss:"△78.5억",share:"70%"},{name:"LMG (독일)",rev:"6.4억",gp:"3.2억",sga:"24.2억",opLoss:"△21.1억",share:"19%"},{name:"LMJ (일본)",rev:"3.0억",gp:"1.0억",sga:"14.0억",opLoss:"△13.1억",share:"12%"}],bs:{totalAssets:743.6,equity:535.9,currentAssets:514.1,currentLiabilities:146.3,totalDebt:207.8,currentRatio:351.5,debtRatio:38.8},cashTrend:[{q:"FY25 1Q",cash:180,net:120},{q:"2Q",cash:165,net:108},{q:"3Q",cash:148,net:95},{q:"4Q(IPO)",cash:1297,net:1267},{q:"FY26 1Q",cash:1201,net:1171}],ipoFunds:[{label:"연구개발비",plan:120,used:28},{label:"해외시장 개척",plan:80,used:15},{label:"운영자금",plan:60,used:22},{label:"시설투자",plan:40,used:5}]}};

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  GOOGLE SHEETS FETCH + CSV → STORE                                       ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const csvUrl=(id,sheet)=>`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
const pN=v=>{if(v==null||v==="")return 0;const n=parseFloat(String(v).replace(/,/g,""));return isNaN(n)?0:n;};
const pNNull=v=>(v==null||v==="")?null:pN(v);

async function fetchSheet(sheetId,sheetName){
  const res=await fetch(csvUrl(sheetId,sheetName));
  if(!res.ok)throw new Error(`${sheetName}: HTTP ${res.status}`);
  const text=await res.text();
  const parsed=Papa.parse(text,{header:true,dynamicTyping:true,skipEmptyLines:true,delimitersToGuess:[",","\t"]});
  return parsed.data;
}

function csvToWeeklyShipments(rows){
  const store={};
  for(const r of rows){
    const k=(r.week_key||"").trim();if(!k)continue;
    const mi=pN(r.month_index);
    store[k]={label:r.week_label||k,updated:r.updated||"",monthIndex:mi,daysInWeek:pN(r.days_in_week)||7,
      orders:{
        domDealer:{w:{AS:pN(r.dom_ord_dealer_w_AS),Seal:pN(r.dom_ord_dealer_w_Seal)},m:{AS:pN(r.dom_ord_dealer_m_AS),Seal:pN(r.dom_ord_dealer_m_Seal)}},
        domDirect:{w:{AS:pN(r.dom_ord_direct_w_AS),Seal:pN(r.dom_ord_direct_w_Seal)},m:{AS:pN(r.dom_ord_direct_m_AS),Seal:pN(r.dom_ord_direct_m_Seal)}},
        ovsCorp:{w:{AS:pN(r.ovs_ord_corp_w_AS),Seal:pN(r.ovs_ord_corp_w_Seal)},m:{AS:pN(r.ovs_ord_corp_m_AS),Seal:pN(r.ovs_ord_corp_m_Seal)}},
        ovsDist:{w:{AS:pN(r.ovs_ord_dist_w_AS),Seal:pN(r.ovs_ord_dist_w_Seal)},m:{AS:pN(r.ovs_ord_dist_m_AS),Seal:pN(r.ovs_ord_dist_m_Seal)}}},
      shipments:{
        domDealer:{w:{AS:pN(r.dom_ship_dealer_w_AS),Seal:pN(r.dom_ship_dealer_w_Seal)},m:{AS:pN(r.dom_ship_dealer_m_AS),Seal:pN(r.dom_ship_dealer_m_Seal)}},
        domDirect:{w:{AS:pN(r.dom_ship_direct_w_AS),Seal:pN(r.dom_ship_direct_w_Seal)},m:{AS:pN(r.dom_ship_direct_m_AS),Seal:pN(r.dom_ship_direct_m_Seal)}},
        ovsCorp:{w:{AS:pN(r.ovs_ship_corp_w_AS),Seal:pN(r.ovs_ship_corp_w_Seal)},m:{AS:pN(r.ovs_ship_corp_m_AS),Seal:pN(r.ovs_ship_corp_m_Seal)},
          country:{w_us:pN(r.ovs_ship_corp_w_us),w_de:pN(r.ovs_ship_corp_w_de),w_jp:pN(r.ovs_ship_corp_w_jp),m_us:pN(r.ovs_ship_corp_m_us),m_de:pN(r.ovs_ship_corp_m_de),m_jp:pN(r.ovs_ship_corp_m_jp)}},
        ovsDist:{w:{AS:pN(r.ovs_ship_dist_w_AS),Seal:pN(r.ovs_ship_dist_w_Seal)},m:{AS:pN(r.ovs_ship_dist_m_AS),Seal:pN(r.ovs_ship_dist_m_Seal)}}},
      inmarket:{w:{us:pN(r.inmarket_w_us),de:pN(r.inmarket_w_de),jp:pN(r.inmarket_w_jp)},m:{us:pN(r.inmarket_m_us),de:pN(r.inmarket_m_de),jp:pN(r.inmarket_m_jp)}},
      treasury:{cashBalance:0,deposits:0,elb:0,foreignCurrency:0,borrowings:0,netCash:0,weeklyFlow:0,prevFlow:0,runway:0,trend:[]}};
  }
  return store;
}

function mergeTreasury(store,rows){
  const sorted=[...rows].sort((a,b)=>String(a.week_key||"").localeCompare(String(b.week_key||"")));
  const flowHist=[];
  for(const r of sorted){
    const k=(r.week_key||"").trim();if(!k)continue;
    const wf=pN(r.weekly_flow);
    const wkShort=k.replace(/^\d{4}[\.\-]/,"");
    flowHist.push({wk:wkShort,flow:wf});
    const trend=flowHist.slice(-4);
    if(!store[k])store[k]={label:r.week_label||k,updated:r.updated||"",monthIndex:0,daysInWeek:7,orders:{domDealer:{w:{AS:0,Seal:0},m:{AS:0,Seal:0}},domDirect:{w:{AS:0,Seal:0},m:{AS:0,Seal:0}},ovsCorp:{w:{AS:0,Seal:0},m:{AS:0,Seal:0}},ovsDist:{w:{AS:0,Seal:0},m:{AS:0,Seal:0}}},shipments:{domDealer:{w:{AS:0,Seal:0},m:{AS:0,Seal:0}},domDirect:{w:{AS:0,Seal:0},m:{AS:0,Seal:0}},ovsCorp:{w:{AS:0,Seal:0},m:{AS:0,Seal:0},country:{w_us:0,w_de:0,w_jp:0,m_us:0,m_de:0,m_jp:0}},ovsDist:{w:{AS:0,Seal:0},m:{AS:0,Seal:0}}},inmarket:{w:{us:0,de:0,jp:0},m:{us:0,de:0,jp:0}}};
    store[k].treasury={cashBalance:pN(r.cash_balance),deposits:pN(r.deposits),elb:pN(r.elb),foreignCurrency:pN(r.foreign_currency),borrowings:pN(r.borrowings),netCash:pN(r.net_cash),weeklyFlow:wf,prevFlow:flowHist.length>=2?flowHist[flowHist.length-2].flow:0,runway:pNNull(r.runway),monthlyNetFlow:pNNull(r.monthly_net_flow),trend:[...trend],
      cfInSales:pNNull(r.cf_in_sales),cfInOther:pNNull(r.cf_in_other),cfOutLabor:pNNull(r.cf_out_labor),cfOutMaterial:pNNull(r.cf_out_material),cfOutOpex:pNNull(r.cf_out_opex),cfInvest:pNNull(r.cf_invest)};
    if(r.updated)store[k].updated=r.updated;
  }
  return store;
}

function csvToMonthly(plRows,subRows){
  const store={};
  const regColors={"🇰🇷 국내":"#3b82f6","🇺🇸 미국":"#ef4444","🇩🇪 독일":"#10b981","🇯🇵 일본":"#f59e0b","🌍 대리점국":"#a78bfa"};
  const allRegData={};
  const sortedPL=[...plRows].sort((a,b)=>String(a.month_key||"").localeCompare(String(b.month_key||"")));
  for(const r of sortedPL){
    const k=(r.month_key||"").trim();if(!k)continue;
    const mi=pN(r.month_index);
    const regThisMonth=[{name:"🇰🇷 국내",v:pN(r.reg_korea),target:Targets.amt.domestic[mi]||0},{name:"🇺🇸 미국",v:pN(r.reg_us),target:Targets.amt.regions.us[mi]||0},{name:"🇩🇪 독일",v:pN(r.reg_germany),target:Targets.amt.regions.de[mi]||0},{name:"🇯🇵 일본",v:pN(r.reg_japan),target:Targets.amt.regions.jp[mi]||0},{name:"🌍 대리점국",v:pN(r.reg_other),target:Targets.amt.regions.other[mi]||0}];
    const mLabel=`${mi+1}월`;
    for(const rg of regThisMonth){if(!allRegData[rg.name])allRegData[rg.name]=[];allRegData[rg.name].push({m:mLabel,v:rg.v,target:rg.target});}
    const regions=regThisMonth.map(rg=>{const hist=allRegData[rg.name]||[];const d=hist.slice(-3);while(d.length<3)d.unshift({m:"—",v:0});return{name:rg.name,data:d,target:rg.target,color:regColors[rg.name]||"#888"};});
    const prevKey=sortedPL.find(x=>String(x.month_key||"").trim()<k);
    store[k]={label:r.month_label||k,updated:r.updated||"",monthIndex:mi,
      revenue:{actual:pN(r.rev_actual),plan:pN(r.rev_plan),prev:prevKey?pN(prevKey.rev_actual):null,domActual:pN(r.rev_dom),ovsActual:pN(r.rev_ovs),domDealer:pNNull(r.rev_dom_dealer),domDirect:pNNull(r.rev_dom_direct)},
      pl:{cogs:pN(r.cogs),grossProfit:pN(r.gross_profit),grossMarginPct:pN(r.gpm_pct),opLoss:{actual:pN(r.op_loss_actual),plan:pN(r.op_loss_plan)},ebitda:{actual:pN(r.ebitda_actual),plan:pN(r.ebitda_plan)},netLoss:{actual:pN(r.net_loss_actual),plan:pN(r.net_loss_plan)},
        costGroups:[{name:"인건비",actual:pN(r.cost_labor_a),plan:pN(r.cost_labor_p)},{name:"R&D",actual:pN(r.cost_rd_a),plan:pN(r.cost_rd_p)},{name:"영업활동",actual:pN(r.cost_sales_a),plan:pN(r.cost_sales_p)},{name:"해외시장개척",actual:pN(r.cost_overseas_a),plan:pN(r.cost_overseas_p)},{name:"기타",actual:pN(r.cost_other_a),plan:pN(r.cost_other_p)}]},
      qtyActual:{domestic:{ArtiSential:pN(r.qty_dom_AS),ArtiSeal:pN(r.qty_dom_Seal),ArtiStapler:0},overseas:{ArtiSential:pN(r.qty_ovs_AS),ArtiSeal:pN(r.qty_ovs_Seal),ArtiStapler:0}},
      standalone:pN(r.standalone),consolidated:pN(r.rev_actual),regions,
      ar:{collectionRate:0,longOverdue:0},inventory:{domestic:0,overseas:0},forecast:[]};
  }
  for(const r of(subRows||[])){
    const k=(r.month_key||"").trim();if(!k||!store[k])continue;
    store[k].ar={collectionRate:pN(r.ar_collection_rate),longOverdue:pN(r.ar_overdue),detail:r.ar_detail||""};
    store[k].inventory={domestic:pN(r.inv_domestic),overseas:pN(r.inv_overseas),domesticDetail:pN(r.inv_dom_5mm)?{fiveMm:pN(r.inv_dom_5mm),eightMm:pN(r.inv_dom_8mm),trocar:0,artiSeal:pN(r.inv_dom_seal)}:null,overseasDetail:pN(r.inv_lmj)?{LMJ:pN(r.inv_lmj),LMG:pN(r.inv_lmg),LMUS:r.inv_lmus||"미수신"}:null,lmusNote:r.inv_note||""};
    const fc=[];if(r.fc_m1_label)fc.push({m:r.fc_m1_label,fcQty:pN(r.fc_m1_qty),ti:1});if(r.fc_m2_label)fc.push({m:r.fc_m2_label,fcQty:pN(r.fc_m2_qty),ti:2});if(r.fc_m3_label)fc.push({m:r.fc_m3_label,fcQty:pN(r.fc_m3_qty),ti:3});
    store[k].forecast=fc;
  }
  const sortedK2=Object.keys(store).sort();
  const arH=[],invH=[];
  for(const k of sortedK2){const m=store[k],ml=`${m.monthIndex+1}월`;arH.push({m:ml,rate:m.ar.collectionRate,overdue:m.ar.longOverdue});invH.push({m:ml,dom:m.inventory.domestic,ovs:m.inventory.overseas});}
  for(let i=0;i<sortedK2.length;i++){store[sortedK2[i]].arTrend=arH.slice(Math.max(0,i-2),i+1);store[sortedK2[i]].invTrend=invH.slice(Math.max(0,i-2),i+1);}
  return store;
}

function mergeInmarket(store,rows){
  const sorted=[...(rows||[])].sort((a,b)=>(a.month_key||"").localeCompare(b.month_key||""));
  let prev=null;
  for(const r of sorted){
    const k=(r.month_key||"").trim();if(!k||!store[k])continue;
    const hasNew=r.im_us_AS!==undefined||r.im_de_AS!==undefined||r.im_jp_AS!==undefined;
    const iUS_AS=pN(r.im_us_AS),iUS_VS=pN(r.im_us_VS),iDE_AS=pN(r.im_de_AS),iDE_VS=pN(r.im_de_VS),iJP_AS=pN(r.im_jp_AS),iJP_VS=pN(r.im_jp_VS);
    const dAS=pN(r.ship_dist_AS),dVS=pN(r.ship_dist_VS);
    const ovsUS=hasNew?iUS_AS+iUS_VS:pN(r.ovs_us_actual);
    const ovsDE=hasNew?iDE_AS+iDE_VS:pN(r.ovs_de_actual);
    const ovsJP=hasNew?iJP_AS+iJP_VS:pN(r.ovs_jp_actual);
    const dDir=pN(r.dom_direct_actual),dDlr=pN(r.dom_dealer_actual);
    const hasDomNew=r.dom_AS_total!==undefined||r.dom_VS_total!==undefined;
    const domAS=hasDomNew?pN(r.dom_AS_total):(dDir+dDlr);
    const domVS=hasDomNew?pN(r.dom_VS_total):0;
    const cur={
      domestic:{direct:dDir,dealer:dDlr,AS:domAS,VS:domVS},
      overseas:{us:ovsUS,de:ovsDE,jp:ovsJP},
      corp:{AS:iUS_AS+iDE_AS+iJP_AS,Seal:iUS_VS+iDE_VS+iJP_VS,us:{AS:iUS_AS,VS:iUS_VS},de:{AS:iDE_AS,VS:iDE_VS},jp:{AS:iJP_AS,VS:iJP_VS}},
      dist:{AS:dAS,Seal:dVS}};
    cur.domTotal=domAS+domVS;
    cur.corpTotal=cur.corp.AS+cur.corp.Seal;cur.distTotal=cur.dist.AS+cur.dist.Seal;
    cur.ovsTotal=cur.overseas.us+cur.overseas.de+cur.overseas.jp;
    cur.grandTotal=cur.domTotal+cur.ovsTotal;
    if(prev){cur.prev={domTotal:prev.domTotal,ovsTotal:prev.ovsTotal,grandTotal:prev.grandTotal,corpTotal:prev.corpTotal,distTotal:prev.distTotal,overseas:{us:prev.overseas.us,de:prev.overseas.de,jp:prev.overseas.jp},domestic:{direct:prev.domestic.direct,dealer:prev.domestic.dealer,AS:prev.domestic.AS,VS:prev.domestic.VS},corp:{AS:prev.corp.AS,Seal:prev.corp.Seal},dist:{AS:prev.dist.AS,Seal:prev.dist.Seal}};}
    store[k].inmarket=cur;prev=cur;
  }
  return store;
}

function csvToQuarterly(rows){
  const store={};
  for(const r of rows){
    const k=(r.quarter_key||"").trim();if(!k)continue;
    store[k]={label:r.quarter_label||k,updated:r.updated||"",
      plTrend:[{q:r.q1_label||"",rev:pN(r.q1_rev),opLoss:pN(r.q1_op_loss)},{q:r.q2_label||"",rev:pN(r.q2_rev),opLoss:pN(r.q2_op)},{q:r.q3_label||"",rev:pN(r.q3_rev),opLoss:pN(r.q3_op)},{q:r.q4_label||"",rev:pN(r.q4_rev),opLoss:pN(r.q4_op)}].filter(x=>x.q),
      cumRevenue:pN(r.q1_rev)+pN(r.q2_rev)+pN(r.q3_rev)+pN(r.q4_rev),cumOpLoss:pN(r.q1_op_loss)+pN(r.q2_op)+pN(r.q3_op)+pN(r.q4_op),
      entities:[{name:r.entity1_name||"LMUS",rev:r.entity1_rev||"",gp:r.entity1_gp||"",sga:r.entity1_sga||"",opLoss:r.entity1_oploss||"",share:r.entity1_share||""},{name:r.entity2_name||"LMG",rev:r.entity2_rev||"",gp:r.entity2_gp||"",sga:r.entity2_sga||"",opLoss:r.entity2_oploss||"",share:r.entity2_share||""},{name:r.entity3_name||"LMJ",rev:r.entity3_rev||"",gp:r.entity3_gp||"",sga:r.entity3_sga||"",opLoss:r.entity3_oploss||"",share:r.entity3_share||""}],
      bs:{totalAssets:pN(r.bs_total_assets),equity:pN(r.bs_equity),currentRatio:pN(r.bs_current_ratio),debtRatio:pN(r.bs_debt_ratio),currentAssets:0,currentLiabilities:0},
      cashTrend:(()=>{const ct=[{q:r.ct1_label||"",cash:pN(r.ct1_cash),net:pN(r.ct1_net)},{q:r.ct2_label||"",cash:pN(r.ct2_cash),net:pN(r.ct2_net)},{q:r.ct3_label||"",cash:pN(r.ct3_cash),net:pN(r.ct3_net)},{q:r.ct4_label||"",cash:pN(r.ct4_cash),net:pN(r.ct4_net)},{q:r.ct5_label||"",cash:pN(r.ct5_cash),net:pN(r.ct5_net)}].filter(x=>x.q);return ct.length>0?ct:fallbackQuarterly["FY25-Q3"].cashTrend;})(),
      ipoFunds:fallbackQuarterly["FY25-Q3"].ipoFunds};
  }
  return store;
}

// ╔═══════════════════════════════════╗
// ║  STYLE + COMPONENTS               ║
// ╚═══════════════════════════════════╝
const C={bg:"#0a0f1a",card:"#111827",border:"#1e293b",text:"#e2e8f0",textMuted:"#94a3b8",textDim:"#64748b",accent:"#3b82f6",green:"#10b981",greenBg:"rgba(16,185,129,0.1)",red:"#ef4444",redBg:"rgba(239,68,68,0.1)",amber:"#f59e0b",amberBg:"rgba(245,158,11,0.1)",purple:"#a78bfa",weekly:"#10b981",monthly:"#3b82f6",quarterly:"#a78bfa",up:"#ef4444",down:"#3b82f6"};
const fmt=n=>n==null?"—":n.toLocaleString();
const fmtBn=n=>n==null?"—":(n/100).toFixed(1)+"억";
const pctVal=(a,t)=>t>0?(a/t)*100:0;
const pctStr=(a,t)=>t>0?((a/t)*100).toFixed(1)+"%":"—";
const pctClr=(a,t)=>{const p=pctVal(a,t);return p>=90?C.green:p>=70?C.amber:C.red;};
const sumP=o=>o?(o.ArtiSential||0)+(o.ArtiSeal||0)+(o.ArtiStapler||0):0;

const Badge=({color,children})=>(<span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:600,background:color==="green"?C.greenBg:color==="amber"?C.amberBg:color==="red"?C.redBg:color==="purple"?"rgba(167,139,250,0.1)":"rgba(59,130,246,0.1)",color:color==="green"?C.green:color==="amber"?C.amber:color==="red"?C.red:color==="purple"?C.purple:C.accent}}>{children}</span>);
const InfoBox=({title,children,color=C.accent})=>(<div style={{margin:"8px 0",padding:"10px 14px",borderRadius:6,borderLeft:`3px solid ${color}`,background:"rgba(255,255,255,0.02)",fontSize:12,color:C.textMuted,lineHeight:1.6}}>{title&&<div style={{fontWeight:700,color:C.text,marginBottom:4,fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em"}}>{title}</div>}{children}</div>);
const Fn=({children})=>(<div style={{fontSize:10,color:C.textDim,marginTop:6,lineHeight:1.5,fontStyle:"italic"}}>{children}</div>);
const TabIntro=({color,icon,title,children})=>(<div style={{marginBottom:16,padding:"14px 16px",borderRadius:8,background:`${color}08`,border:`1px solid ${color}22`,lineHeight:1.7}}><div style={{fontSize:13,fontWeight:700,color,marginBottom:6}}>{icon} {title}</div><div style={{fontSize:11,color:C.textMuted}}>{children}</div></div>);
const Metric=({label,value,sub,trend,unit="",small,color:clr})=>(<div style={{padding:small?"6px 0":"8px 0"}}><div style={{fontSize:11,color:C.textMuted,marginBottom:2}}>{label}</div><div style={{display:"flex",alignItems:"baseline",gap:6}}><span style={{fontSize:small?18:22,fontWeight:700,color:clr||C.text,fontVariantNumeric:"tabular-nums"}}>{value}{unit&&<span style={{fontSize:12,color:C.textMuted,marginLeft:2}}>{unit}</span>}</span>{trend!=null&&<span style={{fontSize:11,fontWeight:600,color:trend>0?C.up:trend<0?C.down:C.textMuted}}>{trend>0?"▲":trend<0?"▼":"—"} {Math.abs(trend).toLocaleString()}{unit}</span>}</div>{sub&&<div style={{fontSize:10,color:C.textDim,marginTop:2}}>{sub}</div>}</div>);
const ProgressBar=({value,max,label,height=6})=>{const p=max>0?Math.min((value/max)*100,100):0;const bc=p>=90?C.green:p>=70?C.amber:C.red;return(<div>{label&&<div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}><span style={{color:C.textMuted}}>{label}</span><span style={{color:bc,fontWeight:700}}>{p.toFixed(1)}%</span></div>}<div style={{height,borderRadius:height/2,background:"rgba(255,255,255,0.05)",overflow:"hidden"}}><div style={{height:"100%",width:`${p}%`,borderRadius:height/2,background:bc,transition:"width 0.6s ease"}}/></div></div>);};
const SH=({icon,title,badge,desc})=>(<div style={{marginBottom:12}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}><span style={{fontSize:16}}>{icon}</span><span style={{fontSize:15,fontWeight:700,color:C.text}}>{title}</span>{badge}</div>{desc&&<div style={{fontSize:11,color:C.textDim,lineHeight:1.5}}>{desc}</div>}</div>);
const Card=({children,style={}})=>(<div className="lm-card" style={{background:C.card,borderRadius:10,border:`1px solid ${C.border}`,padding:18,marginBottom:14,...style}}>{children}</div>);
const NoData=({msg="데이터 미수신"})=>(<div style={{padding:"16px 14px",background:C.amberBg,borderRadius:6,border:`1px solid ${C.amber}33`,fontSize:11,color:C.amber,textAlign:"center"}}>⏳ {msg}</div>);
const DT=({headers,rows,compact})=>(<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:compact?11:12}}><thead><tr>{headers.map((h,i)=>(<th key={i} style={{padding:compact?"5px 6px":"6px 8px",textAlign:i===0?"left":"right",fontSize:10,fontWeight:600,color:C.textDim,borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:"0.04em",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead><tbody>{rows.map((row,ri)=>(<tr key={ri} style={{borderBottom:`1px solid ${C.border}22`}}>{row.map((cell,ci)=>(<td key={ci} style={{padding:compact?"5px 6px":"7px 8px",textAlign:ci===0?"left":"right",color:typeof cell==="object"?cell.color||C.text:C.text,fontWeight:typeof cell==="object"?cell.bold?700:400:400,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>{typeof cell==="object"?cell.v:cell}</td>))}</tr>))}</tbody></table></div>);
const PeriodNav=({keys,current,onChange,colorActive,labels,isMobile})=>(<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:14}}><button onClick={()=>{const i=keys.indexOf(current);if(i>0)onChange(keys[i-1]);}} style={{padding:isMobile?"6px 10px":"4px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,cursor:"pointer",fontSize:12,flexShrink:0}}>◀</button><div style={{display:"flex",gap:4,flexWrap:isMobile?"nowrap":"wrap",overflowX:isMobile?"auto":"visible",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none",flex:1}}>{keys.map(k=>(<button key={k} onClick={()=>onChange(k)} style={{padding:isMobile?"7px 12px":"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,border:"none",cursor:"pointer",transition:"all 0.2s",background:k===current?colorActive:"rgba(255,255,255,0.04)",color:k===current?"#fff":C.textMuted,whiteSpace:"nowrap",flexShrink:0}}>{labels&&labels[k]?labels[k]:k}</button>))}</div><button onClick={()=>{const i=keys.indexOf(current);if(i<keys.length-1)onChange(keys[i+1]);}} style={{padding:isMobile?"6px 10px":"4px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,cursor:"pointer",fontSize:12,flexShrink:0}}>▶</button></div>);

// ── v5.0 Chart Colors ──
const CC={dlrAS:"#3b82f6",dirAS:"#f97316",dlrVS:"#8b5cf6",dirVS:"#14b8a6",corpAS:"#10b981",distAS:"#f43f5e",corpVS:"#eab308",distVS:"#6366f1",imUS:"#ef4444",imDE:"#3b82f6",imJP:"#f59e0b"};
// v5.2.0: shipRow2 — 0/null 목표는 "—" 표시 (대리점국 ArtiSeal 등 계획외 항목 처리)
const shipRow2=(nm,w,m,t)=>{const noT=(t==null||t<=0);return[nm,fmt(w),fmt(m),noT?"—":fmt(t),{v:noT?"—":pctStr(m,t),color:noT?C.textMuted:pctClr(m,t),bold:true}];};

// ╔═══════════════════════════════════════╗
// ║  WEEKLY TAB — v5.2.1                  ║
// ║  v5.2.1: A3 Runway 카드 빈 값(null) "—" 표시.           ║
// ║  v5.2.0: 해외 지사국·대리점국 사업계획 분리 표시.    ║
// ║          per-channel ProgressBar 추가 (국내 패턴 일치). ║
// ╚═══════════════════════════════════════╝
function WeeklyTab({weekKey,WS,isMobile}){
  const W=WS[weekKey];if(!W)return<NoData msg="해당 주차 데이터가 없습니다."/>;
  const mi=W.monthIndex,ord=W.orders,sh=W.shipments,im=W.inmarket,tr=W.treasury;
  const days=W.daysInWeek||7;
  const wKeys=Object.keys(WS).sort(),wIdx=wKeys.indexOf(weekKey);
  const prevW=wIdx>0?WS[wKeys[wIdx-1]]:null;
  const prevDays=prevW?.daysInWeek||7;
  const dT=getTT("domestic",mi),oT=getTT("overseas",mi);
  const dlrAS=Targets.qty.domDealer?.ArtiSential?.[mi]||0,dlrVS=Targets.qty.domDealer?.ArtiSeal?.[mi]||0;
  const dirAS=Targets.qty.domDirect?.ArtiSential?.[mi]||0,dirVS=Targets.qty.domDirect?.ArtiSeal?.[mi]||0;
  const dlrT=dlrAS+dlrVS,dirT=dirAS+dirVS;
  const dAS=Targets.qty.domestic.ArtiSential[mi]||0,dVS=Targets.qty.domestic.ArtiSeal[mi]||0;
  const oAS=Targets.qty.overseas.ArtiSential[mi]||0,oVS=Targets.qty.overseas.ArtiSeal[mi]||0;
  // v5.2.0: 해외 지사국·대리점국 분리 목표
  const corpAS=Targets.qty.ovsCorp?.ArtiSential?.[mi]||0,corpVS=Targets.qty.ovsCorp?.ArtiSeal?.[mi]||0;
  const distAS=Targets.qty.ovsDist?.ArtiSential?.[mi]||0,distVS=Targets.qty.ovsDist?.ArtiSeal?.[mi]||0;
  const corpT=corpAS+corpVS,distT=distAS+distVS;
  const domOrdW=sum2(ord.domDealer.w)+sum2(ord.domDirect.w),domOrdM=sum2(ord.domDealer.m)+sum2(ord.domDirect.m);
  const ovsOrdW=sum2(ord.ovsCorp.w)+sum2(ord.ovsDist.w),ovsOrdM=sum2(ord.ovsCorp.m)+sum2(ord.ovsDist.m);
  const domShipW=sum2(sh.domDealer.w)+sum2(sh.domDirect.w),domShipM=sum2(sh.domDealer.m)+sum2(sh.domDirect.m);
  const ovsShipW=sum2(sh.ovsCorp.w)+sum2(sh.ovsDist.w),ovsShipM=sum2(sh.ovsCorp.m)+sum2(sh.ovsDist.m);
  const pDOW=prevW?sum2(prevW.orders.domDealer.w)+sum2(prevW.orders.domDirect.w):null;
  const pOOW=prevW?sum2(prevW.orders.ovsCorp.w)+sum2(prevW.orders.ovsDist.w):null;
  const pDSW=prevW?sum2(prevW.shipments.domDealer.w)+sum2(prevW.shipments.domDirect.w):null;
  const pOSW=prevW?sum2(prevW.shipments.ovsCorp.w)+sum2(prevW.shipments.ovsDist.w):null;
  const dailyAvg=(val,d)=>d>0?(val/d):0;
  const wowDaily=(cur,curD,prev,prevD)=>{if(prev==null||prevD===0)return null;const ca=dailyAvg(cur,curD),pa=dailyAvg(prev,prevD);return Math.round(ca-pa);};
  // v5.2.0: chTbl — 합계 목표 0/null 시 "—" 표시
  const chTbl=(data,tAS,tVS)=>{const tT=(tAS||0)+(tVS||0);const noTT=tT<=0;return<DT compact headers={["품목","금주(대)","월누적(대)","월목표(대)","달성률"]} rows={[shipRow2("ArtiSential",data.w.AS,data.m.AS,tAS),shipRow2("ArtiSeal",data.w.Seal,data.m.Seal,tVS),[{v:"합계",bold:true},{v:fmt(sum2(data.w)),bold:true},{v:fmt(sum2(data.m)),bold:true},{v:noTT?"—":fmt(tT),bold:true},{v:noTT?"—":pctStr(sum2(data.m),tT),color:noTT?C.textMuted:pctClr(sum2(data.m),tT),bold:true}]]}/>;};
  const t8=wKeys.slice(Math.max(0,wIdx-7),wIdx+1);
  // ── v5.0.7: X축 tick에서 일수 표기 제거 ──
  const mkT=(fn)=>t8.map(k=>({wk:k.replace(/^\d{4}[\.\-]/,""),...fn(WS[k])}));
  const seamTick=({x,y,payload})=>(<text x={x} y={y+10} textAnchor="middle" fontSize={9} fill="#cbd5e1">{payload.value}</text>);
  const domOrdT=mkT(w=>({"대리점 AS":w?.orders?.domDealer?.w?.AS||0,"직판 AS":w?.orders?.domDirect?.w?.AS||0,"대리점 VS":w?.orders?.domDealer?.w?.Seal||0,"직판 VS":w?.orders?.domDirect?.w?.Seal||0}));
  const domShipT=mkT(w=>({"대리점 AS":w?.shipments?.domDealer?.w?.AS||0,"직판 AS":w?.shipments?.domDirect?.w?.AS||0,"대리점 VS":w?.shipments?.domDealer?.w?.Seal||0,"직판 VS":w?.shipments?.domDirect?.w?.Seal||0}));
  const ovsOrdT=mkT(w=>({"지사국 AS":w?.orders?.ovsCorp?.w?.AS||0,"대리점국 AS":w?.orders?.ovsDist?.w?.AS||0,"지사국 VS":w?.orders?.ovsCorp?.w?.Seal||0,"대리점국 VS":w?.orders?.ovsDist?.w?.Seal||0}));
  const ovsShipT=mkT(w=>({"지사국 AS":w?.shipments?.ovsCorp?.w?.AS||0,"대리점국 AS":w?.shipments?.ovsDist?.w?.AS||0,"지사국 VS":w?.shipments?.ovsCorp?.w?.Seal||0,"대리점국 VS":w?.shipments?.ovsDist?.w?.Seal||0}));
  const imT=mkT(w=>({"미국":w?.inmarket?.w?.us||0,"독일":w?.inmarket?.w?.de||0,"일본":w?.inmarket?.w?.jp||0}));
  const corpShipCountryT=mkT(w=>({"미국":w?.shipments?.ovsCorp?.country?.w_us||0,"독일":w?.shipments?.ovsCorp?.country?.w_de||0,"일본":w?.shipments?.ovsCorp?.country?.w_jp||0}));
  const stk2=(data,k1,k2,c1,c2,label)=>{if(data.length<2)return null;return(<div><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>{label}</div><div style={{height:200}}><ResponsiveContainer><BarChart data={data} barSize={22} margin={{top:5,right:10,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="wk" tick={seamTick} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:"#cbd5e1"}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:"#f1f5f9"}} labelStyle={{color:"#f1f5f9"}} itemStyle={{color:"#f1f5f9"}} formatter={(v,n)=>[`${fmt(v)}대`,n]}/><Legend wrapperStyle={{fontSize:9}}/><Bar dataKey={k1} stackId="s" fill={c1} name={k1}/><Bar dataKey={k2} stackId="s" fill={c2} radius={[3,3,0,0]} name={k2}/></BarChart></ResponsiveContainer></div></div>);};
  const stk3=(data,label)=>{if(data.length<2)return null;return(<div><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>{label}</div><div style={{height:200}}><ResponsiveContainer><BarChart data={data} barSize={22} margin={{top:5,right:10,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="wk" tick={seamTick} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:"#cbd5e1"}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:"#f1f5f9"}} labelStyle={{color:"#f1f5f9"}} itemStyle={{color:"#f1f5f9"}} formatter={(v,n)=>[`${fmt(v)}대`,n]}/><Legend wrapperStyle={{fontSize:9}}/><Bar dataKey="미국" stackId="s" fill={CC.imUS}/><Bar dataKey="독일" stackId="s" fill={CC.imDE}/><Bar dataKey="일본" stackId="s" fill={CC.imJP} radius={[3,3,0,0]}/></BarChart></ResponsiveContainer></div></div>);};
  const cashTD=wKeys.slice(Math.max(0,wIdx-5),wIdx+1).map(k=>{const t=WS[k]?.treasury;return{wk:k.replace(/^\d{4}[\.\-]/,""),flow:t?.weeklyFlow||0,netCash:t?.netCash||0};});
  const mCumFlow=wKeys.filter(k=>WS[k]?.monthIndex===mi&&k<=weekKey).reduce((s,k)=>s+(WS[k]?.treasury?.weeklyFlow||0),0);
  const mBurn=(tr&&tr.runway>0)?Math.round(tr.netCash/tr.runway):null;
  const cc=sh.ovsCorp.country||{w_us:0,w_de:0,w_jp:0,m_us:0,m_de:0,m_jp:0};
  const isSeam=days<7;

  return(<div>
    <TabIntro color={C.green} icon="📡" title="Weekly — 주간 운영 현황">
      주간 단위로 업데이트되는 <strong style={{color:C.text}}>운영 지표</strong>입니다. 수주·출하(금~목 주기)와 자금 현황(매주 월요일)이 갱신됩니다.<br/>
      핵심 질문: <strong style={{color:C.text}}>"수주는 들어오고 있는가? 출하는 이루어지고 있는가? 현금 흐름은 안정적인가?"</strong><br/>
      A1(국내 수주/출하) → A2(해외 수주/출하/인마켓) → A3(자금). 국내는 대리점·직판, 해외는 지사국·대리점국으로 구분합니다.
    </TabIntro>
    {isSeam&&<div style={{padding:"8px 12px",marginBottom:12,borderRadius:6,background:C.amberBg,border:`1px solid ${C.amber}33`,fontSize:11,color:C.amber}}>⚠ 이 주차는 월초/월말 이음새 주차({days}일)입니다. 집계 일수가 적어 절대값이 작고, 달성률 변동이 클 수 있습니다.</div>}
    {/* Summary Cards */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:isMobile?8:10,marginBottom:14}}>
      {[{label:"국내 수주",val:domOrdW,mVal:domOrdM,mTgt:dT,wow:wowDaily(domOrdW,days,pDOW,prevDays)},{label:"해외 수주",val:ovsOrdW,mVal:ovsOrdM,mTgt:oT,wow:wowDaily(ovsOrdW,days,pOOW,prevDays)},{label:"국내 출하",val:domShipW,mVal:domShipM,mTgt:dT,wow:wowDaily(domShipW,days,pDSW,prevDays)},{label:"해외 출하",val:ovsShipW,mVal:ovsShipM,mTgt:oT,wow:wowDaily(ovsShipW,days,pOSW,prevDays)}].map((c,i)=>(<Card key={i} style={{marginBottom:0,textAlign:"center",padding:"12px 6px"}}><div style={{fontSize:10,color:C.textDim}}>{c.label}</div><div style={{fontSize:20,fontWeight:700}}>{fmt(c.val)}<span style={{fontSize:11,color:C.textMuted,marginLeft:2}}>대</span><span style={{fontSize:9,color:C.textDim,marginLeft:2}}>({days}일)</span></div>{c.wow!=null&&<div style={{fontSize:10,color:c.wow>=0?C.up:C.down}}>{c.wow>=0?"▲":"▼"} {fmt(Math.abs(c.wow))}/일 vs 전주</div>}<div style={{marginTop:6,padding:"0 4px"}}><ProgressBar value={c.mVal} max={c.mTgt} label={`${fmt(c.mVal)}/${fmt(c.mTgt)}`} height={4}/></div></Card>))}
    </div>

    {/* ═══ A1-1. 국내 수주 현황 ═══ */}
    <Card><SH icon="📋" title="A1-1. 국내 수주 현황" badge={<Badge color="green">매주 금~목</Badge>} desc="ERP 수주상세조회 기준. DSA(일반)=대리점, DSAB(수탁)=직판. 채널별 월목표는 2026년 사업계획 기준."/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
        <div><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>📍 대리점 (DSA) <span style={{fontSize:10,fontWeight:400,color:C.textDim}}>— 월목표 {fmt(dlrT)}대</span></div>{chTbl(ord.domDealer,dlrAS,dlrVS)}<div style={{marginTop:6}}><ProgressBar value={sum2(ord.domDealer.m)} max={dlrT} label={`대리점 수주 달성률 — ${fmt(sum2(ord.domDealer.m))} / ${fmt(dlrT)}`} height={6}/></div></div>
        <div><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>🏥 직판 (DSAB) <span style={{fontSize:10,fontWeight:400,color:C.textDim}}>— 월목표 {fmt(dirT)}대</span></div>{chTbl(ord.domDirect,dirAS,dirVS)}<div style={{marginTop:6}}><ProgressBar value={sum2(ord.domDirect.m)} max={dirT} label={`직판 수주 달성률 — ${fmt(sum2(ord.domDirect.m))} / ${fmt(dirT)}`} height={6}/></div></div>
      </div>
      <div style={{marginTop:10}}><ProgressBar value={domOrdM} max={dT} label={`국내 수주 통합 (대리점+직판) — ${fmt(domOrdM)} / ${fmt(dT)}`} height={8}/></div>
      <div style={{marginTop:16,display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
        {stk2(domOrdT,"대리점 AS","직판 AS",CC.dlrAS,CC.dirAS,"📈 국내 수주 추이 — ArtiSential (8주)")}
        {stk2(domOrdT,"대리점 VS","직판 VS",CC.dlrVS,CC.dirVS,"📈 국내 수주 추이 — ArtiSeal (8주)")}
      </div>
      <Fn>※ 순수주 기준(반품 차감 후). DSA+RREF=대리점, DSAB+RRCE+RREO=직판. A/V만 KPI, T/K/G 제외. 반품코드: RRCE(직판 유상반품), RREF(대리점 정산반품), RREO(오페라 정산). 국내 수주는 월말 집중 경향으로 1~2주차 수치가 낮은 것은 정상 패턴.{isSeam?" 이음새 주차는 집계 일수가 적어 달성률 변동이 클 수 있습니다.":""}</Fn>
    </Card>

    {/* ═══ A1-2. 국내 출하 현황 ═══ */}
    <Card><SH icon="📦" title="A1-2. 국내 출하 현황" badge={<Badge color="green">매주 금~목</Badge>} desc="ERP 출고수량 기준. 대리점 출하 = 본사→대리점 출고(매출 인식 시점). 직판 출하 = 가납창고(병원 위탁 보관) 이동이며 실매출은 개봉 시점에 인식(출하 ≠ 매출). 채널별 월목표는 2026년 사업계획 기준."/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
        <div><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>📍 대리점 <Badge color="green">출하=매출</Badge> <span style={{fontSize:10,fontWeight:400,color:C.textDim}}>— 월목표 {fmt(dlrT)}대</span></div>{chTbl(sh.domDealer,dlrAS,dlrVS)}<div style={{marginTop:6}}><ProgressBar value={sum2(sh.domDealer.m)} max={dlrT} label={`대리점 출하 달성률 — ${fmt(sum2(sh.domDealer.m))} / ${fmt(dlrT)}`} height={6}/></div></div>
        <div><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>🏥 직판 <Badge color="amber">가납출하≠매출</Badge> <span style={{fontSize:10,fontWeight:400,color:C.textDim}}>— 월목표 {fmt(dirT)}대</span></div>{chTbl(sh.domDirect,dirAS,dirVS)}<div style={{marginTop:6}}><ProgressBar value={sum2(sh.domDirect.m)} max={dirT} label={`직판 출하 달성률 — ${fmt(sum2(sh.domDirect.m))} / ${fmt(dirT)}`} height={6}/></div></div>
      </div>
      <div style={{marginTop:10}}><ProgressBar value={domShipM} max={dT} label={`국내 출하 통합 — ${fmt(domShipM)} / ${fmt(dT)}`} height={8}/></div>
      <div style={{marginTop:16,display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
        {stk2(domShipT,"대리점 AS","직판 AS",CC.dlrAS,CC.dirAS,"📈 국내 출하 추이 — ArtiSential (8주)")}
        {stk2(domShipT,"대리점 VS","직판 VS",CC.dlrVS,CC.dirVS,"📈 국내 출하 추이 — ArtiSeal (8주)")}
      </div>
      <Fn>※ 직판 거래처: 분당서울대병원, 드림종합병원, 케어캠프, 에비슨케어 등. 직판 출하는 가납창고 이동 시점 집계(실사용 시 매출 인식). 대리점 출하는 매출 인식과 일치.{isSeam?" 이음새 주차는 집계 일수가 적어 달성률 변동이 클 수 있습니다.":""}</Fn>
    </Card>

    {/* ═══ A2-1. 해외 수주 현황 (v5.2.0: 지사국·대리점국 분리) ═══ */}
    <Card><SH icon="🌏" title="A2-1. 해외 수주 현황" badge={<Badge color="green">매주 금~목</Badge>} desc="ERP 수주상세조회 비KRW 통화 기준. 지사국 = LIVSMED USA·LivsMed Germany·Biogenesis Japan 법인 PO. 대리점국 = 해외 디스트리뷰터 PO. 수주형태 ESA/ESSE만(SESE 유상사급 제외). 월목표는 지사국·대리점국 각자 사업계획."/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>🏢 지사국 (미국·독일·일본) <span style={{fontSize:10,fontWeight:400,color:C.textDim}}>— 월목표 {fmt(corpT)}대</span></div>
          {chTbl(ord.ovsCorp,corpAS,corpVS)}
          <div style={{marginTop:6}}><ProgressBar value={sum2(ord.ovsCorp.m)} max={corpT} label={`지사국 수주 달성률 — ${fmt(sum2(ord.ovsCorp.m))} / ${fmt(corpT)}`} height={6}/></div>
          <div style={{marginTop:6,padding:"6px 8px",background:"rgba(255,255,255,0.02)",borderRadius:4,fontSize:10,color:C.textDim}}>ⓘ 국가별 수주 분리는 DB 스키마 확장 후 반영 예정</div>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>🤝 대리점국 <span style={{fontSize:10,fontWeight:400,color:C.textDim}}>— 월목표 {fmt(distT)}대</span></div>
          {chTbl(ord.ovsDist,distAS,distVS)}
          <div style={{marginTop:6}}><ProgressBar value={sum2(ord.ovsDist.m)} max={distT} label={`대리점국 수주 달성률 — ${fmt(sum2(ord.ovsDist.m))} / ${fmt(distT)}`} height={6}/></div>
          <div style={{marginTop:6,padding:"6px 8px",background:"rgba(255,255,255,0.02)",borderRadius:4,fontSize:10,color:C.textDim}}>ⓘ 향후 주요 3개국 + 기타 분류 예정</div>
        </div>
      </div>
      <div style={{marginTop:10}}><ProgressBar value={ovsOrdM} max={oT} label={`해외 수주 통합 (지사국+대리점국) — ${fmt(ovsOrdM)} / ${fmt(oT)}`} height={8}/></div>
      <div style={{marginTop:16,display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
        {stk2(ovsOrdT,"지사국 AS","대리점국 AS",CC.corpAS,CC.distAS,"📈 해외 수주 추이 — ArtiSential (8주)")}
        {stk2(ovsOrdT,"지사국 VS","대리점국 VS",CC.corpVS,CC.distVS,"📈 해외 수주 추이 — ArtiSeal (8주)")}
      </div>
      <Fn>※ PO 접수 기준. 해외 수주는 PO 접수~선적까지 리드타임 존재. 영업그룹 '해외', ESA/ESSE만 집계. 지사국·대리점국 각자의 사업계획 대비 달성률 표시.</Fn>
    </Card>

    {/* ═══ A2-2. 해외 출하 현황 (v5.2.0: 지사국·대리점국 분리) ═══ */}
    <Card><SH icon="🚢" title="A2-2. 해외 출하 현황" badge={<Badge color="green">매주 금~목</Badge>} desc="매출확정리스트 Sales Date 기준 선적 수량. 지사국 출하는 본사→법인 선적(실매출은 인마켓으로 확인). 대리점국 출하는 본사→대리점 선적으로 매출 인식 시점. 월목표는 지사국·대리점국 각자 사업계획."/>
      <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:8}}>🏢 지사국 출하 <span style={{fontSize:10,fontWeight:400,color:C.amber}}>⚠ 선적 기준, 실매출 연관성 낮음</span> <span style={{fontSize:10,fontWeight:400,color:C.textDim}}>— 월목표 {fmt(corpT)}대</span></div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14,marginBottom:14}}>
        <div><div style={{fontSize:10,fontWeight:600,color:C.textDim,marginBottom:4}}>제품별 (AS/VS)</div>{chTbl(sh.ovsCorp,corpAS,corpVS)}<div style={{marginTop:6}}><ProgressBar value={sum2(sh.ovsCorp.m)} max={corpT} label={`지사국 출하 달성률 — ${fmt(sum2(sh.ovsCorp.m))} / ${fmt(corpT)}`} height={6}/></div></div>
        <div><div style={{fontSize:10,fontWeight:600,color:C.textDim,marginBottom:4}}>국가별 (AS+VS 합산)</div>
          <DT compact headers={["국가","금주(대)","월누적(대)"]} rows={[["🇺🇸 미국",fmt(cc.w_us),fmt(cc.m_us)],["🇩🇪 독일",fmt(cc.w_de),fmt(cc.m_de)],["🇯🇵 일본",fmt(cc.w_jp),fmt(cc.m_jp)],[{v:"합계",bold:true},{v:fmt(cc.w_us+cc.w_de+cc.w_jp),bold:true},{v:fmt(cc.m_us+cc.m_de+cc.m_jp),bold:true}]]}/></div>
      </div>
      <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:8}}>🤝 대리점국 출하 <span style={{fontSize:10,fontWeight:400,color:C.green}}>출하=매출</span> <span style={{fontSize:10,fontWeight:400,color:C.textDim}}>— 월목표 {fmt(distT)}대</span></div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
        <div>{chTbl(sh.ovsDist,distAS,distVS)}<div style={{marginTop:6}}><ProgressBar value={sum2(sh.ovsDist.m)} max={distT} label={`대리점국 출하 달성률 — ${fmt(sum2(sh.ovsDist.m))} / ${fmt(distT)}`} height={6}/></div></div>
        <div style={{padding:"10px 12px",background:"rgba(255,255,255,0.02)",borderRadius:6}}>
          <div style={{fontSize:10,color:C.textDim,marginBottom:6}}>국가별 분류 (향후 반영 예정)</div>
          <DT compact headers={["국가","금주","월누적"]} rows={[["대리점국 A (TBD)","—","—"],["대리점국 B (TBD)","—","—"],["대리점국 C (TBD)","—","—"],["기타","—","—"],[{v:"합계",bold:true},{v:fmt(sum2(sh.ovsDist.w)),bold:true},{v:fmt(sum2(sh.ovsDist.m)),bold:true}]]}/>
        </div>
      </div>
      <div style={{marginTop:10}}><ProgressBar value={ovsShipM} max={oT} label={`해외 출하 통합 (지사국+대리점국) — ${fmt(ovsShipM)} / ${fmt(oT)}`} height={8}/></div>
      <div style={{marginTop:16,display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
        {stk2(ovsShipT,"지사국 AS","대리점국 AS",CC.corpAS,CC.distAS,"📈 해외 출하 추이 — ArtiSential (8주)")}
        {stk2(ovsShipT,"지사국 VS","대리점국 VS",CC.corpVS,CC.distVS,"📈 해외 출하 추이 — ArtiSeal (8주)")}
      </div>
      {corpShipCountryT.length>=2&&<div style={{marginTop:14}}>
        {stk3(corpShipCountryT,"📈 지사국 출하 국가별 추이 — 미국/독일/일본 (8주, AS+VS 합산)")}
      </div>}
      <Fn>※ 매출확정리스트 Sales Date 기준, 유상·Commercial만. '해외법인'=지사국, '디스트리뷰터'=대리점국. 지사국 국가별은 AS+VS 합산. 지사국·대리점국 각자의 사업계획 대비 달성률 표시.</Fn>
    </Card>

    {/* ═══ A2-3. 인마켓 (지사국 실매출) ═══ */}
    <Card><SH icon="🏥" title="A2-3. 인마켓 — 지사국 실매출" badge={<Badge color="green">매주</Badge>} desc="미국(LMUS)·독일(LMG)·일본(LMJ) 법인이 현지 병원·유통에 최종 판매한 수량(AS+VS 합산). 출하가 '공급측' 지표라면 인마켓은 '수요측' 지표이며, 해외 실매출을 가장 직접적으로 반영합니다."/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
        <DT compact headers={["법인","금주(대)","월누적(대)"]} rows={[["🇺🇸 미국 (LMUS)",fmt(im.w.us),fmt(im.m.us)],["🇩🇪 독일 (LMG)",fmt(im.w.de),fmt(im.m.de)],["🇯🇵 일본 (LMJ)",fmt(im.w.jp),fmt(im.m.jp)],[{v:"합계",bold:true},{v:fmt(im.w.us+im.w.de+im.w.jp),bold:true},{v:fmt(im.m.us+im.m.de+im.m.jp),bold:true}]]}/>
        <div style={{textAlign:"center",padding:14,background:"rgba(16,185,129,0.06)",borderRadius:8,border:`1px solid ${C.green}22`}}>
          <div style={{fontSize:10,color:C.textDim}}>금주 인마켓 합계</div>
          <div style={{fontSize:28,fontWeight:700,color:C.green}}>{fmt(im.w.us+im.w.de+im.w.jp)}<span style={{fontSize:13,color:C.textMuted,marginLeft:4}}>대</span></div>
          <div style={{fontSize:11,color:C.textMuted,marginTop:4}}>월누적 {fmt(im.m.us+im.m.de+im.m.jp)}대</div>
        </div>
      </div>
      <div style={{marginTop:16}}>
        {stk3(imT,"📈 인마켓 추이 — 미국/독일/일본 (8주, AS+VS 합산)")}
      </div>
      <Fn>※ 해외사업실 주간 보고(담당자_Weekly_In-Market) 기반. AS+VS 합산(제품별 분리 없음). 인마켓 = 지사국 실매출. 대리점국 인마켓은 별도 수집 체계 구축 전까지 미표시. 인마켓은 해외사업실 주간 합산 기준이며, 월 경계 주차에서 미세한 차이가 발생할 수 있습니다.</Fn>
    </Card>

    {/* ═══ A3. 자금 현황 ═══ */}
    <Card><SH icon="💰" title="A3. 자금 현황" badge={<Badge color="green">매주 월요일</Badge>} desc="재무본부 자금팀이 매주 월요일 보고하는 회사 전체 자금 포지션. Net Cash 추이로 현금 소진 속도(Burn Rate)를, Runway로 현재 현금으로 몇 개월 운영 가능한지를 판단합니다."/>
      {tr&&<>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:isMobile?10:14,marginBottom:14}}>
        <div style={{textAlign:"center",padding:isMobile?12:14,background:"rgba(255,255,255,0.02)",borderRadius:8,border:`1px solid ${C.border}`}}><div style={{fontSize:10,color:C.textDim}}>Gross Cash (총잔고)</div><div style={{fontSize:isMobile?24:28,fontWeight:700,color:C.accent}}>{fmt(Math.round((tr.cashBalance+tr.deposits+(tr.elb||0)+tr.foreignCurrency)/100))}<span style={{fontSize:13,color:C.textMuted,marginLeft:2}}>억</span></div><div style={{fontSize:11,color:C.textMuted,marginTop:2}}>{fmt(tr.cashBalance+tr.deposits+(tr.elb||0)+tr.foreignCurrency)} 백만원</div><div style={{fontSize:9,color:C.textDim,marginTop:3}}>보통예금+정기예금+ELB+외화</div></div>
        <div style={{textAlign:"center",padding:isMobile?12:14,background:"rgba(255,255,255,0.02)",borderRadius:8,border:`1px solid ${C.border}`}}><div style={{fontSize:10,color:C.textDim}}>Net Cash (순현금)</div><div style={{fontSize:isMobile?24:28,fontWeight:700,color:tr.netCash>100000?C.green:C.amber}}>{fmt(Math.round(tr.netCash/100))}<span style={{fontSize:13,color:C.textMuted,marginLeft:2}}>억</span></div><div style={{fontSize:11,color:C.textMuted,marginTop:2}}>{fmt(tr.netCash)} 백만원</div><div style={{fontSize:9,color:C.textDim,marginTop:3}}>총잔고 − 차입금({fmt(tr.borrowings)})</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        <Metric label="보통예금" value={fmt(tr.cashBalance)} unit="백만원"/><Metric label="정기예금 (우리·기업·산업)" value={fmt(tr.deposits)} unit="백만원"/>{tr.elb>0&&<Metric label="ELB (주가연계파생결합사채, 한투 6개월)" value={fmt(tr.elb)} unit="백만원"/>}<Metric label="외화 (USD·JPY 보유)" value={fmt(tr.foreignCurrency)} unit="백만원"/><Metric label="차입금 (IBK 기업은행)" value={fmt(tr.borrowings)} unit="백만원" color={C.amber}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:isMobile?8:10,marginBottom:4}}>
        {[{l:"금주 흐름",v:fmt(tr.weeklyFlow),u:"백만원",c:tr.weeklyFlow>=0?C.up:C.down},{l:"당월 누적 흐름",v:fmt(mCumFlow),u:"백만원",c:mCumFlow>=0?C.up:C.down},{l:"월평균 Burn Rate",v:mBurn!=null?`△${fmt(Math.abs(mBurn))}`:"—",u:"백만원/월",c:C.amber},{l:"Runway",v:tr.runway==null?"—":tr.runway,u:tr.runway==null?"":"개월",c:C.text}].map((x,i)=>(<div key={i} style={{textAlign:"center",padding:"10px 6px",background:"rgba(255,255,255,0.02)",borderRadius:6}}><div style={{fontSize:10,color:C.textDim,marginBottom:2}}>{x.l}</div><div style={{fontSize:18,fontWeight:700,color:x.c}}>{x.v}<span style={{fontSize:10,color:C.textMuted,marginLeft:2}}>{x.u}</span></div></div>))}
      </div>
      {cashTD.length>1&&<div style={{marginTop:14}}><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>📈 Net Cash 추이 (최근 6주)</div><div style={{height:130}}><ResponsiveContainer><LineChart data={cashTD} margin={{top:5,right:10,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="wk" tick={seamTick} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:"#cbd5e1"}} axisLine={false} tickLine={false} domain={["dataMin-2000","dataMax+2000"]}/><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:"#f1f5f9"}} labelStyle={{color:"#f1f5f9"}} itemStyle={{color:"#f1f5f9"}} formatter={v=>[`${fmt(v)}백만원`,"Net Cash"]}/><Line type="monotone" dataKey="netCash" stroke="#60a5fa" strokeWidth={2} dot={{r:3,fill:"#60a5fa"}}/></LineChart></ResponsiveContainer></div></div>}
      {cashTD.length>1&&<div style={{marginTop:10}}><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>💧 주간 순흐름 (양=유입, 음=유출)</div><div style={{height:120}}><ResponsiveContainer><AreaChart data={cashTD.map(d=>({...d,flowPos:d.flow>0?d.flow:0,flowNeg:d.flow<0?d.flow:0}))} margin={{top:5,right:10,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="wk" tick={seamTick} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:"#cbd5e1"}} axisLine={false} tickLine={false}/><ReferenceLine y={0} stroke={C.textDim} strokeDasharray="3 3"/><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:"#f1f5f9"}} labelStyle={{color:"#f1f5f9"}} itemStyle={{color:"#f1f5f9"}} formatter={(v,n)=>{if(n==="유입")return v>0?[`+${fmt(v)}백만원`,"유입"]:[null,null];if(n==="유출")return v<0?[`${fmt(v)}백만원`,"유출"]:[null,null];return[`${fmt(v)}백만원`,n];}} itemSorter={()=>0}/><Area type="monotone" dataKey="flowPos" stroke="#34d399" fill="#34d399" fillOpacity={0.35} strokeWidth={2} name="유입" dot={{r:3,fill:"#34d399"}}/><Area type="monotone" dataKey="flowNeg" stroke="#f87171" fill="#f87171" fillOpacity={0.35} strokeWidth={2} name="유출" dot={{r:3,fill:"#f87171"}}/></AreaChart></ResponsiveContainer></div></div>}
      {(()=>{const cf=tr;const hasCF=cf.cfInSales!=null||cf.cfInOther!=null||cf.cfOutLabor!=null;if(!hasCF)return null;
        const totalIn=(cf.cfInSales||0)+(cf.cfInOther||0);const totalOut=(cf.cfOutLabor||0)+(cf.cfOutMaterial||0)+(cf.cfOutOpex||0)+(cf.cfInvest||0);
        const mw=wKeys.filter(k=>WS[k]?.monthIndex===mi&&k<=weekKey);const cu={inS:0,inO:0,outL:0,outM:0,outX:0,inv:0};
        for(const wk of mw){const t=WS[wk]?.treasury;if(!t)continue;cu.inS+=(t.cfInSales||0);cu.inO+=(t.cfInOther||0);cu.outL+=(t.cfOutLabor||0);cu.outM+=(t.cfOutMaterial||0);cu.outX+=(t.cfOutOpex||0);cu.inv+=(t.cfInvest||0);}
        const cumIn=cu.inS+cu.inO;const cumOut=cu.outL+cu.outM+cu.outX+cu.inv;
        const items=[{n:"매출대금",v:cf.cfInSales||0,c:cu.inS,t:"in"},{n:"기타수입",v:cf.cfInOther||0,c:cu.inO,t:"in"},{n:"인건비",v:cf.cfOutLabor||0,c:cu.outL,t:"out"},{n:"원자재",v:cf.cfOutMaterial||0,c:cu.outM,t:"out"},{n:"운영비",v:cf.cfOutOpex||0,c:cu.outX,t:"out"},{n:"투자",v:cf.cfInvest||0,c:cu.inv,t:"out"}];
        return(<div style={{marginTop:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:8}}>💸 주간 입출금 Breakdown</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div style={{padding:"8px 10px",background:"rgba(239,68,68,0.08)",borderRadius:6,textAlign:"center"}}><div style={{fontSize:10,color:C.textDim}}>금주 유입</div><div style={{fontSize:18,fontWeight:700,color:C.up}}>+{fmt(totalIn)}<span style={{fontSize:10,color:C.textDim,marginLeft:2}}>백만원</span></div><div style={{fontSize:10,color:C.textDim,marginTop:2}}>당월 누적 +{fmt(cumIn)}</div></div>
                <div style={{padding:"8px 10px",background:"rgba(59,130,246,0.08)",borderRadius:6,textAlign:"center"}}><div style={{fontSize:10,color:C.textDim}}>금주 유출</div><div style={{fontSize:18,fontWeight:700,color:C.down}}>△{fmt(totalOut)}<span style={{fontSize:10,color:C.textDim,marginLeft:2}}>백만원</span></div><div style={{fontSize:10,color:C.textDim,marginTop:2}}>당월 누적 △{fmt(cumOut)}</div></div>
              </div>
              <DT compact headers={["항목","금주(백만원)","당월누적(백만원)","구분"]} rows={items.filter(x=>x.v>0||x.c>0).map(x=>[x.n,fmt(x.v),fmt(x.c),{v:x.t==="in"?"유입":"유출",color:x.t==="in"?C.up:C.down}])}/>
            </div>
            <div style={{height:180}}><ResponsiveContainer>
              <BarChart data={[{name:"유입","매출대금":cf.cfInSales||0,"기타수입":cf.cfInOther||0},{name:"유출","인건비":cf.cfOutLabor||0,"원자재":cf.cfOutMaterial||0,"운영비":cf.cfOutOpex||0,"투자":cf.cfInvest||0}]} barSize={40} margin={{top:5,right:10,bottom:0,left:0}}>
                <XAxis dataKey="name" tick={{fontSize:10,fill:"#cbd5e1"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:"#cbd5e1"}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:"#f1f5f9"}} labelStyle={{color:"#f1f5f9"}} itemStyle={{color:"#f1f5f9"}} formatter={(v,n)=>v>0?[`${fmt(v)}백만원`,n]:[null,null]}/><Legend wrapperStyle={{fontSize:9}}/>
                <Bar dataKey="매출대금" stackId="a" fill="#34d399"/><Bar dataKey="기타수입" stackId="a" fill="#60a5fa" radius={[3,3,0,0]}/>
                <Bar dataKey="인건비" stackId="a" fill="#f87171"/><Bar dataKey="원자재" stackId="a" fill="#fb923c"/><Bar dataKey="운영비" stackId="a" fill="#fbbf24"/><Bar dataKey="투자" stackId="a" fill="#a78bfa" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer></div>
          </div>
          <div style={{fontSize:9,color:C.textDim,marginTop:4}}>※ 매출대금=고객수금, 기타수입=이자+기타, 운영비=영업+수수료+기타+생산+임차+복리후생+금융, 투자=해외법인+R&D+자산</div>
        </div>);
      })()}
      </>}
      <Fn>※ 재무본부 주간 자금보고 기준. Gross Cash = 보통예금+정기예금+ELB+외화. Net Cash = 총잔고−차입금. 당월 누적 흐름 = 해당 월 주간흐름 합산. 월평균 Burn Rate = Net Cash ÷ Runway. Runway = Net Cash ÷ 최근 3개월 월평균 순유출. ELB = 주가연계파생결합사채, 차입금 = IBK 기업은행. 자금 데이터는 자금팀 자체 주기(월~금) 기준이며, 수주/출하 주기(금~목)와 며칠 차이가 있을 수 있습니다.</Fn>
    </Card>
  </div>);
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  MONTHLY TAB — v5.1.0                                              ║
// ╚══════════════════════════════════════════════════════════════╝
const shipRow=(nm,w,m,t)=>[nm,fmt(w),fmt(m),fmt(t),{v:pctStr(m,t),color:pctClr(m,t),bold:true}];

function MonthlyTab({monthKey,MS,WS,isMobile}){
  const M=MS[monthKey];if(!M)return<NoData msg="해당 월 데이터가 없습니다."/>;
  const r=M.revenue,p=M.pl,mi=M.monthIndex,im=M.inmarket;
  const tDom=getTT("domestic",mi),tOvs=getTT("overseas",mi);
  const dQty=sumP(M.qtyActual.domestic),oQty=sumP(M.qtyActual.overseas);
  const planAch=r.plan>0?(r.actual/r.plan)*100:0;
  const yoyAch=r.prev>0?((r.actual-r.prev)/r.prev)*100:null;
  const mKeys=Object.keys(MS).sort(),mIdx=mKeys.indexOf(monthKey);
  const cumWk=Object.keys(WS||{}).filter(k=>WS[k]?.monthIndex===mi).sort();
  const lastWk=cumWk[cumWk.length-1];const lastIM=lastWk?WS[lastWk].inmarket:null;
  const cumIM=lastIM?{us:lastIM.m.us,de:lastIM.m.de,jp:lastIM.m.jp}:null;
  const ovsYoyAch=null;const domYoyAch=null;
  const tSeg=Targets.amt;
  const fyKey=monthKey.startsWith("2026")?monthKey:monthKey;
  const cumDom=mKeys.filter(k=>k<=monthKey&&k.startsWith(fyKey.substring(0,4))).reduce((s,k)=>s+(MS[k]?.revenue?.domActual||0),0);
  const cumOvs=mKeys.filter(k=>k<=monthKey&&k.startsWith(fyKey.substring(0,4))).reduce((s,k)=>s+(MS[k]?.revenue?.ovsActual||0),0);
  const cumDomT=tSeg.domestic.slice(0,mi+1).reduce((s,v)=>s+v,0);
  const cumOvsT=tSeg.overseas.slice(0,mi+1).reduce((s,v)=>s+v,0);
  const lastM=mIdx>0?MS[mKeys[mIdx-1]]:null;

  return(<div>
    <TabIntro color={C.accent} icon="📊" title="Monthly — 가결산 분석">
      매월 가결산 후 발표되는 <strong style={{color:C.text}}>경영 성과 지표</strong>입니다. 매출(B1), P&L(B2), 운영(B3) 순으로 진단 흐름을 따라 구성되어 있습니다.<br/>
      핵심 질문: <strong style={{color:C.text}}>"실적이 계획대비 얼마나 달성되었는가? 비용은 효율적으로 관리되고 있는가? 운전자본은 건전한가?"</strong>
    </TabIntro>

    {/* B1. 매출 진단 */}
    <Card><SH icon="📈" title="B1. 매출 진단" badge={<Badge color="purple">월별</Badge>} desc="해외 매출은 본사 별도(Standalone) 기준 수출 매출과 연결(Consolidated) 기준 인마켓 매출이 다릅니다. 인마켓이 실질적인 해외 시장 점유 지표입니다."/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14,marginBottom:14}}>
        <div style={{textAlign:"center",padding:14,background:"rgba(59,130,246,0.08)",borderRadius:8}}><div style={{fontSize:10,color:C.textDim}}>당월 매출 (연결)</div><div style={{fontSize:28,fontWeight:700,color:C.accent}}>{fmtBn(r.actual)}</div><div style={{fontSize:10,color:C.textMuted,marginTop:2}}>계획 {fmtBn(r.plan)} 대비 <span style={{color:planAch>=90?C.green:planAch>=70?C.amber:C.red,fontWeight:700}}>{planAch.toFixed(1)}%</span></div></div>
        <div style={{textAlign:"center",padding:14,background:"rgba(16,185,129,0.06)",borderRadius:8}}><div style={{fontSize:10,color:C.textDim}}>국내 매출</div><div style={{fontSize:24,fontWeight:700,color:C.green}}>{fmtBn(r.domActual)}</div><div style={{fontSize:10,color:C.textMuted,marginTop:2}}>비중 {((r.domActual/r.actual)*100).toFixed(1)}%</div></div>
        <div style={{textAlign:"center",padding:14,background:"rgba(167,139,250,0.06)",borderRadius:8}}><div style={{fontSize:10,color:C.textDim}}>해외 매출 (인마켓 기준)</div><div style={{fontSize:24,fontWeight:700,color:C.purple}}>{fmtBn(r.ovsActual)}</div><div style={{fontSize:10,color:C.textMuted,marginTop:2}}>비중 {((r.ovsActual/r.actual)*100).toFixed(1)}%</div></div>
      </div>
      {(yoyAch!=null||lastM)&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:10,marginBottom:14}}>
        <div style={{padding:"8px 10px",background:"rgba(255,255,255,0.02)",borderRadius:6}}><div style={{fontSize:10,color:C.textDim}}>전월 대비 (MoM)</div><div style={{fontSize:18,fontWeight:700,color:lastM&&r.actual>=lastM.revenue.actual?C.up:C.down}}>{lastM?(((r.actual-lastM.revenue.actual)/lastM.revenue.actual)*100).toFixed(1):"—"}<span style={{fontSize:11,marginLeft:2}}>%</span></div><div style={{fontSize:10,color:C.textMuted,marginTop:2}}>{lastM?fmtBn(lastM.revenue.actual):"—"}</div></div>
        <div style={{padding:"8px 10px",background:"rgba(255,255,255,0.02)",borderRadius:6}}><div style={{fontSize:10,color:C.textDim}}>전년 동월 대비 (YoY)</div><div style={{fontSize:18,fontWeight:700,color:yoyAch>=0?C.up:C.down}}>{yoyAch!=null?yoyAch.toFixed(1):"—"}<span style={{fontSize:11,marginLeft:2}}>%</span></div><div style={{fontSize:10,color:C.textMuted,marginTop:2}}>전년 {r.prev?fmtBn(r.prev):"—"}</div></div>
        <div style={{padding:"8px 10px",background:"rgba(255,255,255,0.02)",borderRadius:6}}><div style={{fontSize:10,color:C.textDim}}>YTD 누적</div><div style={{fontSize:18,fontWeight:700,color:C.text}}>{fmtBn(cumDom+cumOvs)}</div><div style={{fontSize:10,color:C.textMuted,marginTop:2}}>계획 {fmtBn(cumDomT+cumOvsT)} ({(((cumDom+cumOvs)/(cumDomT+cumOvsT))*100).toFixed(1)}%)</div></div>
      </div>}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
        <div><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>📊 지역별 매출 (3개월 추이)</div>
          <div style={{height:200}}><ResponsiveContainer><BarChart data={M.regions[0].data.map((_,idx)=>{const o={m:M.regions[0].data[idx].m};M.regions.forEach(rg=>{o[rg.name]=rg.data[idx]?.v||0;});return o;})} barSize={28} margin={{top:5,right:10,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="m" tick={{fontSize:10,fill:"#cbd5e1"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:"#cbd5e1"}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:"#f1f5f9"}} labelStyle={{color:"#f1f5f9"}} itemStyle={{color:"#f1f5f9"}} formatter={v=>[fmtBn(v),null]}/><Legend wrapperStyle={{fontSize:9}}/>{M.regions.map(rg=>(<Bar key={rg.name} dataKey={rg.name} stackId="a" fill={rg.color}/>))}</BarChart></ResponsiveContainer></div>
        </div>
        <div><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>📊 지역별 당월 vs 계획</div>
          <DT compact headers={["지역","당월","계획","달성률"]} rows={M.regions.map(rg=>[rg.name,fmtBn(rg.data[rg.data.length-1].v),fmtBn(rg.target),{v:pctStr(rg.data[rg.data.length-1].v,rg.target),color:pctClr(rg.data[rg.data.length-1].v,rg.target),bold:true}])}/>
        </div>
      </div>
      <Fn>※ 연결(Consolidated) 기준. 국내 매출 = 본사+자회사 통합. 해외 매출 = 지사국 인마켓+대리점국 매출 합산.</Fn>
    </Card>

    {/* B2. P&L */}
    <Card><SH icon="💼" title="B2. 손익 구조 (P&L)" badge={<Badge color="purple">월별</Badge>} desc="매출총이익(GP) → 판관비(SG&A) → 영업손익(OP) 흐름을 분석합니다. 비용 그룹별로 사업계획 대비 차이를 확인하세요."/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14,marginBottom:14}}>
        <div style={{textAlign:"center",padding:12,background:"rgba(255,255,255,0.02)",borderRadius:6}}><div style={{fontSize:10,color:C.textDim}}>매출총이익 (GP)</div><div style={{fontSize:22,fontWeight:700,color:C.green}}>{fmtBn(p.grossProfit)}</div><div style={{fontSize:10,color:C.textMuted,marginTop:2}}>GP 마진율 {p.grossMarginPct.toFixed(1)}%</div></div>
        <div style={{textAlign:"center",padding:12,background:"rgba(255,255,255,0.02)",borderRadius:6}}><div style={{fontSize:10,color:C.textDim}}>영업손익 (OP)</div><div style={{fontSize:22,fontWeight:700,color:p.opLoss.actual>=0?C.green:C.red}}>{p.opLoss.actual>=0?"+":""}{fmtBn(p.opLoss.actual)}</div><div style={{fontSize:10,color:C.textMuted,marginTop:2}}>계획 {p.opLoss.plan>=0?"+":""}{fmtBn(p.opLoss.plan)}</div></div>
        <div style={{textAlign:"center",padding:12,background:"rgba(255,255,255,0.02)",borderRadius:6}}><div style={{fontSize:10,color:C.textDim}}>EBITDA</div><div style={{fontSize:22,fontWeight:700,color:p.ebitda.actual>=0?C.green:C.red}}>{p.ebitda.actual>=0?"+":""}{fmtBn(p.ebitda.actual)}</div><div style={{fontSize:10,color:C.textMuted,marginTop:2}}>계획 {p.ebitda.plan>=0?"+":""}{fmtBn(p.ebitda.plan)}</div></div>
      </div>
      <div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>📊 비용 그룹별 (계획 vs 실적, 백만원)</div>
      <DT compact headers={["비용 그룹","계획","실적","차이","증감률"]} rows={p.costGroups.map(cg=>{const diff=cg.actual-cg.plan,pct=cg.plan>0?(diff/cg.plan)*100:0;return[cg.name,fmt(cg.plan),fmt(cg.actual),{v:(diff>0?"+":"")+fmt(diff),color:diff>0?C.red:C.green},{v:(pct>0?"+":"")+pct.toFixed(1)+"%",color:pct>0?C.red:C.green,bold:true}];})}/>
      <Fn>※ 비용 차이 양수(+) = 계획 대비 초과 지출 = 적자 확대 요인. 음수(−) = 계획 대비 절감 = 손익 개선 기여.</Fn>
    </Card>

    {/* B3. 운영 */}
    <Card><SH icon="📦" title="B3. 운영 지표 (인마켓·재고·매출채권)" badge={<Badge color="purple">월별</Badge>} desc="인마켓(B3-1) → 재고(B3-2) → 매출채권(B3-3) → 생산계획(B3-4) 4개 영역. 매출이 운영 효율로 어떻게 이어지고 있는지를 점검합니다."/>
      {/* B3-1 인마켓 */}
      <div style={{padding:"10px 12px",background:"rgba(167,139,250,0.04)",borderRadius:6,marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:C.purple,marginBottom:8}}>B3-1. 월간 인마켓 (해외 실매출 + 국내)</div>
        {im?(<>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(4,1fr)",gap:10,marginBottom:10}}>
            {[{l:"국내",v:im.domTotal,c:C.accent,p:im.prev?.domTotal},{l:"해외(지사국 인마켓)",v:im.corpTotal,c:C.purple,p:im.prev?.corpTotal},{l:"해외(대리점국 출하)",v:im.distTotal,c:C.amber,p:im.prev?.distTotal},{l:"전체",v:im.grandTotal,c:C.green,p:im.prev?.grandTotal}].map((x,i)=>{const mom=x.p>0?((x.v-x.p)/x.p)*100:null;return(<div key={i} style={{textAlign:"center",padding:"8px 6px",background:"rgba(255,255,255,0.02)",borderRadius:6}}><div style={{fontSize:10,color:C.textDim}}>{x.l}</div><div style={{fontSize:18,fontWeight:700,color:x.c}}>{fmt(x.v)}<span style={{fontSize:9,color:C.textMuted,marginLeft:2}}>대</span></div>{mom!=null&&<div style={{fontSize:10,color:mom>=0?C.up:C.down,marginTop:2}}>{mom>=0?"▲":"▼"}{Math.abs(mom).toFixed(1)}%</div>}</div>);})}
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
            <DT compact headers={["국가/채널","당월(대)","비중"]} rows={[{l:"🇺🇸 미국 (LMUS)",v:im.overseas.us,t:"corp"},{l:"🇩🇪 독일 (LMG)",v:im.overseas.de,t:"corp"},{l:"🇯🇵 일본 (LMJ)",v:im.overseas.jp,t:"corp"},{l:"🌍 대리점국 (디스트리뷰터)",v:im.distTotal,t:"dist"},{l:"🇰🇷 국내",v:im.domTotal,t:"dom"}].map(x=>[x.l,fmt(x.v),`${im.grandTotal>0?((x.v/im.grandTotal)*100).toFixed(1):"0"}%`])}/>
            <div>
              <div style={{fontSize:10,color:C.textDim,marginBottom:4}}>국가별 당월 인마켓 (AS/VS 분리)</div>
              <DT compact headers={["국가","AS","VS","합계"]} rows={[["🇺🇸 미국",fmt(im.corp.us?.AS||0),fmt(im.corp.us?.VS||0),{v:fmt((im.corp.us?.AS||0)+(im.corp.us?.VS||0)),bold:true}],["🇩🇪 독일",fmt(im.corp.de?.AS||0),fmt(im.corp.de?.VS||0),{v:fmt((im.corp.de?.AS||0)+(im.corp.de?.VS||0)),bold:true}],["🇯🇵 일본",fmt(im.corp.jp?.AS||0),fmt(im.corp.jp?.VS||0),{v:fmt((im.corp.jp?.AS||0)+(im.corp.jp?.VS||0)),bold:true}],[{v:"지사국 합계",bold:true},{v:fmt(im.corp.AS),bold:true},{v:fmt(im.corp.Seal),bold:true},{v:fmt(im.corpTotal),bold:true}]]}/>
            </div>
          </div>
          <Fn>※ 인마켓 = 지사국이 현지 병원·유통에 최종 판매. 대리점국 출하 = 본사→대리점 선적(매출 인식). 국내 = 본사 직판+대리점 매출(가납 출고 합산). MoM은 전월 대비.</Fn>
        </>):<NoData msg="해당 월 인마켓 데이터 미수신"/>}
      </div>

      {/* B3-2 재고 */}
      <div style={{padding:"10px 12px",background:"rgba(245,158,11,0.04)",borderRadius:6,marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:8}}>B3-2. 재고 현황</div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
          <Metric label="국내 재고 (백만원)" value={fmt(M.inventory.domestic)} sub={M.inventory.domesticDetail?`5mm:${M.inventory.domesticDetail.fiveMm} / 8mm:${M.inventory.domesticDetail.eightMm} / Seal:${M.inventory.domesticDetail.artiSeal}`:"세부내역 미수신"}/>
          <Metric label="해외 재고 (백만원)" value={fmt(M.inventory.overseas)} sub={M.inventory.overseasDetail?`LMJ:${M.inventory.overseasDetail.LMJ} / LMG:${M.inventory.overseasDetail.LMG} / LMUS:${M.inventory.overseasDetail.LMUS}`:"세부내역 미수신"}/>
        </div>
        {M.invTrend?.length>1&&<div style={{marginTop:10,height:140}}><ResponsiveContainer><LineChart data={M.invTrend} margin={{top:5,right:10,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="m" tick={{fontSize:9,fill:"#cbd5e1"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:"#cbd5e1"}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:"#f1f5f9"}} labelStyle={{color:"#f1f5f9"}} itemStyle={{color:"#f1f5f9"}} formatter={v=>[`${fmt(v)}백만원`,null]}/><Legend wrapperStyle={{fontSize:9}}/><Line type="monotone" dataKey="dom" stroke="#3b82f6" strokeWidth={2} dot={{r:3,fill:"#3b82f6"}} name="국내"/><Line type="monotone" dataKey="ovs" stroke="#a78bfa" strokeWidth={2} dot={{r:3,fill:"#a78bfa"}} name="해외"/></LineChart></ResponsiveContainer></div>}
        <Fn>※ 본사 재고 = 창고별재고원장조회. 가납재고(병원 위탁)는 별도 항목. 해외 재고 = 지사국 보유 재고(LMUS·LMG·LMJ).</Fn>
      </div>

      {/* B3-3 매출채권 */}
      <div style={{padding:"10px 12px",background:"rgba(239,68,68,0.04)",borderRadius:6,marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:C.red,marginBottom:8}}>B3-3. 매출채권 (AR)</div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
          <Metric label="회수율" value={`${M.ar.collectionRate.toFixed(1)}%`} color={M.ar.collectionRate>=85?C.green:C.amber}/>
          <Metric label="장기연체 잔액 (백만원)" value={fmt(M.ar.longOverdue)} sub={M.ar.detail||"—"} color={M.ar.longOverdue<100?C.green:C.red}/>
        </div>
        {M.arTrend?.length>1&&<div style={{marginTop:10,height:140}}><ResponsiveContainer><ComposedChart data={M.arTrend} margin={{top:5,right:10,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="m" tick={{fontSize:9,fill:"#cbd5e1"}} axisLine={false} tickLine={false}/><YAxis yAxisId="left" tick={{fontSize:9,fill:"#cbd5e1"}} axisLine={false} tickLine={false} domain={[80,100]}/><YAxis yAxisId="right" orientation="right" tick={{fontSize:9,fill:"#cbd5e1"}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:"#f1f5f9"}} labelStyle={{color:"#f1f5f9"}} itemStyle={{color:"#f1f5f9"}}/><Legend wrapperStyle={{fontSize:9}}/><Bar yAxisId="right" dataKey="overdue" fill="#ef4444" name="장기연체(백만원)" radius={[3,3,0,0]}/><Line yAxisId="left" type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={{r:3,fill:"#10b981"}} name="회수율(%)"/></ComposedChart></ResponsiveContainer></div>}
        <Fn>※ 회수율 = 만기 도래 채권 중 실제 회수 비율. 장기연체 = 90일 초과 미수금. 90% 이상 = 양호, 80% 미만 = 위험.</Fn>
      </div>

      {/* B3-4 생산계획 */}
      {M.forecast?.length>0&&<div style={{padding:"10px 12px",background:"rgba(16,185,129,0.04)",borderRadius:6}}>
        <div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:8}}>B3-4. 향후 3개월 생산계획 (Forecast)</div>
        <DT compact headers={["월","계획 수량(대)","조달 분기"]} rows={M.forecast.map(f=>[f.m,fmt(f.fcQty),`${f.ti}분기`])}/>
        <Fn>※ 생산실 발행 Forecast. 자재 조달 리드타임을 고려한 향후 3개월 예상 생산량.</Fn>
      </div>}
    </Card>
  </div>);
}

// ╔═════════════════════════════════════╗
// ║  QUARTERLY TAB                       ║
// ╚═════════════════════════════════════╝
function QuarterlyTab({quarterKey,QS,isMobile}){
  const Q=QS[quarterKey];if(!Q)return<NoData msg="해당 분기 데이터가 없습니다."/>;
  return(<div>
    <TabIntro color={C.purple} icon="🏛️" title="Quarterly — 분기 확정 분석">
      분기 확정 결산 후 발표되는 <strong style={{color:C.text}}>전략 성과 지표</strong>입니다. P&L 추이(C1), 자회사별 손익(C2), 재무구조(C3), 자금흐름·IPO 자금사용(C4) 4개 영역.<br/>
      핵심 질문: <strong style={{color:C.text}}>"분기 트렌드는 개선되고 있는가? 자회사별 손익 구조는 어떠한가? 재무 건전성과 IPO 자금 집행은 계획대로 진행되는가?"</strong>
    </TabIntro>
    <Card><SH icon="📊" title="C1. P&L 분기 추이" badge={<Badge color="purple">분기</Badge>} desc="최근 4개 분기 매출과 영업손익 추이. 매출은 확대되고 있는지, 영업적자는 축소되고 있는지를 확인합니다."/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
        <div style={{textAlign:"center",padding:14,background:"rgba(167,139,250,0.06)",borderRadius:8}}><div style={{fontSize:10,color:C.textDim}}>YTD 누적 매출</div><div style={{fontSize:28,fontWeight:700,color:C.purple}}>{fmtBn(Q.cumRevenue*100)}</div></div>
        <div style={{textAlign:"center",padding:14,background:"rgba(239,68,68,0.06)",borderRadius:8}}><div style={{fontSize:10,color:C.textDim}}>YTD 누적 영업손실</div><div style={{fontSize:28,fontWeight:700,color:C.red}}>{fmtBn(Q.cumOpLoss*100)}</div></div>
      </div>
      <div style={{marginTop:14,height:200}}><ResponsiveContainer><ComposedChart data={Q.plTrend} margin={{top:5,right:10,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="q" tick={{fontSize:10,fill:"#cbd5e1"}} axisLine={false} tickLine={false}/><YAxis yAxisId="left" tick={{fontSize:9,fill:"#cbd5e1"}} axisLine={false} tickLine={false}/><YAxis yAxisId="right" orientation="right" tick={{fontSize:9,fill:"#cbd5e1"}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:"#f1f5f9"}} labelStyle={{color:"#f1f5f9"}} itemStyle={{color:"#f1f5f9"}} formatter={v=>[`${v}억`,null]}/><Legend wrapperStyle={{fontSize:9}}/><Bar yAxisId="left" dataKey="rev" fill="#a78bfa" name="매출(억)" radius={[3,3,0,0]}/><Line yAxisId="right" type="monotone" dataKey="opLoss" stroke="#ef4444" strokeWidth={2} dot={{r:4,fill:"#ef4444"}} name="영업손익(억)"/></ComposedChart></ResponsiveContainer></div>
    </Card>
    <Card><SH icon="🌐" title="C2. 자회사별 손익" badge={<Badge color="purple">분기</Badge>} desc="자회사 누적 영업손실 분포. 가장 큰 적자 발생처가 전사 손익에 미치는 영향을 가늠합니다."/>
      <DT headers={["법인","매출","GP","SG&A","영업손익","비중"]} rows={Q.entities.map(e=>[e.name,e.rev,e.gp,e.sga,{v:e.opLoss,color:C.red,bold:true},e.share])}/>
    </Card>
    <Card><SH icon="🏦" title="C3. 재무구조 (BS)" badge={<Badge color="purple">분기</Badge>} desc="유동비율(>200% 양호), 부채비율(<50% 양호) 기준. IPO 후 자본 확충 효과를 확인합니다."/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
        <Metric label="총자산" value={fmtBn(Q.bs.totalAssets*100)}/>
        <Metric label="자본" value={fmtBn(Q.bs.equity*100)}/>
        <Metric label="유동비율" value={`${Q.bs.currentRatio.toFixed(1)}%`} color={Q.bs.currentRatio>=200?C.green:C.amber}/>
        <Metric label="부채비율" value={`${Q.bs.debtRatio.toFixed(1)}%`} color={Q.bs.debtRatio<50?C.green:C.amber}/>
      </div>
    </Card>
    <Card><SH icon="💰" title="C4. 자금흐름 + IPO 자금 사용" badge={<Badge color="purple">분기</Badge>} desc="IPO 조달자금(약 1,200억) 사용 진척률. 4개 영역(R&D, 해외시장, 운영, 시설) 계획 대비 집행률을 확인합니다."/>
      <div style={{height:200}}><ResponsiveContainer><LineChart data={Q.cashTrend} margin={{top:5,right:10,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="q" tick={{fontSize:9,fill:"#cbd5e1"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:"#cbd5e1"}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:"#f1f5f9"}} labelStyle={{color:"#f1f5f9"}} itemStyle={{color:"#f1f5f9"}} formatter={v=>[`${fmt(v)}억`,null]}/><Legend wrapperStyle={{fontSize:9}}/><Line type="monotone" dataKey="cash" stroke="#3b82f6" strokeWidth={2} dot={{r:3,fill:"#3b82f6"}} name="총현금"/><Line type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} dot={{r:3,fill:"#10b981"}} name="순현금"/></LineChart></ResponsiveContainer></div>
      {Q.ipoFunds&&<div style={{marginTop:14}}>
        <div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>📊 IPO 자금 사용 현황</div>
        <DT compact headers={["용도","조달계획(억)","집행(억)","집행률"]} rows={Q.ipoFunds.map(f=>[f.label,fmt(f.plan),fmt(f.used),{v:`${((f.used/f.plan)*100).toFixed(1)}%`,color:pctClr(f.used,f.plan),bold:true}])}/>
      </div>}
    </Card>
  </div>);
}

// ╔═══════════════════════════════════════╗
// ║  DASHBOARD MAIN                       ║
// ╚═══════════════════════════════════════╝
function Dashboard(){
  const isMobile=useIsMobile(768);
  const [tab,setTab]=useState("weekly");
  const [data,setData]=useState({WS:fallbackWeekly,MS:fallbackMonthly,QS:fallbackQuarterly});
  const [weekKey,setWeekKey]=useState("2026.03 W4");
  const [monthKey,setMonthKey]=useState("2025-11");
  const [quarterKey,setQuarterKey]=useState("FY25-Q3");
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState(null);
  const [updated,setUpdated]=useState("");

  const loadData=useCallback(async()=>{
    setLoading(true);setErr(null);
    try{
      const sheetId="1K8ZVdxGAj-bUe5hdLQDE2c2bFAz0NpXkXwVlhohrWWg";
      const [wsR,trR,mpR,msR,imR,qR]=await Promise.all([fetchSheet(sheetId,"Weekly_Shipments"),fetchSheet(sheetId,"Weekly_Treasury"),fetchSheet(sheetId,"Monthly_PL"),fetchSheet(sheetId,"Monthly_Sub"),fetchSheet(sheetId,"Monthly_Inmarket").catch(()=>[]),fetchSheet(sheetId,"Quarterly_Summary")]);
      let WS=csvToWeeklyShipments(wsR);WS=mergeTreasury(WS,trR);
      let MS=csvToMonthly(mpR,msR);MS=mergeInmarket(MS,imR);
      const QS=csvToQuarterly(qR);
      setData({WS,MS,QS});
      const wK=Object.keys(WS).sort(),mK=Object.keys(MS).sort(),qK=Object.keys(QS).sort();
      if(wK.length)setWeekKey(wK[wK.length-1]);
      if(mK.length)setMonthKey(mK[mK.length-1]);
      if(qK.length)setQuarterKey(qK[qK.length-1]);
      setUpdated(new Date().toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}));
    }catch(e){setErr(e.message);}finally{setLoading(false);}
  },[]);
  useEffect(()=>{loadData();},[loadData]);

  const wKeys=Object.keys(data.WS).sort();
  const mKeys=Object.keys(data.MS).sort();
  const qKeys=Object.keys(data.QS).sort();

  return(<div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"-apple-system,BlinkMacSystemFont,'Pretendard','Segoe UI',Roboto,sans-serif"}}>
    <style>{`.lm-card{}@media(max-width:768px){.lm-card{padding:10px 8px !important;margin-bottom:10px !important;border-radius:6px !important;} body{font-size:14px;}}`}</style>
    <div style={{maxWidth:isMobile?"100%":1200,margin:"0 auto",padding:isMobile?"10px 6px":"20px 24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:isMobile?10:14}}>
        <div style={{fontSize:isMobile?15:18,fontWeight:700}}><span style={{color:C.accent}}>LIVSMED</span> Executive Dashboard <span style={{fontSize:10,color:C.textDim,fontWeight:400}}>v5.2.1</span></div>
        <div style={{display:"flex",alignItems:"center",gap:8,fontSize:10,color:C.textDim}}>
          {updated&&<span>업데이트: {updated}</span>}
          <button onClick={loadData} disabled={loading} style={{padding:"4px 10px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,cursor:loading?"wait":"pointer",fontSize:10}}>{loading?"⏳":"🔄"} {loading?"로딩":"동기화"}</button>
        </div>
      </div>
      {err&&<div style={{padding:"8px 12px",marginBottom:12,borderRadius:6,background:C.amberBg,border:`1px solid ${C.amber}33`,fontSize:11,color:C.amber}}>⚠ Sheets 로드 실패: {err} (Fallback 데이터 표시 중)</div>}
      <div style={{display:"flex",gap:6,marginBottom:14,borderBottom:`1px solid ${C.border}`,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        {[{k:"weekly",l:"📡 Weekly",c:C.weekly},{k:"monthly",l:"📊 Monthly",c:C.monthly},{k:"quarterly",l:"🏛️ Quarterly",c:C.quarterly}].map(t=>(<button key={t.k} onClick={()=>setTab(t.k)} style={{padding:isMobile?"10px 14px":"8px 16px",border:"none",background:"transparent",color:tab===t.k?t.c:C.textMuted,fontSize:isMobile?13:13,fontWeight:tab===t.k?700:500,cursor:"pointer",borderBottom:tab===t.k?`2px solid ${t.c}`:"2px solid transparent",transition:"all 0.2s",whiteSpace:"nowrap",flexShrink:0}}>{t.l}</button>))}
      </div>
      {tab==="weekly"&&<>
        <PeriodNav keys={wKeys} current={weekKey} onChange={setWeekKey} colorActive={C.weekly} isMobile={isMobile}/>
        <WeeklyTab weekKey={weekKey} WS={data.WS} isMobile={isMobile}/>
      </>}
      {tab==="monthly"&&<>
        <PeriodNav keys={mKeys} current={monthKey} onChange={setMonthKey} colorActive={C.monthly} labels={Object.fromEntries(mKeys.map(k=>[k,data.MS[k]?.label||k]))} isMobile={isMobile}/>
        <MonthlyTab monthKey={monthKey} MS={data.MS} WS={data.WS} isMobile={isMobile}/>
      </>}
      {tab==="quarterly"&&<>
        <PeriodNav keys={qKeys} current={quarterKey} onChange={setQuarterKey} colorActive={C.quarterly} labels={Object.fromEntries(qKeys.map(k=>[k,data.QS[k]?.label||k]))} isMobile={isMobile}/>
        <QuarterlyTab quarterKey={quarterKey} QS={data.QS} isMobile={isMobile}/>
      </>}
      <div style={{marginTop:24,paddingTop:14,borderTop:`1px solid ${C.border}`,fontSize:10,color:C.textDim,textAlign:"center"}}>
        LIVSMED Executive Dashboard v5.2.1 · 전략기획실 전략팀 · {new Date().getFullYear()}
      </div>
    </div>
  </div>);
}

// ╔═══════════════════════════════════════╗
// ║  PASSWORD GATE                        ║
// ╚═══════════════════════════════════════╝
function PasswordGate(){
  const [pw,setPw]=useState("");const [ok,setOk]=useState(()=>typeof window!=="undefined"&&sessionStorage.getItem("livsmed_dash_auth")==="1");const [err,setErr]=useState(false);
  if(ok)return<Dashboard/>;
  const submit=()=>{if(pw===DASHBOARD_PASSWORD){sessionStorage.setItem("livsmed_dash_auth","1");setOk(true);}else{setErr(true);setPw("");}};
  return(<div style={{minHeight:"100vh",background:C.bg,color:C.text,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"-apple-system,BlinkMacSystemFont,'Pretendard','Segoe UI',Roboto,sans-serif"}}>
    <div style={{padding:32,background:C.card,borderRadius:12,border:`1px solid ${C.border}`,minWidth:300}}>
      <div style={{fontSize:18,fontWeight:700,marginBottom:6}}><span style={{color:C.accent}}>LIVSMED</span> Executive Dashboard</div>
      <div style={{fontSize:12,color:C.textMuted,marginBottom:20}}>전략기획실 임원용 대시보드</div>
      <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr(false);}} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="비밀번호" style={{width:"100%",padding:"10px 12px",fontSize:13,background:C.bg,border:`1px solid ${err?C.red:C.border}`,borderRadius:6,color:C.text,outline:"none",marginBottom:err?6:14}} autoFocus/>
      {err&&<div style={{fontSize:11,color:C.red,marginBottom:10}}>비밀번호가 올바르지 않습니다.</div>}
      <button onClick={submit} style={{width:"100%",padding:"10px",fontSize:13,fontWeight:600,background:C.accent,color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}}>접속</button>
    </div>
  </div>);
}

export default PasswordGate;
