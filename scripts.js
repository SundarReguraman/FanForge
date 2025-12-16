// Page entrance animation trigger
document.addEventListener('DOMContentLoaded', function(){
  try{ document.documentElement.classList.add('has-loaded'); }catch(e){}
  // small additional class to allow staggered effects later
  setTimeout(function(){ try{ document.documentElement.classList.add('is-ready'); }catch(e){} }, 60);
  // Scroll reveal using IntersectionObserver
  try{
    const revealItems = document.querySelectorAll('.reveal');
    if(revealItems && revealItems.length){
      const io = new IntersectionObserver((entries)=>{
        entries.forEach((en)=>{
          if(en.isIntersecting){
            en.target.classList.add('in-view');
            // optionally unobserve so animation runs once
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.12 });
      revealItems.forEach((el)=> io.observe(el));
    }
  }catch(e){}
  // Track visit: create or reuse client id and POST visit to server (no UI shown)
  try{
    var cidKey = 'fanforge_cid';
    var cid = null;
    try{ cid = localStorage.getItem(cidKey); }catch(e){}
    if(!cid){
      cid = 'c_' + Math.random().toString(36).slice(2,12) + Date.now().toString(36).slice(-4);
      try{ localStorage.setItem(cidKey, cid); }catch(e){}
    }
    // fire-and-forget POST
    fetch('/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: cid })
    }).catch(function(){});
  }catch(e){}
});

// Mobile hamburger toggle and smooth scrolling
document.addEventListener('DOMContentLoaded', function(){
  function byId(id){return document.getElementById(id)}
  var btn = byId('hamburgerBtn');
  var nav = byId('mobileNav');
  if(btn && nav){
    btn.addEventListener('click', function(){ nav.classList.add('open'); nav.setAttribute('aria-hidden','false'); });
  }
  var closeBtn = byId('mobileClose');
  if(closeBtn && nav){ closeBtn.addEventListener('click', function(){ nav.classList.remove('open'); nav.setAttribute('aria-hidden','true'); }); }

  // local page variants
  var btnL = byId('hamburgerBtnLocal'); var navL = byId('mobileNavLocal'); var closeL = byId('mobileCloseLocal');
  if(btnL && navL){ btnL.addEventListener('click', function(){ navL.classList.add('open'); navL.setAttribute('aria-hidden','false'); }); }
  if(closeL && navL){ closeL.addEventListener('click', function(){ navL.classList.remove('open'); navL.setAttribute('aria-hidden','true'); }); }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var href = a.getAttribute('href');
      if(href && href.startsWith('#')){
        var el = document.querySelector(href);
        if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth', block:'start'}); }
      }
    });
  });

  // initialize AOS if present
  try{ if(window.AOS) window.AOS.init(); }catch(e){}
});

// Shared navigation and behavior for the three pages.
(function(){
  // safe DOM helpers
  function id(n){return document.getElementById(n)}

  // On index page: Proceed button
  var proceed = id('proceedBtn');
  if(proceed){
    proceed.addEventListener('click', function(){
      window.location = 'enter-email.html';
    });
    return;
  }

  // Waitlist form on frontpage: client-side capture (no backend required)
  var waitlistForm = id('waitlistForm');
  if(waitlistForm){
    var wName = id('w_name');
    var wEmail = id('w_email');
    var wMsg = id('waitlistMsg');
    waitlistForm.addEventListener('submit', function(e){
      e.preventDefault();
      var name = (wName && wName.value || '').trim();
      var email = (wEmail && wEmail.value || '').trim();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if(!ok){ if(wMsg) wMsg.textContent = 'Please enter a valid email.'; return; }
      // store locally as a simple waitlist (array)
      try{
        var list = JSON.parse(localStorage.getItem('fanforge_waitlist') || '[]');
        list.push({name: name, email: email, ts: Date.now()});
        localStorage.setItem('fanforge_waitlist', JSON.stringify(list));
        if(wMsg) wMsg.textContent = 'Thanks — you are reserved! We will email updates.';
        waitlistForm.reset();
      }catch(err){ if(wMsg) wMsg.textContent = 'Saved locally. Thank you!'; }
    });
    return;
  }

  // On enter-email page: handle form -> POST to /subscribe
  var emailForm = id('emailForm');
  if(emailForm){
    var input = id('emailInput');
    var err = id('emailError');
    emailForm.addEventListener('submit', function(e){
      e.preventDefault();
      var v = (input.value || '').trim();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if(!ok){
        err.textContent = 'Please enter a valid email address.';
        return;
      }
      err.textContent = '';
      // Save locally as fallback
      try{ localStorage.setItem('fanforge_email', v); } catch(_){ }

      // POST to backend
      fetch('/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: v })
      }).then(function(r){
        if(!r.ok) throw new Error('network');
        return r.json();
      }).then(function(data){
        window.location = 'plans.html';
      }).catch(function(){
        // If network fails, still continue using localStorage
        window.location = 'plans.html';
      });
    });
    return;
  }

  // On plans page: show saved email and handle plan choice -> POST plan
  var savedLine = id('savedEmailLine');
  if(savedLine){
    var email = null;
    try{ email = localStorage.getItem('fanforge_email'); } catch(_){ }
    if(email){
      savedLine.textContent = 'Email: ' + email;
    } else {
      savedLine.textContent = 'No email provided. You can go back and enter your mail id.';
    }

    var buttons = document.querySelectorAll('.choose');
    buttons.forEach(function(btn){
      btn.addEventListener('click', function(){
        var plan = btn.getAttribute('data-plan') || 'Plan';
        var payload = { plan: plan };
        if(email) payload.email = email;

        fetch('/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function(r){
          if(!r.ok) throw new Error('network');
          return r.json();
        }).then(function(resp){
          if(resp && resp.counted){
            alert('Payment action recorded. Thank you!');
          } else if(resp && resp.counted === false){
            alert('You already clicked Pay for this plan before.');
          } else {
            alert('Thanks — you selected "' + plan + '".');
          }
        }).catch(function(){
          alert('Saved locally: "' + plan + '" (offline mode).');
        });
      });
    });
  }
})();
