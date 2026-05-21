/* ═══════════════════════════════════════════════════════════════
   NUROL · B+D HI-FI · APP LOGIC
   ═══════════════════════════════════════════════════════════════ */

(function(){
  // ─── Scroll reveals (opt-in only — content is visible by default if JS fails) ───
  let io = null;
  function armReveals(){
    if(io) io.disconnect();
    // Enable the hide-by-default CSS only AFTER we've decided what's already in view.
    // First: mark everything already in/above the viewport as `.in` so it shows immediately.
    const vh = window.innerHeight || 800;
    const allReveals = [...document.querySelectorAll('.page.active .reveal')];
    allReveals.forEach(el => {
      const rect = el.getBoundingClientRect();
      if(rect.top < vh * 1.1) el.classList.add('in');
    });
    // Now opt in — anything not already `.in` will hide and animate in on scroll.
    document.documentElement.classList.add('js-reveals');

    io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if(en.isIntersecting){
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, {threshold:0.05, rootMargin:'0px 0px -8% 0px'});
    document.querySelectorAll('.page.active .reveal:not(.in)').forEach(el => io.observe(el));

    // Final safety net — even if the observer never fires (some browsers, edge cases),
    // force everything visible after 2s. Page is never broken.
    setTimeout(() => {
      document.querySelectorAll('.page.active .reveal:not(.in)').forEach(el => el.classList.add('in'));
    }, 2000);
  }

  // ─── Page routing (Apple-style: instant, hashless on click) ───
  const pages = document.querySelectorAll('.page');
  const navLinks = document.querySelectorAll('[data-route]');
  function go(name, push=true){
    pages.forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
    navLinks.forEach(l => l.classList.toggle('active', l.dataset.route === name));
    window.scrollTo({top:0, behavior:'instant'});
    if(push) history.pushState({page:name}, '', '#' + name);
    // re-arm reveals on the new page
    armReveals();
  }
  document.addEventListener('click', e => {
    const scrollA = e.target.closest('[data-scroll]');
    if(scrollA){
      e.preventDefault();
      const id = scrollA.dataset.scroll;
      // Make sure we're on home, then scroll to anchor
      if(!document.getElementById('page-home').classList.contains('active')){
        go('home', true);
        // wait a frame for the page to render before scrolling
        requestAnimationFrame(() => {
          const el = document.getElementById(id);
          if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
        });
      } else {
        const el = document.getElementById(id);
        if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
      }
      return;
    }
    const a = e.target.closest('[data-route]');
    if(!a) return;
    e.preventDefault();
    go(a.dataset.route);
  });
  window.addEventListener('popstate', e => {
    const name = (e.state && e.state.page) || (location.hash.slice(1) || 'home');
    go(name, false);
  });
  // init route from hash
  const initial = location.hash.slice(1);
  if(initial && document.getElementById('page-' + initial)) go(initial, false);
  else armReveals();

  // ─── Hero desktop "flatten on scroll" ───
  const desktops = document.querySelectorAll('.desktop');
  function onScroll(){
    const y = window.scrollY;
    desktops.forEach(d => {
      const rect = d.getBoundingClientRect();
      if(rect.top < window.innerHeight && rect.bottom > 0){
        const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / window.innerHeight));
        const tilt = 8 * (1 - Math.min(1, progress * 1.6));
        d.style.transform = `perspective(2200px) rotateX(${tilt}deg)`;
      }
    });
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  // ─── Sector tabs (Home) ───
  document.querySelectorAll('[data-sector-tabs]').forEach(group => {
    const tabs = group.querySelectorAll('.spotlight-tab');
    const slides = group.querySelectorAll('[data-sector-slide]');
    tabs.forEach((t,i) => t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      slides.forEach(s => s.style.display = 'none');
      t.classList.add('active');
      slides[i].style.display = '';
    }));
  });

  // ─── Filter chips (Agents) ───
  document.querySelectorAll('[data-filter-group]').forEach(group => {
    const filters = group.querySelectorAll('.filter');
    const targetSel = group.dataset.filterGroup;
    const items = document.querySelectorAll(targetSel + ' [data-cat]');
    filters.forEach(f => f.addEventListener('click', () => {
      filters.forEach(x => x.classList.remove('active'));
      f.classList.add('active');
      const c = f.dataset.cat;
      items.forEach(it => {
        const match = (c === 'all') || it.dataset.cat.split(' ').includes(c);
        it.style.display = match ? '' : 'none';
      });
    }));
  });

  // ─── Tweak panel (hero headline swap) ───
  const variants = [
    {name:'A · Pillar echo', headline:'Power on <em>your</em> AI.', sub:'Hybrid AI, optimised end-to-end, air-gapped by design. One platform — yours to control.'},
    {name:'B · Hybrid-led', headline:'Hybrid AI.<br><em>One platform.</em>', sub:'Cloud elastic when you want it. On-prem locked-down when you don\u2019t. NurOS routes the difference.'},
    {name:'C · Sovereignty', headline:'Governed<br><em>by your policy.</em>', sub:'Identity-aware routing keeps sensitive data on iron you own. Hybrid AI on your terms.'},
    {name:'D · Performance per $', headline:'Maximum value.<br><em>Per dollar.</em>', sub:'Intelligent routing across on-prem and cloud picks the cheapest path that still satisfies your policy. No compromise on capability.'},
    {name:'E · Operating system', headline:'An OS<br>for <em>your AI.</em>', sub:'Hybrid by default. Optimised by design. Governed by policy. Boots in your rack \u2014 in days, not months.'}
  ];
  const fab = document.getElementById('tweakFab');
  const panel = document.getElementById('tweakPanel');
  const optsRoot = document.getElementById('tweakOpts');
  const heroH = document.getElementById('heroHeadline');
  const heroSub = document.getElementById('heroSub');

  if(fab && panel && optsRoot && heroH){
    let current = 0;
    function render(){
      optsRoot.innerHTML = variants.map((v,i) => `
        <button class="opt ${i === current ? 'active' : ''}" data-i="${i}">
          <div class="name">${v.name}</div>
          <div class="copy">${v.headline.replace(/<[^>]+>/g,' ')} — ${v.sub.slice(0,60)}…</div>
        </button>
      `).join('');
    }
    function apply(i){
      current = i;
      heroH.innerHTML = variants[i].headline;
      if(heroSub) heroSub.textContent = variants[i].sub;
      render();
    }
    fab.addEventListener('click', () => panel.classList.toggle('open'));
    optsRoot.addEventListener('click', e => {
      const b = e.target.closest('.opt');
      if(b) apply(+b.dataset.i);
    });
    render();
  }

  // ─── Featured agents carousel ───
  (function initCarousel(){
    const car = document.getElementById('agentCarousel');
    if(!car) return;
    const track = car.querySelector('.car-track');
    const slides = [...car.querySelectorAll('.car-slide')];
    const dots = [...car.querySelectorAll('.car-dot')];
    const navBtns = [...car.querySelectorAll('.car-btn')];
    const progress = car.querySelector('#carProgress');
    const interval = +car.dataset.autoplay || 7000;
    let i = 0, timer = null, progressTimer = null, paused = false;

    function set(n){
      i = (n + slides.length) % slides.length;
      track.style.transform = `translateX(${-i * 100}%)`;
      slides.forEach((s,k) => s.classList.toggle('active', k === i));
      dots.forEach((d,k) => d.classList.toggle('active', k === i));
      resetProgress();
    }

    function resetProgress(){
      if(progressTimer) clearInterval(progressTimer);
      if(!progress) return;
      progress.style.width = '0%';
      if(paused) return;
      const start = performance.now();
      progressTimer = setInterval(() => {
        const elapsed = performance.now() - start;
        const pct = Math.min(100, (elapsed / interval) * 100);
        progress.style.width = pct + '%';
        if(pct >= 100) clearInterval(progressTimer);
      }, 50);
    }

    function startTimer(){
      stopTimer();
      timer = setInterval(() => { if(!paused) set(i + 1); }, interval);
    }
    function stopTimer(){ if(timer) clearInterval(timer); timer = null; }

    dots.forEach(d => d.addEventListener('click', () => { set(+d.dataset.idx); startTimer(); }));
    navBtns.forEach(b => b.addEventListener('click', () => { set(i + (+b.dataset.dir)); startTimer(); }));

    // pause on hover
    car.addEventListener('mouseenter', () => { paused = true; if(progressTimer) clearInterval(progressTimer); });
    car.addEventListener('mouseleave', () => { paused = false; resetProgress(); });

    // only run autoplay when in view
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if(en.isIntersecting){
          startTimer();
          resetProgress();
        } else {
          stopTimer();
          if(progressTimer) clearInterval(progressTimer);
        }
      });
    }, {threshold:0.2});
    io.observe(car);

    set(0);
  })();
  window.addEventListener('message', e => {
    if(!e.data || !e.data.type) return;
    if(e.data.type === '__activate_edit_mode'){
      fab && fab.classList.add('show');
    } else if(e.data.type === '__deactivate_edit_mode'){
      fab && fab.classList.remove('show');
      panel && panel.classList.remove('open');
    }
  });
  // Always show in standalone view too — small floating handle
  fab && fab.classList.add('show');
  try{ window.parent.postMessage({type:'__edit_mode_available'}, '*'); }catch(e){}

  // ─── In-viewport "live" stats counter (Why page) ───
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const obs = new IntersectionObserver((entries,o) => {
      entries.forEach(en => {
        if(!en.isIntersecting) return;
        o.unobserve(el);
        const start = performance.now();
        const dur = 1200;
        function tick(t){
          const p = Math.min(1, (t - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = target * eased;
          el.textContent = prefix + (target % 1 === 0 ? Math.round(val) : val.toFixed(1)) + suffix;
          if(p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, {threshold:0.5});
    obs.observe(el);
  });
})();
, headline:'Maximum value.<br><em>Per dollar.</em>', sub:'Intelligent routing across on-prem and cloud picks the cheapest path that still satisfies your policy. No compromise on capability.'},
    {name:'E · Operating system', headline:'An OS<br>for <em>your AI.</em>', sub:'Hybrid by default. Optimised by design. Air-gapped by choice. Boots in your rack — in 48 hours.'}
  ];
  const fab = document.getElementById('tweakFab');
  const panel = document.getElementById('tweakPanel');
  const optsRoot = document.getElementById('tweakOpts');
  const heroH = document.getElementById('heroHeadline');
  const heroSub = document.getElementById('heroSub');

  if(fab && panel && optsRoot && heroH){
    let current = 0;
    function render(){
      optsRoot.innerHTML = variants.map((v,i) => `
        <button class="opt ${i === current ? 'active' : ''}" data-i="${i}">
          <div class="name">${v.name}</div>
          <div class="copy">${v.headline.replace(/<[^>]+>/g,' ')} — ${v.sub.slice(0,60)}…</div>
        </button>
      `).join('');
    }
    function apply(i){
      current = i;
      heroH.innerHTML = variants[i].headline;
      if(heroSub) heroSub.textContent = variants[i].sub;
      render();
    }
    fab.addEventListener('click', () => panel.classList.toggle('open'));
    optsRoot.addEventListener('click', e => {
      const b = e.target.closest('.opt');
      if(b) apply(+b.dataset.i);
    });
    render();
  }

  // ─── Featured agents carousel ───
  (function initCarousel(){
    const car = document.getElementById('agentCarousel');
    if(!car) return;
    const track = car.querySelector('.car-track');
    const slides = [...car.querySelectorAll('.car-slide')];
    const dots = [...car.querySelectorAll('.car-dot')];
    const navBtns = [...car.querySelectorAll('.car-btn')];
    const progress = car.querySelector('#carProgress');
    const interval = +car.dataset.autoplay || 7000;
    let i = 0, timer = null, progressTimer = null, paused = false;

    function set(n){
      i = (n + slides.length) % slides.length;
      track.style.transform = `translateX(${-i * 100}%)`;
      slides.forEach((s,k) => s.classList.toggle('active', k === i));
      dots.forEach((d,k) => d.classList.toggle('active', k === i));
      resetProgress();
    }

    function resetProgress(){
      if(progressTimer) clearInterval(progressTimer);
      if(!progress) return;
      progress.style.width = '0%';
      if(paused) return;
      const start = performance.now();
      progressTimer = setInterval(() => {
        const elapsed = performance.now() - start;
        const pct = Math.min(100, (elapsed / interval) * 100);
        progress.style.width = pct + '%';
        if(pct >= 100) clearInterval(progressTimer);
      }, 50);
    }

    function startTimer(){
      stopTimer();
      timer = setInterval(() => { if(!paused) set(i + 1); }, interval);
    }
    function stopTimer(){ if(timer) clearInterval(timer); timer = null; }

    dots.forEach(d => d.addEventListener('click', () => { set(+d.dataset.idx); startTimer(); }));
    navBtns.forEach(b => b.addEventListener('click', () => { set(i + (+b.dataset.dir)); startTimer(); }));

    // pause on hover
    car.addEventListener('mouseenter', () => { paused = true; if(progressTimer) clearInterval(progressTimer); });
    car.addEventListener('mouseleave', () => { paused = false; resetProgress(); });

    // only run autoplay when in view
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if(en.isIntersecting){
          startTimer();
          resetProgress();
        } else {
          stopTimer();
          if(progressTimer) clearInterval(progressTimer);
        }
      });
    }, {threshold:0.2});
    io.observe(car);

    set(0);
  })();
  window.addEventListener('message', e => {
    if(!e.data || !e.data.type) return;
    if(e.data.type === '__activate_edit_mode'){
      fab && fab.classList.add('show');
    } else if(e.data.type === '__deactivate_edit_mode'){
      fab && fab.classList.remove('show');
      panel && panel.classList.remove('open');
    }
  });
  // Always show in standalone view too — small floating handle
  fab && fab.classList.add('show');
  try{ window.parent.postMessage({type:'__edit_mode_available'}, '*'); }catch(e){}

  // ─── In-viewport "live" stats counter (Why page) ───
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const obs = new IntersectionObserver((entries,o) => {
      entries.forEach(en => {
        if(!en.isIntersecting) return;
        o.unobserve(el);
        const start = performance.now();
        const dur = 1200;
        function tick(t){
          const p = Math.min(1, (t - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = target * eased;
          el.textContent = prefix + (target % 1 === 0 ? Math.round(val) : val.toFixed(1)) + suffix;
          if(p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, {threshold:0.5});
    obs.observe(el);
  });
})();
