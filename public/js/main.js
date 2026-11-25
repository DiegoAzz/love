// Interactive, Multilingual, Real Photo Upload & Real QR Code Generator for Amor Em Códigos Clone

let currentLang = 'es';
let selectedPlan = 'exclusive';
let selectedTheme = 'netflix';
let uploadedPhotos = []; // Stores optimized Data URLs of uploaded images
let currentTributeId = null;
let currentTributeUrl = '';
let activeQrInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  setupLanguageSwitcher();
  setupFaqAccordion();
  setupSmoothScroll();
  setupTimerPreview();
  setupDragAndDrop();
  // Initialize with Spanish
  applyLanguage('es');
});

// 1. Language switcher & i18n
function setupLanguageSwitcher() {
  const trigger = document.getElementById('locale-switcher');
  const menu = document.getElementById('locale-menu');

  if (!trigger || !menu) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    if (!menu.classList.contains('hidden')) {
      menu.classList.add('hidden');
    }
  });

  document.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      applyLanguage(lang);
      menu.classList.add('hidden');
    });
  });
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function applyLanguage(lang) {
  if (!window.i18nData || !window.i18nData[lang]) return;
  currentLang = lang;
  const data = window.i18nData[lang];

  // Update current flag and code
  const flagMap = { es: '🇪🇸', en: '🇺🇸', pt: '🇧🇷' };
  const flagEl = document.getElementById('current-lang-flag');
  const codeEl = document.getElementById('current-lang-code');
  if (flagEl) flagEl.textContent = flagMap[lang] || '🇪🇸';
  if (codeEl) codeEl.textContent = lang.toUpperCase();

  // Update dropdown checkmarks
  document.querySelectorAll('.check-es, .check-en, .check-pt').forEach(el => el.classList.add('hidden'));
  const activeCheck = document.querySelector(`.check-${lang}`);
  if (activeCheck) activeCheck.classList.remove('hidden');

  document.documentElement.lang = lang;

  // 1. Text translations
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = getNestedValue(data, key);
    if (val !== undefined && val !== null) {
      el.textContent = val;
    }
  });

  // 2. HTML translations
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    const val = getNestedValue(data, key);
    if (val !== undefined && val !== null) {
      el.innerHTML = val;
    }
  });

  // 3. Testimonials in marquee
  if (data.testimonials) {
    const cards = document.querySelectorAll('.animate-marquee-testimonials > div');
    const tKeys = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'];
    cards.forEach((card, index) => {
      const key = tKeys[index % tKeys.length];
      const item = data.testimonials[key];
      if (item) {
        const quoteEl = card.querySelector('p');
        if (quoteEl) quoteEl.textContent = item.quote;
        const timeEl = card.querySelector('.text-primary\\/70');
        if (timeEl) timeEl.textContent = item.time;
      }
    });
  }

  // 4. Wizard step labels
  if (data.wizard && data.wizard.steps) {
    data.wizard.steps.forEach((lbl, i) => {
      const stepLbl = document.getElementById(`step-lbl-${i + 1}`);
      if (stepLbl) stepLbl.textContent = lbl;
    });
  }

  updateLiveTimer();
}

// 2. FAQ Accordion with smooth toggle
function setupFaqAccordion() {
  const triggers = document.querySelectorAll('button[data-slot="accordion-trigger"]');
  triggers.forEach((trigger, idx) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const answer = document.getElementById(`faq-answer-${idx}`);
      const chevron = trigger.querySelector('svg.lucide-chevron-down');
      if (!answer) return;

      const isOpen = answer.getAttribute('data-state') === 'open';

      triggers.forEach((otherTrig, otherIdx) => {
        if (otherIdx !== idx) {
          const otherAns = document.getElementById(`faq-answer-${otherIdx}`);
          const otherChev = otherTrig.querySelector('svg.lucide-chevron-down');
          if (otherAns && otherAns.getAttribute('data-state') === 'open') {
            otherAns.setAttribute('data-state', 'closed');
            otherAns.classList.remove('max-h-[500px]', 'opacity-100');
            otherAns.classList.add('max-h-0', 'opacity-0');
            if (otherChev) otherChev.classList.remove('rotate-180');
          }
        }
      });

      if (isOpen) {
        answer.setAttribute('data-state', 'closed');
        answer.classList.remove('max-h-[500px]', 'opacity-100');
        answer.classList.add('max-h-0', 'opacity-0');
        if (chevron) chevron.classList.remove('rotate-180');
      } else {
        answer.setAttribute('data-state', 'open');
        answer.classList.remove('max-h-0', 'opacity-0');
        answer.classList.add('max-h-[500px]', 'opacity-100');
        if (chevron) chevron.classList.add('rotate-180');
      }
    });
  });
}

