import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, Cell } from "recharts";
import Papa from "papaparse";

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  LIVSMED Executive Dashboard v3.2 — Google Sheets Integration           ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ── Password (변경 시 이 값만 수정) ──
const DASHBOARD_PASSWORD = "livsmed1000jo";

// ── Targets (하드코딩 — 사업계획 변경 시만 수정) ──
const Targets={
  qty:{domestic:{ArtiSential:[6685,6595,7465,6356,6434,6899,10521,11701,13379,14059,14828,16267],ArtiSeal:[1310,1490,1730,985,1015,1145,1715,1930,2190,2950,3145,3395],ArtiStapler:[0,0,0,0,0,0,100,100,200,400,600,600]},
    overseas:{ArtiSential:[851,5008,6160,5243,5888,8298,7293,9408,19083,9019,10039,29759],ArtiSeal:[370,845,1235,895,1025,1475,1344,1386,4435,1451,2731,7772],ArtiStapler:[0,0,0,0,0,0,0,0,0,0,0,0]}},
  amt:{domestic:[3223,3239,3757,3095,3166,3401,5131,5677,6510,7239,7786,8481],overseas:[568,2753,3500,2875,3231,4546,3987,4902,10776,4758,5921,17201],combined:[3791,5992,7257,5970,6396,7947,9118,10580,17286,11997,13707,25682]}
};
const getTT=(r,mi)=>(Targets.qty[r].ArtiSential[mi]||0)+(Targets.qty[r].ArtiSeal[mi]||0)+(Targets.qty[r].ArtiStapler[mi]||0);

// ── Fallback Data (Sheets 연결 전 또는 fetch 실패 시) ──
const fallbackWeekly={"2026-W04":{label:"2026.01 W4 (1/20~1/24)",updated:"2026.01.27 월",shipments:{domestic:{weekly:{ArtiSential:1520,ArtiSeal:290,ArtiStapler:0},mtd:{ArtiSential:5730,ArtiSeal:1070,ArtiStapler:0}},overseas:{weekly:{ArtiSential:220,ArtiSeal:90,ArtiStapler:0},mtd:{ArtiSential:740,ArtiSeal:300,ArtiStapler:0}}},orders:{domestic:{weekly:{ArtiSential:1450,ArtiSeal:310,ArtiStapler:0},mtd:{ArtiSential:4300,ArtiSeal:830,ArtiStapler:0},backlog:3800},overseas:{weekly:{ArtiSential:280,ArtiSeal:105,ArtiStapler:0},mtd:{ArtiSential:930,ArtiSeal:365,ArtiStapler:0},backlog:2500}},inmarket:{domestic:{mtd:null,note:"직판병원 실사용량 미확정"},overseas:{weekly:{ArtiSential:190,ArtiSeal:78,ArtiStapler:0},mtd:{ArtiSential:670,ArtiSeal:273,ArtiStapler:0}}},backorder:{domestic:16,overseas:12,avgDelay:5.2,totalQty:385,reasons:["대리점 보관요청","재고부족"],prev:{domestic:15,overseas:10,avgDelay:4.8}},treasury:{cashBalance:13800,deposits:110000,elb:0,foreignCurrency:625,borrowings:3000,netCash:121425,weeklyFlow:-315,prevFlow:-1970,runway:24.2,trend:[{wk:"W01",flow:0},{wk:"W02",flow:-1472},{wk:"W03",flow:-998},{wk:"W04",flow:-315}]},monthIndex:0},"2026-W09":{label:"2026.03 W1 (3/2~3/6)",updated:"2026.03.09 월",shipments:{domestic:{weekly:null,mtd:null},overseas:{weekly:null,mtd:null}},orders:{domestic:{weekly:null,mtd:null,backlog:null},overseas:{weekly:null,mtd:null,backlog:null}},inmarket:{domestic:{mtd:null,note:"미확정"},overseas:{weekly:null,mtd:null}},backorder:{domestic:16,overseas:12,avgDelay:5.2,totalQty:385,reasons:["대리점 보관요청","재고부족"],prev:{domestic:16,overseas:12,avgDelay:5.2}},treasury:{cashBalance:14428,deposits:100000,elb:5000,foreignCurrency:684,borrowings:3000,netCash:117112,weeklyFlow:566,prevFlow:-3745,runway:23.3,trend:[{wk:"W06",flow:-315},{wk:"W07",flow:-1449},{wk:"W08",flow:-3745},{wk:"W09",flow:566}]},monthIndex:2}};
const fallbackMonthly={"2025-11":{label:"FY2025 11월 가결산 (REV01)",updated:"2025.12.16",monthIndex:10,revenue:{actual:4583,plan:7013,prev:3830,domActual:4346,ovsActual:237},pl:{cogs:1930,grossProfit:2653,grossMarginPct:57.9,opLoss:{actual:-1478,plan:277},ebitda:{actual:-1398,plan:310},netLoss:{actual:-1556,plan:282},costGroups:[{name:"인건비",actual:1560,plan:1543},{name:"R&D",actual:858,plan:970},{name:"영업활동",actual:765,plan:974},{name:"해외시장개척",actual:0,plan:31},{name:"기타",actual:948,plan:501}]},qtyActual:{domestic:{ArtiSential:5820,ArtiSeal:1050,ArtiStapler:0},overseas:{ArtiSential:620,ArtiSeal:280,ArtiStapler:0}},standalone:5569,consolidated:4583,regions:[{name:"🇰🇷 국내",data:[{m:"9월",v:4173},{m:"10월",v:3512},{m:"11월",v:4346}],target:5333,color:"#3b82f6"},{name:"🇺🇸 미국",data:[{m:"9월",v:246},{m:"10월",v:181},{m:"11월",v:46}],target:1434,color:"#ef4444"},{name:"🇩🇪 독일",data:[{m:"9월",v:56},{m:"10월",v:82},{m:"11월",v:95}],target:111,color:"#10b981"},{name:"🇯🇵 일본",data:[{m:"9월",v:36},{m:"10월",v:20},{m:"11월",v:32}],target:46,color:"#f59e0b"},{name:"🌍 기타",data:[{m:"9월",v:89},{m:"10월",v:36},{m:"11월",v:65}],target:89,color:"#a78bfa"}],ar:{balance:4250,collectionRate:88.5,longOverdue:99,detail:"국내 연체 47백만, 해외 연체 52백만"},inventory:{domestic:1297,overseas:3838,domesticDetail:{fiveMm:685,eightMm:561,trocar:7,artiSeal:44},overseasDetail:{LMJ:1454,LMG:2384,LMUS:"미수신"},lmusNote:"LMUS 재고: 추후 수령 예정"},forecast:[{m:"1월",fcQty:10275,ti:1},{m:"2월",fcQty:10648,ti:2},{m:"3월",fcQty:12785,ti:3}]}};
const fallbackQuarterly={"FY25-Q3":{label:"FY2025 3Q 확정 (2025.07~09)",updated:"2025.11.14",plTrend:[{q:"24.4Q",rev:95.8,opLoss:-62.6},{q:"25.1Q",rev:97.3,opLoss:-66.6},{q:"25.2Q",rev:114.1,opLoss:-54.3},{q:"25.3Q",rev:134.4,opLoss:-45.5}],cumRevenue:441.6,cumOpLoss:-229.0,entities:[{name:"LMUS (미국)",rev:"26.2억",gp:"7.3억",sga:"85.8억",opLoss:"△78.5억",share:"70%"},{name:"LMG (독일)",rev:"6.4억",gp:"3.2억",sga:"24.2억",opLoss:"△21.1억",share:"19%"},{name:"LMJ (일본)",rev:"3.0억",gp:"1.0억",sga:"14.0억",opLoss:"△13.1억",share:"12%"}],bs:{totalAssets:743.6,equity:535.9,currentAssets:514.1,currentLiabilities:146.3,totalDebt:207.8,currentRatio:351.5,debtRatio:38.8},cashTrend:[{q:"FY25 1Q",cash:180,net:120},{q:"2Q",cash:165,net:108},{q:"3Q",cash:148,net:95},{q:"4Q(IPO)",cash:1297,net:1267},{q:"FY26 1Q",cash:1201,net:1171}],ipoFunds:[{label:"연구개발비",plan:120,used:28},{label:"해외시장 개척",plan:80,used:15},{label:"운영자금",plan:60,used:22},{label:"시설투자",plan:40,used:5}]}};

