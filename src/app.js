/* app.js — clean, defensive, full frontend logic for CineNext */
/* ================= CONFIG ================= */
// API keys are kept secure on the backend
const API_ROOT = '/proxy.php?'; // Secure proxy for OMDb API
const BACKEND_BASE = "/api";
const CHAT_API = '/chat.php';
// TMDB API for watch providers
const TMDB_KEY = '8f6dd3c5f1664c20c027cc6c1e22002c'; // TMDB API Key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
// OMDb API Key (Exposed for client-side fetching on free hosting)
const OMDB_API_KEY = window.OMDB_API_KEY || 'dea27012';
async function fetchMovieData(query, type = 't') {
  // Direct client-side fetch to bypass server restrictions
  const url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&${type}=${encodeURIComponent(query)}`;
  console.log(`Fetching OMDb: ${url}`); // Debug log
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log('OMDb Response:', data); // Debug log
    return data;
  } catch (error) {
    console.error('OMDb fetch error:', error);
    return { Response: 'False', Error: error.message };
  }
}
/* ========== Utilities ========== */
const $ = id => document.getElementById(id);
const el = sel => document.querySelector(sel);
const on = (target, evt, fn) => { if (!target) return; target.addEventListener(evt, fn); };
const escapeHtml = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function safeFetchJson(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    console.warn('fetch failed', url, err);
    return null;
  }
}
/* ========== TMDB Watch Providers Integration ========== */
// Provider logo URL mapping for common providers
const PROVIDER_LOGO_MAP = {
  8: 'Netflix',
  119: 'Amazon Prime Video',
  337: 'Disney+ Hotstar',
  283: 'JioCinema',
  237: 'Zee5',
  237: 'SonyLIV',
  350: 'Apple TV+',
  188: 'YouTube'
};
// Cache for TMDB movie IDs to avoid redundant searches
const tmdbMovieCache = new Map();
// Search for movie on TMDB by title
async function searchMovieOnTMDB(title) {
  if (!title || !TMDB_KEY) return null;
  // Check cache first
  if (tmdbMovieCache.has(title)) {
    return tmdbMovieCache.get(title);
  }
  try {
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&language=en-US`;
    const data = await safeFetchJson(searchUrl);
    if (data && data.results && data.results.length > 0) {
      const movieId = data.results[0].id;
      tmdbMovieCache.set(title, movieId);
      return movieId;
    }
  } catch (err) {
    console.warn('TMDB search failed for:', title, err);
  }
  return null;
}
// Fetch watch providers from TMDB for a movie ID
async function fetchWatchProvidersFromTMDB(tmdbId) {
  if (!tmdbId || !TMDB_KEY) return [];
  try {
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}/watch/providers?api_key=${TMDB_KEY}`;
    const data = await safeFetchJson(url);
    // Get providers for India (IN) or fallback to US/Global
    if (data && data.results) {
      let region = 'IN';
      let providersData = data.results.IN;
      // Fallback to US if IN is missing
      if (!providersData) {
        providersData = data.results.US;
        region = 'US';
      }
      // Fallback to any available region if US is also missing
      if (!providersData) {
        const availableRegions = Object.keys(data.results);
        if (availableRegions.length > 0) {
          region = availableRegions[0];
          providersData = data.results[region];
        }
      }
      if (providersData) {
        const providers = [];
        // Collect from all provider types
        ['flatrate', 'rent', 'buy'].forEach(type => {
          if (providersData[type]) {
            providersData[type].forEach(p => {
              const providerInfo = {
                name: p.provider_name,
                logo: p.logo_path ? `${TMDB_IMAGE_BASE}${p.logo_path}` : null,
                type: type === 'flatrate' ? 'Subscription' : (type === 'rent' ? 'Rent' : 'Buy'),
                emoji: getProviderEmoji(p.provider_name),
                region: region // Optional: could use this to show "Available in US" etc.
              };
              // Avoid duplicates
              if (!providers.find(pr => pr.name === providerInfo.name)) {
                providers.push(providerInfo);
              }
            });
          }
        });
        return providers;
      }
    }
  } catch (err) {
    console.warn('TMDB watch providers fetch failed:', err);
  }
  return [];
}
// Get emoji for provider name
function getProviderEmoji(name) {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('netflix')) return '🎥';
  if (nameLower.includes('prime') || nameLower.includes('amazon')) return '▶️';
  if (nameLower.includes('disney') || nameLower.includes('hotstar')) return '🎬';
  if (nameLower.includes('jio')) return '🎭';
  if (nameLower.includes('sony')) return '📺';
  if (nameLower.includes('zee')) return '🎪';
  if (nameLower.includes('apple')) return '🍎';
  if (nameLower.includes('youtube')) return '▶️';
  return '📺';
}
// Main function to get watch providers for a movie (with TMDB integration)
async function getWatchProvidersForMovie(title) {
  // Try TMDB first
  const tmdbId = await searchMovieOnTMDB(title);
  if (tmdbId) {
    const providers = await fetchWatchProvidersFromTMDB(tmdbId);
    if (providers.length > 0) {
      return providers;
    }
  }
  // Fallback to mock data if TMDB fails
  return getFallbackProviders(title);
}
// Fallback mock providers (used when TMDB API fails)
function getFallbackProviders(title) {
  const providers = [];
  const titleLower = title.toLowerCase();
  // Indian content
  if (titleLower.includes('panchayat') || titleLower.includes('dangal') ||
    titleLower.includes('jawan') || titleLower.includes('pathaan')) {
    providers.push(
      { name: 'Amazon Prime Video', emoji: '▶️', type: 'Subscription', logo: null },
      { name: 'Disney+ Hotstar', emoji: '🎬', type: 'Subscription', logo: null }
    );
  }
  // Hollywood blockbusters  
  else if (titleLower.includes('oppenheimer') || titleLower.includes('inception') ||
    titleLower.includes('interstellar') || titleLower.includes('dune')) {
    providers.push(
      { name: 'Amazon Prime Video', emoji: '▶️', type: 'Subscription', logo: null },
      { name: 'Netflix', emoji: '🎥', type: 'Subscription', logo: null }
    );
  }
  // Default providers
  else {
    providers.push(
      { name: 'Netflix', emoji: '🎥', type: 'Subscription', logo: null },
      { name: 'Amazon Prime Video', emoji: '▶️', type: 'Subscription', logo: null },
      { name: 'Disney+ Hotstar', emoji: '🎬', type: 'Subscription', logo: null }
    );
  }
  return providers;
}
/* ========== SLIDESHOW ========== */
const slideshowImages = [
  "https://i.vimeocdn.com/video/696682957-a405a56e2669d5d32e313b1b3244d6e3f465d19c1a66d24719fd005387330e52-d?f=webp",
  "https://images.wallpapersden.com/image/download/oppenheimer-2023-movie-poster_bmVpamqUmZqaraWkpJRmbmdlrWZlbWU.jpg",
  "https://bsmedia.business-standard.com/_media/bs/img/article/2024-05/02/full/1714640016-6552.jpg",
  "https://img.etimg.com/thumb/width-1600,height-900,imgsize-82852,resizemode-75,msid-122804611/magazines/panache/saiyaara-shatters-records-with-rs-83-crore-in-its-opening-weekend-ahaan-panday-and-aneet-padda-make-history.jpg"
];
let slideTimer = null;
let currentSlideIndex = 0;
function createSlidesFromArray() {
  const container = $('heroSlidesContainer');
  if (!container) return;
  if (container.querySelectorAll('.hero-slide').length > 0) return;
  slideshowImages.forEach((url, i) => {
    const d = document.createElement('div');
    d.className = 'hero-slide';
    d.style.backgroundImage = `url('${url}')`;
    d.style.opacity = i === 0 ? '1' : '0';
    d.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
    container.appendChild(d);
  });
}
function startSlideshow(interval = 6000) {
  const slides = document.querySelectorAll('.hero-slide');
  if (!slides || slides.length === 0) return;
  if (slideTimer) clearInterval(slideTimer);
  slideTimer = setInterval(() => {
    slides[currentSlideIndex].style.opacity = '0';
    slides[currentSlideIndex].setAttribute('aria-hidden', 'true');
    currentSlideIndex = (currentSlideIndex + 1) % slides.length;
    slides[currentSlideIndex].style.opacity = '1';
    slides[currentSlideIndex].setAttribute('aria-hidden', 'false');
  }, interval);
}
/* ========== Watch Providers Popup ========== */
async function createWatchPopup(title, parentElement) {
  // Desktop hover popup logic - kept for reference or hybrid approach, 
  // but user requested button. We can keep this if we want hover AND button, 
  // or just rely on the button. 
  // For now, let's ensure the function exists to avoid errors if called.
  const providers = await getWatchProvidersForMovie(title);
  // Remove any existing popup
  const existing = parentElement.querySelector('.watch-popup');
  if (existing) existing.remove();
  const popup = document.createElement('div');
  popup.className = 'watch-popup';
  let providersHTML = '';
  providers.forEach(provider => {
    if (provider) {
      const logoHTML = provider.logo
        ? `<img src="${provider.logo}" alt="${provider.name}" class="provider-logo-img" style="width:40px;height:40px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"/><span class="provider-logo" style="background:#222;display:none;">${provider.emoji}</span>`
        : `<span class="provider-logo" style="background:#222;">${provider.emoji}</span>`;
      providersHTML += `
        <div class="watch-provider-item">
          ${logoHTML}
          <div class="provider-info">
            <div class="provider-name">${escapeHtml(provider.name)}</div>
            <div class="provider-type">${provider.type}</div>
          </div>
        </div>
      `;
    }
  });
  if (!providersHTML) {
    providersHTML = '<div style="padding: 12px; color: #999;">No providers available</div>';
  }
  popup.innerHTML = `
    <div class="watch-popup-header">Where to Watch</div>
    <div class="watch-popup-providers">
      ${providersHTML}
    </div>
    <div class="watch-popup-footer">© CineNext</div>
  `;
  parentElement.appendChild(popup);
  // Trigger animation
  setTimeout(() => popup.classList.add('visible'), 10);
  return popup;
}
function removeWatchPopup(parentElement) {
  const popup = parentElement.querySelector('.watch-popup');
  if (popup) {
    popup.classList.remove('visible');
    setTimeout(() => popup.remove(), 300);
  }
}
async function showWatchModal(title) {
  const providers = await getWatchProvidersForMovie(title);
  // Remove existing modal
  const existing = document.querySelector('.watch-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.className = 'watch-modal';
  let providersHTML = '';
  providers.forEach(provider => {
    if (provider) {
      const logoHTML = provider.logo
        ? `<img src="${provider.logo}" alt="${provider.name}" class="provider-logo-img" style="width:40px;height:40px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"/><span class="provider-logo" style="background:#222;display:none;">${provider.emoji}</span>`
        : `<span class="provider-logo" style="background:#222;">${provider.emoji}</span>`;
      providersHTML += `
        <div class="watch-provider-item">
          ${logoHTML}
          <div class="provider-info">
            <div class="provider-name">${escapeHtml(provider.name)}</div>
            <div class="provider-type">${provider.type}</div>
          </div>
        </div>
      `;
    }
  });
  if (!providersHTML) {
    providersHTML = '<div style="padding: 20px; text-align: center; color: #999;">No streaming providers available</div>';
  }
  modal.innerHTML = `
    <div class="watch-modal-content">
      <button class="watch-modal-close" aria-label="Close">✕</button>
      <div class="watch-modal-header">Where to Watch</div>
      <div class="watch-modal-title">${escapeHtml(title)}</div>
      <div class="watch-modal-providers">
        ${providersHTML}
      </div>
      <div class="watch-modal-footer">© CineNext</div>
    </div>
  `;
  document.body.appendChild(modal);
  // Close handlers
  modal.querySelector('.watch-modal-close').addEventListener('click', () => {
    modal.classList.add('closing');
    setTimeout(() => modal.remove(), 300);
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('closing');
      setTimeout(() => modal.remove(), 300);
    }
  });
  // Trigger animation
  setTimeout(() => modal.classList.add('visible'), 10);
}
/* ========== Create Watch Button for Movie Cards ========== */
function createWatchButton(movieTitle, cardElement) {
  const btn = document.createElement('button');
  btn.className = 'watch-btn-mobile';
  // Use innerHTML to include both text and icon spans
  btn.innerHTML = '<span class="watch-text">WATCH</span><span class="watch-icon">▶</span>';
  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    showWatchModal(movieTitle);
  };
  cardElement.appendChild(btn);
}
/* ========== OMDb rows & search ========== */
const rows = {
  bollywood: ['Panchayat', 'Dangal', 'Jawan', 'Pathaan', 'Special 26', 'Aavesham', 'Kick', 'Saiyaara'],
  regional: ['Pather Panchali', 'The World of Apu', 'Dasham Avatar', 'Chotushkone', 'Vinci Da', 'Rahasya', 'Feluda Pherot'],
  hollywood: ['Oppenheimer', 'Inception', 'Interstellar', 'Hereditary', 'The Conjuring: Last Rites', 'Joker', 'Avengers', 'Dune', 'Matrix', 'Zodiac'],
  action: ['War', 'Baby', 'Extraction', 'Mad Max', 'John Wick: Chapter 4', 'Alice in Borderland'],
  scifi: ['Avatar', 'The Martian', 'Gravity', 'Tenet', 'Edge of Tomorrow', 'Oblivion'],
  drama: ['Squid Game', 'Alice in Borderland', 'All of Us Are Dead', 'When the Stars Gossip', 'Queen of Tears', 'Business Proposal', 'Chimera']
};
async function fetchMovieByTitle(title) {
  return await fetchMovieData(title, 't');
}
async function loadRowMovies() {
  for (const key of Object.keys(rows)) {
    const wrap = $('row-' + key);
    if (!wrap) continue;
    wrap.innerHTML = '';
    for (const title of rows[key]) {
      try {
        const data = await fetchMovieByTitle(title);
        const poster = (data && data.Poster && data.Poster !== 'N/A') ? data.Poster : 'https://placehold.co/300x450?text=No+Image';
        const name = (data && data.Title) ? data.Title : title;
        const imdbUrl = (data && data.imdbID) ? `https://www.imdb.com/title/${data.imdbID}/` : '#';
        const card = document.createElement('div');
        card.className = 'movie-card-wrapper';
        // Styles are handled by CSS now
        card.innerHTML = `
          <a href="${imdbUrl}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(name)} on IMDb">
            <img src="${poster}" alt="${escapeHtml(name)}" class="poster" onerror="this.src='https://placehold.co/300x450?text=No+Image'"/>
          </a>
          <p>${escapeHtml(name)}</p>
        `;
        // Add watch button
        if (typeof createWatchButton === 'function') {
          createWatchButton(name, card);
        }
        wrap.appendChild(card);
      } catch (e) {
        console.warn('row fetch failed', e);
      }
    }
  }
}
function getSearchBox() {
  return $('searchBox');
}
async function searchMovies(query) {
  if (!query) return;
  console.log('Searching for:', query);
  // Create or get search results container
  let resultsContainer = $('searchResults');
  if (!resultsContainer) {
    resultsContainer = document.createElement('section');
    resultsContainer.id = 'searchResults';
    resultsContainer.style.padding = '20px 4%';
    resultsContainer.style.marginTop = '20px';
    // Insert after AI Recommender Section
    const recommender = $('ai-recommender-section');
    if (recommender && recommender.parentNode) {
      recommender.parentNode.insertBefore(resultsContainer, recommender.nextSibling);
    } else {
      // Fallback
      const main = document.querySelector('main');
      if (main) main.prepend(resultsContainer);
    }
  }
  // Hide all other movie rows
  const rowsToHide = [
    'row-bollywood-wrap',
    'row-regional-wrap',
    'row-hollywood-wrap',
    'row-action-wrap',
    'row-scifi-wrap',
    'row-drama-wrap'
  ];
  rowsToHide.forEach(id => {
    const el = $(id);
    if (el) el.style.display = 'none';
  });
  resultsContainer.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h2 class="section-title" style="margin:0">Search Results</h2>
      <button id="clearSearchBtn" class="btn btn-ghost" style="font-size:0.9rem">Clear Search</button>
    </div>
    <div class="row-posters" id="searchResultsList" style="display:flex;gap:16px;overflow-x:auto;padding-bottom:20px;flex-wrap:wrap;"></div>
  `;
  // Wire up clear button
  on($('clearSearchBtn'), 'click', () => {
    resultsContainer.remove();
    // Show rows again
    rowsToHide.forEach(id => {
      const el = $(id);
      if (el) el.style.display = 'block';
    });
    // Clear input
    const sb = getSearchBox();
    if (sb) sb.value = '';
  });
  const list = $('searchResultsList');
  list.innerHTML = '<div style="color:#fff;padding:20px">Searching...</div>';
  try {
    // Use OMDb API directly
    const data = await fetchMovieData(query, 's');
    list.innerHTML = ''; // Clear loading
    if (data && data.Search && data.Search.length > 0) {
      data.Search.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card-wrapper';
        // Styles are handled by CSS now
        const poster = (movie.Poster && movie.Poster !== 'N/A') ? movie.Poster : 'https://placehold.co/300x450?text=No+Image';
        const imdbUrl = `https://www.imdb.com/title/${movie.imdbID}/`;
        const name = movie.Title;
        card.innerHTML = `
          <a href="${imdbUrl}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(name)} on IMDb">
            <img src="${poster}" alt="${escapeHtml(name)}" class="poster" onerror="this.src='https://placehold.co/300x450?text=No+Image'"/>
          </a>
          <p>${escapeHtml(name)}</p>
        `;
        // Add watch button
        if (typeof createWatchButton === 'function') {
          createWatchButton(name, card);
        }
        list.appendChild(card);
      });

      // Scroll to results
      resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      list.innerHTML = '<div style="color:#ccc;padding:20px">No results found.</div>';
      // Scroll to show "no results" message
      resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (err) {
    console.error('Search error', err);
    list.innerHTML = '<div style="color:red;padding:20px">Error searching movies.</div>';
    // Scroll to show error message
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
/* ========== AI RECOMMENDER ========== */
async function fetchRecommendations(genre = '', year = '') {
  const container = $('ai-recommendations');
  if (!container) return;
  // Show the container when user requests recommendations
  container.style.display = 'grid';
  container.innerHTML = `<div style="color:#bbb;padding:12px">Loading recommendations…</div>`;
  // Try backend
  if (BACKEND_BASE) {
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch(`${BACKEND_BASE}/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ genre, year, limit: 12 })
      });
      if (res.ok) {
        const list = await res.json();
        renderRecoList(list);
        return;
      }
    } catch (err) {
      // ignore and fallback
      console.warn('backend recs failed', err);
    }
  }
  // Fallback seeded list (client-side)
  const fallback = [
    { title: 'Oppenheimer', poster_url: 'https://placehold.co/600x900?text=Oppenheimer', reason: 'Critically-acclaimed biopic.' },
    { title: 'Inception', poster_url: 'https://placehold.co/600x900?text=Inception', reason: 'Mind-bending heist.' },
    { title: 'Interstellar', poster_url: 'https://placehold.co/600x900?text=Interstellar', reason: 'Epic sci-fi drama.' },
    { title: 'Dune', poster_url: 'https://placehold.co/600x900?text=Dune', reason: 'Expansive sci-fi world.' },
    { title: 'Squid Game', poster_url: 'https://placehold.co/600x900?text=Squid+Game', reason: 'Thrilling survival series.' },
    { title: 'Alice in Borderland', poster_url: 'https://placehold.co/600x900?text=Alice+in+Borderland', reason: 'High-stakes games.' }
  ];
  renderRecoList(fallback);
}
function renderRecoList(list) {
  const container = $('ai-recommendations');
  if (!container) return;
  container.innerHTML = '';
  if (!list || !list.length) {
    container.innerHTML = `<div style="color:#bbb;padding:12px">No recommendations found.</div>`;
    return;
  }
  // compact grid cards: create smaller artwork and tighter layout
  for (const item of list) {
    const card = document.createElement('div');
    card.className = 'reco-card';
    // add a small modifier class to keep cards compact if CSS supports it
    card.classList.add('reco-card--compact');
    const poster = item.poster_url || item.Poster || 'https://placehold.co/600x900?text=No+Image';
    const title = item.title || item.name || 'Untitled';
    const reason = item.reason || item.description || '';
    card.innerHTML = `
      <img src="${poster}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.src='https://placehold.co/600x900?text=No+Image'"/>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3 class="title" style="margin:0;font-size:0.98rem">${escapeHtml(title)}</h3>
        </div>
        <div class="meta" style="font-size:0.86rem">${escapeHtml(reason)}</div>
      </div>
    `;
    container.appendChild(card);
  }
}
// Chat message lifetime configuration
const MESSAGE_LIFETIME_MS = 40000; // 40 seconds
function appendMessageToFeed(msg) {
  const feed = $('chat-feed');
  if (!feed) return;
  const div = document.createElement('div');
  div.className = 'chat-message';
  div.dataset.messageId = msg.id;
  div.dataset.createdAt = msg.created_at;
  div.dataset.displayedAt = new Date().toISOString(); // Track when displayed, not created
  const userName = msg.user_name || msg.user || 'Anonymous';
  const messageText = msg.message || msg.text || '';
  // Check if it's a funny username (contains numbers at the end and is not "Anonymous")
  const isFunnyName = /\d{3}$/.test(userName) && userName !== 'Anonymous';
  const userColor = isFunnyName ? '#ff9500' : (msg.is_anonymous ? '#888' : '#7b3fe4');
  // Format timestamp
  let timeStr = '';
  if (msg.created_at) {
    const msgDate = new Date(msg.created_at);
    const now = new Date();
    const diffMs = now - msgDate;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    if (diffSec < 60) {
      timeStr = diffSec <= 5 ? 'just now' : `${diffSec}s ago`;
    } else if (diffMin < 60) {
      timeStr = `${diffMin}m ago`;
    } else {
      timeStr = msgDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
  }
  // Linkify URLs in message text
  function linkifyText(text) {
    // Regex to match URLs (http, https, www, or domain.com patterns)
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
    return text.replace(urlRegex, (match) => {
      let url = match;
      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url;
      }
      // Return clickable link with security attributes
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #4a9eff; text-decoration: underline;">${escapeHtml(match)}</a>`;
    });
  }
  const linkedMessage = linkifyText(escapeHtml(messageText));
  div.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
      <span style="color: ${userColor}; font-weight: 600; font-size: 0.85rem;">${escapeHtml(userName)}</span>
      <span style="color: #666; font-size: 0.75rem;">${timeStr}</span>
    </div>
    <div style="color: #ddd;">${linkedMessage}</div>
  `;
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}
function removeOldMessages() {
  const feed = $('chat-feed');
  if (!feed) return;
  const now = new Date();
  const messages = feed.querySelectorAll('.chat-message');
  messages.forEach(msgDiv => {
    const createdAt = msgDiv.dataset.createdAt;
    if (!createdAt) return;
    const messageTime = new Date(createdAt);
    if (now - messageTime >= MESSAGE_LIFETIME_MS) {
      fadeOutAndRemoveMessage(msgDiv);
    }
  });
}
/* ========== CHAT LOGIC ========== */
let loadedMessageIds = new Set();
// Load messages from backend
async function loadMessages() {
  try {
    const response = await fetch('/messages.php?limit=50');
    if (!response.ok) throw new Error('Failed to fetch messages');
    const data = await response.json();
    const messages = data.messages || [];
    messages.forEach(msg => {
      // Only append if we haven't seen this message ID before
      if (!loadedMessageIds.has(msg.id)) {
        loadedMessageIds.add(msg.id);
        appendMessageToFeed(msg);
      }
    });
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}
// Remove messages 40 seconds after they're displayed (not created)
function removeOldMessages() {
  const feed = $('chat-feed');
  if (!feed) return;
  const now = new Date();
  const messages = feed.querySelectorAll('.chat-message');
  messages.forEach(msgDiv => {
    const displayedAt = msgDiv.dataset.displayedAt;
    if (!displayedAt) return;
    const displayDate = new Date(displayedAt);
    const ageInSeconds = (now - displayDate) / 1000;
    // Remove messages that have been displayed for more than 40 seconds
    if (ageInSeconds > 40) {
      // Fade out animation
      msgDiv.style.transition = 'opacity 0.5s ease-out';
      msgDiv.style.opacity = '0';
      setTimeout(() => {
        msgDiv.remove();
        // Keep message ID in tracking set to prevent it from being re-added by loadMessages()
      }, 500);
    }
  });
}
// Send message to backend
async function sendMessage() {
  const input = $('chat-input');
  const feed = $('chat-feed');
  if (!input || !feed) return;
  const text = input.value.trim();
  if (!text) return;
  // Clear input immediately for better UX
  input.value = '';
  try {
    // Use URLSearchParams (x-www-form-urlencoded) to bypass InfinityFree JSON restrictions
    const formData = new URLSearchParams();
    formData.append('message', text);
    formData.append('is_anonymous', '1');
    const response = await fetch('/messages.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      // If we get the AES challenge (HTML), it means the browser needs to pass it first.
      // Usually reloading fixes this, but for fetch, we might just need to retry or alert the user.
      if (text.includes('aes.js')) {
        throw new Error('Security check failed. Please refresh the page and try again.');
      }
      console.error('Non-JSON response:', text);
      throw new Error(`Server returned non-JSON response (Status ${response.status})`);
    }
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Server Error (${response.status})`);
    }
    if (data.ok) {
      console.log('Message sent:', data);
      await loadMessages();
      feed.scrollTop = feed.scrollHeight;
    } else {
      throw new Error(data.error || 'Unknown server error');
    }
  } catch (error) {
    console.error('Error sending message:', error);
    input.value = text; // Restore text
    alert(`Failed to send: ${error.message}`);
  }
}
function setupChat() {
  console.log('setupChat initializing...');
  const sendBtn = $('chat-send');
  const input = $('chat-input');
  const feed = $('chat-feed');
  if (!sendBtn) {
    console.error('chat-send button not found!');
    return;
  }
  if (!input) {
    console.error('chat-input not found!');
    return;
  }
  if (!feed) {
    console.error('chat-feed not found!');
    return;
  }
  console.log('✓ All chat elements found');
  // Use direct addEventListener for reliability
  sendBtn.addEventListener('click', () => {
    console.log('Send button clicked');
    sendMessage();
  });
  // Send on Enter, Shift+Enter for new line
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('Enter key pressed');
      sendMessage();
    }
  });
  // Initialize Emoji Picker
  if (typeof setupEmojiPicker === 'function') {
    setupEmojiPicker();
  } else {
    console.warn('setupEmojiPicker not defined');
  }
  // Load initial messages
  loadMessages();
  // Auto-refresh messages every 5 seconds
  setInterval(loadMessages, 5000);
  // Check and remove old messages every 2 seconds
  setInterval(removeOldMessages, 2000);
  // Setup Mobile Chat Popup
  setupMobileChat();
  console.log('✓ Chat setup complete');
}
/* ========== MOBILE CHAT POPUP ========== */
function setupMobileChat() {
  const triggerBtn = $('mobile-chat-trigger');
  const closeBtn = $('chat-mobile-close');
  const chatContainer = $('chat-container') || document.querySelector('.chat-container');
  if (!triggerBtn || !chatContainer) return;
  // Create backdrop if it doesn't exist
  let backdrop = document.querySelector('.chat-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'chat-backdrop';
    document.body.appendChild(backdrop);
  }
  function openChat() {
    chatContainer.classList.add('chat-open');
    backdrop.classList.add('visible');
    // Focus input for convenience
    const input = $('chat-input');
    if (input) setTimeout(() => input.focus(), 100);
  }
  function closeChat() {
    chatContainer.classList.remove('chat-open');
    backdrop.classList.remove('visible');
  }
  triggerBtn.addEventListener('click', openChat);
  if (closeBtn) {
    closeBtn.addEventListener('click', closeChat);
  }
  // Close on backdrop click
  backdrop.addEventListener('click', closeChat);
}
/* sticky / aside behavior: keeps chat on the right on wide screens */
function setupAsideSticky() {
  // Sticky positioning is now handled via CSS, so this function is a no-op
  // but kept for compatibility
}
function setupEmojiPicker() {
  console.log('setupEmojiPicker called');
  const picker = $('emoji-picker');
  const btn = $('emoji-btn');
  const input = $('chat-input');
  console.log('Emoji picker elements:', { picker, btn, input });
  if (!picker || !btn || !input) {
    console.error('Missing emoji picker elements!', { picker: !!picker, btn: !!btn, input: !!input });
    return;
  }
  const emojis = [
    // Smileys & People
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇',
    '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝',
    '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
    '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
    '🥵', '🥶', '😶‍🌫️', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁',
    '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭',
    '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈',
    '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖',
    // Gestures & Body Parts
    '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙',
    '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏',
    '🙌', '👐', '🤲', '🤝', '🙏', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃',
    '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋',
    // Hearts & Emotions
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞',
    '💓', '💗', '💖', '💘', '💝', '💟', '💌', '💢', '💥', '💫', '💦', '💨', '🕳️',
    '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤',
    // Animals & Nature
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷',
    '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴',
    '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍',
    '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳',
    '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫',
    '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕',
    '🐩', '🦮', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨',
    '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔',
    // Food & Drink
    '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑',
    '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽',
    '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚',
    '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕',
    '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜',
    '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮',
    '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫',
    '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🫖', '🍵', '🧃', '🥤',
    '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊',
    // Activities & Sports
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸',
    '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽',
    '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺',
    '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏊', '🤽', '🚣', '🧗', '🚴', '🚵', '🎪', '🎭',
    '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲',
    '♟️', '🎯', '🎳', '🎮', '🎰', '🧩',
    // Travel & Places
    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛',
    '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘',
    '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆',
    '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶',
    '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧', '🚦', '🚥', '🚏', '🗺️',
    '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️',
    '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭',
    '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪',
    '🕌', '🕍', '🛕', '🕋',
    // Objects
    '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💾', '💿',
    '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺',
    '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋',
    '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '💰',
    '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🧱', '⛓️',
    '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '⚱️', '🏺',
    '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸',
    '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀',
    '🧼', '🪒', '🧽', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🖼️', '🧳',
    // Symbols
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞',
    '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯',
    '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
    '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸',
    '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️',
    '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢',
    '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️',
    '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹',
    '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳',
    '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '⚧️', '🚻', '🚮', '🎦', '📶',
    '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣',
    '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣',
    '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️',
    '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️',
    '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗',
    '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛',
    '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪',
    '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽',
    '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇',
    '🔉', '🔊', '🔔', '🔕', '📣', '📢', '👁️‍🗨️', '💬', '💭', '🗯️', '♠️', '♣️', '♥️',
    '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘',
    '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥',
    '🕦', '🕧'
  ];
  // Generate emoji HTML
  picker.innerHTML = emojis.map(e => `<span class="emoji-item">${e}</span>`).join('');
  // Toggle picker when button is clicked
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    picker.classList.toggle('hidden');
  });
  // Add emoji to input when clicked
  picker.querySelectorAll('.emoji-item').forEach(item => {
    item.addEventListener('click', () => {
      input.value += item.textContent;
      input.focus();
      // picker.classList.add('hidden'); // Keep open
    });
  });
  // Close picker when clicking outside
  document.addEventListener('click', (e) => {
    if (!picker.contains(e.target) && !btn.contains(e.target)) {
      picker.classList.add('hidden');
    }
  });
}
/* ========== PRELOADER (robust) ========== */
(function setupPreloader() {
  const MIN_VISIBLE_MS = 700;
  const FADE_MS = 450;
  let loaded = false;

  function hidePreloader() {
    if (loaded) return;
    loaded = true;
    try {
      const pre = $('preloader') || document.querySelector('.preloader');
      if (!pre) return;
      pre.classList.add('hidden');
      // remove after fade completes
      setTimeout(() => {
        try { pre.setAttribute('data-removed', 'true'); } catch (e) { }
        try { pre.parentNode && pre.parentNode.removeChild(pre); } catch (e) { }
      }, FADE_MS + 50);
    } catch (err) {
      console.error('Preloader hide error', err);
    }
  }
  // Hide when window triggers load (images/fonts ready)
  window.addEventListener('load', () => {
    // ensure it shows for at least MIN_VISIBLE_MS
    setTimeout(hidePreloader, MIN_VISIBLE_MS);
  });
  // Fallback: if load never fires (rare), hide after 6s
  setTimeout(hidePreloader, 6000);
})();
/* ========== BOOTSTRAP / INIT ========== */
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOMContentLoaded - Initializing app...');
  // Safety: Ensure preloader is hidden even if load event missed
  setTimeout(() => {
    const pre = $('preloader') || document.querySelector('.preloader');
    if (pre && !pre.classList.contains('hidden')) {
      console.warn('Force hiding preloader via safety timeout');
      pre.classList.add('hidden');
      setTimeout(() => {
        if (pre.parentNode) pre.parentNode.removeChild(pre);
      }, 500);
    }
  }, 1000);
  try {
    // Hero slides
    createSlidesFromArray();
    startSlideshow();
    // Rows
    loadRowMovies().catch(e => console.warn('loadRowMovies error', e));
    // Search wiring - search on same page with clear button
    console.log('🔍 Initializing search...');
    const sb = $('searchBox');
    const btn = $('searchBtn');
    console.log('Search elements:', { searchBox: sb, searchBtn: btn });
    if (sb && btn) {
      console.log('✅ Search elements found, attaching event listeners');
      let isSearchActive = false;
      let clearBtn = null;
      const performSearch = () => {
        const query = sb.value.trim();
        if (!query) return;
        searchMovies(query);
      };
      const clearSearch = async () => {
        if (!isSearchActive) return;
        const allCards = document.querySelectorAll('.movie-card-wrapper');
        allCards.forEach(card => {
          card.style.transition = 'opacity 0.5s ease-out';
          card.style.opacity = '0';
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        // Restore all row sections
        const allRowWraps = document.querySelectorAll('[id$="-wrap"]');
        allRowWraps.forEach(wrap => {
          wrap.style.display = 'block';
        });
        const firstRowWrap = document.querySelector('#row-bollywood-wrap');
        if (firstRowWrap) {
          const title = firstRowWrap.querySelector('.section-title');
          if (title) title.textContent = 'Recommended For You';
        }
        if (clearBtn) {
          clearBtn.remove();
          clearBtn = null;
        }
        sb.value = '';
        isSearchActive = false;
        await loadRowMovies();
      };
      btn.addEventListener('click', performSearch);
      sb.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
      });
    }
    // Setup Chat
    setupChat();
    // Initialize Chat Connection (must be after setupChat)
    initChatConnection();
    // Setup AI Recommender
    setupAIRecommender();
    // Setup Aside Sticky (if needed)
    setupAsideSticky();
    // Setup Emoji Picker
    setupEmojiPicker();
    // Initial animation
    try {
      if (typeof gsap !== 'undefined') {
        gsap.from('header', { duration: 1, y: -50, opacity: 0, ease: 'power3.out' });
        gsap.from('.hero-content', { duration: 1, y: 30, opacity: 0, delay: 0.5, ease: 'power3.out' });
      }
    } catch (err) { console.warn('GSAP hero animation error', err); }
  } catch (err) {
    console.error('Initialization error', err);
  }
});
/* ========== AI RECOMMENDER ========== */
function setupAIRecommender() {
  const fetchBtn = $('reco-fetch');
  const titleInput = $('reco-title');
  const yearInput = $('reco-year');
  const grid = $('ai-recommendations');
  if (!fetchBtn || !grid) return;
  // Add Enter key support
  if (titleInput) {
    titleInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        fetchBtn.click();
      }
    });
  }
  fetchBtn.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    const year = yearInput.value.trim();
    if (!title) {
      alert('Please enter a movie title first!');
      return;
    }
    // Show loading state
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ccc;">✨ Asking AI for hidden gems...</div>';
    fetchBtn.disabled = true;
    fetchBtn.textContent = 'Thinking...';
    try {
      console.log('Fetching recommendations for:', title, year);
      const url = '/recommend.php';
      console.log('Request URL:', window.location.origin + url);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, year })
      });
      console.log('Response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);
      // Try to get response text first
      const responseText = await response.text();
      console.log('Response text:', responseText);
      let data = {};
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr);
        data = { error: 'Invalid JSON response', raw: responseText };
      }
      if (!response.ok) {
        throw new Error(data.error || `Server Error: ${response.status}`);
      }
      if (data.error) {
        throw new Error(data.error);
      }
      renderRecommenderGrid(data, grid);
    } catch (err) {
      console.error('Recommender error:', err);
      console.error('Error stack:', err.stack);
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ff6b6b; padding: 20px; background: rgba(255,0,0,0.1); border-radius: 8px;">
          <strong>Error:</strong> ${err.message}<br>
          <span style="font-size: 0.8em; opacity: 0.8;">(Try checking the movie title spelling)</span>
      </div>`;
    } finally {
      fetchBtn.disabled = false;
      fetchBtn.textContent = 'Get recommendations';
    }
  });
}
function renderRecommenderGrid(data, container) {
  container.innerHTML = '';
  const { movie, ai } = data;
  if (!ai || !ai.recommendations || ai.recommendations.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #999;">No recommendations found.</div>';
    return;
  }
  // 1. Summary Section
  const summaryDiv = document.createElement('div');
  summaryDiv.style.gridColumn = '1 / -1';
  summaryDiv.style.marginBottom = '20px';
  summaryDiv.style.padding = '20px';
  summaryDiv.style.background = 'rgba(255, 255, 255, 0.03)';
  summaryDiv.style.borderRadius = '12px';
  summaryDiv.style.border = '1px solid rgba(255, 255, 255, 0.05)';
  summaryDiv.innerHTML = `
        <div style="display: flex; gap: 20px; align-items: start; flex-wrap: wrap;">
            <img src="${movie.poster}" alt="${escapeHtml(movie.title)}" style="width: 100px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <div style="flex: 1;">
                <h3 style="margin: 0 0 8px; color: var(--accent);">Because you watched "${escapeHtml(movie.title)}"</h3>
                <p style="color: #ddd; line-height: 1.6; margin: 0;">${escapeHtml(ai.summary)}</p>
                <div style="margin-top: 12px; font-style: italic; color: var(--gold); font-size: 0.9rem;">"${escapeHtml(ai.tagline)}"</div>
            </div>
        </div>
    `;
  container.appendChild(summaryDiv);
  // 2. Recommendations Grid
  ai.recommendations.forEach(rec => {
    const card = document.createElement('div');
    card.className = 'reco-card';
    // Use real poster if available, otherwise fallback
    const posterUrl = rec.poster ? rec.poster : `https://placehold.co/300x450/1a1a1a/ffffff?text=${encodeURIComponent(rec.title)}`;
    card.innerHTML = `
            <div style="position: relative; overflow: hidden; border-radius: 10px; height: 100%;">
                <img src="${posterUrl}" alt="${escapeHtml(rec.title)}" style="width: 100%; height: 280px; object-fit: cover; display: block;">
                <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.95) 10%, rgba(0,0,0,0.6) 50%, transparent 100%); padding: 12px; display: flex; flex-direction: column; justify-content: flex-end;">
                    <h4 style="margin: 0; font-size: 1rem; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">${escapeHtml(rec.title)}</h4>
                    <span style="font-size: 0.8rem; color: var(--gold); margin-bottom: 4px; font-weight: bold;">${escapeHtml(rec.year)}</span>
                    <p style="margin: 0; font-size: 0.75rem; color: #ddd; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${escapeHtml(rec.reason)}</p>
                </div>
            </div>
        `;
    // Add click to search this movie
    card.style.cursor = 'pointer';
    card.onclick = () => {
      const searchBox = $('searchBox');
      if (searchBox) {
        searchBox.value = rec.title;
        $('searchBtn').click();
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    container.appendChild(card);
  });
  // 3. Watch Next Section
  if (ai.watch_next && ai.watch_next.length > 0) {
    const nextDiv = document.createElement('div');
    nextDiv.style.gridColumn = '1 / -1';
    nextDiv.style.marginTop = '20px';
    nextDiv.innerHTML = `<h3 style="font-size: 1.1rem; margin-bottom: 12px; color: #fff;">What to watch next?</h3>`;
    const nextGrid = document.createElement('div');
    nextGrid.style.display = 'grid';
    nextGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
    nextGrid.style.gap = '12px';
    ai.watch_next.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.style.background = 'rgba(255, 255, 255, 0.05)';
      itemDiv.style.padding = '12px';
      itemDiv.style.borderRadius = '8px';
      itemDiv.style.borderLeft = '3px solid var(--accent)';
      let icon = '🎬';
      if (item.reason_type === 'visuals') icon = '👁️';
      if (item.reason_type === 'performances') icon = '🎭';
      if (item.reason_type === 'story') icon = '📖';
      itemDiv.innerHTML = `
                <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 4px;">${icon} If you liked the ${item.reason_type}</div>
                <div style="font-weight: bold; color: #fff; margin-bottom: 4px;">${escapeHtml(item.title)}</div>
                <div style="font-size: 0.85rem; color: #ccc;">${escapeHtml(item.short_reason)}</div>
            `;
      nextGrid.appendChild(itemDiv);
    });
    nextDiv.appendChild(nextGrid);
    container.appendChild(nextDiv);
  }
}
// Chat Connect Feature JavaScript
// Add this code at the end of setupChat() function in app.js
// Chat connection state
let chatConnected = false;
function initChatConnection() {
  // Use matchMedia to properly detect mobile view (works in DevTools too)
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  const chatContainer = document.querySelector('.chat-container');
  if (!chatContainer) {
    console.warn('Chat container not found');
    return;
  }
  // Ensure container has relative positioning for overlay
  chatContainer.style.position = 'relative';
  // Create connect overlay dynamically
  const overlay = document.createElement('div');
  overlay.id = 'chat-connect-overlay';
  overlay.className = 'chat-connect-overlay';
  overlay.innerHTML = `
        <div class="connect-content">
            <p style="margin: 0 0 20px; color: #ccc;">Connect to chat with other movie lovers!</p>
            <button id="connect-chat-btn" class="btn-connect">
                Connect to Chat
            </button>
        </div>
    `;
  // Insert overlay as first child of chat container
  chatContainer.insertBefore(overlay, chatContainer.firstChild);
  if (isMobile) {
    // Mobile: Show connect overlay
    chatContainer.classList.add('chat-disconnected');
    overlay.style.display = 'flex'; // Force visibility
    const connectBtn = document.getElementById('connect-chat-btn');
    if (connectBtn) {
      connectBtn.addEventListener('click', connectToChat);
    }
  } else {
    // Desktop: Auto-connect
    overlay.style.display = 'none'; // Ensure hidden on desktop
    connectToChat();
  }
}
async function connectToChat() {
  if (chatConnected) return;
  chatConnected = true;
  const chatContainer = document.querySelector('.chat-container');
  if (chatContainer) {
    chatContainer.classList.remove('chat-disconnected');
  }
  // Explicitly hide overlay since we forced it with inline styles
  const overlay = document.getElementById('chat-connect-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
  // Fetch username
  let username = 'Movie Lover';
  try {
    const res = await fetch('/messages.php?action=whoami');
    if (res.ok) {
      const data = await res.json();
      if (data.user_name) username = data.user_name;
    }
  } catch (e) {
    console.warn('Failed to fetch username', e);
  }
  // Ensure chat feed exists before showing message
  const checkFeed = setInterval(() => {
    const feed = $('chat-feed');
    if (feed) {
      clearInterval(checkFeed);
      showWelcomeMessage(username);
    }
  }, 100);
  // Safety timeout to stop checking
  setTimeout(() => clearInterval(checkFeed), 5000);
}
function showWelcomeMessage(username) {
  const feed = $('chat-feed');
  if (!feed) return;
  const msgId = 'welcome-' + Date.now();
  const div = document.createElement('div');
  div.className = 'chat-message chat-alert-green';
  // Green alert styling
  div.style.cssText = 'background: rgba(40, 167, 69, 0.15); border: 1px solid rgba(40, 167, 69, 0.3); color: #4ade80; text-align: center; font-size: 0.9rem; padding: 10px; border-radius: 8px; margin-bottom: 8px; box-shadow: 0 2px 10px rgba(40, 167, 69, 0.1);';
  div.innerHTML = `✅ Connected successfully as <strong>${username}</strong>`;
  div.dataset.messageId = msgId;
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
  // Remove welcome message after 5 seconds
  setTimeout(() => {
    div.style.transition = 'opacity 0.5s ease-out';
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 500);
  }, 5000);
}
// Initialize Chat
setupChat();