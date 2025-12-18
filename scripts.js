/**
 * FANFORGE CORE SCRIPTS
 * Includes: Page Animations, Typewriter Engine, 
 * Mobile Navigation, and Success Sequences.
 */

// --- 1. TYPEWRITER & ANIMATION ENGINE ---

/**
 * Types text into an element character by character
 */
function typeWriter(elementId, text, speed = 50) {
  let i = 0;
  const element = document.getElementById(elementId);
  if (!element) return Promise.resolve();
  
  element.innerHTML = "";
  return new Promise((resolve) => {
    function type() {
      if (i < text.length) {
        element.innerHTML += text.charAt(i);
        i++;
        setTimeout(type, speed);
      } else { 
        resolve(); 
      }
    }
    type();
  });
}

/**
 * Triggers the Cyberpunk Success Overlay Sequence
 */
async function triggerSuccessSequence() {
  const overlay = document.getElementById('successOverlay');
  const sound = document.getElementById('glitchSound');
  
  // Play digital notification sound
  if (sound) { 
    sound.volume = 0.2; 
    sound.play().catch(() => {
      console.log("Audio playback requires user interaction first.");
    }); 
  }
  
  // Show the scan overlay
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Lock background scroll
  }
  
  // Run typewriter lines sequentially
  await typeWriter("type-id", "ID: FAN-FORGE-FOUNDER-2025", 40);
  await typeWriter("type-status", "STATUS: PRIORITY ACCESS SECURED", 40);
}

/**
 * Closes the success overlay
 */
window.closeSuccess = function() {
  const overlay = document.getElementById('successOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = ''; // Restore scroll
  }
};


// --- 2. PAGE INITIALIZATION & GLOBAL UI ---

document.addEventListener('DOMContentLoaded', function(){
  
  // Page entrance trigger
  try { document.documentElement.classList.add('has-loaded'); } catch(e){}

  // Header Scroll Effect (HUD Blur)
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
  });

  // Scroll Reveal Observer
  try {
    const revealItems = document.querySelectorAll('.reveal');
    if(revealItems.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if(en.isIntersecting) {
            en.target.classList.add('in-view');
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.15 });
      revealItems.forEach((el) => io.observe(el));
    }
  } catch(e){}

  // Mobile Hamburger Logic
  const btn = document.getElementById('hamburgerBtn');
  const nav = document.getElementById('mobileNav');
  const closeBtn = document.getElementById('mobileClose');

  if(btn && nav) {
    btn.addEventListener('click', () => {
      nav.classList.add('open');
      nav.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });
  }

  if(closeBtn && nav) {
    closeBtn.addEventListener('click', () => {
      nav.classList.remove('open');
      nav.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    });
  }

  // Smooth Scroll for Anchor Links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if(href && href.startsWith('#')) {
        const el = document.querySelector(href);
        if(el) {
          e.preventDefault();
          if(nav) nav.classList.remove('open');
          document.body.style.overflow = '';
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // Visit Tracking (Fire-and-forget)
  try {
    const cidKey = 'fanforge_cid';
    let cid = localStorage.getItem(cidKey);
    if(!cid) {
      cid = 'c_' + Math.random().toString(36).slice(2,12) + Date.now().toString(36).slice(-4);
      localStorage.setItem(cidKey, cid);
    }
    fetch('/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: cid })
    }).catch(() => {});
  } catch(e){}

  // Initialize AOS if external library is loaded
  try { if(window.AOS) window.AOS.init(); } catch(e){}
});


// --- 3. FORM & BUSINESS LOGIC ---

(function(){
  const id = (n) => document.getElementById(n);

  // Index Page Proceed Button
  const proceed = id('proceedBtn');
  if(proceed) {
    proceed.addEventListener('click', () => window.location = 'enter-email.html');
  }

  // Waitlist Form Logic
  const waitlistForm = id('waitlistForm');
  if(waitlistForm) {
    waitlistForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const submitBtn = id('w_submit');
      const wEmail = id('w_email');
      const wMsg = id('waitlistMsg');
      
      if(submitBtn) submitBtn.innerText = 'INITIALIZING...';
      
      const email = (wEmail?.value || '').trim();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      
      if(!ok) {
        if(wMsg) wMsg.textContent = 'Invalid access protocol (Email format error).';
        if(submitBtn) submitBtn.innerText = 'RETRY ACCESS';
        return;
      }

      try {
        // Save to LocalStorage
        const list = JSON.parse(localStorage.getItem('fanforge_waitlist') || '[]');
        list.push({ email: email, ts: Date.now() });
        localStorage.setItem('fanforge_waitlist', JSON.stringify(list));
        
        // Trigger Cyberpunk Success Overlay
        triggerSuccessSequence();
        
        waitlistForm.reset();
        if(submitBtn) {
          submitBtn.innerText = 'ACCESS GRANTED';
          submitBtn.style.borderColor = 'var(--accent)';
        }
      } catch(err) {
        if(wMsg) wMsg.textContent = 'Local backup saved.';
      }
    });
  }

  // Email Subscription Form (Direct Entry)
  const emailForm = id('emailForm');
  if(emailForm) {
    emailForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const input = id('emailInput');
      const err = id('emailError');
      const v = (input?.value || '').trim();
      
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        if(err) err.textContent = 'Valid email required.';
        return;
      }

      try { localStorage.setItem('fanforge_email', v); } catch(e){}

      fetch('/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: v })
      })
      .then(() => window.location = 'plans.html')
      .catch(() => window.location = 'plans.html');
    });
  }

  // Plans Page Interaction
  const savedLine = id('savedEmailLine');
  if(savedLine) {
    let email = null;
    try { email = localStorage.getItem('fanforge_email'); } catch(e){}
    savedLine.textContent = email ? 'Verified ID: ' + email : 'Unauthorized: No email provided.';

    document.querySelectorAll('.choose').forEach(btn => {
      btn.addEventListener('click', function() {
        const plan = this.getAttribute('data-plan') || 'Plan';
        this.innerText = 'CONNECTING...';
        
        const payload = { plan: plan };
        if(email) payload.email = email;

        fetch('/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        .then(r => r.json())
        .then(resp => {
          alert('Data transmission complete: ' + plan);
          this.innerText = 'CHOSEN';
        })
        .catch(() => {
          alert('Local storage override: ' + plan);
          this.innerText = 'SAVED OFFLINE';
        });
      });
    });
  }
})();