// ╔══════════════════════════════════════════╗
// ║  GOOGLE SHEETS FETCH + CSV → STORE       ║
// ╚══════════════════════════════════════════╝
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
    const prev=store[k];
    const prevTr=prev?.treasury||{cashBalance:0,deposits:0,elb:0,foreignCurrency:0,borrowings:0,netCash:0,weeklyFlow:0,prevFlow:0,runway:0,trend:[]};
    const prevBO=prev?.backorder||{domestic:0,overseas:0,avgDelay:0,totalQty:0,reasons:[],prev:{domestic:0,overseas:0,avgDelay:0}};
    store[k]={label:r.week_label||k,updated:r.updated||"",monthIndex:mi,
      shipments:{domestic:{weekly:{ArtiSential:pN(r.dom_ship_w_AS),ArtiSeal:pN(r.dom_ship_w_Seal),ArtiStapler:pN(r.dom_ship_w_Stapler)},mtd:{ArtiSential:pN(r.dom_ship_m_AS),ArtiSeal:pN(r.dom_ship_m_Seal),ArtiStapler:pN(r.dom_ship_m_Stapler)}},overseas:{weekly:{ArtiSential:pN(r.ovs_ship_w_AS),ArtiSeal:pN(r.ovs_ship_w_Seal),ArtiStapler:pN(r.ovs_ship_w_Stapler)},mtd:{ArtiSential:pN(r.ovs_ship_m_AS),ArtiSeal:pN(r.ovs_ship_m_Seal),ArtiStapler:pN(r.ovs_ship_m_Stapler)}}},
      orders:{domestic:{weekly:{ArtiSential:pN(r.dom_ord_w_AS),ArtiSeal:pN(r.dom_ord_w_Seal),ArtiStapler:pN(r.dom_ord_w_Stapler)},mtd:{ArtiSential:pN(r.dom_ord_m_AS),ArtiSeal:pN(r.dom_ord_m_Seal),ArtiStapler:pN(r.dom_ord_m_Stapler)},backlog:pN(r.dom_backlog)},overseas:{weekly:{ArtiSential:pN(r.ovs_ord_w_AS),ArtiSeal:pN(r.ovs_ord_w_Seal),ArtiStapler:pN(r.ovs_ord_w_Stapler)},mtd:{ArtiSential:pN(r.ovs_ord_m_AS),ArtiSeal:pN(r.ovs_ord_m_Seal),ArtiStapler:pN(r.ovs_ord_m_Stapler)},backlog:pN(r.ovs_backlog)}},
      inmarket:{domestic:{mtd:null,note:"직판병원 실사용량 미확정"},overseas:{weekly:null,mtd:null}},
      backorder:prevBO,treasury:prevTr};
  }
  return store;
}

function mergeTreasury(store,rows){
  const sorted=[...rows].sort((a,b)=>String(a.week_key||"").localeCompare(String(b.week_key||"")));
  const flowHist=[];
  for(const r of sorted){
    const k=(r.week_key||"").trim();if(!k)continue;
    const wf=pN(r.weekly_flow);
    const wkShort=k.replace(/^\d{4}-/,"");
    flowHist.push({wk:wkShort,flow:wf});
    const trend=flowHist.slice(-4);
    if(!store[k])store[k]={label:r.week_label||k,updated:r.updated||"",monthIndex:0,shipments:{domestic:{weekly:null,mtd:null},overseas:{weekly:null,mtd:null}},orders:{domestic:{weekly:null,mtd:null,backlog:null},overseas:{weekly:null,mtd:null,backlog:null}},inmarket:{domestic:{mtd:null,note:"미확정"},overseas:{weekly:null,mtd:null}},backorder:{domestic:0,overseas:0,avgDelay:0,totalQty:0,reasons:[],prev:{domestic:0,overseas:0,avgDelay:0}}};
    store[k].treasury={cashBalance:pN(r.cash_balance),deposits:pN(r.deposits),elb:pN(r.elb),foreignCurrency:pN(r.foreign_currency),borrowings:pN(r.borrowings),netCash:pN(r.net_cash),weeklyFlow:wf,prevFlow:flowHist.length>=2?flowHist[flowHist.length-2].flow:0,runway:pN(r.runway),monthlyNetFlow:pNNull(r.monthly_net_flow),trend:[...trend]};
    if(r.updated)store[k].updated=r.updated;
  }
  return store;
}

function mergeBackorder(store,rows){
  const sorted=[...rows].sort((a,b)=>String(a.week_key||"").localeCompare(String(b.week_key||"")));
  let prevBO={domestic:0,overseas:0,avgDelay:0};
  for(const r of sorted){
    const k=(r.week_key||"").trim();if(!k)continue;
    const bo={domestic:pN(r.domestic_count),overseas:pN(r.overseas_count),avgDelay:pN(r.avg_delay),totalQty:pN(r.total_qty),reasons:(r.reasons||"").split(",").map(s=>s.trim()).filter(Boolean),prev:{...prevBO}};
    if(store[k])store[k].backorder=bo;
    prevBO={domestic:bo.domestic,overseas:bo.overseas,avgDelay:bo.avgDelay};
  }
  return store;
}

