import {accountConfig} from './account-config.js';

// The live account area and the fictional local marketplace never share credentials.
export function accountEntryTarget(href, enabled) {
  if (!enabled) return null;
  const current = new URL(href);
  if (current.pathname.endsWith('/account.html')) return null;
  const name = current.hash.slice(1);
  const legal = {imprint:'imprint', privacy:'privacy', 'test-terms':'terms'};
  const auth = {register:'register', 'register-provider':'register-provider', login:'login', profile:'profile', security:'forgot'};
  const isDemo = current.searchParams.get('demo') === '1' || current.searchParams.get('next') === 'admin' || current.pathname.endsWith('/admin.html');
  const targetRoute = Object.hasOwn(legal,name) ? legal[name] : !isDemo && Object.hasOwn(auth,name) ? auth[name] : null;
  if (!targetRoute) return null;
  const target = new URL('./account.html', current);
  target.search = '';
  target.hash = targetRoute;
  return target.href;
}

if (typeof window !== 'undefined') {
  const enterAccount = () => {
    const target = accountEntryTarget(window.location.href, accountConfig.enabled);
    if (target) window.location.replace(target);
  };
  window.addEventListener('hashchange', enterAccount);
  enterAccount();
}