// 3. Smooth scrolling for nav anchors
function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#') {
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

// 4. Real Photo Uploading with Automatic Client-Side Compression
function setupDragAndDrop() {
  const zone = document.getElementById('drop-zone');
  if (!zone) return;

  ['dragenter', 'dragover'].forEach(name => {
    zone.addEventListener(name, (e) => {
      e.preventDefault();
      zone.classList.add('border-primary', 'bg-primary/10');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    zone.addEventListener(name, (e) => {
      e.preventDefault();
      zone.classList.remove('border-primary', 'bg-primary/10');
    });
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  });
}

window.handlePhotoSelect = function(e) {
  if (e.target && e.target.files) {
    handleFiles(Array.from(e.target.files));
  }
};

// Compress image via Canvas to max 1200x1200px and JPEG quality 0.82
// Prevents QuotaExceededError and ensures lightning-fast performance
function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const maxDim = 1200;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

async function handleFiles(files) {
  const imageFiles = files.filter(f => f.type.startsWith('image/'));
  if (imageFiles.length === 0) return;

  const remainingSlots = 7 - uploadedPhotos.length;
  if (remainingSlots <= 0) {
    alert(currentLang === 'en' ? 'You have reached the maximum of 7 photos.' : 'Ya has alcanzado el máximo de 7 fotos.');
    return;
  }

  const toProcess = imageFiles.slice(0, remainingSlots);
  const badge = document.getElementById('photo-count-badge');
  if (badge) badge.textContent = 'Procesando fotos...';

  for (const file of toProcess) {
    try {
      const optimizedDataUrl = await compressImage(file);
      if (optimizedDataUrl) {
        uploadedPhotos.push(optimizedDataUrl);
      }
    } catch (e) {
      console.warn('Error compressing photo:', e);
    }
  }

  renderPhotosPreview();
}

function renderPhotosPreview() {
  const container = document.getElementById('photos-preview-grid');
  const countBadge = document.getElementById('photo-count-badge');
  if (!container) return;

  if (countBadge) {
    countBadge.textContent = `${uploadedPhotos.length} / 7 fotos`;
  }

  container.innerHTML = '';
  if (uploadedPhotos.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  uploadedPhotos.forEach((src, idx) => {
    const item = document.createElement('div');
    item.className = 'relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-white/20 shadow-md';
    item.innerHTML = `
      <img src="${src}" class="w-full h-full object-cover" alt="Foto ${idx + 1}">
      <span class="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 text-[9px] font-bold text-white pointer-events-none">
        ${idx === 0 ? '★ Portada' : '#' + (idx + 1)}
      </span>
      <button type="button" onclick="event.stopPropagation(); removePhoto(${idx})" class="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-xs shadow-md z-20 cursor-pointer" title="Eliminar foto">
        ✕
      </button>
    `;
    container.appendChild(item);
  });
}

window.removePhoto = function(index) {
  uploadedPhotos.splice(index, 1);
  renderPhotosPreview();
};

// 5. Wizard & Interactive Tribute Creator
window.openWizard = function(plan = 'exclusive') {
  const modal = document.getElementById('wizard-modal');
  if (modal) {
    modal.classList.remove('hidden');
    selectPlan(plan);
    goToStep(1);

    try {
      const match = document.cookie.match(/love_user_email=([^;]+)/);
      const email = match ? decodeURIComponent(match[1]) : (JSON.parse(localStorage.getItem('love_user_session') || '{}').email || '');
      const emailInp = document.getElementById('input-creator-email');
      if (emailInp && email && !emailInp.value) {
        emailInp.value = email;
      }
    } catch(e) {}
  }
};

window.closeWizard = function() {
  const modal = document.getElementById('wizard-modal');
  if (modal) modal.classList.add('hidden');
};

window.selectPlan = function(plan) {
  selectedPlan = plan;
  document.querySelectorAll('.plan-option').forEach(el => {
    el.classList.remove('border-primary', 'border-2', 'bg-primary/10');
    el.classList.add('border-border', 'bg-card/60');
  });
  const btn = document.getElementById(`plan-btn-${plan}`);
  if (btn) {
    btn.classList.add('border-primary', 'border-2', 'bg-primary/10');
    btn.classList.remove('border-border', 'bg-card/60');
  }
};

window.selectTheme = function(theme) {
  selectedTheme = theme;
  document.querySelectorAll('.theme-option').forEach(el => {
    el.classList.remove('border-primary', 'border-2', 'bg-primary/10');
    el.classList.add('border-border', 'bg-card/60');
  });
  const btn = document.getElementById(`theme-btn-${theme}`);
  if (btn) {
    btn.classList.add('border-primary', 'border-2', 'bg-primary/10');
    btn.classList.remove('border-border', 'bg-card/60');
  }
};

window.goToStep = function(stepNum) {
  [1, 2, 3, 4].forEach(n => {
    const stepEl = document.getElementById(`wizard-step-${n}`);
    const dot = document.getElementById(`step-dot-${n}`);
    if (stepEl) {
      if (n === stepNum) {
        stepEl.classList.remove('hidden');
      } else {
        stepEl.classList.add('hidden');
      }
    }
    if (dot) {
      if (n <= stepNum) {
        dot.classList.add('bg-primary', 'text-white');
        dot.classList.remove('bg-card', 'text-muted-foreground');
      } else {
        dot.classList.remove('bg-primary', 'text-white');
        dot.classList.add('bg-card', 'text-muted-foreground');
      }
    }
  });

  const modal = document.getElementById('wizard-modal');
  if (modal) {
    modal.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (stepNum === 2) updateLiveTimer();
};

function setupTimerPreview() {
  const dateInput = document.getElementById('input-date');
  if (dateInput) {
    dateInput.addEventListener('change', updateLiveTimer);
  }
}

function calculateTimeTogether(startDateStr, lang = currentLang) {
  const start = new Date(startDateStr);
  const now = new Date();
  const diffTime = Math.abs(now - start);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  const days = Math.floor((diffDays % 365) % 30);

  let parts = [];
  if (lang === 'en') {
    if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
    parts.push(`${days} day${days > 1 ? 's' : ''}`);
  } else if (lang === 'pt') {
    if (years > 0) parts.push(`${years} ano${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} mês${months > 1 ? 'es' : ''}`);
    parts.push(`${days} dia${days > 1 ? 's' : ''}`);
  } else {
    if (years > 0) parts.push(`${years} año${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} mes${months > 1 ? 'es' : ''}`);
    parts.push(`${days} día${days > 1 ? 's' : ''}`);
  }

  return parts.join(', ');
}

function updateLiveTimer() {
  const dateInput = document.getElementById('input-date');
  const preview = document.getElementById('live-timer-preview');
  if (dateInput && preview) {
    const text = calculateTimeTogether(dateInput.value, currentLang);
    const prefix = currentLang === 'en' ? '⏱️ Time together:' : (currentLang === 'pt' ? '⏱️ Juntos há:' : '⏱️ Llevan juntos:');
    preview.textContent = `${prefix} ${text}`;
  }
}

window.generateAiMessage = function() {
  const sender = document.getElementById('input-sender')?.value || 'Lucas';
  const partner = document.getElementById('input-partner')?.value || 'Camila';

  const messages = {
    es: [
      `Desde el primer momento en que te vi, supe que mi lugar en el mundo era a tu lado. Gracias ${partner} por cada risa, cada abrazo y por hacer que cada día sea mágico. Eres mi persona favorita para siempre. Con todo mi amor, ${sender}.`,
      `${partner}, no hay palabras suficientes para describir lo agradecido que estoy por tenerte. Eres mi refugio en los días difíciles y mi mayor alegría en los buenos. Gracias por caminar a mi lado. Te amo infinitamente. — ${sender}`,
      `Dicen que el amor verdadero llega sin avisar y transforma todo. Contigo entendí lo que significa ser un equipo y soñar juntos. Gracias por estos momentos inolvidables, ${partner}. ¡Por toda una vida juntos! — ${sender}`
    ],
    en: [
      `From the very first moment I saw you, I knew my favorite place in the world was next to you. Thank you ${partner} for every smile, every hug, and for making every day magical. You are my forever person. With all my love, ${sender}.`,
      `${partner}, there aren't enough words to describe how grateful I am to have you. You are my safe harbor on hard days and my greatest joy on the best ones. Thank you for walking beside me. I love you endlessly. — ${sender}`,
      `They say true love comes unannounced and changes everything. With you, I learned what it means to be a true team and dream together. Thank you for these unforgettable memories, ${partner}. Here's to a lifetime together! — ${sender}`
    ],
    pt: [
      `Desde o primeiro momento em que te vi, soube que meu lugar no mundo era ao seu lado. Obrigado ${partner} por cada riso, cada abraço e por tornar cada dia especial. Você é minha pessoa favorita para sempre. Com todo meu amor, ${sender}.`,
      `${partner}, não existem palavras suficientes para expressar o quanto sou grato por você. Você é meu porto seguro nos dias difíceis e minha maior alegria nos bons. Obrigado por caminhar ao meu lado. Te amo infinitamente. — ${sender}`,
      `Dizem que o amor verdadeiro chega sem avisar e transforma tudo. Com você aprendi o que significa ser uma equipe e sonhar juntos. Obrigado por esses momentos inesquecíveis, ${partner}. Por toda uma vida juntos! — ${sender}`
    ]
  };

  const list = messages[currentLang] || messages.es;
  const chosen = list[Math.floor(Math.random() * list.length)];
  const txtArea = document.getElementById('input-message');
  if (txtArea) txtArea.value = chosen;
};

// 6. Generate Surprise & Real Scannable QR Code
window.generateSurprise = async function() {
  const genBtn = document.querySelector('button[onclick="generateSurprise()"]');
  const originalBtnText = genBtn ? genBtn.innerHTML : '✨ Generar Mi Sorpresa';
  if (genBtn) {
    genBtn.disabled = true;
    genBtn.innerHTML = '✨ Generando...';
  }

  try {
    const sender = document.getElementById('input-sender')?.value || 'Lucas';
    const partner = document.getElementById('input-partner')?.value || 'Camila';
    const song = document.getElementById('input-song')?.value || 'Perfect - Ed Sheeran';
    const title = document.getElementById('input-title')?.value || 'Nuestra Historia Inolvidable';
    const message = document.getElementById('input-message')?.value || '';
    const dateVal = document.getElementById('input-date')?.value || '2022-06-12';

    const timeStr = calculateTimeTogether(dateVal, currentLang);

    // Generate unique tribute ID
    const cleanNames = `${sender}-${partner}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
    currentTributeId = `${cleanNames}-${Date.now().toString().slice(-6)}`;

    // Default photos if none uploaded
    const photos = uploadedPhotos.length > 0 ? uploadedPhotos : ['/videos/hero-criar.jpg', '/images/og-default.png'];

    // Check logged in user to bind tribute to their real account
    let userEmail = null;
    try {
      const match = document.cookie.match(/love_user_email=([^;]+)/);
      if (match) userEmail = decodeURIComponent(match[1]);
      if (!userEmail) {
        const session = JSON.parse(localStorage.getItem('love_user_session') || '{}');
        if (session.email) userEmail = session.email;
      }
    } catch(e) {}

    const creatorEmailInput = document.getElementById('input-creator-email');
    if (creatorEmailInput && creatorEmailInput.value.trim()) {
      userEmail = creatorEmailInput.value.trim().toLowerCase();
    }

    const tributePayload = {
      id: currentTributeId,
      userEmail,
      sender,
      partner,
      title,
      song,
      message,
      date: dateVal,
      theme: selectedTheme,
      plan: selectedPlan,
      photos,
      lang: currentLang || 'es'
    };

    // 1. Safe localStorage saving (will not crash if storage quota is tight)
    try {
      localStorage.setItem('tribute_' + currentTributeId, JSON.stringify(tributePayload));
      localStorage.setItem('last_created_tribute', JSON.stringify(tributePayload));
    } catch (quotaErr) {
      console.warn('LocalStorage quota full, using memory/server:', quotaErr);
    }

    // 2. Save to server API asynchronously (with short timeout so UI never hangs)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      fetch('/api/tributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tributePayload),
        signal: controller.signal
      }).catch(() => {});
      clearTimeout(timeoutId);

      // Save to user's local tribute list for dashboard
      try {
        const existing = JSON.parse(localStorage.getItem('love_created_tributes') || '[]');
        existing.unshift(tributePayload);
        localStorage.setItem('love_created_tributes', JSON.stringify(existing.slice(0, 30)));
      } catch(e) {}
    } catch (netErr) {
      console.warn('Backend sync error:', netErr);
    }

    // Construct target URL for the QR code
    // In production (love.appzplay.online) or local Wi-Fi test
    let targetOrigin = window.location.origin;
    if (window.location.hostname === 'love.appzplay.online') {
      targetOrigin = 'https://love.appzplay.online';
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      try {
        const netRes = await fetch('/api/network-info');
        if (netRes.ok) {
          const netData = await netRes.json();
          if (netData.ip && netData.ip !== '127.0.0.1') {
            targetOrigin = `http://${netData.ip}:${netData.port || 3333}`;
          }
        }
      } catch (e) {
        targetOrigin = 'http://192.168.1.124:3333';
      }
    }

    currentTributeUrl = `${targetOrigin}/tribute/${currentTributeId}`;

    // Populate Summary
    const resCouple = document.getElementById('res-couple');
    const resTheme = document.getElementById('res-theme');
    const resSong = document.getElementById('res-song');
    const resTime = document.getElementById('res-time');
    const linkInput = document.getElementById('tribute-link-input');

    if (resCouple) resCouple.textContent = `${sender} & ${partner}`;
    if (resTheme) resTheme.textContent = selectedTheme;
    if (resSong) resSong.textContent = song;
    if (resTime) resTime.textContent = timeStr;
    if (linkInput) linkInput.value = currentTributeUrl;

    // 3. GENERATE REAL SCANNABLE QR CODE
    const qrContainer = document.getElementById('real-qr-code');
    if (qrContainer) {
      qrContainer.innerHTML = '';
      if (typeof QRCode !== 'undefined') {
        activeQrInstance = new QRCode(qrContainer, {
          text: currentTributeUrl,
          width: 170,
          height: 170,
          colorDark: '#030d21',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
      }
    }

    // Advance to Step 4 immediately
    goToStep(4);
  } catch (err) {
    console.error('Error in generateSurprise:', err);
    // Even if an unexpected error occurs, still advance to step 4!
    goToStep(4);
  } finally {
    if (genBtn) {
      genBtn.disabled = false;
      genBtn.innerHTML = originalBtnText;
    }
  }
};

window.copyTributeLink = function() {
  const linkInput = document.getElementById('tribute-link-input');
  const btn = document.getElementById('btn-copy-link');
  if (linkInput) {
    linkInput.select();
    navigator.clipboard.writeText(linkInput.value);
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = '¡Copiado! ✓';
      btn.classList.add('bg-emerald-600');
      setTimeout(() => {
        btn.textContent = orig;
        btn.classList.remove('bg-emerald-600');
      }, 2000);
    }
  }
};

// 7. High-Definition Scannable QR PNG Downloader
window.downloadRealQrPng = function() {
  const qrContainer = document.getElementById('real-qr-code');
  if (!qrContainer) return;

  const canvas = qrContainer.querySelector('canvas');
  const img = qrContainer.querySelector('img');

  const size = 1024;
  const padding = 120;
  const hdCanvas = document.createElement('canvas');
  hdCanvas.width = size;
  hdCanvas.height = size + 160;
  const ctx = hdCanvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, hdCanvas.width, hdCanvas.height);

  ctx.strokeStyle = '#030d21';
  ctx.lineWidth = 12;
  ctx.strokeRect(30, 30, hdCanvas.width - 60, hdCanvas.height - 60);

  const qrImage = img && img.src ? img : canvas;
  if (qrImage) {
    ctx.drawImage(qrImage, padding, padding, size - padding * 2, size - padding * 2);
  }

  ctx.fillStyle = '#e11d48';
  ctx.font = 'bold 36px "Bricolage Grotesque", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LOVE · love.appzplay.online', size / 2, size - 20);

  ctx.fillStyle = '#555555';
  ctx.font = '28px sans-serif';
  ctx.fillText('Escanea con tu cámara para ver tu sorpresa ❤️', size / 2, size + 35);

  const sender = document.getElementById('input-sender')?.value || 'Lucas';
  const partner = document.getElementById('input-partner')?.value || 'Camila';
  ctx.fillStyle = '#030d21';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(`${sender} & ${partner}`, size / 2, size + 85);

  const link = document.createElement('a');
  link.download = `love-qr-${currentTributeId || Date.now()}.png`;
  link.href = hdCanvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 8. Open Live Tribute Page in New Tab
