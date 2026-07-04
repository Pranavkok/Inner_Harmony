// ========================================
// INNER HARMONY — Premium Interactions
// GSAP animations + cinematic hero
// ========================================

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ limitCallbacks: true });

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ========== UTILITY: Text Splitting ==========
function splitTextIntoWords(element) {
    const html = element.innerHTML;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const wordSpans = [];

    function processNode(node, parent) {
        if (node.nodeType === Node.TEXT_NODE) {
            const words = node.textContent.split(/(\s+)/);
            words.forEach(word => {
                if (word.match(/^\s+$/)) {
                    parent.appendChild(document.createTextNode(' '));
                } else if (word.length > 0) {
                    const outer = document.createElement('span');
                    outer.className = 'word';
                    const inner = document.createElement('span');
                    inner.className = 'word-inner';
                    inner.textContent = word;
                    outer.appendChild(inner);
                    parent.appendChild(outer);
                    wordSpans.push(inner);
                }
            });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const clone = document.createElement(node.tagName.toLowerCase());
            for (const attr of node.attributes) {
                clone.setAttribute(attr.name, attr.value);
            }
            parent.appendChild(clone);
            node.childNodes.forEach(child => processNode(child, clone));
        }
    }

    element.innerHTML = '';
    tempDiv.childNodes.forEach(child => processNode(child, element));
    return wordSpans;
}

function scrollReveal(trigger, targets, fromVars, toVars, options = {}) {
    const els = typeof targets === 'string' ? gsap.utils.toArray(targets) :
                (targets instanceof Element ? [targets] : Array.from(targets));
    if (!els.length) return;
    gsap.set(els, fromVars);
    ScrollTrigger.create({
        trigger: trigger,
        start: options.start || 'top 88%',
        once: true,
        onEnter: () => {
            gsap.to(els, {
                ...toVars,
                duration: toVars.duration || 0.9,
                ease: toVars.ease || 'power3.out',
                stagger: toVars.stagger || 0,
                delay: toVars.delay || 0,
            });
        },
    });
}

function batchReveal(selector, fromVars, toVars, options = {}) {
    const els = gsap.utils.toArray(selector);
    if (!els.length) return;
    gsap.set(els, fromVars);
    ScrollTrigger.batch(els, {
        start: options.start || 'top 90%',
        once: true,
        onEnter: (batch) => {
            gsap.to(batch, {
                ...toVars,
                duration: toVars.duration || 0.8,
                ease: toVars.ease || 'power3.out',
                stagger: toVars.stagger || 0.12,
                overwrite: true,
            });
        },
    });
}

// ========== PAGE LOADER ==========
const pageLoader = document.getElementById('pageLoader');

function hideLoader() {
    if (!pageLoader || pageLoader.classList.contains('loaded')) return;
    pageLoader.classList.add('loaded');
    document.body.style.overflow = '';
    startHeroSequence();

    // If the page was opened directly at an anchor, the scroll-lock swallowed
    // the jump — restore it, then refresh so in-view reveals fire.
    if (location.hash && location.hash.length > 1) {
        const target = document.querySelector(location.hash);
        if (target) window.scrollTo({ top: target.offsetTop - 80 });
    }
    ScrollTrigger.refresh();
    revealInView();

    setTimeout(() => { if (pageLoader) pageLoader.style.display = 'none'; }, 900);
}

// Safety net: reveal any scroll-animated element already within the viewport
// (covers direct hash loads where ScrollTrigger's onEnter wouldn't fire).
function revealInView() {
    const vh = window.innerHeight;
    document.querySelectorAll('.reveal-up, .reveal-text, .split-words, .hook-card, .svc-card, .accord-item, .step-card, .benefit-item, .test-item, .career-different, .career-tests, .philo-line').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < vh && rect.bottom > 0) {
            if (el.classList.contains('reveal-text')) {
                gsap.to(el, { clipPath: 'inset(0 0% 0 0)', duration: 0.6, overwrite: true });
            } else if (el.classList.contains('split-words')) {
                gsap.to(el.querySelectorAll('.word-inner'), { y: 0, duration: 0.6, stagger: 0.04, overwrite: true });
            } else {
                gsap.to(el, { opacity: 1, x: 0, y: 0, clearProps: 'transform', duration: 0.6, overwrite: true });
            }
        }
    });
}

// Lock scroll while the loader is visible
if (pageLoader) document.body.style.overflow = 'hidden';