function csvToMonthly(plRows,subRows){
  const store={};
  const regColors={"🇰🇷 국내":"#3b82f6","🇺🇸 미국":"#ef4444","🇩🇪 독일":"#10b981","🇯🇵 일본":"#f59e0b","🌍 기타":"#a78bfa"};
  const allRegData={};
  const sortedPL=[...plRows].sort((a,b)=>String(a.month_key||"").localeCompare(String(b.month_key||"")));
  for(const r of sortedPL){
    const k=(r.month_key||"").trim();if(!k)continue;
    const mi=pN(r.month_index);
    const regThisMonth=[{name:"🇰🇷 국내",v:pN(r.reg_korea),target:5333},{name:"🇺🇸 미국",v:pN(r.reg_us),target:1434},{name:"🇩🇪 독일",v:pN(r.reg_germany),target:111},{name:"🇯🇵 일본",v:pN(r.reg_japan),target:46},{name:"🌍 기타",v:pN(r.reg_other),target:89}];
    const mLabel=`${mi+1}월`;
    for(const rg of regThisMonth){
      if(!allRegData[rg.name])allRegData[rg.name]=[];
      allRegData[rg.name].push({m:mLabel,v:rg.v,target:rg.target});
    }
    const regions=regThisMonth.map(rg=>{const hist=allRegData[rg.name]||[];const d=hist.slice(-3);while(d.length<3)d.unshift({m:"—",v:0});return{name:rg.name,data:d,target:rg.target,color:regColors[rg.name]||"#888"};});
    const prevKey=sortedPL.find(x=>String(x.month_key||"").trim()<k);
    store[k]={label:r.month_label||k,updated:r.updated||"",monthIndex:mi,
      revenue:{actual:pN(r.rev_actual),plan:pN(r.rev_plan),prev:prevKey?pN(prevKey.rev_actual):null,domActual:pN(r.rev_dom),ovsActual:pN(r.rev_ovs)},
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
    const fc=[];
    if(r.fc_m1_label)fc.push({m:r.fc_m1_label,fcQty:pN(r.fc_m1_qty),ti:1});
    if(r.fc_m2_label)fc.push({m:r.fc_m2_label,fcQty:pN(r.fc_m2_qty),ti:2});
    if(r.fc_m3_label)fc.push({m:r.fc_m3_label,fcQty:pN(r.fc_m3_qty),ti:3});
    store[k].forecast=fc;
  }
  return store;
}

function csvToQuarterly(rows){
  const store={};
  for(const r of rows){
    const k=(r.quarter_key||"").trim();if(!k)continue;
    store[k]={label:r.quarter_label||k,updated:r.updated||"",
      plTrend:[{q:r.q1_label||"",rev:pN(r.q1_rev),opLoss:pN(r.q1_op_loss)},{q:r.q2_label||"",rev:pN(r.q2_rev),opLoss:pN(r.q2_op)},{q:r.q3_label||"",rev:pN(r.q3_rev),opLoss:pN(r.q3_op)},{q:r.q4_label||"",rev:pN(r.q4_rev),opLoss:pN(r.q4_op)}].filter(x=>x.q),
      cumRevenue:pN(r.q1_rev)+pN(r.q2_rev)+pN(r.q3_rev)+pN(r.q4_rev),
      cumOpLoss:pN(r.q1_op_loss)+pN(r.q2_op)+pN(r.q3_op)+pN(r.q4_op),
      entities:[{name:r.entity1_name||"LMUS",rev:r.entity1_rev||"",gp:r.entity1_gp||"",sga:r.entity1_sga||"",opLoss:r.entity1_oploss||"",share:r.entity1_share||""},{name:r.entity2_name||"LMG",rev:r.entity2_rev||"",gp:r.entity2_gp||"",sga:r.entity2_sga||"",opLoss:r.entity2_oploss||"",share:r.entity2_share||""},{name:r.entity3_name||"LMJ",rev:r.entity3_rev||"",gp:r.entity3_gp||"",sga:r.entity3_sga||"",opLoss:r.entity3_oploss||"",share:r.entity3_share||""}],
      bs:{totalAssets:pN(r.bs_total_assets),equity:pN(r.bs_equity),currentRatio:pN(r.bs_current_ratio),debtRatio:pN(r.bs_debt_ratio),currentAssets:0,currentLiabilities:0},
      cashTrend:fallbackQuarterly["FY25-Q3"].cashTrend,
      ipoFunds:fallbackQuarterly["FY25-Q3"].ipoFunds};
  }
  return store;
}

// ╔═══════════════════════════╗
// ║  STYLE + COMPONENTS       ║
// ╚═══════════════════════════╝
const C={bg:"#0a0f1a",card:"#111827",border:"#1e293b",text:"#e2e8f0",textMuted:"#94a3b8",textDim:"#64748b",accent:"#3b82f6",green:"#10b981",greenBg:"rgba(16,185,129,0.1)",red:"#ef4444",redBg:"rgba(239,68,68,0.1)",amber:"#f59e0b",amberBg:"rgba(245,158,11,0.1)",purple:"#a78bfa",weekly:"#10b981",monthly:"#3b82f6",quarterly:"#a78bfa"};
const fmt=n=>n==null?"—":n.toLocaleString();
const fmtBn=n=>n==null?"—":(n/100).toFixed(1)+"억";
const pctVal=(a,t)=>t>0?(a/t)*100:0;
const pctStr=(a,t)=>t>0?((a/t)*100).toFixed(1)+"%":"—";
const pctClr=(a,t)=>{const p=pctVal(a,t);return p>=90?C.green:p>=70?C.amber:C.red;};
const sumP=o=>o?(o.ArtiSential||0)+(o.ArtiSeal||0)+(o.ArtiStapler||0):0;

const Badge=({color,children})=>(<span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:600,background:color==="green"?C.greenBg:color==="amber"?C.amberBg:color==="red"?C.redBg:color==="purple"?"rgba(167,139,250,0.1)":"rgba(59,130,246,0.1)",color:color==="green"?C.green:color==="amber"?C.amber:color==="red"?C.red:color==="purple"?C.purple:C.accent}}>{children}</span>);
const InfoBox=({title,children,color=C.accent})=>(<div style={{margin:"8px 0",padding:"10px 14px",borderRadius:6,borderLeft:`3px solid ${color}`,background:"rgba(255,255,255,0.02)",fontSize:12,color:C.textMuted,lineHeight:1.6}}>{title&&<div style={{fontWeight:700,color:C.text,marginBottom:4,fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em"}}>{title}</div>}{children}</div>);
const Metric=({label,value,sub,trend,unit="",small,color:clr})=>(<div style={{padding:small?"6px 0":"8px 0"}}><div style={{fontSize:11,color:C.textMuted,marginBottom:2}}>{label}</div><div style={{display:"flex",alignItems:"baseline",gap:6}}><span style={{fontSize:small?18:22,fontWeight:700,color:clr||C.text,fontVariantNumeric:"tabular-nums"}}>{value}{unit&&<span style={{fontSize:12,color:C.textMuted,marginLeft:2}}>{unit}</span>}</span>{trend!=null&&<span style={{fontSize:11,fontWeight:600,color:trend>0?C.green:trend<0?C.red:C.textMuted}}>{trend>0?"▲":trend<0?"▼":"—"} {Math.abs(trend).toLocaleString()}{unit}</span>}</div>{sub&&<div style={{fontSize:10,color:C.textDim,marginTop:2}}>{sub}</div>}</div>);
const ProgressBar=({value,max,label,height=6})=>{const p=max>0?Math.min((value/max)*100,100):0;const bc=p>=90?C.green:p>=70?C.amber:C.red;return(<div>{label&&<div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}><span style={{color:C.textMuted}}>{label}</span><span style={{color:bc,fontWeight:700}}>{p.toFixed(1)}%</span></div>}<div style={{height,borderRadius:height/2,background:"rgba(255,255,255,0.05)",overflow:"hidden"}}><div style={{height:"100%",width:`${p}%`,borderRadius:height/2,background:bc,transition:"width 0.6s ease"}}/></div></div>);};
const SH=({icon,title,badge,desc})=>(<div style={{marginBottom:12}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}><span style={{fontSize:16}}>{icon}</span><span style={{fontSize:15,fontWeight:700,color:C.text}}>{title}</span>{badge}</div>{desc&&<div style={{fontSize:11,color:C.textDim,lineHeight:1.5}}>{desc}</div>}</div>);
const Card=({children,style={}})=>(<div style={{background:C.card,borderRadius:10,border:`1px solid ${C.border}`,padding:18,marginBottom:14,...style}}>{children}</div>);
const NoData=({msg="데이터 미수신"})=>(<div style={{padding:"16px 14px",background:C.amberBg,borderRadius:6,border:`1px solid ${C.amber}33`,fontSize:11,color:C.amber,textAlign:"center"}}>⏳ {msg}</div>);
const DT=({headers,rows,compact})=>(<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:compact?11:12}}><thead><tr>{headers.map((h,i)=>(<th key={i} style={{padding:compact?"5px 6px":"6px 8px",textAlign:i===0?"left":"right",fontSize:10,fontWeight:600,color:C.textDim,borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:"0.04em",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead><tbody>{rows.map((row,ri)=>(<tr key={ri} style={{borderBottom:`1px solid ${C.border}22`}}>{row.map((cell,ci)=>(<td key={ci} style={{padding:compact?"5px 6px":"7px 8px",textAlign:ci===0?"left":"right",color:typeof cell==="object"?cell.color||C.text:C.text,fontWeight:typeof cell==="object"?cell.bold?700:400:400,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>{typeof cell==="object"?cell.v:cell}</td>))}</tr>))}</tbody></table></div>);
const PeriodNav=({keys,current,onChange,colorActive,labels})=>(<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:14}}><button onClick={()=>{const i=keys.indexOf(current);if(i>0)onChange(keys[i-1]);}} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,cursor:"pointer",fontSize:12}}>◀</button><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{keys.map(k=>(<button key={k} onClick={()=>onChange(k)} style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,border:"none",cursor:"pointer",transition:"all 0.2s",background:k===current?colorActive:"rgba(255,255,255,0.04)",color:k===current?"#fff":C.textMuted}}>{labels&&labels[k]?labels[k]:k}</button>))}</div><button onClick={()=>{const i=keys.indexOf(current);if(i<keys.length-1)onChange(keys[i+1]);}} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,cursor:"pointer",fontSize:12}}>▶</button></div>);

