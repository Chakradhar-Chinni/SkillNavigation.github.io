// Get the base path for GitHub Pages or local
const getBasePath = () => {
    const pathname = window.location.pathname;
    const isDev = pathname === '/' || pathname === '/index.html';
    if (isDev) return ''; // Local development
    
    // Extract base path for GitHub Pages
    const parts = pathname.split('/').filter(Boolean);
    return parts.length > 0 && parts[parts.length - 1] !== 'index.html' 
        ? '/' + parts[0] 
        : '';
};

// Global state
let data = null;
let currentCategory = 'all';
let searchQuery = '';

// Initialize app
async function init() {
    try {
        const basePath = getBasePath();
        const response = await fetch(`${basePath}/data.json`);
        data = await response.json();
        
        // Set sidebar open by default
        const contentWrapper = document.getElementById('content-wrapper');
        contentWrapper.classList.add('shifted');
        
        renderCategories();
        renderSidebar();
        renderTopics();
        setupEventListeners();
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('topics-container').innerHTML = `
            <div class="no-results">
                <p>Error loading data. Please check if data.json exists.</p>
            </div>
        `;
    }
}

// Render sidebar overview
function renderSidebar() {
    const sidebarContent = document.getElementById('sidebar-content');
    
    // Calculate stats
    const totalTopics = data.topics.length;
    const totalSubtopics = data.topics.reduce((sum, topic) => sum + topic.subTopics.length, 0);
    const totalCategories = data.categories.length;
    const totalTags = data.topics.reduce((sum, topic) => {
        return sum + topic.subTopics.reduce((tagSum, subtopic) => tagSum + subtopic.tags.length, 0);
    }, 0);
    
    // Stats section
    const statsHTML = `
        <div class="sidebar-section">
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-number">${totalTopics}</span>
                    <span class="stat-label">Topics</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${totalSubtopics}</span>
                    <span class="stat-label">Subtopics</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${totalCategories}</span>
                    <span class="stat-label">Categories</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${totalTags}</span>
                    <span class="stat-label">Tags</span>
                </div>
            </div>
        </div>
    `;
    
    // Categories section
    let categoriesHTML = '<div class="sidebar-section"><h3 class="sidebar-section-title">Categories</h3><div class="category-list">';
    
    data.categories.forEach(category => {
        const topicNames = category.subCategories.map(sc => sc.label).join(', ');
        const count = category.subCategories.length;
        
        categoriesHTML += `
            <div class="category-item" data-category="${category.name}">
                <div class="category-item-name">
                    <span>${category.name}</span>
                    <span class="category-count">${count}</span>
                </div>
                <div class="category-topics">
                    ${category.subCategories.map(sc => `<span>${sc.label}</span>`).join('')}
                </div>
            </div>
        `;
    });
    
    categoriesHTML += '</div></div>';
    
    // Quick links section
    const quickLinksHTML = `
        <div class="sidebar-section">
            <h3 class="sidebar-section-title">Quick Actions</h3>
            <div class="quick-links">
                <a href="#" class="quick-link" id="show-all">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                    Show All Topics
                </a>
                <a href="#" class="quick-link" id="clear-search">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    Clear Search
                </a>
            </div>
        </div>
    `;
    
    sidebarContent.innerHTML = statsHTML + categoriesHTML + quickLinksHTML;
    
    // Add click handlers for category items
    sidebarContent.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
            const category = item.dataset.category;
            currentCategory = category;
            
            // Update active state in main nav
            document.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.category === category) {
                    btn.classList.add('active');
                }
            });
            
            renderTopics();
            
            // Only close sidebar on mobile
            if (window.innerWidth <= 1024) {
                closeSidebar();
            }
        });
    });
    
    // Quick actions
    document.getElementById('show-all').addEventListener('click', (e) => {
        e.preventDefault();
        currentCategory = 'all';
        searchQuery = '';
        document.getElementById('search-input').value = '';
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === 'all') {
                btn.classList.add('active');
            }
        });
        renderTopics();
        
        // Only close sidebar on mobile
        if (window.innerWidth <= 1024) {
            closeSidebar();
        }
    });
    
    document.getElementById('clear-search').addEventListener('click', (e) => {
        e.preventDefault();
        searchQuery = '';
        document.getElementById('search-input').value = '';
        renderTopics();
        
        // Only close sidebar on mobile
        if (window.innerWidth <= 1024) {
            closeSidebar();
        }
    });
}

// Render categories navigation
function renderCategories() {
    const nav = document.getElementById('categories-nav');
    
    // Add "All" button
    const allBtn = document.createElement('button');
    allBtn.className = 'category-btn active';
    allBtn.textContent = 'All Topics';
    allBtn.dataset.category = 'all';
    nav.appendChild(allBtn);
    
    // Add category buttons
    data.categories.forEach(category => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.textContent = category.name;
        btn.dataset.category = category.name;
        
        if (category.notes) {
            btn.title = category.notes;
        }
        
        nav.appendChild(btn);
    });
}

