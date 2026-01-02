let allTopics = [];
let categories = [];
let selectedTopics = new Set();

/* -------- Load JSON -------- */

fetch('data.json')
  .then(r => r.json())
  .then(d => {
    allTopics = d.topics;
    categories = d.categories;

    renderSideNav();
    selectAllTopics();
    renderFiltered();
    initResizable();
  });

/* -------- Side Nav -------- */

function renderSideNav() {
  const nav = document.getElementById('sideNav');
  nav.innerHTML = '';

  categories.forEach((cat, i) => {
    const catId = `cat-${i}`;

    nav.insertAdjacentHTML('beforeend', `
      <div class="mb-3">
        <div class="fw-semibold d-flex justify-content-between align-items-center"
             data-bs-toggle="collapse"
             data-bs-target="#${catId}">
          ${cat.name}
          <span class="text-muted">▾</span>
        </div>

        <div id="${catId}" class="collapse show ms-2 mt-2">
          ${cat.subCategories.map(sc => `
            <div class="form-check">
              <input class="form-check-input"
                     type="checkbox"
                     checked
                     onchange="toggleTopic('${sc.topic}', this.checked)">
              <label class="form-check-label">${sc.label}</label>
            </div>
          `).join('')}
        </div>
      </div>
    `);
  });
}

function toggleTopic(topic, checked) {
  checked ? selectedTopics.add(topic) : selectedTopics.delete(topic);
  renderFiltered();
}

function toggleAll(state) {
  selectedTopics.clear();

  if (state) {
    allTopics.forEach(t => selectedTopics.add(t.name));
  }

  document.querySelectorAll('.form-check-input')
    .forEach(cb => cb.checked = state);

  renderFiltered();
}

function selectAllTopics() {
  allTopics.forEach(t => selectedTopics.add(t.name));
}

/* -------- Rendering -------- */

function renderFiltered() {
  const filtered = allTopics.filter(t => selectedTopics.has(t.name));
  applySearch(filtered);
}

function renderTopics(topics) {
  const container = document.getElementById('topics');
  container.innerHTML = '';

  topics.forEach((topic, i) => {
    const id = `topic-${i}`;
    const topicClass = topic.name.toLowerCase().replace(/\s+/g, '-').replace(/[#.]/g, '');

    const subHtml = topic.subTopics.map(s => {
      const tags = (s.tags || [])
        .map(tag => `<span class="badge bg-secondary me-1">${tag}</span>`)
        .join('');
      
      const subClass = `subtopic-${topicClass}`;

      return `
        <li class="list-group-item subtopic ${subClass}" onclick="setUrl('${s.url}')">
          <div class="fw-semibold">${s.title}</div>
          <div class="mt-1">${tags}</div>
        </li>
      `;
    }).join('');

    container.insertAdjacentHTML('beforeend', `
      <div class="card mb-2 topic-${topicClass}">
        <div class="card-header fw-semibold"
             data-bs-toggle="collapse"
             data-bs-target="#${id}">
          ${topic.name}
        </div>
        <div id="${id}" class="collapse">
          <ul class="list-group list-group-flush">
            ${subHtml}
          </ul>
        </div>
      </div>
    `);
  });
}

/* -------- Search -------- */

function applySearch(base = allTopics) {
  const q = document.getElementById('searchBox').value.toLowerCase();

  if (!q) {
    renderTopics(base);
    return;
  }

  const filtered = base
    .map(t => ({
      ...t,
      subTopics: t.subTopics.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.tags || []).some(tag => tag.toLowerCase().includes(q))
      )
    }))
    .filter(t => t.subTopics.length > 0);

  renderTopics(filtered);
}

/* -------- URL Actions -------- */

function setUrl(url) {
  const box = document.getElementById('urlBox');
  box.value = url;
  box.classList.remove('highlight');
  void box.offsetWidth; // Force reflow to restart animation
  box.classList.add('highlight');
  setTimeout(() => box.classList.remove('highlight'), 600);
}

function copyUrl() {
  const box = document.getElementById('urlBox');
  box.select();
  navigator.clipboard.writeText(box.value);
}

function openUrl() {
  const url = document.getElementById('urlBox').value;
  if (url) window.open(url, '_blank');
}

/* -------- Sidebar Toggle -------- */

function toggleSidebar() {
  const sidebar = document.getElementById('sidebarContainer');
  sidebar.classList.toggle('hidden');
  
  const main = document.querySelector('main');
  const mainCol = main.className;
  
  if (sidebar.classList.contains('hidden')) {
    main.className = mainCol.replace('col-9', 'col-12');
  } else {
    main.className = mainCol.replace('col-12', 'col-9');
  }
}

/* -------- Resizable Sidebar -------- */

function initResizable() {
  const sidebar = document.getElementById('sidebarContainer');
  const handle = document.getElementById('resizeHandle');
  let isResizing = false;

  handle.addEventListener('mousedown', () => {
    isResizing = true;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const container = document.querySelector('.container-fluid');
    const newWidth = e.clientX - container.getBoundingClientRect().left;
    
    if (newWidth > 150 && newWidth < window.innerWidth - 100) {
      sidebar.style.width = newWidth + 'px';
      document.querySelector('main').style.width = `calc(100% - ${newWidth}px)`;
    }
  });

  document.addEventListener('mouseup', () => {
    isResizing = false;
    document.body.style.userSelect = 'auto';
  });
}