// ╔═══════════════════════════════╗
// ║  TAB RENDERERS                 ║
// ╚═══════════════════════════════╝
const shipRow=(nm,w,m,t)=>[nm,fmt(w),fmt(m),fmt(t),{v:pctStr(m,t),color:pctClr(m,t),bold:true}];

function WeeklyTab({weekKey,WS}){
  const W=WS[weekKey];if(!W)return<NoData msg="해당 주차 데이터가 없습니다."/>;
  const mi=W.monthIndex,dT=getTT("domestic",mi),oT=getTT("overseas",mi);
  const s=W.shipments,o=W.orders,im=W.inmarket,bo=W.backorder,tr=W.treasury;
  const hasShip=s?.domestic?.weekly!=null;const hasOrd=o?.domestic?.weekly!=null;
  const dSM=hasShip?sumP(s.domestic.mtd):0,oSM=hasShip?sumP(s.overseas.mtd):0;
  return(<div>
    <Card><SH icon="📦" title="A1. 출하 현황" badge={<Badge color="green">매주 금요일</Badge>} desc="ERP 출고 (국내) + 해외 선적. 출하≠매출."/>
      {hasShip?(<><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>{[["domestic","🇰🇷 국내"],["overseas","🌏 해외 (선적)"]].map(([rk,rl])=>{const w=s[rk].weekly,m=s[rk].mtd,t=rk==="domestic"?dT:oT;return(<div key={rk}><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>{rl}</div><DT compact headers={["품목","금주","월누적","월목표","달성률"]} rows={[shipRow("ArtiSential",w.ArtiSential,m.ArtiSential,Targets.qty[rk].ArtiSential[mi]),shipRow("ArtiSeal",w.ArtiSeal,m.ArtiSeal,Targets.qty[rk].ArtiSeal[mi]),[{v:"합계",bold:true},{v:fmt(sumP(w)),bold:true},{v:fmt(sumP(m)),bold:true},{v:fmt(t),bold:true},{v:pctStr(sumP(m),t),color:pctClr(sumP(m),t),bold:true}]]}/></div>);})}</div><div style={{marginTop:10}}><ProgressBar value={dSM+oSM} max={dT+oT} label={`통합 달성률 (${fmt(dSM+oSM)} / ${fmt(dT+oT)})`} height={8}/></div></>):(<NoData msg="출하 데이터 미수신"/>)}</Card>
    <Card><SH icon="📋" title="A2. 수주 현황 & Backlog" badge={<Badge color="green">매주 금요일</Badge>}/>
      {hasOrd?(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>{[["domestic","🇰🇷 국내"],["overseas","🌏 해외"]].map(([rk,rl])=>{const w=o[rk].weekly,m=o[rk].mtd,t=getTT(rk,mi);return(<div key={rk}><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>{rl}</div><DT compact headers={["품목","금주","월누적","월목표","달성률"]} rows={[shipRow("ArtiSential",w.ArtiSential,m.ArtiSential,Targets.qty[rk].ArtiSential[mi]),shipRow("ArtiSeal",w.ArtiSeal,m.ArtiSeal,Targets.qty[rk].ArtiSeal[mi]),[{v:"합계",bold:true},{v:fmt(sumP(w)),bold:true},{v:fmt(sumP(m)),bold:true},{v:fmt(t),bold:true},{v:pctStr(sumP(m),t),color:pctClr(sumP(m),t),bold:true}]]}/>{o[rk].backlog!=null&&<Metric label="Backlog" value={fmt(o[rk].backlog)} unit="대" small/>}</div>);})}</div>):(<NoData msg="수주 데이터 미수신"/>)}
      <InfoBox title="📖 참고" color={C.amber}>국내 수주 월말 집중 패턴. Backlog=미출고 확정주문(긍정) ≠ 백오더(납기지연).</InfoBox></Card>
    <Card><SH icon="🏥" title="A3. 인마켓" badge={<><Badge color="green">해외 매주</Badge>{" "}<Badge color="amber">국내 월간</Badge></>}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><div><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>🇰🇷 국내</div><div style={{padding:12,background:C.amberBg,borderRadius:6,border:`1px solid ${C.amber}33`,fontSize:11,color:C.amber}}>⏳ {im?.domestic?.note||"월마감 후 확정"}</div></div><div><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>🌏 해외</div>{im?.overseas?.mtd?<DT compact headers={["품목","금주","월누적"]} rows={[["ArtiSential",fmt(im.overseas.weekly?.ArtiSential),fmt(im.overseas.mtd.ArtiSential)],["ArtiSeal",fmt(im.overseas.weekly?.ArtiSeal),fmt(im.overseas.mtd.ArtiSeal)]]}/>:<NoData msg="해외 인마켓 미수신"/>}</div></div></Card>
    <Card><SH icon="🚨" title="A4. 백오더" badge={<Badge color="green">매주 금요일</Badge>}/>{bo&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}><Metric label="국내" value={bo.domestic} unit="건" trend={bo.domestic-(bo.prev?.domestic||0)}/><Metric label="해외" value={bo.overseas} unit="건" trend={bo.overseas-(bo.prev?.overseas||0)}/><Metric label="평균 지연" value={bo.avgDelay} unit="일"/><Metric label="통합" value={bo.domestic+bo.overseas} unit="건" sub={`총 ${fmt(bo.totalQty)}대`}/></div>}{bo?.reasons?.length>0&&<InfoBox color={C.amber}>사유: {bo.reasons.join(", ")}</InfoBox>}</Card>
    <Card style={{marginBottom:0}}><SH icon="💰" title="A5. 자금 현황" badge={<Badge color="green">매주 월요일</Badge>}/>{tr&&<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:12}}><Metric label="보통예금" value={fmt(tr.cashBalance)} unit="백만"/><Metric label="정기예금" value={fmt(tr.deposits)} unit="백만"/>{tr.elb>0&&<Metric label="ELB" value={fmt(tr.elb)} unit="백만"/>}<Metric label="외화" value={fmt(tr.foreignCurrency)} unit="백만"/><Metric label="차입금" value={fmt(tr.borrowings)} unit="백만" color={C.amber}/><Metric label="Net Cash" value={fmt(tr.netCash)} unit="백만"/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><div><Metric label="금주 흐름" value={fmt(tr.weeklyFlow)} unit="백만" color={tr.weeklyFlow>=0?C.green:C.red} small/><Metric label="Runway" value={tr.runway} unit="개월" small/></div>{tr.trend?.length>0&&<div style={{height:100}}><ResponsiveContainer><BarChart data={tr.trend} margin={{top:5,right:10,bottom:0,left:10}}><XAxis dataKey="wk" tick={{fontSize:10,fill:C.textDim}} axisLine={false} tickLine={false}/><YAxis hide/><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,fontSize:11}} formatter={v=>[`${v?.toLocaleString()}백만`,"순흐름"]}/><Bar dataKey="flow" radius={[3,3,0,0]}>{tr.trend.map((d,i)=>(<Cell key={i} fill={d.flow>=0?C.green:C.red} opacity={0.7}/>))}</Bar></BarChart></ResponsiveContainer></div>}</div></>}</Card>
  </div>);
}