// Render topics based on current filters
function renderTopics() {
    const container = document.getElementById('topics-container');
    const filteredTopics = getFilteredTopics();
    
    if (filteredTopics.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <p>No topics found matching your search.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    filteredTopics.forEach((topic, index) => {
        const section = createTopicSection(topic, index);
        container.appendChild(section);
    });
}

// Create a topic section
function createTopicSection(topic, index) {
    const section = document.createElement('div');
    section.className = 'topic-section';
    section.style.animationDelay = `${index * 0.1}s`;
    
    const header = document.createElement('div');
    header.className = 'topic-header';
    
    const titleContainer = document.createElement('div');
    const title = document.createElement('h2');
    title.className = 'topic-name';
    title.innerHTML = highlightText(topic.name);
    titleContainer.appendChild(title);
    
    if (topic.notes) {
        const notes = document.createElement('p');
        notes.className = 'topic-notes';
        notes.innerHTML = highlightText(topic.notes);
        titleContainer.appendChild(notes);
    }
    
    header.appendChild(titleContainer);
    section.appendChild(header);
    
    const grid = document.createElement('div');
    grid.className = 'subtopics-grid';
    
    topic.subTopics.forEach(subtopic => {
        const card = createSubtopicCard(subtopic);
        grid.appendChild(card);
    });
    
    section.appendChild(grid);
    return section;
}

// Create a subtopic card
function createSubtopicCard(subtopic) {
    const card = document.createElement('div');
    card.className = 'subtopic-card';
    
    const header = document.createElement('div');
    header.className = 'subtopic-header';
    
    const title = document.createElement('h3');
    title.className = 'subtopic-title';
    title.innerHTML = highlightText(subtopic.title);
    header.appendChild(title);
    
    if (subtopic.url && subtopic.url !== '' && subtopic.url !== 'placeholder') {
        const link = document.createElement('a');
        link.href = subtopic.url;
        link.target = '_blank';
        link.className = 'external-link';
        link.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
        `;
        link.title = 'Open link';
        header.appendChild(link);
    }
    
    card.appendChild(header);
    
    if (subtopic.notes) {
        const notes = document.createElement('p');
        notes.className = 'subtopic-notes';
        notes.innerHTML = highlightText(subtopic.notes);
        card.appendChild(notes);
    }
    
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'tags-container';
    
    subtopic.tags.forEach(tag => {
        const tagEl = createTag(tag);
        tagsContainer.appendChild(tagEl);
    });
    
    card.appendChild(tagsContainer);
    
    // Make card clickable if it has a URL
    if (subtopic.url && subtopic.url !== '' && subtopic.url !== 'placeholder') {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            // Don't navigate if clicking on a tag or external link
            if (!e.target.closest('.tag') && !e.target.closest('.external-link')) {
                window.open(subtopic.url, '_blank');
            }
        });
    }
    
    return card;
}

// Create a tag element
function createTag(tag) {
    const hasUrl = tag.url && tag.url !== '';
    
    if (hasUrl) {
        const link = document.createElement('a');
        link.href = tag.url;
        link.target = '_blank';
        link.className = 'tag has-url';
        link.innerHTML = highlightText(tag.label);
        return link;
    } else {
        const span = document.createElement('span');
        span.className = 'tag';
        span.innerHTML = highlightText(tag.label);
        return span;
    }
}

// Highlight search text
function highlightText(text) {
    if (!searchQuery || !text) return text;
    
    const regex = new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// Escape special regex characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Get filtered topics based on category and search
function getFilteredTopics() {
    if (!data) return [];
    
    let topics = data.topics;
    
    // Filter by category
    if (currentCategory !== 'all') {
        const category = data.categories.find(c => c.name === currentCategory);
        if (category) {
            const topicNames = category.subCategories.map(sc => sc.topic);
            topics = topics.filter(t => topicNames.includes(t.name));
        }
    }
    
    // Filter by search query
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        topics = topics.filter(topic => {
            // Search in topic name
            if (topic.name.toLowerCase().includes(query)) return true;
            
            // Search in subtopics
            return topic.subTopics.some(subtopic => {
                if (subtopic.title.toLowerCase().includes(query)) return true;
                
                // Search in tags
                return subtopic.tags.some(tag => 
                    tag.label.toLowerCase().includes(query)
                );
            });
        });
    }
    
    return topics;
}

// Setup event listeners
function setupEventListeners() {
    // Sidebar toggle
    document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
    
    // Close sidebar when clicking outside (mobile only)
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('sidebar-toggle');
        
        // Only auto-close on mobile/tablet
        if (window.innerWidth <= 1024 &&
            sidebar.classList.contains('open') && 
            !sidebar.contains(e.target) && 
            !toggle.contains(e.target)) {
            closeSidebar();
        }
    });
    
    // Category navigation
    document.getElementById('categories-nav').addEventListener('click', (e) => {
        if (e.target.classList.contains('category-btn')) {
            // Update active state
            document.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // Update current category and render
            currentCategory = e.target.dataset.category;
            renderTopics();
        }
    });
    
    // Search input
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', debounce((e) => {
        searchQuery = e.target.value;
        renderTopics();
    }, 300));
    
    // Search button
    document.querySelector('.search-btn').addEventListener('click', () => {
        searchQuery = searchInput.value;
        renderTopics();
    });
    
    // Enter key on search
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchQuery = e.target.value;
            renderTopics();
        }
    });
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const contentWrapper = document.getElementById('content-wrapper');
    
    sidebar.classList.toggle('open');
    contentWrapper.classList.toggle('shifted');
}

// Close sidebar
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const contentWrapper = document.getElementById('content-wrapper');
    
    sidebar.classList.remove('open');
    contentWrapper.classList.remove('shifted');
}

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Start the app
init();