// Hide once everything is ready, with sensible fallbacks
window.addEventListener('load', () => setTimeout(hideLoader, 1400));
setTimeout(hideLoader, 3500); // hard fallback so the page never stays locked

// ========== CINEMATIC HERO SEQUENCE ==========
let heroSequenceStarted = false;

function startHeroSequence() {
    if (heroSequenceStarted) return;
    heroSequenceStarted = true;

    const questionPhase = document.getElementById('questionPhase');
    const revealPhase = document.getElementById('revealPhase');
    const qWord = document.getElementById('qWord');
    const heroScroll = document.getElementById('heroScroll');

    const revealNow = () => {
        if (questionPhase) questionPhase.classList.add('done');
        if (revealPhase) revealPhase.classList.add('show');
        if (heroScroll) heroScroll.classList.add('show');
    };

    if (!revealPhase) return;

    // Reduced motion / no question phase → reveal immediately
    if (prefersReduced || !questionPhase || !qWord) {
        revealNow();
        return;
    }

    const questions = [
        'feeling lost?',
        'overwhelmed & anxious?',
        'stuck in one place?',
        'seeking real clarity?',
        'ready to heal?',
    ];

    let index = 0;
    qWord.textContent = questions[0];

    const cycle = () => {
        index++;
        if (index >= questions.length) {
            // Finish question phase, unveil the brand
            setTimeout(revealNow, 700);
            return;
        }
        qWord.classList.add('swap');
        setTimeout(() => {
            qWord.textContent = questions[index];
            qWord.classList.remove('swap');
            setTimeout(cycle, 1100);
        }, 400);
    };

    setTimeout(cycle, 1200);
}

