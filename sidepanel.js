(function(){
  const sidebar = document.getElementById('opSidebar');
  const toggle = document.getElementById('opSidebarToggle');
  if (!sidebar || !toggle) return;

  const current = location.pathname.split('/').pop() || 'index.html';
  const hash = location.hash || '';

  function normalizeHref(href){ return (href || '').split('#')[0] || 'index.html'; }
  function hrefMatches(href){
    const base = normalizeHref(href);
    if (href === current + hash) return true;
    if (!hash && base === current) return true;
    if (hash && href === current + hash) return true;
    return false;
  }

  let activeGroup = null;
  sidebar.querySelectorAll('.op-sidebar-nav a').forEach(a => {
    const href = a.getAttribute('href') || '';
    const base = normalizeHref(href);
    if (base === current) a.classList.add('is-active-parent');
    if (hrefMatches(href)) a.classList.add('is-active');
    if (a.classList.contains('is-active') || base === current) {
      const group = a.closest('.op-nav-group');
      if (group && !activeGroup) activeGroup = group;
    }
  });

  function setGroup(group, open){
    const btn = group.querySelector('.op-nav-parent');
    group.classList.toggle('is-expanded', open);
    if (btn) btn.setAttribute('aria-expanded', String(open));
  }

  sidebar.querySelectorAll('.op-nav-group').forEach(group => {
    setGroup(group, false);
    const btn = group.querySelector('.op-nav-parent');
    if (!btn) return;
    btn.addEventListener('click', function(){
      const nextOpen = !group.classList.contains('is-expanded');
      setGroup(group, nextOpen);
    });
  });
  if (activeGroup) setGroup(activeGroup, true);

  function setSidebar(open){
    document.body.classList.toggle('sidebar-open', open);
    sidebar.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }
  setSidebar(window.innerWidth >= 1180);
  toggle.addEventListener('click', function(){ setSidebar(!document.body.classList.contains('sidebar-open')); });
  window.addEventListener('resize', function(){ if (window.innerWidth < 980) setSidebar(false); });
})();
