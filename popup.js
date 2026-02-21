const statusEl = document.getElementById('status');
const listEl = document.getElementById('links-list');
const countEl = document.getElementById('link-count');

initialize();

async function initialize() {
  try {
    setLoadingState();

    const tab = await getActiveTab();
    if (!tab?.id || !tab.url) {
      throw new Error('No active tab found.');
    }

    const links = await extractLinksFromTab(tab.id);
    renderLinks(links);
  } catch (error) {
    renderError(getUserFriendlyError(error));
  }
}

function setLoadingState() {
  statusEl.textContent = 'Scanning page links...';
  statusEl.classList.remove('hidden');
  listEl.classList.add('hidden');
  countEl.textContent = 'Scanning page links...';
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
  listEl.innerHTML = '';

  if (!links.length) {
    statusEl.textContent = 'No links found on this page.';
    statusEl.classList.remove('hidden');
    listEl.classList.add('hidden');
    countEl.textContent = '0 links';
    return;
  }

  countEl.textContent = `${links.length} ${links.length === 1 ? 'link' : 'links'}`;
  statusEl.classList.add('hidden');
  listEl.classList.remove('hidden');

  for (const link of links) {
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

function renderError(message) {
  listEl.classList.add('hidden');
  statusEl.classList.remove('hidden');
  statusEl.textContent = message;
  countEl.textContent = 'Unable to read links';
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