const statusEl = document.getElementById('status');
const listEl = document.getElementById('links-list');
const countEl = document.getElementById('link-count');
const exportButtonEl = document.getElementById('export-csv');
const searchInputEl = document.getElementById('link-search');

let allLinks = [];
let filteredLinks = [];
let currentQuery = '';
let currentPageUrl = '';

exportButtonEl.addEventListener('click', handleExportClick);
searchInputEl.addEventListener('input', handleSearchInput);

initialize();

async function initialize() {
  try {
    setLoadingState();

    const tab = await getActiveTab();
    if (!tab?.id || !tab.url) {
      throw new Error('No active tab found.');
    }

    currentPageUrl = tab.url;

    const links = await extractLinksFromTab(tab.id);
    renderLinks(links);
  } catch (error) {
    renderError(getUserFriendlyError(error));
  }
}

function setLoadingState() {
  allLinks = [];
  filteredLinks = [];
  currentQuery = '';
  searchInputEl.value = '';
  searchInputEl.disabled = true;
  statusEl.textContent = 'Scanning page links...';
  statusEl.classList.remove('hidden');
  listEl.classList.add('hidden');
  countEl.textContent = 'Scanning page links...';
  exportButtonEl.disabled = true;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function extractLinksFromTab(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const anchors = document.querySelectorAll('a[href]');
      const seen = new Set();
      const links = [];

      for (const anchor of anchors) {
        const url = anchor.href;
        if (!url || seen.has(url)) {
          continue;
        }

        seen.add(url);
        const text = (anchor.textContent || '').trim() || '(no text)';
        const title = (anchor.getAttribute('title') || '').trim();

        links.push({ url, text, title });
      }

      return links;
    }
  });

  return results?.[0]?.result ?? [];
}

function renderLinks(links) {
  allLinks = links;
  currentQuery = '';
  searchInputEl.value = '';
  searchInputEl.disabled = !allLinks.length;

  if (!allLinks.length) {
    filteredLinks = [];
    listEl.innerHTML = '';
    statusEl.textContent = 'No links found on this page.';
    statusEl.classList.remove('hidden');
    listEl.classList.add('hidden');
    countEl.textContent = '0 links';
    exportButtonEl.disabled = true;
    return;
  }

  applyFilterAndRender();
}

function handleSearchInput() {
  currentQuery = searchInputEl.value.trim();
  applyFilterAndRender();
}

function applyFilterAndRender() {
  filteredLinks = filterLinks(allLinks, currentQuery);
  listEl.innerHTML = '';

  if (!filteredLinks.length) {
    statusEl.textContent = 'No links match your search.';
    statusEl.classList.remove('hidden');
    listEl.classList.add('hidden');
    countEl.textContent = `0 of ${allLinks.length} links`;
    exportButtonEl.disabled = true;
    return;
  }

  const hasQuery = Boolean(currentQuery);
  countEl.textContent = hasQuery
    ? `${filteredLinks.length} of ${allLinks.length} links`
    : `${allLinks.length} ${allLinks.length === 1 ? 'link' : 'links'}`;
  statusEl.classList.add('hidden');
  listEl.classList.remove('hidden');
  exportButtonEl.disabled = false;

  for (const link of filteredLinks) {
    const item = document.createElement('li');
    item.className = 'link-item';

    const button = document.createElement('button');
    button.type = 'button';
    button.title = link.title || link.url;
    button.addEventListener('click', () => {
      chrome.tabs.create({ url: link.url });
    });

    const textSpan = document.createElement('span');
    textSpan.className = 'link-text';
    textSpan.textContent = link.text;

    const urlSpan = document.createElement('span');
    urlSpan.className = 'link-url';
    urlSpan.textContent = link.url;

    button.append(textSpan, urlSpan);
    item.appendChild(button);
    listEl.appendChild(item);
  }
}

function filterLinks(links, query) {
  if (!query) {
    return links;
  }

  const normalizedQuery = query.toLowerCase();
  return links.filter((link) => {
    const text = String(link.text || '').toLowerCase();
    const title = String(link.title || '').toLowerCase();
    const url = String(link.url || '').toLowerCase();
    return text.includes(normalizedQuery) || title.includes(normalizedQuery) || url.includes(normalizedQuery);
  });
}

function renderError(message) {
  allLinks = [];
  filteredLinks = [];
  currentQuery = '';
  searchInputEl.value = '';
  searchInputEl.disabled = true;
  listEl.classList.add('hidden');
  statusEl.classList.remove('hidden');
  statusEl.textContent = message;
  countEl.textContent = 'Unable to read links';
  exportButtonEl.disabled = true;
}

function handleExportClick() {
  if (!filteredLinks.length) {
    return;
  }

  const csv = buildCsv(filteredLinks, currentPageUrl);
  const filename = `linkist-links-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsv(csv, filename);
}

function buildCsv(links, pageUrl) {
  const header = ['text', 'url', 'title', 'page_url'];
  const rows = links.map((link) => [
    escapeCsvCell(link.text),
    escapeCsvCell(link.url),
    escapeCsvCell(link.title),
    escapeCsvCell(pageUrl)
  ]);

  return [header.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
}

function escapeCsvCell(value) {
  const normalized = String(value ?? '');
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
}

function downloadCsv(csvText, filename) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getUserFriendlyError(error) {
  const raw = String(error?.message || error || '');

  if (
    raw.includes('Cannot access') ||
    raw.includes('Cannot read') ||
    raw.includes('chrome://') ||
    raw.includes('The extensions gallery cannot be scripted')
  ) {
    return 'Unable to access this page. Try a standard website tab (http or https).';
  }

  return 'Could not scan links on this page.';
}