// ========== HERO CANVAS PARTICLES ==========
(function heroParticles() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas || prefersReduced) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let raf = null;

    function resize() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        const count = Math.min(60, Math.floor(canvas.width / 22));
        particles = Array.from({ length: count }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2.2 + 0.6,
            vx: (Math.random() - 0.5) * 0.25,
            vy: (Math.random() - 0.5) * 0.25,
            a: Math.random() * 0.4 + 0.1,
        }));
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(88, 56, 67, ${p.a})`;
            ctx.fill();
        });
        raf = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);

    // Pause when hero is offscreen to save cycles
    const hero = document.querySelector('.hero');
    if (hero && 'IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting && !raf) { draw(); }
                else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
            });
        }, { threshold: 0 }).observe(hero);
    }
})();

// ========== ACCORDION (Services detail) ==========
function toggleAccord(head) {
    const item = head.closest('.accord-item');
    if (!item) return;
    const body = item.querySelector('.accord-body');
    const isOpen = item.classList.contains('open');

    // Close any other open item (classic accordion behaviour)
    document.querySelectorAll('.accord-item.open').forEach(other => {
        if (other !== item) {
            other.classList.remove('open');
            const b = other.querySelector('.accord-body');
            if (b) b.style.maxHeight = null;
        }
    });

    if (isOpen) {
        item.classList.remove('open');
        if (body) body.style.maxHeight = null;
    } else {
        item.classList.add('open');
        if (body) body.style.maxHeight = body.scrollHeight + 'px';
    }

    // Refresh triggers after the height change settles
    setTimeout(() => ScrollTrigger.refresh(), 520);
}
window.toggleAccord = toggleAccord;

// Keep an open accordion sized correctly on resize
window.addEventListener('resize', () => {
    document.querySelectorAll('.accord-item.open .accord-body').forEach(body => {
        body.style.maxHeight = body.scrollHeight + 'px';
    });
});

// ========== CUSTOM CURSOR ==========
const cursor = document.getElementById('cursor');
const cursorFollower = document.getElementById('cursorFollower');

if (cursor && cursorFollower && window.innerWidth > 768) {
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    let followerX = 0, followerY = 0;

    document.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    gsap.ticker.add(() => {
        cursorX += (mouseX - cursorX) * 0.2;
        cursorY += (mouseY - cursorY) * 0.2;
        followerX += (mouseX - followerX) * 0.08;
        followerY += (mouseY - followerY) * 0.08;
        gsap.set(cursor, { x: cursorX - 4, y: cursorY - 4 });
        gsap.set(cursorFollower, { x: followerX - 19, y: followerY - 19 });
    });

    const hoverTargets = document.querySelectorAll(
        'a, button, .btn, .hook-card, .svc-card, .step-card, .benefit-item, .test-item, .accord-head, .hero-pill, .magnetic'
    );
    hoverTargets.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.classList.add('hover');
            cursorFollower.classList.add('hover');
        });
        el.addEventListener('mouseleave', () => {
            cursor.classList.remove('hover');
            cursorFollower.classList.remove('hover');
        });
    });
}

// ========== NAVBAR ==========
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

window.addEventListener('scroll', () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
});

if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    });

    document.querySelectorAll('.mobile-nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
}

// ========== SMOOTH SCROLL ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (target) {
            e.preventDefault();
            // If the target is an accordion item, open it
            if (target.classList.contains('accord-item') && !target.classList.contains('open')) {
                const head = target.querySelector('.accord-head');
                if (head) toggleAccord(head);
            }
            window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
        }
    });
});

// ========== SERVICE CARD → open matching programme ==========
document.querySelectorAll('.svc-card').forEach(card => {
    card.addEventListener('click', (e) => {
        // Let real links inside the card behave normally
        if (e.target.closest('a')) return;
        const href = card.getAttribute('data-href');
        if (!href) return;
        const target = document.querySelector(href);
        if (target) {
            if (target.classList.contains('accord-item') && !target.classList.contains('open')) {
                const head = target.querySelector('.accord-head');
                if (head) toggleAccord(head);
            }
            window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
        }
    });
});

// ========== SCROLL ANIMATIONS ==========

// Label clip-path reveals
document.querySelectorAll('.reveal-text').forEach(el => {
    gsap.set(el, { clipPath: 'inset(0 100% 0 0)' });
    ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        once: true,
        onEnter: () => {
            gsap.to(el, { clipPath: 'inset(0 0% 0 0)', duration: 0.9, ease: 'power3.inOut' });
        },
    });
});

// Word reveals
document.querySelectorAll('.split-words').forEach(el => {
    const words = splitTextIntoWords(el);
    ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        once: true,
        onEnter: () => {
            gsap.to(words, { y: 0, duration: 1, stagger: 0.06, ease: 'power4.out' });
        },
    });
});

// Generic reveal-up
document.querySelectorAll('.reveal-up').forEach(el => {
    gsap.set(el, { opacity: 0, y: 50 });
    ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        once: true,
        onEnter: () => {
            gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' });
        },
    });
});

// Card batch reveals
batchReveal('.hook-card',    { opacity: 0, y: 60 }, { opacity: 1, y: 0, stagger: 0.12 });
batchReveal('.svc-card',     { opacity: 0, y: 70 }, { opacity: 1, y: 0, stagger: 0.1 });
batchReveal('.accord-item',  { opacity: 0, y: 40 }, { opacity: 1, y: 0, stagger: 0.1 });
batchReveal('.step-card',    { opacity: 0, y: 70 }, { opacity: 1, y: 0, stagger: 0.15 });
batchReveal('.benefit-item', { opacity: 0, x: -30 }, { opacity: 1, x: 0, stagger: 0.1 });
batchReveal('.test-item',    { opacity: 0, y: 40 }, { opacity: 1, y: 0, stagger: 0.1 });
batchReveal('.career-different, .career-tests',
    { opacity: 0, y: 60 }, { opacity: 1, y: 0, stagger: 0.15 });

// ========== ABOUT SECTION ==========
scrollReveal('.about', '.about-image-col',
    { x: -80, opacity: 0 }, { x: 0, opacity: 1, duration: 1.3 });
scrollReveal('.about', '.about-text',
    { x: 80, opacity: 0 }, { x: 0, opacity: 1, duration: 1.3, delay: 0.2 });

gsap.to('.about-image-col', {
    scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: 0.5 },
    y: -40, ease: 'none',
});

// ========== COUNTER ANIMATIONS ==========
document.querySelectorAll('.stat-number[data-count]').forEach(counter => {
    const target = parseInt(counter.getAttribute('data-count'), 10);
    counter.textContent = '0';
    ScrollTrigger.create({
        trigger: counter,
        start: 'top 92%',
        once: true,
        onEnter: () => {
            gsap.to(counter, {
                textContent: target,
                duration: 2.2,
                ease: 'power2.out',
                snap: { textContent: 1 },
                onUpdate() {
                    counter.textContent = Math.round(parseFloat(counter.textContent));
                },
            });
        },
    });
});

// ========== PARENTING SECTION ==========
scrollReveal('.parenting-section', '.parenting-text',
    { x: -60, opacity: 0 }, { x: 0, opacity: 1, duration: 1.1 });
scrollReveal('.parenting-section', '.parenting-benefits-col',
    { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 1.1, delay: 0.2 });

// ========== PHILOSOPHY SECTION ==========
const philoLines = gsap.utils.toArray('.philo-line');
if (philoLines.length) {
    ScrollTrigger.create({
        trigger: '.philosophy',
        start: 'top 70%',
        once: true,
        onEnter: () => {
            gsap.to(philoLines, {
                opacity: 1, y: 0, duration: 1, stagger: 0.18, ease: 'power4.out',
            });
        },
    });
}

// Philosophy mandala gentle rotation on scroll
gsap.to('#philoMandala', {
    scrollTrigger: { trigger: '.philosophy', start: 'top bottom', end: 'bottom top', scrub: 1 },
    rotation: 45, ease: 'none',
});

// ========== CONTACT SECTION ==========
scrollReveal('.contact', '.contact-info',
    { x: -60, opacity: 0 }, { x: 0, opacity: 1, duration: 1 });
scrollReveal('.contact', '.contact-form-wrapper',
    { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 1, delay: 0.15 });
batchReveal('.form-group', { y: 25, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08 }, { start: 'top 92%' });

// ========== FOOTER ==========
batchReveal('.footer-top > div', { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1 }, { start: 'top 96%' });

// ========== WHATSAPP FLOAT ==========
const whatsappFloat = document.getElementById('whatsappFloat');
if (whatsappFloat) {
    gsap.set(whatsappFloat, { scale: 0, opacity: 0 });
    ScrollTrigger.create({
        trigger: '.about',
        start: 'top 80%',
        once: true,
        onEnter: () => {
            gsap.to(whatsappFloat, { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.7)' });
        },
    });
}

// ========== MAGNETIC BUTTONS ==========
if (window.innerWidth > 768) {
    document.querySelectorAll('.magnetic').forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            gsap.to(btn, { x: x * 0.25, y: y * 0.25, duration: 0.3, ease: 'power2.out' });
        });
        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
        });
    });
}

// ========== CAREER TABS ==========
const testTabs = document.querySelectorAll('.test-tab');
const testPanels = document.querySelectorAll('.test-panel');

testTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');

        testTabs.forEach(t => t.classList.remove('active'));
        testPanels.forEach(p => {
            if (p.classList.contains('active')) {
                gsap.to(p, {
                    opacity: 0, y: -10, duration: 0.2, ease: 'power2.in',
                    onComplete: () => {
                        p.classList.remove('active');
                        p.style.opacity = '';
                        p.style.transform = '';
                    }
                });
            }
        });

        tab.classList.add('active');

        setTimeout(() => {
            const targetPanel = document.getElementById(`panel${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
                gsap.from(targetPanel, { opacity: 0, y: 15, duration: 0.35, ease: 'power3.out' });
            }
        }, 220);
    });
});

