import {upgradeCommerce} from './commerce-seed.js';
import {upgradeTaxonomy} from './categories.js';
import {createSeed} from './model.js';
import {enrichSeed} from './seed.js';
export const KEY='buyme-platform-demo-v2';
export function loadState(){try{const saved=JSON.parse(localStorage.getItem(KEY));if(validState(saved))return upgradeCommerce(upgradeTaxonomy(saved));const old=JSON.parse(localStorage.getItem('buyme-admin-demo-v1'));if(old?.version===1&&Array.isArray(old.deals)&&Array.isArray(old.tickets))return enrichSeed(old);}catch{}return createSeed();}
export function validState(s){return s?.version===2&&['deals','tickets','offers','members','providers','reviews','activity','payouts'].every(k=>Array.isArray(s[k]));}
export function saveState(s){s.lastSaved=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(s));}
export function loadSession(){try{return JSON.parse(localStorage.getItem('buyme-demo-session'))||{member:'U-2108',provider:'A-101'};}catch{return {member:'U-2108',provider:'A-101'};}}
export function saveSession(s){try{localStorage.setItem('buyme-demo-session',JSON.stringify(s));}catch{}}
