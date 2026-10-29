import {CATEGORY_TREE,categoryName,categoryInfo} from './categories.js';
import {esc,icon,categoryIcon} from './ui.js';
const marks={
 fashion:'M10 5a2 2 0 0 1 4 0c0 2-2 2-2 4 M12 9 3 16v3h18v-3L12 9',
 'food-service':'M4 3v6a3 3 0 0 0 6 0V3 M7 3v18 M17 3v9h4V3 M19 12v9',
 health:'M8 3h8v5h5v8h-5v5H8v-5H3V8h5V3',
 beauty:'m12 3 2 6 6 3-6 2-2 7-2-7-6-2 6-3 2-6 M20 3v4 M18 5h4',
 groceries:'M3 9h18l-2 12H5L3 9z M7 9l3-6 M17 9l-3-6 M9 13v4 M15 13v4',
 streaming:'M3 5h18v14H3z m6 4 6 3-6 3V9',
 education:'M12 5C8 3 5 3 2 4v15c3-1 6-1 10 1 M12 5c4-2 7-2 10-1v15c-3-1-6-1-10 1V5',
 digital:'M3 3h18v14H3z M8 21h8 M12 17v4 m-4-10-2 3 2 3 m8-6 2 3-2 3',
 pets:'M7 16c0-3 2-6 5-6s5 3 5 6c0 4-3 3-5 3s-5 1-5-3 M4 7a2 2 0 1 0 .1 0 M9 3a2 2 0 1 0 .1 0 M15 3a2 2 0 1 0 .1 0 M20 7a2 2 0 1 0 .1 0',
 press:'M5 3h16v18H5V3 M5 8H2v13h16 M9 7h8 M9 11h3v4H9z M15 11h2 M15 15h2 M9 18h8',
 sport:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M5 5l14 14 M19 5 5 19 M2 12c7-4 13-4 20 0 M12 2c-4 7-4 13 0 20'
};
function mark(category){const path=marks[categoryInfo(category)?.id];return path?`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`:icon(categoryIcon(category));}
export function categoryBrowser(category='',expanded=false){
 const active=categoryName(category);
 return `<section class="category-browser ${expanded?'is-expanded':''}" aria-labelledby="category-browser-title"><div class="category-browser-head"><div><h3 id="category-browser-title">Kategorien entdecken</h3><p>Finde den Bereich, der zu dir passt.</p></div><button type="button" id="category-all" class="category-all ${!active?'selected':''}" data-category="" aria-pressed="${!active}">${icon('grid')}<span>Alle Angebote</span></button></div><div class="category-browser-grid" id="category-browser-grid">${CATEGORY_TREE.map(group=>`<button type="button" id="category-${group.id}" class="category-tile ${active===group.name?'selected':''}" data-category="${esc(group.name)}" aria-pressed="${active===group.name}" title="${esc(group.name)}"><span class="category-tile-icon">${mark(group.name)}</span><span class="category-tile-label">${esc(group.name)}</span><span class="category-tile-check">${icon('check')}</span></button>`).join('')}</div><div class="category-browser-foot"><button type="button" id="category-toggle" class="category-toggle" data-action="toggle-categories" aria-expanded="${expanded}" aria-controls="category-browser-grid"><span>${expanded?'Weniger Kategorien anzeigen':'Alle Kategorien anzeigen'}</span>${icon('chevron')}</button></div></section>`;
}