function MonthlyTab({monthKey,MS}){
  const M=MS[monthKey];if(!M)return<NoData msg="해당 월 데이터가 없습니다."/>;
  const mi=M.monthIndex,rv=M.revenue,pl=M.pl,qa=M.qtyActual;
  const dQA=sumP(qa.domestic),oQA=sumP(qa.overseas),dQT=getTT("domestic",mi),oQT=getTT("overseas",mi);
  const gap=M.standalone-M.consolidated,gapPct=M.standalone>0?((gap/M.standalone)*100).toFixed(1):"—";
  const tCA=pl.costGroups.reduce((s,g)=>s+g.actual,0),tCP=pl.costGroups.reduce((s,g)=>s+g.plan,0);
  const opProfit=pl.opLoss.plan>0;
  return(<div>
    <div style={{padding:"8px 12px",marginBottom:14,borderRadius:6,background:"rgba(59,130,246,0.08)",border:`1px solid ${C.accent}33`,fontSize:11,color:C.accent}}>ⓘ <strong>{M.label}</strong> · 갱신: {M.updated}</div>
    <Card><SH icon="🎯" title="B1. 매출 실적" badge={<Badge color="blue">월간</Badge>}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
        <div style={{textAlign:"center",padding:12,background:"rgba(255,255,255,0.02)",borderRadius:8}}><div style={{fontSize:10,color:C.textDim}}>연결 매출</div><div style={{fontSize:26,fontWeight:700}}>{fmtBn(rv.actual)}</div><div style={{fontSize:11,color:C.textDim}}>목표 {fmtBn(rv.plan)}</div><div style={{fontSize:14,fontWeight:700,color:pctClr(rv.actual,rv.plan),marginTop:4}}>{pctStr(rv.actual,rv.plan)}</div></div>
        <div style={{textAlign:"center",padding:12,background:"rgba(255,255,255,0.02)",borderRadius:8}}><div style={{fontSize:10,color:C.textDim}}>국내</div><div style={{fontSize:22,fontWeight:700}}>{fmtBn(rv.domActual)}</div><ProgressBar value={rv.domActual} max={Targets.amt.domestic[mi]} label="달성률"/></div>
        <div style={{textAlign:"center",padding:12,background:"rgba(255,255,255,0.02)",borderRadius:8}}><div style={{fontSize:10,color:C.textDim}}>해외</div><div style={{fontSize:22,fontWeight:700}}>{fmtBn(rv.ovsActual)}</div><ProgressBar value={rv.ovsActual} max={Targets.amt.overseas[mi]} label="달성률"/></div>
      </div>
      <div style={{padding:"10px 12px",background:"rgba(255,255,255,0.02)",borderRadius:6}}><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>📊 수량 달성률</div><DT compact headers={["구분","ArtiSential","ArtiSeal","합계","달성률"]} rows={[["국내",`${fmt(qa.domestic.ArtiSential)}/${fmt(Targets.qty.domestic.ArtiSential[mi])}`,`${fmt(qa.domestic.ArtiSeal)}/${fmt(Targets.qty.domestic.ArtiSeal[mi])}`,`${fmt(dQA)}/${fmt(dQT)}`,{v:pctStr(dQA,dQT),color:pctClr(dQA,dQT),bold:true}],["해외",`${fmt(qa.overseas.ArtiSential)}/${fmt(Targets.qty.overseas.ArtiSential[mi])}`,`${fmt(qa.overseas.ArtiSeal)}/${fmt(Targets.qty.overseas.ArtiSeal[mi])}`,`${fmt(oQA)}/${fmt(oQT)}`,{v:pctStr(oQA,oQT),color:pctClr(oQA,oQT),bold:true}]]}/></div></Card>
    <Card><SH icon="🗺️" title="B1-2. 지역별 매출" badge={<Badge color="blue">월간</Badge>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12}}>{M.regions.map((r,i)=>{const lat=r.data[r.data.length-1]?.v||0,prev=r.data.length>=2?r.data[r.data.length-2].v:0,p=r.target>0?((lat/r.target)*100).toFixed(1):"0",tr=lat-prev;return(<div key={i} style={{background:"rgba(255,255,255,0.02)",borderRadius:8,padding:12,border:`1px solid ${C.border}`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,fontWeight:600,color:C.text}}>{r.name}</span><span style={{fontSize:10,color:parseFloat(p)>=80?C.green:parseFloat(p)>=50?C.amber:C.red,fontWeight:700}}>{p}%</span></div><div style={{height:55}}><ResponsiveContainer><LineChart data={r.data} margin={{top:5,right:5,bottom:0,left:-15}}><XAxis dataKey="m" tick={{fontSize:9,fill:C.textDim}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:C.textDim}} axisLine={false} tickLine={false}/><Line type="monotone" dataKey="v" stroke={r.color} strokeWidth={2} dot={{r:3,fill:r.color}}/></LineChart></ResponsiveContainer></div><div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textDim,marginTop:4}}><span>{fmt(lat)}백만</span><span style={{color:tr>=0?C.green:C.red}}>{tr>=0?"▲":"▼"}{fmt(Math.abs(tr))}</span></div></div>);})}</div></Card>
    <Card><SH icon="🔄" title="B1-3. 별도 vs 연결" badge={<Badge color="blue">월간</Badge>}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}><div style={{textAlign:"center",padding:12,background:"rgba(255,255,255,0.02)",borderRadius:8}}><div style={{fontSize:10,color:C.textDim}}>별도</div><div style={{fontSize:22,fontWeight:700}}>{fmtBn(M.standalone)}</div></div><div style={{textAlign:"center",padding:12,background:"rgba(255,255,255,0.02)",borderRadius:8}}><div style={{fontSize:10,color:C.textDim}}>연결</div><div style={{fontSize:22,fontWeight:700}}>{fmtBn(M.consolidated)}</div></div><div style={{textAlign:"center",padding:12,background:"rgba(239,68,68,0.06)",borderRadius:8,border:`1px solid ${C.red}22`}}><div style={{fontSize:10,color:C.textDim}}>Gap</div><div style={{fontSize:22,fontWeight:700,color:C.amber}}>{fmtBn(gap)}</div><div style={{fontSize:10,color:C.textDim}}>{gapPct}%</div></div></div></Card>
    <Card><SH icon="📈" title="B2. 손익 (P&L)" badge={<Badge color="blue">월간</Badge>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:14}}>{[{l:"매출총이익률",v:`${pl.grossMarginPct}%`,c:C.green},{l:"영업손실",v:`△${fmt(Math.abs(pl.opLoss.actual))}`,c:C.red,sub:opProfit?`계획+${fmt(pl.opLoss.plan)}`:`계획△${fmt(Math.abs(pl.opLoss.plan))}`},{l:"EBITDA",v:pl.ebitda.actual<0?`△${fmt(Math.abs(pl.ebitda.actual))}`:`${fmt(pl.ebitda.actual)}`,c:pl.ebitda.actual<0?C.red:C.green},{l:"당기순손실",v:`△${fmt(Math.abs(pl.netLoss.actual))}`,c:C.red}].map((x,i)=>(<div key={i} style={{padding:10,background:"rgba(255,255,255,0.02)",borderRadius:6,textAlign:"center"}}><div style={{fontSize:10,color:C.textDim}}>{x.l}</div><div style={{fontSize:22,fontWeight:700,color:x.c}}>{x.v}</div>{x.sub&&<div style={{fontSize:10,color:C.textDim}}>{x.sub}</div>}</div>))}</div>
      {opProfit&&<InfoBox title="⚠️ GAP" color={C.red}>계획 +{fmt(pl.opLoss.plan)}백만 vs 실적 △{fmt(Math.abs(pl.opLoss.actual))}백만. {fmt(Math.abs(pl.opLoss.actual)+pl.opLoss.plan)}백만 미달.</InfoBox>}</Card>
    <Card><SH icon="💸" title="B3. 비용 구조" badge={<Badge color="blue">월간</Badge>}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><DT headers={["비용군","실적","계획","차이"]} rows={pl.costGroups.map(g=>[g.name,fmt(g.actual),fmt(g.plan),{v:(g.actual-g.plan>0?"+":"")+fmt(g.actual-g.plan),color:g.actual>g.plan?C.red:C.green,bold:true}]).concat([[{v:"합계",bold:true},{v:fmt(tCA),bold:true},{v:fmt(tCP),bold:true},{v:(tCA-tCP>0?"+":"")+fmt(tCA-tCP),bold:true,color:tCA>tCP?C.red:C.green}]])}/><div style={{height:180}}><ResponsiveContainer><BarChart data={pl.costGroups} layout="vertical" margin={{left:65,right:10,top:5,bottom:5}}><XAxis type="number" tick={{fontSize:10,fill:C.textDim}} axisLine={false}/><YAxis type="category" dataKey="name" tick={{fontSize:10,fill:C.textMuted}} axisLine={false} tickLine={false}/><Bar dataKey="actual" fill={C.accent} radius={[0,3,3,0]} opacity={0.8}/><Bar dataKey="plan" fill={C.textDim} radius={[0,3,3,0]} opacity={0.3}/><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,fontSize:11}}/></BarChart></ResponsiveContainer></div></div></Card>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
      <Card style={{marginBottom:0}}><SH icon="💳" title="B4. 매출채권" badge={<Badge color="blue">월간</Badge>}/><Metric label="수금률" value={M.ar.collectionRate} unit="%" small/><Metric label="연체" value={fmt(M.ar.longOverdue)} unit="백만" color={C.red} small/>{M.ar.detail&&<div style={{fontSize:10,color:C.textDim,marginTop:4,lineHeight:1.5}}>{M.ar.detail}</div>}</Card>
      <Card style={{marginBottom:0}}><SH icon="📦" title="B5. 재고" badge={<Badge color="blue">월간</Badge>}/><Metric label="국내" value={fmt(M.inventory.domestic)} unit="대" small/>{M.inventory.domesticDetail&&<div style={{fontSize:10,color:C.textDim}}>5mm:{M.inventory.domesticDetail.fiveMm}/8mm:{M.inventory.domesticDetail.eightMm}/Seal:{M.inventory.domesticDetail.artiSeal}</div>}<Metric label="해외" value={fmt(M.inventory.overseas)} unit="대" small/>{M.inventory.overseasDetail&&<div style={{fontSize:10,color:C.textDim}}>LMJ:{fmt(M.inventory.overseasDetail.LMJ)}/LMG:{fmt(M.inventory.overseasDetail.LMG)}/LMUS:{M.inventory.overseasDetail.LMUS}</div>}{M.inventory.lmusNote&&<div style={{marginTop:4,padding:"4px 8px",background:C.amberBg,borderRadius:4,fontSize:10,color:C.amber}}>⚠ {M.inventory.lmusNote}</div>}</Card>
      <Card style={{marginBottom:0}}><SH icon="🔮" title="B6. Forecast" badge={<Badge color="blue">월간</Badge>}/>{M.forecast?.map((f,i)=>{const isQ=f.fcQty!=null;const v=isQ?f.fcQty:(f.fc||0);const ti=M.monthIndex+f.ti;const t=isQ?(ti<12?getTT("domestic",ti)+getTT("overseas",ti):0):(Targets.amt.combined[ti]||10000);return(<div key={i} style={{marginBottom:6}}><ProgressBar value={v} max={t} label={`${f.m}: ${isQ?fmt(v)+"대":(v/100).toFixed(0)+"억"}`}/></div>);})||null}</Card>
    </div>
  </div>);
}

