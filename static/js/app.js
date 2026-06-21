// State management
let releaseNotes = [];
let filteredNotes = [];
let activeCategory = 'all';
let searchKeyword = '';
let selectedNote = null;

// DOM Elements
const feedContainer = document.getElementById('feed-container');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const refreshBtn = document.getElementById('refresh-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = document.getElementById('theme-icon');
const btnSpinner = document.getElementById('btn-spinner');
const retryBtn = document.getElementById('retry-btn');
const syncStatus = document.getElementById('sync-status');
const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const clearFiltersBtn = document.getElementById('clear-filters-btn');

// Stats Elements
const statTotalUpdates = document.getElementById('stat-total-updates');
const statLatestDate = document.getElementById('stat-latest-date');

// Filter Buttons
const categoryFilterList = document.getElementById('category-filter-list');

// Tweet Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const modalSourceTitle = document.getElementById('modal-source-title');
const modalSourceSummary = document.getElementById('modal-source-summary');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCount = document.getElementById('char-count');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalTweetBtn = document.getElementById('modal-tweet-btn');
const btnAddHashtags = document.getElementById('btn-add-hashtags');
const btnAddLink = document.getElementById('btn-add-link');
const btnCopyTweet = document.getElementById('btn-copy-tweet');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchReleaseNotes();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    exportCsvBtn.addEventListener('click', exportToCSV);
    themeToggleBtn.addEventListener('click', toggleTheme);
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search inputs
    searchInput.addEventListener('input', handleSearch);
    searchClearBtn.addEventListener('click', clearSearch);
    clearFiltersBtn.addEventListener('click', resetFilters);
    
    // Category filters delegation
    categoryFilterList.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        
        // Toggle active status
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        activeCategory = btn.dataset.category;
        applyFilters();
    });
    
    // Modal controls
    modalCloseBtn.addEventListener('click', closeTweetModal);
    modalCancelBtn.addEventListener('click', closeTweetModal);
    
    // Modal action buttons
    tweetTextarea.addEventListener('input', updateCharCount);
    btnAddHashtags.addEventListener('click', appendDefaultHashtags);
    btnAddLink.addEventListener('click', toggleLinkInTweet);
    btnCopyTweet.addEventListener('click', copyTweetToClipboard);
    modalTweetBtn.addEventListener('click', handleTweetRedirect);
    
    // Close modal on clicking outside
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });
}

// Fetch Release Notes from API
async function fetchReleaseNotes(forceRefresh = false) {
    showState('loading');
    btnSpinner.classList.add('spinning');
    
    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success && result.data) {
            releaseNotes = result.data.map(item => {
                return {
                    ...item,
                    categories: parseCategories(item.content)
                };
            });
            
            // Update UI/Stats
            updateStats(releaseNotes);
            syncStatus.innerHTML = `Last Synced: <span style="color: white; font-weight: 500;">${result.cached_at}</span>`;
            
            applyFilters();
        } else {
            throw new Error(result.error || 'Failed to retrieve release notes.');
        }
    } catch (err) {
        console.error(err);
        errorMessage.textContent = err.message || 'Unable to contact feed service.';
        showState('error');
    } finally {
        btnSpinner.classList.remove('spinning');
    }
}

// Extract Categories from Release Notes Content
function parseCategories(htmlContent) {
    const categories = new Set();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const headers = doc.querySelectorAll('h3');
    
    headers.forEach(h => {
        const text = h.textContent.trim().toLowerCase();
        if (text.includes('feature')) categories.add('feature');
        else if (text.includes('deprecation')) categories.add('deprecation');
        else if (text.includes('change')) categories.add('changed');
        else if (text.includes('resolve')) categories.add('resolved');
        else if (text.includes('beta')) categories.add('beta');
    });
    
    // If no specific headings are parsed, tag it as general
    if (categories.size === 0) {
        categories.add('general');
    }
    
    return Array.from(categories);
}

// Update Overview Stats
function updateStats(notes) {
    if (notes.length === 0) return;
    
    statTotalUpdates.textContent = notes.length;
    statLatestDate.textContent = notes[0].title;
}

