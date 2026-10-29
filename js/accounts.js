import {walletSummary,offerUsed} from './platform-model.js';
export function accountContext(state,type,id){
 if(!['member','provider'].includes(type))return null;
 const account=(type==='member'?state.members:state.providers).find(x=>x.id===id);
 if(!account)return null;
 const deals=state.deals.filter(d=>type==='member'?d.userId===id:d.providerId===id);
 const dealIds=new Set(deals.map(d=>d.id));
 const tickets=state.tickets.filter(t=>dealIds.has(t.dealId));
 const offers=type==='provider'?state.offers.filter(o=>o.providerId===id):[];
 const reviews=state.reviews.filter(r=>type==='member'?r.userId===id:r.providerId===id);
 const events=deals.flatMap(d=>d.events.map(e=>({...e,dealId:d.id,offer:d.offer}))).sort((a,b)=>b.at.localeCompare(a.at));
 return {account,type,deals,tickets,offers,reviews,events,wallet:type==='member'?walletSummary(state,id):null,budget:type==='provider'?{credit:account.credit,total:offers.reduce((s,o)=>s+o.budget,0),used:offers.reduce((s,o)=>s+offerUsed(state,o.id),0)}:null};
}