function QuarterlyTab({qKey,QS}){
  const Q=QS[qKey];if(!Q)return<NoData msg="해당 분기 데이터가 없습니다."/>;
  return(<div>
    <div style={{padding:"8px 12px",marginBottom:14,borderRadius:6,background:"rgba(167,139,250,0.08)",border:`1px solid ${C.purple}33`,fontSize:11,color:C.purple}}>ⓘ <strong>{Q.label}</strong> · 갱신: {Q.updated}</div>
    <Card><SH icon="📊" title="C1. 분기별 실적 추이" badge={<Badge color="purple">분기 확정</Badge>}/>
      <div style={{height:200}}><ResponsiveContainer><BarChart data={Q.plTrend} margin={{top:10,right:10,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="q" tick={{fontSize:11,fill:C.textMuted}} axisLine={false}/><YAxis tick={{fontSize:10,fill:C.textDim}} axisLine={false} unit="억"/><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,fontSize:11}} formatter={(v,n)=>[`${v}억`,n==="rev"?"매출":"영업손실"]}/><Legend wrapperStyle={{fontSize:11}}/><Bar dataKey="rev" fill={C.accent} radius={[4,4,0,0]} name="매출"/><Bar dataKey="opLoss" fill={C.red} opacity={0.6} radius={[4,4,0,0]} name="영업손실"/></BarChart></ResponsiveContainer></div>
      <InfoBox color={C.purple}>누적 매출 {Q.cumRevenue}억, 영업손실 △{Math.abs(Q.cumOpLoss)}억.</InfoBox></Card>
    <Card><SH icon="🌍" title="C2. 해외법인별 실적" badge={<Badge color="purple">분기 확정</Badge>}/><DT headers={["법인","매출","GP","판관비","영업손실","비중"]} rows={Q.entities.map((e,i)=>[e.name,e.rev,e.gp,e.sga,{v:e.opLoss,color:C.red},{v:e.share,color:i===0?C.red:C.amber,bold:true}])}/></Card>
    <Card><SH icon="🏦" title="C3. 재무 건전성" badge={<Badge color="purple">분기 확정</Badge>}/><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}><Metric label="유동비율" value={Q.bs.currentRatio} unit="%" color={C.green}/><Metric label="부채비율" value={Q.bs.debtRatio} unit="%" color={C.green}/><Metric label="총자산" value={Q.bs.totalAssets} unit="억"/><Metric label="순자산" value={Q.bs.equity} unit="억"/></div></Card>
    <Card style={{marginBottom:0}}><SH icon="🏦" title="C4. IPO 공모자금" badge={<Badge color="purple">분기 확정</Badge>}/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><div>{Q.ipoFunds.map((f,i)=>{const colors=[C.accent,C.green,C.amber,C.purple];return(<div key={i} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}><span style={{color:C.textMuted}}>{f.label}</span><span style={{color:C.text,fontWeight:600}}>{f.used}/{f.plan}억 ({((f.used/f.plan)*100).toFixed(0)}%)</span></div><div style={{height:5,borderRadius:3,background:"rgba(255,255,255,0.05)",overflow:"hidden"}}><div style={{height:"100%",width:`${(f.used/f.plan)*100}%`,borderRadius:3,background:colors[i]}}/></div></div>);})}</div><div style={{height:170}}><ResponsiveContainer><LineChart data={Q.cashTrend} margin={{top:5,right:10,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="q" tick={{fontSize:9,fill:C.textDim}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:C.textDim}} axisLine={false} tickLine={false} unit="억"/><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,fontSize:11}}/><Legend wrapperStyle={{fontSize:10}}/><Line type="monotone" dataKey="cash" stroke={C.accent} strokeWidth={2} dot={{r:3}} name="현금성자산"/><Line type="monotone" dataKey="net" stroke={C.green} strokeWidth={2} dot={{r:3}} name="Net Cash"/></LineChart></ResponsiveContainer></div></div></Card>
  </div>);
}

