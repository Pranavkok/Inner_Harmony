/* ==========================================================================
   INNER HARMONY — "The Journey Within" · surprise-driven scroll ride
   One rAF scroll loop drives every scene. No libraries.
   ========================================================================== */
(function () {
    'use strict';

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $  = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => [...c.querySelectorAll(s)];
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    // progress of an element through the viewport-scroll window it "pins" over
    const prog = (el) => {
        const r = el.getBoundingClientRect();
        const total = r.height - innerHeight;          // scrollable distance while pinned
        return clamp(-r.top / (total || 1));
    };
    const mix = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));
    const rgb = (a) => `rgb(${a[0]},${a[1]},${a[2]})`;

    /* ---------- LOADER ---------- */
    addEventListener('load', () => setTimeout(() => $('#loader')?.classList.add('done'), 600));

    /* ---------- NAV ---------- */
    const nav = $('#nav'), burger = $('#navBurger'), mob = $('#mobileMenu');
    burger?.addEventListener('click', () => { burger.classList.toggle('open'); mob.classList.toggle('open'); });
    $$('#mobileMenu a').forEach(a => a.addEventListener('click', () => { burger.classList.remove('open'); mob.classList.remove('open'); }));

    /* ---------- WORD FLY-IN (hero) ---------- */
    const flyers = $$('[data-fly]');
    flyers.forEach((el) => {
        const dx = (Math.random() * 2 - 1) * 220;
        const dy = (Math.random() * 2 - 1) * 160 - 40;
        const rot = (Math.random() * 2 - 1) * 24;
        el.style.transform = `translate(${dx}px,${dy}px) rotate(${rot}deg)`;
    });
    addEventListener('load', () => {
        setTimeout(() => flyers.forEach((el, i) => setTimeout(() => el.classList.add('flew'), i * 85)), 700);
    });

    /* ---------- REVEALS ---------- */
    const revs = $$('.reveal');
    revs.forEach((el, i) => el.style.setProperty('--d', i % 4));
    const rObs = new IntersectionObserver((es) => es.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); rObs.unobserve(e.target); }
    }), { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    revs.forEach(el => rObs.observe(el));

    /* ---------- STAT COUNTERS ---------- */
    const cObs = new IntersectionObserver((es) => es.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target, target = +el.dataset.count, t0 = performance.now(), dur = 1500;
        (function tick(now) {
            const t = clamp((now - t0) / dur), k = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(target * k).toLocaleString();
            if (t < 1) requestAnimationFrame(tick);
        })(t0);
        cObs.unobserve(el);
    }), { threshold: 0.6 });
    $$('.stat-num').forEach(el => cObs.observe(el));

    /* ---------- CURSOR GLOW ---------- */
    const glow = $('#cursorGlow');
    if (glow && !reduce && matchMedia('(pointer:fine)').matches) {
        let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy;
        addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
        (function f() { gx = lerp(gx, tx, .12); gy = lerp(gy, ty, .12); glow.style.left = gx + 'px'; glow.style.top = gy + 'px'; requestAnimationFrame(f); })();
    } else if (glow) glow.style.display = 'none';

    /* ---------- SCENE ELEMENTS ---------- */
    const worldBg   = $('#worldBg');
    const ribbon    = $('#ribbonFill');
    const blinkAct  = $('#blink');
    const intro     = $('[data-blink="intro"]');
    const orb       = $('#portalOrb');
    const lidTop    = $('#lidTop');
    const lidBot    = $('#lidBot');
    const bReveal   = $('#blinkReveal');
    const sideways  = $('#guide');
    const sideRail  = $('#sideRail');
    const panels    = sideRail ? $$('.panel', sideRail).length : 0;
    const sunriseEl = $('#sunrise');
    const srSun     = $('#sunriseSun');
    const srCopy    = $('#sunriseCopy');

    // day & night palettes for the fixed world bg
    const DAY   = { top: [247,231,220], bot: [238,240,230], glow: [251,228,214] };
    const NIGHT = { top: [14,19,48],    bot: [22,27,61],   glow: [40,44,90] };
    const setWorld = (p) => {
        worldBg.style.setProperty('--bg-top', rgb(mix(DAY.top, NIGHT.top, p)));
        worldBg.style.setProperty('--bg-bot', rgb(mix(DAY.bot, NIGHT.bot, p)));
        worldBg.style.setProperty('--bg-glow', rgb(mix(DAY.glow, NIGHT.glow, p)));
    };

    /* ---------- MASTER SCROLL LOOP ---------- */
    let ticking = false;
    function frame() {
        const doc = document.documentElement;
        const maxS = doc.scrollHeight - innerHeight;
        const gp = clamp(scrollY / (maxS || 1));
        ribbon.style.width = (gp * 100) + '%';
        nav.classList.toggle('scrolled', scrollY > 40);

        /* ===== SINGLE BACKGROUND STATE MACHINE =====
           night = 0 (day) .. 1 (night). Computed once, applied once.
           Ride order: hero(day) → blink(flip→night) → constellation+guide(night)
                       → sunrise(flip→day) → pullcard/contact(day).            */
        let night = 0;

        // ----- ACT 2: THE BLINK — flips day → night -----
        if (blinkAct) {
            const p = prog(blinkAct);                 // 0..1 across the pin
            const inView = blinkAct.getBoundingClientRect();

            // orb zooms toward you as you approach the blink
            if (orb) {
                const s = 1 + Math.pow(clamp(p / 0.45), 2) * 9;   // grows huge
                orb.style.transform = `scale(${s})`;
                orb.style.opacity = clamp(1 - (p - 0.42) / 0.1);
            }
            if (intro) intro.style.opacity = clamp(1 - p / 0.3);

            // eyelids close .40 → .52, open .52 → .64
            let lid = 0;
            if (p > 0.4 && p <= 0.52) lid = (p - 0.4) / 0.12;
            else if (p > 0.52 && p < 0.64) lid = 1 - (p - 0.52) / 0.12;
            if (lidTop) lidTop.style.transform = `translateY(${lerp(-102, 0, lid)}%)`;
            if (lidBot) lidBot.style.transform = `translateY(${lerp(102, 0, lid)}%)`;

            // world flips to night at the closed moment
            night = clamp((p - 0.46) / 0.1);

            // reveal night copy after eyes reopen
            if (bReveal) {
                const rp = clamp((p - 0.6) / 0.25);
                bReveal.style.opacity = rp;
                bReveal.style.transform = `translateY(${lerp(30, 0, rp)}px)`;
            }

            // once we've scrolled PAST the blink section, hold full night
            if (inView.bottom <= 0) night = 1;
        }

        // ----- ACT 5: SUNRISE — flips night → day (takes precedence when active) -----
        if (sunriseEl) {
            const r = sunriseEl.getBoundingClientRect();
            if (r.bottom <= 0) {
                night = 0;                              // fully past sunrise → day
            } else if (r.top < innerHeight) {
                const p = prog(sunriseEl);
                night = clamp(1 - p * 1.4);             // night back to day
                if (srSun) {
                    srSun.style.transform = `translateX(-50%) translateY(${lerp(20, -60, p)}vh) scale(${lerp(.8,1.3,p)})`;
                    srSun.style.opacity = clamp(p * 1.4);
                }
                if (srCopy) {
                    srCopy.style.opacity = clamp((p - 0.25) / 0.4);
                    srCopy.style.transform = `translateY(${lerp(40, 0, clamp((p-0.25)/0.4))}px)`;
                }
            }
            // sunrise still below viewport → leave `night` as blink set it (day at hero, night after blink)
        }

        setWorld(night);
        nav.classList.toggle('on-night', night > 0.5);

        // ----- ACT 4: SIDEWAYS DETOUR -----
        if (sideways && sideRail && panels > 1) {
            const r = sideways.getBoundingClientRect();
            if (r.top < innerHeight && r.bottom > 0) {
                const p = prog(sideways);
                const shift = p * (panels - 1) * 100;   // vw
                sideRail.style.transform = `translateX(-${shift}vw)`;
            }
        }

        ticking = false;
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    if (!reduce) {
        addEventListener('scroll', onScroll, { passive: true });
        addEventListener('resize', onScroll);
        frame();
    } else {
        // static fallback
        setWorld(0);
    }

    /* ---------- CONSTELLATION CANVAS (lines to cursor + between stars) ---------- */
    const sc = $('#starCanvas');
    if (sc && !reduce) {
        const ctx = sc.getContext('2d');
        const field = $('#starField');
        let W, H, pts = [], mouse = { x: -9999, y: -9999 };
        function size() {
            const r = sc.getBoundingClientRect();
            W = sc.width = r.width * devicePixelRatio;
            H = sc.height = r.height * devicePixelRatio;
        }
        function collect() {
            const base = sc.getBoundingClientRect();
            pts = $$('.star', field).map(s => {
                const r = s.getBoundingClientRect();
                return { x: (r.left + r.width / 2 - base.left) * devicePixelRatio,
                         y: (r.top + r.height / 2 - base.top) * devicePixelRatio };
            });
        }
        size(); collect();
        addEventListener('resize', () => { size(); collect(); });
        addEventListener('scroll', collect, { passive: true });
        sc.parentElement.addEventListener('mousemove', e => {
            const b = sc.getBoundingClientRect();
            mouse.x = (e.clientX - b.left) * devicePixelRatio;
            mouse.y = (e.clientY - b.top) * devicePixelRatio;
        });
        sc.parentElement.addEventListener('mouseleave', () => { mouse.x = mouse.y = -9999; });

        (function draw() {
            ctx.clearRect(0, 0, W, H);
            // faint web between nearby stars
            ctx.lineWidth = 1 * devicePixelRatio;
            for (let i = 0; i < pts.length; i++) {
                for (let j = i + 1; j < pts.length; j++) {
                    const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
                    if (d < 360 * devicePixelRatio) {
                        ctx.strokeStyle = `rgba(245,230,200,${0.12 * (1 - d / (360 * devicePixelRatio))})`;
                        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
                    }
                }
            }
            // bright lines from cursor to near stars — "drawing" the constellation
            pts.forEach(p => {
                const d = Math.hypot(p.x - mouse.x, p.y - mouse.y);
                if (d < 260 * devicePixelRatio) {
                    ctx.strokeStyle = `rgba(245,230,200,${0.5 * (1 - d / (260 * devicePixelRatio))})`;
                    ctx.lineWidth = 1.3 * devicePixelRatio;
                    ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(p.x, p.y); ctx.stroke();
                }
            });
            requestAnimationFrame(draw);
        })();

        const hint = $('#constHint');
        field.addEventListener('mouseenter', () => hint && (hint.style.opacity = '0'), { once: true });
    }

    /* ---------- DRIFTING DUST (day layer) ---------- */
    const dust = $('#dustCanvas');
    if (dust && !reduce) {
        const ctx = dust.getContext('2d');
        let W, H, ps = [], m = { x: -9999, y: -9999 };
        const size = () => { W = dust.width = innerWidth * devicePixelRatio; H = dust.height = innerHeight * devicePixelRatio; dust.style.width = innerWidth + 'px'; dust.style.height = innerHeight + 'px'; };
        size(); addEventListener('resize', size);
        addEventListener('mousemove', e => { m.x = e.clientX * devicePixelRatio; m.y = e.clientY * devicePixelRatio; });
        const rand = (a, b) => a + Math.random() * (b - a);
        const N = Math.min(64, Math.floor(innerWidth / 20));
        for (let i = 0; i < N; i++) ps.push({ x: Math.random() * W, y: Math.random() * H, r: rand(.6, 2.3) * devicePixelRatio, vx: rand(-.12, .12), vy: rand(-.26, -.04), a: rand(.15, .55), tw: rand(.005, .02), tp: Math.random() * 6.28 });
        (function draw() {
            ctx.clearRect(0, 0, W, H);
            for (const p of ps) {
                p.x += p.vx; p.y += p.vy; p.tp += p.tw;
                const dx = m.x - p.x, dy = m.y - p.y, dist = Math.hypot(dx, dy);
                if (dist < 170 * devicePixelRatio) { p.x += dx * .008; p.y += dy * .008; }
                if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
                if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28);
                ctx.fillStyle = `rgba(255,244,226,${p.a * (.6 + .4 * Math.sin(p.tp))})`;
                ctx.shadowBlur = 6 * devicePixelRatio; ctx.shadowColor = 'rgba(255,240,215,.6)';
                ctx.fill();
            }
            requestAnimationFrame(draw);
        })();
    } else if (dust) dust.style.display = 'none';

    /* ---------- PULL A CARD ---------- */
    const deck = $('#deck'), cardMsg = $('#cardMessage');
    if (deck) {
        const cards = $$('.tcard', deck);
        let picked = false;
        cards.forEach(card => {
            card.addEventListener('click', () => {
                if (picked) return;
                picked = true;
                card.classList.add('flipped');
                cards.forEach(c => { if (c !== card) c.classList.add('dim'); });
                if (cardMsg) {
                    cardMsg.style.opacity = '0';
                    setTimeout(() => { cardMsg.textContent = '“' + card.dataset.msg + '”'; cardMsg.style.opacity = '1'; }, 350);
                }
                setTimeout(() => {
                    picked = false;
                    cards.forEach(c => c.classList.remove('flipped', 'dim'));
                    if (cardMsg) { cardMsg.style.opacity = '0'; setTimeout(() => { cardMsg.textContent = 'choose again ✦'; cardMsg.style.opacity = '1'; }, 350); }
                }, 5200);
            });
        });
    }

    /* ---------- FORM ---------- */
    const form = $('#contactForm');
    form?.addEventListener('submit', e => {
        e.preventDefault();
        const b = $('#submitBtn'), t = b.textContent;
        b.textContent = 'Thank you — we’ll be in touch ♥'; b.style.background = '#128c7e';
        form.reset();
        setTimeout(() => { b.textContent = t; b.style.background = ''; }, 3200);
    });

    /* ---------- SMOOTH ANCHORS ---------- */
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
        const id = a.getAttribute('href'); if (id.length < 2) return;
        const el = $(id); if (!el) return;
        e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' });
    }));

})();