window.openLiveTributePage = function() {
  if (currentTributeUrl) {
    window.open(currentTributeUrl, '_blank');
  } else {
    window.open('/tribute/demo', '_blank');
  }
};

// 9. Printable Gift Card Modal
window.openPrintableCard = function() {
  const modal = document.getElementById('print-modal');
  const cardCouple = document.getElementById('card-couple');
  const cardQr = document.getElementById('card-qr-container');

  const sender = document.getElementById('input-sender')?.value || 'Lucas';
  const partner = document.getElementById('input-partner')?.value || 'Camila';

  if (cardCouple) cardCouple.textContent = `${sender} & ${partner}`;

  if (cardQr) {
    cardQr.innerHTML = '';
    new QRCode(cardQr, {
      text: currentTributeUrl || window.location.href,
      width: 180,
      height: 180,
      colorDark: '#030d21',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  if (modal) modal.classList.remove('hidden');
};

window.closePrintableCard = function() {
  const modal = document.getElementById('print-modal');
  if (modal) modal.classList.add('hidden');
};

// 10. Phone Mockup Live Preview Modal
window.previewGeneratedSite = function() {
  const iframe = document.getElementById('phone-preview-iframe');
  if (iframe) {
    iframe.src = '/tribute/' + (currentTributeId || 'demo');
  }

  const modal = document.getElementById('preview-modal');
  if (modal) modal.classList.remove('hidden');
};

window.openPhonePreview = window.previewGeneratedSite;

window.selectSongPreset = function(song) {
  const input = document.getElementById('input-song');
  if (input) input.value = song;
};

window.closePreview = function() {
  const iframe = document.getElementById('phone-preview-iframe');
  if (iframe) {
    iframe.src = 'about:blank';
  }
  const modal = document.getElementById('preview-modal');
  if (modal) modal.classList.add('hidden');
};

// 11. Header Auth Session & Wizard Auto-Trigger
document.addEventListener('DOMContentLoaded', () => {
  try {
    const sessionStr = localStorage.getItem('love_user_session');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      if (session && session.email) {
        const loginLinks = document.querySelectorAll('a[href="/login"]');
        loginLinks.forEach(link => {
          link.href = '/dashboard';
          link.innerHTML = `
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Mis Sitios</span>
          `;
          link.classList.remove('text-white/80');
          link.classList.add('text-white', 'bg-white/10', 'border', 'border-white/15');
        });
      }
    }

    if (localStorage.getItem('open_wizard_trigger') === 'true') {
      localStorage.removeItem('open_wizard_trigger');
      if (typeof openWizard === 'function') {
        setTimeout(openWizard, 250);
      }
    }
  } catch(e) {}
});