// ╔═══════════════════════════════╗
// ║  MAIN DASHBOARD                ║
// ╚═══════════════════════════════╝
function Dashboard(){
  const [tab,setTab]=useState("weekly");
  const [WS,setWS]=useState(fallbackWeekly);
  const [MS,setMS]=useState(fallbackMonthly);
  const [QS,setQS]=useState(fallbackQuarterly);
  const [sheetId,setSheetId]=useState("1K8ZVdxGAj-bUe5hdLQDE2c2bFAz0NpXkXwVlhohrWWg");
  const [showSettings,setShowSettings]=useState(false);
  const [syncStatus,setSyncStatus]=useState({state:"idle",msg:"Google Sheets 미연결 (Fallback 데이터)",time:null});
  const [loading,setLoading]=useState(false);

  const wk=Object.keys(WS),mk=Object.keys(MS),qk=Object.keys(QS);
  const [weekKey,setWeekKey]=useState(wk[wk.length-1]);
  const [monthKey,setMonthKey]=useState(mk[mk.length-1]);
  const [quarterKey,setQuarterKey]=useState(qk[qk.length-1]);

  useEffect(()=>{const ks=Object.keys(WS);if(ks.length&&!ks.includes(weekKey))setWeekKey(ks[ks.length-1]);},[WS]);
  useEffect(()=>{const ks=Object.keys(MS);if(ks.length&&!ks.includes(monthKey))setMonthKey(ks[ks.length-1]);},[MS]);

  // Auto-sync on load
  useEffect(()=>{if(sheetId)doSync();},[]);

  const doSync=useCallback(async()=>{
    if(!sheetId.trim()){setSyncStatus({state:"error",msg:"Sheet ID를 입력하세요",time:null});return;}
    setLoading(true);setSyncStatus({state:"loading",msg:"동기화 중...",time:null});
    const errors=[];
    try{
      let ws={};
      try{const d=await fetchSheet(sheetId,"Weekly_Shipments");ws=csvToWeeklyShipments(d);}catch(e){errors.push("Shipments: "+e.message);}
      try{const d=await fetchSheet(sheetId,"Weekly_Treasury");ws=mergeTreasury(ws,d);}catch(e){errors.push("Treasury: "+e.message);}
      try{const d=await fetchSheet(sheetId,"Weekly_Backorder");ws=mergeBackorder(ws,d);}catch(e){errors.push("Backorder: "+e.message);}
      if(Object.keys(ws).length>0)setWS(ws);

      try{
        const plD=await fetchSheet(sheetId,"Monthly_PL");
        let subD=[];try{subD=await fetchSheet(sheetId,"Monthly_Subsidiary");}catch(e2){errors.push("Subsidiary: "+e2.message);}
        const ms=csvToMonthly(plD,subD);if(Object.keys(ms).length>0)setMS(ms);
      }catch(e){errors.push("Monthly_PL: "+e.message);}

      try{const d=await fetchSheet(sheetId,"Quarterly_Summary");const qs=csvToQuarterly(d);if(Object.keys(qs).length>0)setQS(qs);}catch(e){errors.push("Quarterly: "+e.message);}

      const now=new Date().toLocaleTimeString("ko");
      if(errors.length===0)setSyncStatus({state:"ok",msg:"✅ 동기화 완료",time:now});
      else setSyncStatus({state:"warn",msg:`⚠️ 일부 시트 오류: ${errors.join(" / ")}`,time:now});
    }catch(e){setSyncStatus({state:"error",msg:"❌ 동기화 실패: "+e.message,time:null});}
    setLoading(false);
  },[sheetId]);

  const cur=tab==="weekly"?WS[weekKey]:tab==="monthly"?MS[monthKey]:QS[quarterKey];
  const tabStyle=k=>({padding:"8px 16px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",border:"none",transition:"all 0.2s",background:tab===k?(k==="weekly"?C.weekly:k==="monthly"?C.monthly:C.quarterly):"transparent",color:tab===k?"#fff":C.textMuted});
  const statusColor=syncStatus.state==="ok"?C.green:syncStatus.state==="warn"?C.amber:syncStatus.state==="error"?C.red:C.textDim;

  return(<div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"'IBM Plex Sans','Pretendard',system-ui,sans-serif"}}>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    {/* Header */}
    <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
      <div>
        <div style={{fontSize:18,fontWeight:700}}><span style={{color:C.accent}}>LIVSMED</span> Executive Dashboard <span style={{fontSize:10,color:C.textDim,fontWeight:400}}>v3.2</span></div>
        <div style={{fontSize:11,color:C.textDim,marginTop:2}}>{cur?.label||""} · {cur?.updated||""}</div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:statusColor,display:"inline-block"}}/>
          <span style={{fontSize:10,color:statusColor}}>{syncStatus.time?`${syncStatus.time}`:""} {syncStatus.msg}</span>
        </div>
        <button onClick={()=>setShowSettings(p=>!p)} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${showSettings?C.accent:C.border}`,background:showSettings?"rgba(59,130,246,0.15)":"transparent",color:showSettings?C.accent:C.textMuted,cursor:"pointer",fontSize:11,fontWeight:600}}>⚙️ 설정</button>
        <div style={{display:"flex",gap:4,background:"rgba(255,255,255,0.03)",padding:3,borderRadius:8}}>
          {["weekly","monthly","quarterly"].map(k=>(<button key={k} style={tabStyle(k)} onClick={()=>setTab(k)}>● {k==="weekly"?"Weekly":k==="monthly"?"Monthly":"Quarterly"}</button>))}
        </div>
      </div>
    </div>

    <div style={{padding:"16px 20px",maxWidth:1200,margin:"0 auto"}}>
      {/* Settings Panel */}
      {showSettings&&<Card style={{background:"#0d1422",border:`1px solid ${C.accent}44`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><span style={{fontSize:16}}>⚙️</span><span style={{fontSize:14,fontWeight:700}}>Google Sheets 연결 설정</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:8,alignItems:"end"}}>
          <div><label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Spreadsheet ID (URL에서 /d/ 와 /edit 사이 문자열)</label><input value={sheetId} onChange={e=>setSheetId(e.target.value)} style={{background:"#0d1117",border:`1px solid ${C.border}`,borderRadius:6,color:C.text,padding:"8px 10px",fontSize:12,width:"100%",fontFamily:"monospace"}} placeholder="예: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"/></div>
          <button onClick={doSync} disabled={loading} style={{padding:"8px 16px",borderRadius:6,border:"none",background:C.accent,color:"#fff",fontSize:12,fontWeight:600,cursor:loading?"wait":"pointer",opacity:loading?0.6:1}}>{loading?"⏳ 동기화 중...":"🔄 동기화"}</button>
          <button onClick={()=>{setWS(fallbackWeekly);setMS(fallbackMonthly);setQS(fallbackQuarterly);setSyncStatus({state:"idle",msg:"Fallback 데이터로 복원",time:null});}} style={{padding:"8px 16px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,fontSize:12,cursor:"pointer"}}>↩ Fallback</button>
        </div>
        <div style={{marginTop:12,padding:10,background:"rgba(255,255,255,0.02)",borderRadius:6,fontSize:11,color:C.textDim,lineHeight:1.7}}>
          <strong style={{color:C.text}}>연결 방법:</strong><br/>
          1. Google Sheets에서 스프레드시트 생성 → 시트명을 정확히 맞추기: Weekly_Shipments, Weekly_Treasury, Weekly_Backorder, Monthly_PL, Monthly_Subsidiary, Quarterly_Summary<br/>
          2. 파일 → 공유 → "링크가 있는 모든 사용자" → 뷰어 권한<br/>
          3. URL에서 Spreadsheet ID 복사: https://docs.google.com/spreadsheets/d/<strong style={{color:C.accent}}>[이 부분]</strong>/edit<br/>
          4. 위 입력란에 붙여넣기 → "동기화" 클릭
        </div>
      </Card>}

      {/* Period Nav + Tab Content */}
      {tab==="weekly"&&<><PeriodNav keys={Object.keys(WS)} current={weekKey} onChange={setWeekKey} colorActive={C.weekly} labels={Object.fromEntries(Object.entries(WS).map(([k,v])=>[k,v.label?v.label.replace(/\s*\(.*\)/,""):k]))}/><WeeklyTab weekKey={weekKey} WS={WS}/></>}
      {tab==="monthly"&&<><PeriodNav keys={Object.keys(MS)} current={monthKey} onChange={setMonthKey} colorActive={C.monthly}/><MonthlyTab monthKey={monthKey} MS={MS}/></>}
      {tab==="quarterly"&&<><PeriodNav keys={Object.keys(QS)} current={quarterKey} onChange={setQuarterKey} colorActive={C.quarterly}/><QuarterlyTab qKey={quarterKey} QS={QS}/></>}

      <div style={{marginTop:20,padding:"12px 0",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,fontSize:10,color:C.textDim}}>
        <div>LIVSMED 전략기획실 전략팀 · Confidential</div>
        <div style={{display:"flex",gap:12}}>{[["주간",C.weekly],["월간",C.monthly],["분기",C.quarterly]].map(([l,c])=>(<span key={l}><span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:c,marginRight:4}}/>{l}</span>))}</div>
      </div>
    </div>
  </div>);
}

// ╔═══════════════════════════════╗
// ║  PASSWORD GATE                 ║
// ╚═══════════════════════════════╝
function PasswordGate(){
  const [authed,setAuthed]=useState(()=>{try{return sessionStorage.getItem("lm_auth")==="1";}catch(e){return false;}});
  const [pw,setPw]=useState("");
  const [error,setError]=useState(false);
  const [shake,setShake]=useState(false);

  const handleSubmit=()=>{
    if(pw===DASHBOARD_PASSWORD){
      try{sessionStorage.setItem("lm_auth","1");}catch(e){}
      setAuthed(true);
    } else {
      setError(true);
      setShake(true);
      setTimeout(()=>setShake(false),500);
      setTimeout(()=>setError(false),2000);
    }
  };

  if(authed) return <Dashboard/>;

  return(
    <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'IBM Plex Sans','Pretendard',system-ui,sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <div style={{
        width:380,maxWidth:"90vw",padding:40,borderRadius:16,
        background:C.card,border:`1px solid ${C.border}`,
        textAlign:"center",
        animation:shake?"shake 0.4s ease":"none"
      }}>
        <style>{`
          @keyframes shake {
            0%,100%{transform:translateX(0)}
            20%,60%{transform:translateX(-8px)}
            40%,80%{transform:translateX(8px)}
          }
        `}</style>
        <div style={{fontSize:32,marginBottom:8}}>🔒</div>
        <div style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:4}}>
          <span style={{color:C.accent}}>LIVSMED</span> Dashboard
        </div>
        <div style={{fontSize:12,color:C.textDim,marginBottom:28}}>접근이 제한된 페이지입니다</div>
        <input
          type="password"
          value={pw}
          onChange={e=>{setPw(e.target.value);setError(false);}}
          onKeyDown={e=>{if(e.key==="Enter")handleSubmit();}}
          placeholder="비밀번호를 입력하세요"
          autoFocus
          style={{
            width:"100%",padding:"12px 16px",borderRadius:8,
            border:`1px solid ${error?C.red:C.border}`,
            background:"#0d1117",color:C.text,fontSize:14,
            outline:"none",marginBottom:12,
            transition:"border-color 0.2s"
          }}
        />
        {error&&<div style={{fontSize:11,color:C.red,marginBottom:8}}>비밀번호가 올바르지 않습니다</div>}
        <button
          onClick={handleSubmit}
          style={{
            width:"100%",padding:"12px",borderRadius:8,
            border:"none",background:C.accent,color:"#fff",
            fontSize:14,fontWeight:600,cursor:"pointer",
            transition:"opacity 0.2s"
          }}
          onMouseEnter={e=>e.target.style.opacity="0.85"}
          onMouseLeave={e=>e.target.style.opacity="1"}
        >로그인</button>
        <div style={{fontSize:10,color:C.textDim,marginTop:20}}>전략기획실 전략팀 · Confidential</div>
      </div>
    </div>
  );
}

export default PasswordGate;