// Apply Category & Search Filters
function applyFilters() {
    filteredNotes = releaseNotes.filter(note => {
        // Category filter
        const matchesCategory = activeCategory === 'all' || note.categories.includes(activeCategory);
        
        // Search filter
        const cleanContent = stripHtml(note.content).toLowerCase();
        const cleanTitle = note.title.toLowerCase();
        const matchesSearch = !searchKeyword || 
                              cleanTitle.includes(searchKeyword) || 
                              cleanContent.includes(searchKeyword);
                              
        return matchesCategory && matchesSearch;
    });
    
    renderFeed();
}

// Render the Feed list
function renderFeed() {
    feedContainer.innerHTML = '';
    
    if (filteredNotes.length === 0) {
        showState('empty');
        return;
    }
    
    showState('feed');
    
    filteredNotes.forEach(note => {
        const card = document.createElement('article');
        card.className = 'release-card';
        
        // Badges HTML
        const badgesHtml = note.categories.map(cat => 
            `<span class="release-badge ${cat}">${cat}</span>`
        ).join(' ');
        
        card.innerHTML = `
            <div class="release-header">
                <div class="release-title-area">
                    <h3 class="release-date">${note.title}</h3>
                    <div class="badges-wrapper">${badgesHtml}</div>
                </div>
                <div class="card-actions">
                    <button class="card-action-btn btn-copy" title="Copy to clipboard">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                    <button class="card-action-btn btn-tweet" title="Tweet this update">
                        <i class="fa-brands fa-x-twitter"></i>
                    </button>
                    <a href="${note.link}" target="_blank" class="card-action-btn" title="View official release notes page">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a>
                </div>
            </div>
            <div class="release-body">
                ${note.content}
            </div>
        `;
        
        // Attach event listener to Copy button
        card.querySelector('.btn-copy').addEventListener('click', (e) => {
            const rawContent = stripHtml(note.content).trim();
            const categoriesStr = note.categories.join(', ');
            const textToCopy = `Google Cloud BigQuery Update (${note.title})\nCategories: ${categoriesStr}\nLink: ${note.link}\n\n${rawContent}`;
            
            navigator.clipboard.writeText(textToCopy).then(() => {
                const icon = e.currentTarget.querySelector('i');
                icon.className = 'fa-solid fa-check';
                icon.style.color = 'var(--color-feature)';
                setTimeout(() => {
                    icon.className = 'fa-solid fa-copy';
                    icon.style.color = '';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });
        
        // Attach event listener to Tweet button
        card.querySelector('.btn-tweet').addEventListener('click', () => openTweetModal(note));
        
        feedContainer.appendChild(card);
    });
}

// Search and clear inputs
function handleSearch(e) {
    searchKeyword = e.target.value.trim().toLowerCase();
    
    if (searchKeyword.length > 0) {
        searchClearBtn.style.display = 'block';
    } else {
        searchClearBtn.style.display = 'none';
    }
    
    applyFilters();
}

function clearSearch() {
    searchInput.value = '';
    searchKeyword = '';
    searchClearBtn.style.display = 'none';
    applyFilters();
}

function resetFilters() {
    clearSearch();
    activeCategory = 'all';
    
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.filter-btn[data-category="all"]').classList.add('active');
    
    applyFilters();
}

// Show/Hide page states
function showState(state) {
    loadingState.style.display = state === 'loading' ? 'flex' : 'none';
    errorState.style.display = state === 'error' ? 'flex' : 'none';
    emptyState.style.display = state === 'empty' ? 'flex' : 'none';
    feedContainer.style.display = state === 'feed' ? 'flex' : 'none';
}

// Strip HTML tags for clean summaries/searches
function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

// Modal Interaction & Formatting
function openTweetModal(note) {
    selectedNote = note;
    
    modalSourceTitle.textContent = note.title;
    
    // Extract the raw text to formulate a clean snippet
    const rawContent = stripHtml(note.content);
    // clean up whitespace
    const cleanContent = rawContent.replace(/\s+/g, ' ').trim();
    modalSourceSummary.textContent = cleanContent;
    
    // Draft the default Tweet
    const maxSnippetLength = 140;
    let snippet = cleanContent;
    if (snippet.length > maxSnippetLength) {
        snippet = snippet.substring(0, maxSnippetLength) + '...';
    }
    
    const defaultText = `Google Cloud BigQuery Update (${note.title}):\n\n"${snippet}"\n\nDetails: ${note.link}\n#BigQuery #GoogleCloud`;
    
    tweetTextarea.value = defaultText;
    updateCharCount();
    
    tweetModal.classList.add('open');
}

function closeTweetModal() {
    tweetModal.classList.remove('open');
    selectedNote = null;
}

function updateCharCount() {
    const count = tweetTextarea.value.length;
    charCount.textContent = count;
    
    // Character limit classes
    charCount.classList.remove('warning', 'danger');
    if (count > 280) {
        charCount.classList.add('danger');
        modalTweetBtn.classList.add('disabled');
    } else if (count > 250) {
        charCount.classList.add('warning');
        modalTweetBtn.classList.remove('disabled');
    } else {
        modalTweetBtn.classList.remove('disabled');
    }
}

// Custom Tweet Composer Functions
function appendDefaultHashtags() {
    let currentText = tweetTextarea.value;
    const tags = ['#GCP', '#DataEngineering', '#Analytics'];
    
    tags.forEach(tag => {
        if (!currentText.includes(tag)) {
            currentText += ` ${tag}`;
        }
    });
    
    tweetTextarea.value = currentText.trim();
    updateCharCount();
}

function toggleLinkInTweet() {
    if (!selectedNote) return;
    
    let currentText = tweetTextarea.value;
    const link = selectedNote.link;
    
    if (currentText.includes(link)) {
        // Remove link
        currentText = currentText.replace(`Details: ${link}`, '').replace(link, '').trim();
    } else {
        // Add link
        currentText += `\n\nDetails: ${link}`;
    }
    
    tweetTextarea.value = currentText;
    updateCharCount();
}

async function copyTweetToClipboard() {
    try {
        await navigator.clipboard.writeText(tweetTextarea.value);
        
        // Show temporary visual feedback
        const originalHtml = btnCopyTweet.innerHTML;
        btnCopyTweet.innerHTML = '<i class="fa-solid fa-check" style="color: #10b981;"></i>';
        btnCopyTweet.setAttribute('title', 'Copied!');
        
        setTimeout(() => {
            btnCopyTweet.innerHTML = originalHtml;
            btnCopyTweet.setAttribute('title', 'Copy Tweet');
        }, 2000);
    } catch (err) {
        console.error('Clipboard copy failed: ', err);
    }
}

function handleTweetRedirect(e) {
    if (tweetTextarea.value.length > 280) {
        e.preventDefault();
        return;
    }
    
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetTextarea.value)}`;
    modalTweetBtn.setAttribute('href', tweetUrl);
}

// Export current filtered notes to CSV
function exportToCSV() {
    if (filteredNotes.length === 0) {
        alert('No notes available to export.');
        return;
    }
    
    // CSV headers
    const headers = ['Date/Title', 'Link', 'Categories', 'Content'];
    
    // Map rows
    const rows = filteredNotes.map(note => {
        const title = note.title.replace(/"/g, '""');
        const link = note.link.replace(/"/g, '""');
        const categories = note.categories.join(', ').replace(/"/g, '""');
        const content = stripHtml(note.content).replace(/\s+/g, ' ').trim().replace(/"/g, '""');
        
        return `"${title}","${link}","${categories}","${content}"`;
    });
    
    // Join header and rows
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bigquery_release_notes_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Theme Toggle Logic
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    updateThemeIcon(isLight);
}

function updateThemeIcon(isLight) {
    if (isLight) {
        themeIcon.className = 'fa-solid fa-moon';
        themeToggleBtn.setAttribute('title', 'Switch to Dark Mode');
    } else {
        themeIcon.className = 'fa-solid fa-sun';
        themeToggleBtn.setAttribute('title', 'Switch to Light Mode');
    }
}

// Initialize Theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    
    const useLight = savedTheme === 'light' || (!savedTheme && systemPrefersLight);
    
    if (useLight) {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
    updateThemeIcon(useLight);
}
