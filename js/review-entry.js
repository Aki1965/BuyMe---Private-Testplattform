import {esc} from './ui.js';
import {canReview,submitDealReview} from './deal-workflow.js';

export function reviewableDeals(state,role,actorId,dealId=''){
 if(!['member','provider'].includes(role))return [];
 return state.deals.filter(d=>(!dealId||d.id===dealId)&&canReview(state,d,role,actorId));
}
export function submitReviewEntry(state,role,actorId,values){
 return submitDealReview(state,String(values.dealId||''),role,actorId,values.rating,values.text);
}
export function reviewEntry(state,role,actorId,{dealId='',draft={},saved=null}={}){
 if(!['member','provider'].includes(role))return '';
 const eligible=reviewableDeals(state,role,actorId,dealId),enabled=eligible.length>0;
 const selected=eligible.some(d=>d.id===draft.dealId)?draft.dealId:eligible.length===1?eligible[0].id:'';
 const matchingDraft=!dealId||!draft.dealId||draft.dealId===dealId?draft:{};
 const text=String(matchingDraft.text||''),rating=Number(matchingDraft.rating)||0;
 const own=state.deals.filter(d=>role==='member'?d.userId===actorId:d.providerId===actorId),completed=own.filter(d=>d.status==='completed');
 const empty=completed.length?'Du hast deine abgeschlossenen Deals bereits bewertet.':'Noch kein abgeschlossener Deal zum Bewerten vorhanden.';
 return `<section class="review-entry" id="review-entry"><div class="review-entry-heading"><div><div class="eyebrow">DEINE ERFAHRUNG ZÄHLT</div><h2>Bewertung abgeben</h2><p>${role==='member'?'Bewerte den Anbieter deines abgeschlossenen Deals.':'Bewerte das Mitglied nach einem abgeschlossenen Deal.'}</p></div><span class="review-entry-role">${role==='member'?'Mitglied → Anbieter':'Anbieter → Mitglied'}</span></div>
 ${saved&&(!dealId||saved.dealId===dealId)?'<div class="review-entry-success" role="status">Bewertung gespeichert und für beide Dealparteien sichtbar.</div>':''}
 ${!enabled?`<div class="review-entry-empty"><strong>${empty}</strong><p>${completed.length?'Deine abgegebenen Bewertungen findest du weiter unten.':'Ein Deal muss durch BuyMe als abgeschlossen bestätigt sein. Danach kannst du hier Sterne und einen Kommentar abgeben.'}</p><a class="btn secondary small" href="#deals">Meine Deals ansehen</a></div>`:''}
 <form data-form="review-entry" class="review-entry-form">
 <label for="review-deal">Abgeschlossenen Deal auswählen</label><select id="review-deal" name="dealId" required ${!enabled?'disabled':''}><option value="">${enabled?'Bitte einen Deal auswählen':'Kein bewertbarer Deal'}</option>${eligible.map(d=>`<option translate="no" value="${esc(d.id)}" ${d.id===selected?'selected':''}>${esc(d.id)} · ${esc(d.offer)} · ${esc(role==='member'?d.provider:d.user)}</option>`).join('')}</select>
 <fieldset class="review-rating" ${!enabled?'disabled':''}><legend>Sterne vergeben</legend><div class="review-star-options">${[1,2,3,4,5].map(n=>`<label class="review-star"><input type="radio" name="rating" value="${n}" aria-label="${n} / 5" required ${n===rating?'checked':''}><span aria-hidden="true">★</span><small>${n}</small></label>`).join('')}</div><p class="review-rating-hint">1 = schlecht · 5 = sehr gut</p></fieldset>
 <label for="review-comment">Deine Erfahrung</label><textarea id="review-comment" name="text" required minlength="5" maxlength="1500" rows="4" placeholder="Wie war die Zusammenarbeit bei diesem Deal?" aria-describedby="review-comment-hint" ${!enabled?'disabled':''}>${esc(text)}</textarea><div class="review-comment-meta"><small id="review-comment-hint">Mindestens 5, maximal 1.500 Zeichen.</small><output class="review-character-count" aria-label="Zeichenanzahl">${text.length} / 1500</output></div>
 <p class="legal-review-hint">Bitte nur eigene Erfahrungen und keine sensiblen Daten nennen. Einzelkommentare bleiben bei den berechtigten Dealparteien und dem Admin; öffentlich werden nur Anbieterwerte zusammengefasst. <a href="#transparency">Bewertungsregeln</a> · <a href="#content-request">Inhalt melden</a></p><p class="review-entry-visibility">Deine Bewertung ist für beide Dealparteien sichtbar. Pro Deal ist eine Bewertung je Partei möglich.</p><div class="form-error" role="alert" tabindex="-1"></div><button type="submit" class="btn primary" ${!enabled?'disabled':''}>Bewertung speichern</button></form></section>`;
}
// Delegated so the same form works after navigation, a rerender or a language switch.
export function installReviewEntryInteractions(root,onDraft=()=>{}){
 const handler=event=>{const form=event.target.closest?.('form[data-form="review-entry"]');if(!form)return;const values=Object.fromEntries(new FormData(form));onDraft(values);const output=form.querySelector('.review-character-count');if(output)output.textContent=String(values.text||'').length+' / 1500';};
 root.addEventListener('input',handler);root.addEventListener('change',handler);
 return ()=>{root.removeEventListener('input',handler);root.removeEventListener('change',handler);};
}