// ========== CONTACT FORM ==========
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData);

        if (!data.name || !data.email || !data.service || !data.message) {
            showFormMessage('Please fill in all required fields.', 'error');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            showFormMessage('Please enter a valid email address.', 'error');
            return;
        }

        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending…';
        submitBtn.disabled = true;

        setTimeout(() => {
            showFormMessage('Thank you! Your message has been sent. Dr. Gargee will get back to you soon.', 'success');
            contactForm.reset();
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }, 1600);
    });
}

function showFormMessage(message, type) {
    const existing = document.querySelector('.form-message');
    if (existing) existing.remove();

    const msgEl = document.createElement('div');
    msgEl.className = `form-message form-message-${type}`;
    msgEl.textContent = message;
    msgEl.style.cssText = `
        padding: 14px 20px;
        border-radius: 10px;
        margin-top: 16px;
        font-size: 0.93rem;
        font-family: var(--font-body);
        ${type === 'success'
            ? 'background: #f0faf0; color: #1a6b2a; border: 1px solid #a8ddb0;'
            : 'background: #fff0f0; color: #8b1a1a; border: 1px solid #f0b0b0;'}
    `;
    contactForm.appendChild(msgEl);
    gsap.from(msgEl, { y: 12, opacity: 0, duration: 0.4, ease: 'power3.out' });

    setTimeout(() => {
        if (msgEl.parentNode) {
            gsap.to(msgEl, { opacity: 0, y: -12, duration: 0.35, onComplete: () => msgEl.remove() });
        }
    }, 5000);
}

// ========== SCROLL REFRESH ==========
window.addEventListener('load', () => ScrollTrigger.refresh());
window.addEventListener('resize', () => ScrollTrigger.refresh());
