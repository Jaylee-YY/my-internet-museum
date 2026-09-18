const STORAGE_KEY = "my-internet-museum-demo-v1";

const seedExhibits = [
  {
    id: "demo-001",
    title: "Progressive Web Apps：让网站像 App 一样安装",
    url: "https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps",
    platform: "Website",
    collection: "Product Learning",
    tags: ["PWA", "Web开发"],
    whySaved: "了解网页安装、离线体验和移动端能力。",
    favorite: true,
    createdAt: "2026-09-18",
    coverStyle: "cover-blue",
    coverLabel: "PWA\nGUIDE"
  },
  {
    id: "demo-002",
    title: "Supabase Documentation",
    url: "https://supabase.com/docs",
    platform: "Website",
    collection: "Product Learning",
    tags: ["Database", "Web开发"],
    whySaved: "学习数据库、登录和文件存储。",
    favorite: false,
    createdAt: "2026-09-17",
    coverStyle: "cover-sage",
    coverLabel: "SUPABASE\nDOCS"
  },
  {
    id: "demo-003",
    title: "GitHub Pages 入门指南",
    url: "https://docs.github.com/en/pages/getting-started-with-github-pages",
    platform: "Website",
    collection: "Portfolio",
    tags: ["GitHub", "部署"],
    whySaved: "整理作品集网站的发布方式。",
    favorite: true,
    createdAt: "2026-09-16",
    coverStyle: "cover-ink",
    coverLabel: "GITHUB\nPAGES"
  },
  {
    id: "demo-004",
    title: "Designing Interfaces",
    url: "https://www.designinginterfaces.com/",
    platform: "Website",
    collection: "Design Inspiration",
    tags: ["UI设计", "设计灵感"],
    whySaved: "收集界面设计模式与交互参考。",
    favorite: false,
    createdAt: "2026-09-15",
    coverStyle: "cover-lilac",
    coverLabel: "INTERFACE\nDESIGN"
  },
  {
    id: "demo-005",
    title: "Web Content Accessibility Guidelines",
    url: "https://www.w3.org/WAI/standards-guidelines/wcag/",
    platform: "Website",
    collection: "Product Learning",
    tags: ["Accessibility", "Web开发"],
    whySaved: "检查产品是否对更多用户友好。",
    favorite: false,
    createdAt: "2026-09-14",
    coverStyle: "cover-sand",
    coverLabel: "ACCESSIBLE\nWEB"
  }
];

const initialCollections = ["Product Learning", "Portfolio", "Design Inspiration"];
const coverStyles = ["cover-ink", "cover-blue", "cover-sky", "cover-paper", "cover-blush", "cover-sage", "cover-sand", "cover-lilac"];

let state = loadState();
let currentRoute = "museum";
let currentSearch = "";
let currentPlatform = "all";
let selectedMuseumCollection = "all";
let selectedTagsPageTag = "AI工具";
let favoritesOnly = false;
let tagBatchMode = false;
let selectedBatchTags = new Set();
let pendingCoverData = "";
let pendingCoverStyle = "cover-paper";
let editingTags = [];
let metadataTimer;
let metadataRequestId = 0;
let toastTimer;

const elements = {
  routes: [...document.querySelectorAll("[data-route-view]")],
  navLinks: [...document.querySelectorAll(".nav-link")],
  universalInput: document.querySelector("#universal-input"),
  inputHint: document.querySelector("#input-hint"),
  pasteAndCollect: document.querySelector("#paste-and-collect"),
  resetDemo: document.querySelector("#reset-demo"),
  platformFilter: document.querySelector("#platform-filter"),
  tagShortcuts: document.querySelector("#tag-shortcuts"),
  tagSections: document.querySelector("#tag-sections"),
  favoritesFilter: document.querySelector("#favorites-filter"),
  collectionGrid: document.querySelector("#collection-grid"),
  collectionCount: document.querySelector("#collection-count"),
  tagIndex: document.querySelector("#tag-index"),
  selectedTagTitle: document.querySelector("#selected-tag-title"),
  selectedTagCount: document.querySelector("#selected-tag-count"),
  tagResultGrid: document.querySelector("#tag-result-grid"),
  batchManageTags: document.querySelector("#batch-manage-tags"),
  tagBatchToolbar: document.querySelector("#tag-batch-toolbar"),
  tagBatchCount: document.querySelector("#tag-batch-count"),
  deleteSelectedTags: document.querySelector("#delete-selected-tags"),
  formDialog: document.querySelector("#exhibit-form-dialog"),
  detailDialog: document.querySelector("#detail-dialog"),
  detailContent: document.querySelector("#detail-content"),
  form: document.querySelector("#exhibit-form"),
  formTitle: document.querySelector("#form-title"),
  id: document.querySelector("#exhibit-id"),
  url: document.querySelector("#exhibit-url"),
  platform: document.querySelector("#exhibit-platform"),
  title: document.querySelector("#exhibit-title-input"),
  collection: document.querySelector("#exhibit-collection"),
  collectionOptions: document.querySelector("#collection-options"),
  tagInput: document.querySelector("#exhibit-tag-input"),
  tagOptions: document.querySelector("#tag-options"),
  selectedTagChips: document.querySelector("#selected-tag-chips"),
  why: document.querySelector("#exhibit-why"),
  favorite: document.querySelector("#exhibit-favorite"),
  urlFeedback: document.querySelector("#url-feedback"),
  coverFile: document.querySelector("#cover-file"),
  coverPreviewImage: document.querySelector("#cover-preview-image"),
  coverPreviewPlaceholder: document.querySelector("#cover-preview-placeholder"),
  coverPreviewLabel: document.querySelector("#cover-preview-label"),
  collectionDialog: document.querySelector("#collection-dialog"),
  collectionForm: document.querySelector("#collection-form"),
  newCollectionName: document.querySelector("#new-collection-name"),
  tagDialog: document.querySelector("#tag-dialog"),
  tagForm: document.querySelector("#tag-form"),
  tagDialogTitle: document.querySelector("#tag-dialog-title"),
  originalTagName: document.querySelector("#original-tag-name"),
  tagName: document.querySelector("#tag-name"),
  toast: document.querySelector("#toast")
};

init();

function init() {
  bindEvents();
  renderAll();
  routeFromHash();
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.exhibits?.length) {
      const exhibits = saved.exhibits.map((item) => ({ ...item, tags: Array.isArray(item.tags) ? item.tags : [] }));
      return {
        exhibits,
        collections: Array.isArray(saved.collections) ? saved.collections.filter(Boolean) : [...initialCollections],
        tags: Array.from(new Set([...(saved.tags || []), ...exhibits.flatMap((item) => item.tags)]))
      };
    }
  } catch (error) {
    console.warn("Could not load saved Museum data", error);
  }
  const exhibits = structuredClone(seedExhibits);
  return {
    exhibits,
    collections: [...initialCollections],
    tags: Array.from(new Set(exhibits.flatMap((item) => item.tags)))
  };
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    showToast("保存空间不足，请换一张更小的封面图片。");
    throw error;
  }
}

function bindEvents() {
  window.addEventListener("hashchange", routeFromHash);

  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.route));
  });

  document.querySelector("#focus-search").addEventListener("click", () => {
    navigate("museum");
    requestAnimationFrame(() => elements.universalInput.focus());
  });

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      navigate("museum");
      elements.universalInput.focus();
    }
    if (event.key === "Escape") {
      [elements.formDialog, elements.detailDialog, elements.collectionDialog, elements.tagDialog].forEach((dialog) => {
        if (dialog.open) dialog.close();
      });
    }
  });

  elements.universalInput.addEventListener("input", () => {
    const value = elements.universalInput.value.trim();
    elements.inputHint.textContent = extractUrl(value) ? "添加 ↗" : "⌘ K";
    if (!extractUrl(value)) {
      currentSearch = value.toLowerCase();
      renderMuseum();
    }
  });

  elements.universalInput.addEventListener("paste", (event) => {
    const pastedText = event.clipboardData?.getData("text") || "";
    const url = extractUrl(pastedText);
    if (!url) return;
    event.preventDefault();
    elements.universalInput.value = pastedText;
    openPastedLink(pastedText);
  });

  elements.universalInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const value = elements.universalInput.value.trim();
      const url = extractUrl(value);
      if (url) openForm({ sharedText: value, url });
      else {
        currentSearch = value.toLowerCase();
        renderMuseum();
      }
    }
  });

  elements.pasteAndCollect.addEventListener("click", pasteFromClipboard);
  elements.resetDemo.addEventListener("click", resetDemoData);

  elements.platformFilter.addEventListener("change", () => {
    currentPlatform = elements.platformFilter.value;
    renderMuseum();
  });

  elements.favoritesFilter.addEventListener("click", () => {
    favoritesOnly = !favoritesOnly;
    elements.favoritesFilter.setAttribute("aria-pressed", String(favoritesOnly));
    renderAll();
    showToast(favoritesOnly ? "只显示 Favorite" : "显示全部收藏");
  });

  document.querySelector("#add-exhibit").addEventListener("click", () => openForm());
  document.querySelectorAll(".close-dialog").forEach((button) => button.addEventListener("click", () => elements.formDialog.close()));
  document.querySelectorAll(".close-collection-dialog").forEach((button) => button.addEventListener("click", () => elements.collectionDialog.close()));

  elements.url.addEventListener("input", () => {
    const url = extractUrl(elements.url.value);
    clearTimeout(metadataTimer);
    if (url) {
      const platform = detectPlatform(url);
      elements.platform.value = platform;
      elements.urlFeedback.textContent = `已识别为 ${platform}，准备抓取标题和封面…`;
      if (!elements.title.value.trim()) elements.title.value = suggestTitle(elements.url.value);
      syncCoverLabel();
      metadataTimer = setTimeout(() => fetchLinkMetadata(url), 650);
    } else {
      elements.urlFeedback.textContent = "粘贴后会自动识别 Platform。";
    }
  });

  elements.title.addEventListener("input", syncCoverLabel);
  document.querySelector("#add-tag-to-exhibit").addEventListener("click", addTagFromInput);
  elements.tagInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === "," || event.key === "，") {
      event.preventDefault();
      addTagFromInput();
    }
  });
  elements.coverFile.addEventListener("change", handleCoverUpload);
  document.querySelector("#fetch-cover").addEventListener("click", () => {
    const url = extractUrl(elements.url.value);
    if (url) fetchLinkMetadata(url, true);
    else showToast("请先粘贴一个有效链接");
  });
  document.querySelector("#generate-cover").addEventListener("click", generateLayoutCover);
  document.querySelector("#clear-cover").addEventListener("click", clearCover);
  elements.form.addEventListener("submit", saveExhibit);

  document.querySelector("#new-collection").addEventListener("click", () => {
    elements.newCollectionName.value = "";
    elements.collectionDialog.showModal();
  });
  elements.collectionForm.addEventListener("submit", saveCollection);

  document.querySelector("#new-tag").addEventListener("click", () => openTagDialog());
  elements.batchManageTags.addEventListener("click", () => setTagBatchMode(true));
  document.querySelector("#cancel-tag-batch").addEventListener("click", () => setTagBatchMode(false));
  document.querySelector("#select-all-tags").addEventListener("click", selectAllTags);
  elements.deleteSelectedTags.addEventListener("click", deleteSelectedTags);
  document.querySelectorAll(".close-tag-dialog").forEach((button) => button.addEventListener("click", () => elements.tagDialog.close()));
  elements.tagForm.addEventListener("submit", saveTag);

  elements.formDialog.addEventListener("click", closeOnBackdrop);
  elements.detailDialog.addEventListener("click", closeOnBackdrop);
  elements.collectionDialog.addEventListener("click", closeOnBackdrop);
  elements.tagDialog.addEventListener("click", closeOnBackdrop);
}

function routeFromHash() {
  const route = location.hash.replace("#", "") || "museum";
  showRoute(["museum", "collections", "tags"].includes(route) ? route : "museum");
}

function navigate(route) {
  if (location.hash === `#${route}`) showRoute(route);
  else location.hash = route;
}

function showRoute(route) {
  currentRoute = route;
  elements.routes.forEach((view) => {
    const active = view.dataset.routeView === route;
    view.hidden = !active;
    view.classList.toggle("is-active", active);
  });
  elements.navLinks.forEach((link) => link.classList.toggle("is-active", link.dataset.route === route));
  if (route === "collections") renderCollections();
  if (route === "tags") renderTagsPage();
  document.querySelector("#app").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAll() {
  renderMuseum();
  renderCollections();
  renderTagsPage();
  renderCollectionOptions();
  renderTagOptions();
}

function getFilteredExhibits() {
  return state.exhibits.filter((item) => {
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const searchable = [item.title, item.collection, item.whySaved, item.platform, ...tags].join(" ").toLowerCase();
    return (!currentSearch || searchable.includes(currentSearch)) &&
      (currentPlatform === "all" || item.platform === currentPlatform) &&
      (!favoritesOnly || item.favorite) &&
      (selectedMuseumCollection === "all" || item.collection === selectedMuseumCollection);
  });
}

function renderMuseum() {
  if (selectedMuseumCollection !== "all" && !state.collections.includes(selectedMuseumCollection)) selectedMuseumCollection = "all";
  const shortcuts = ["all", ...state.collections.filter(Boolean)];
  elements.tagShortcuts.innerHTML = shortcuts.map((collection) => {
    const label = collection === "all" ? "全部收藏" : escapeHtml(collection);
    return `<button class="tag-shortcut ${selectedMuseumCollection === collection ? "is-active" : ""}" type="button" data-shortcut-collection="${escapeAttr(collection)}">${label}</button>`;
  }).join("");

  elements.tagShortcuts.querySelectorAll("[data-shortcut-collection]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMuseumCollection = button.dataset.shortcutCollection;
      renderMuseum();
    });
  });

  const filtered = getFilteredExhibits();
  if (!filtered.length) {
    elements.tagSections.innerHTML = `<div class="empty-state"><strong>没有找到相关 Exhibit</strong><span>换一个关键词、Tag 或 Platform 试试。</span></div>`;
    return;
  }

  const heading = selectedMuseumCollection === "all" ? "全部收藏" : escapeHtml(selectedMuseumCollection);
  const helper = selectedMuseumCollection === "all"
    ? "所有 Exhibit 都会保存在这里，包括暂时没有 Tag 的链接。"
    : `这个 Collection 中共有 ${countLabel(filtered.length)}。`;
  elements.tagSections.innerHTML = `
    <section class="tag-section all-exhibits-section">
      <div class="section-heading section-heading--stacked">
        <div><h2>${heading}</h2><span>${countLabel(filtered.length)}</span></div>
        <p>${helper}</p>
      </div>
      <div class="exhibit-grid">${filtered.map(exhibitCard).join("")}</div>
    </section>`;

  bindCardClicks(elements.tagSections);
}

function exhibitCard(item) {
  const titleSize = item.title.length > 34 ? "is-very-long" : item.title.length > 20 ? "is-long" : "";
  const cover = `
    ${item.coverData ? `<img src="${item.coverData}" alt="" /><span class="cover-image-shade"></span>` : `<span class="cover-paper-texture"></span>`}
    <span class="cover-kicker">${escapeHtml(item.platform)}${item.collection ? ` · ${escapeHtml(item.collection)}` : ""}</span>
    <span class="editorial-cover-title ${titleSize}">${escapeHtml(item.title)}</span>
    <span class="cover-number">${escapeHtml(item.id)}</span>`;
  return `
    <button class="exhibit-card" type="button" data-exhibit-id="${escapeAttr(item.id)}">
      <span class="exhibit-cover ${escapeAttr(item.coverStyle || "cover-paper")}">
        ${item.favorite ? `<span class="favorite-mark" aria-label="Favorite">♥</span>` : ""}
        ${cover}
      </span>
      <span class="exhibit-meta"><span>${escapeHtml(item.collection || "未分类")}</span><span>·</span><span>${formatDate(item.createdAt)}</span></span>
      <span class="exhibit-tags ${item.tags.length ? "" : "is-empty"}">${item.tags.length ? item.tags.slice(0, 3).map((tag) => `#${escapeHtml(tag)}`).join(" · ") : "暂未添加 Tag"}</span>
    </button>`;
}

function bindCardClicks(container) {
  container.querySelectorAll("[data-exhibit-id]").forEach((card) => {
    card.addEventListener("click", () => openDetail(card.dataset.exhibitId));
  });
}

function renderCollections() {
  const collections = state.collections.filter(Boolean);
  elements.collectionCount.textContent = collections.length;
  elements.collectionGrid.innerHTML = collections.map((name, index) => {
    const items = state.exhibits.filter((item) => item.collection === name && (!favoritesOnly || item.favorite));
    const previewItems = items.slice(0, 4);
    const tiles = previewItems.length
      ? previewItems.map((item, tileIndex) => collectionTile(item, tileIndex)).join("")
      : `<span class="collection-empty-tile ${coverStyles[index % coverStyles.length]}"><span>EMPTY ROOM</span></span>`;
    return `
      <article class="collection-card">
        <button class="collection-card-main" type="button" data-collection-name="${escapeAttr(name)}">
          <span class="collection-card-cover collection-tiles-${Math.min(previewItems.length, 4)}">${tiles}</span>
          <span class="collection-card-copy"><strong>${escapeHtml(name)}</strong><small>${countLabel(items.length)}</small></span>
        </button>
        <button class="collection-menu-button" type="button" data-delete-collection="${escapeAttr(name)}" aria-label="删除 Collection ${escapeAttr(name)}">···</button>
      </article>`;
  }).join("");

  elements.collectionGrid.querySelectorAll("[data-collection-name]").forEach((card) => {
    card.addEventListener("click", () => {
      currentSearch = "";
      elements.universalInput.value = "";
      selectedMuseumCollection = card.dataset.collectionName;
      navigate("museum");
      renderMuseum();
    });
  });

  elements.collectionGrid.querySelectorAll("[data-delete-collection]").forEach((button) => {
    button.addEventListener("click", () => deleteCollection(button.dataset.deleteCollection));
  });
}

function collectionTile(item, index) {
  const shortTitle = item.title.length > 22 ? `${item.title.slice(0, 22)}…` : item.title;
  return `
    <span class="collection-tile ${escapeAttr(item.coverStyle || coverStyles[index % coverStyles.length])}">
      ${item.coverData ? `<img src="${item.coverData}" alt="" />` : `<span class="collection-tile-text">${escapeHtml(shortTitle)}</span>`}
    </span>`;
}

function deleteCollection(name) {
  const count = state.exhibits.filter((item) => item.collection === name).length;
  if (!window.confirm(`删除 Collection“${name}”？其中的 ${count} 个 Exhibits 不会被删除，将保留在“全部收藏”中。`)) return;
  state.collections = state.collections.filter((collection) => collection !== name);
  state.exhibits.forEach((item) => {
    if (item.collection === name) item.collection = "";
  });
  if (selectedMuseumCollection === name) selectedMuseumCollection = "all";
  persist();
  renderAll();
  showToast("Collection 已删除，Exhibits 已保留在全部收藏");
}

function renderTagsPage() {
  const source = state.exhibits.filter((item) => !favoritesOnly || item.favorite);
  const counts = getTagCounts(source);
  const tags = Array.from(new Set([...(state.tags || []), ...Object.keys(counts)]))
    .sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b, "zh-CN"));
  selectedBatchTags = new Set([...selectedBatchTags].filter((tag) => tags.includes(tag)));
  if (!tags.includes(selectedTagsPageTag)) selectedTagsPageTag = tags[0] || "";

  elements.tagBatchToolbar.hidden = !tagBatchMode;
  elements.batchManageTags.hidden = tagBatchMode;
  updateTagBatchToolbar();

  elements.tagIndex.innerHTML = tags.length ? tags.map((tag) => tagBatchMode ? `
    <label class="tag-batch-row">
      <input type="checkbox" data-batch-tag="${escapeAttr(tag)}" ${selectedBatchTags.has(tag) ? "checked" : ""} />
      <span>#${escapeHtml(tag)}</span><small>${counts[tag] || 0}</small>
    </label>` : `
      <div class="tag-index-row">
        <button class="tag-index-button ${selectedTagsPageTag === tag ? "is-active" : ""}" type="button" data-index-tag="${escapeAttr(tag)}">
          <span>#${escapeHtml(tag)}</span><span>${counts[tag] || 0}</span>
        </button>
        <div class="tag-index-actions">
          <button type="button" data-rename-tag="${escapeAttr(tag)}" aria-label="重命名 ${escapeAttr(tag)}">编辑</button>
          <button type="button" data-delete-tag="${escapeAttr(tag)}" aria-label="删除 ${escapeAttr(tag)}">删除</button>
        </div>
      </div>`).join("") : `<p class="tag-index-empty">还没有 Tag。点击“新建 Tag”开始整理。</p>`;

  elements.tagIndex.querySelectorAll("[data-batch-tag]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedBatchTags.add(checkbox.dataset.batchTag);
      else selectedBatchTags.delete(checkbox.dataset.batchTag);
      updateTagBatchToolbar();
    });
  });

  elements.tagIndex.querySelectorAll("[data-index-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedTagsPageTag = button.dataset.indexTag;
      renderTagsPage();
    });
  });

  elements.tagIndex.querySelectorAll("[data-rename-tag]").forEach((button) => {
    button.addEventListener("click", () => openTagDialog(button.dataset.renameTag));
  });

  elements.tagIndex.querySelectorAll("[data-delete-tag]").forEach((button) => {
    button.addEventListener("click", () => deleteTag(button.dataset.deleteTag));
  });

  const results = source.filter((item) => item.tags.includes(selectedTagsPageTag));
  elements.selectedTagTitle.textContent = selectedTagsPageTag ? `#${selectedTagsPageTag}` : "还没有 Tag";
  elements.selectedTagCount.textContent = countLabel(results.length);
  elements.tagResultGrid.innerHTML = results.length
    ? results.map(exhibitCard).join("")
    : `<div class="empty-state compact-empty"><strong>这个 Tag 还是空的</strong><span>编辑 Exhibit 时可以把它添加进去。</span></div>`;
  bindCardClicks(elements.tagResultGrid);
}

function setTagBatchMode(active) {
  tagBatchMode = active;
  selectedBatchTags.clear();
  renderTagsPage();
}

function selectAllTags() {
  const allTags = Array.from(new Set([...(state.tags || []), ...state.exhibits.flatMap((item) => item.tags || [])]));
  if (selectedBatchTags.size === allTags.length) selectedBatchTags.clear();
  else selectedBatchTags = new Set(allTags);
  renderTagsPage();
}

function updateTagBatchToolbar() {
  const count = selectedBatchTags.size;
  elements.tagBatchCount.textContent = `已选择 ${count} 个 Tag`;
  elements.deleteSelectedTags.disabled = count === 0;
  elements.deleteSelectedTags.textContent = count ? `删除已选 Tag（${count}）` : "删除已选 Tag";
}

function deleteSelectedTags() {
  const tags = [...selectedBatchTags];
  if (!tags.length) return;
  const affected = state.exhibits.filter((item) => item.tags.some((tag) => selectedBatchTags.has(tag))).length;
  if (!window.confirm(`删除选中的 ${tags.length} 个 Tags？这会从 ${affected} 个 Exhibits 中移除这些 Tags，但不会删除 Exhibits。`)) return;
  state.tags = (state.tags || []).filter((tag) => !selectedBatchTags.has(tag));
  state.exhibits.forEach((item) => { item.tags = item.tags.filter((tag) => !selectedBatchTags.has(tag)); });
  selectedBatchTags.clear();
  tagBatchMode = false;
  selectedTagsPageTag = "";
  persist();
  renderAll();
  showToast("所选 Tags 已删除，Exhibits 保持不变");
}

function renderCollectionOptions() {
  elements.collectionOptions.innerHTML = state.collections.map((name) => `<option value="${escapeAttr(name)}"></option>`).join("");
}

function renderTagOptions() {
  elements.tagOptions.innerHTML = (state.tags || [])
    .slice()
    .sort((a, b) => a.localeCompare(b, "zh-CN"))
    .map((tag) => `<option value="${escapeAttr(tag)}"></option>`)
    .join("");
}

function openForm(options = {}) {
  clearTimeout(metadataTimer);
  metadataRequestId += 1;
  elements.form.reset();
  elements.id.value = "";
  elements.formTitle.textContent = "添加 Exhibit";
  elements.urlFeedback.textContent = "粘贴后会自动识别 Platform，并尝试抓取标题与封面。";
  pendingCoverData = "";
  pendingCoverStyle = coverStyles[state.exhibits.length % coverStyles.length];
  editingTags = [];
  renderEditingTags();
  clearCover(false);

  if (options.url) {
    elements.url.value = options.url;
    elements.platform.value = detectPlatform(options.url);
    elements.urlFeedback.textContent = `已识别为 ${elements.platform.value}，正在抓取标题和封面…`;
    elements.title.value = suggestTitle(options.sharedText || "");
  }
  syncCoverLabel();
  elements.formDialog.showModal();
  requestAnimationFrame(() => (options.url ? elements.tagInput : elements.url).focus());
  if (options.url) fetchLinkMetadata(options.url);
}

function openPastedLink(text) {
  const value = String(text || "").trim();
  const url = extractUrl(value);
  if (!url) {
    showToast("没有识别到链接，请复制链接后再试");
    return;
  }
  openForm({ sharedText: value, url });
  elements.universalInput.value = "";
  currentSearch = "";
}

async function pasteFromClipboard() {
  if (!navigator.clipboard?.readText) {
    elements.universalInput.focus();
    showToast("请在搜索框中粘贴链接");
    return;
  }

  const originalLabel = elements.pasteAndCollect.textContent;
  elements.pasteAndCollect.disabled = true;
  elements.pasteAndCollect.textContent = "读取中…";
  try {
    const text = await navigator.clipboard.readText();
    openPastedLink(text);
  } catch {
    elements.universalInput.focus();
    showToast("浏览器未允许读取剪贴板，请手动粘贴");
  } finally {
    elements.pasteAndCollect.disabled = false;
    elements.pasteAndCollect.textContent = originalLabel;
  }
}

function resetDemoData() {
  if (!window.confirm("恢复 5 条示例内容？当前浏览器中的 Demo 修改将被清除。")) return;
  state = {
    exhibits: structuredClone(seedExhibits),
    collections: [...initialCollections],
    tags: Array.from(new Set(seedExhibits.flatMap((item) => item.tags)))
  };
  currentSearch = "";
  currentPlatform = "all";
  selectedMuseumCollection = "all";
  favoritesOnly = false;
  elements.universalInput.value = "";
  elements.platformFilter.value = "all";
  elements.favoritesFilter.setAttribute("aria-pressed", "false");
  persist();
  renderAll();
  navigate("museum");
  showToast("已恢复演示数据");
}

function openEditForm(id) {
  const item = state.exhibits.find((entry) => entry.id === id);
  if (!item) return;
  elements.detailDialog.close();
  openForm();
  elements.formTitle.textContent = "编辑 Exhibit";
  elements.id.value = item.id;
  elements.url.value = item.url;
  elements.platform.value = item.platform;
  elements.title.value = item.title;
  elements.collection.value = item.collection;
  editingTags = [...item.tags];
  renderEditingTags();
  elements.why.value = item.whySaved;
  elements.favorite.checked = item.favorite;
  pendingCoverData = item.coverData || "";
  pendingCoverStyle = item.coverStyle || "cover-paper";
  if (pendingCoverData) showCoverImage(pendingCoverData);
  else clearCover(false);
  syncCoverLabel();
}

function saveExhibit(event) {
  event.preventDefault();
  const uncommittedTag = normalizeTagName(elements.tagInput.value);
  if (uncommittedTag && !editingTags.some((tag) => tag.toLocaleLowerCase() === uncommittedTag.toLocaleLowerCase())) {
    const existingTag = (state.tags || []).find((tag) => tag.toLocaleLowerCase() === uncommittedTag.toLocaleLowerCase());
    editingTags.push(existingTag || uncommittedTag);
  }
  const normalizedUrl = extractUrl(elements.url.value);
  if (!normalizedUrl) {
    elements.urlFeedback.textContent = "没有识别到有效链接，请重新粘贴。";
    elements.url.focus();
    return;
  }

  const id = elements.id.value || `mim-${Date.now()}`;
  const existingIndex = state.exhibits.findIndex((item) => item.id === id);
  const tags = [...editingTags];
  const title = elements.title.value.trim();
  const exhibit = {
    id,
    title,
    url: normalizedUrl,
    platform: elements.platform.value,
    collection: elements.collection.value.trim(),
    tags,
    whySaved: elements.why.value.trim(),
    favorite: elements.favorite.checked,
    createdAt: existingIndex >= 0 ? state.exhibits[existingIndex].createdAt : new Date().toISOString().slice(0, 10),
    coverStyle: pendingCoverStyle,
    coverLabel: makeCoverLabel(title),
    coverData: pendingCoverData
  };

  if (existingIndex >= 0) state.exhibits.splice(existingIndex, 1, exhibit);
  else state.exhibits.unshift(exhibit);
  if (exhibit.collection && !state.collections.includes(exhibit.collection)) state.collections.push(exhibit.collection);
  state.tags = Array.from(new Set([...(state.tags || []), ...tags]));

  persist();
  renderAll();
  elements.formDialog.close();
  elements.universalInput.value = "";
  currentSearch = "";
  selectedMuseumCollection = "all";
  showToast(existingIndex >= 0 ? "Exhibit 已更新" : "已加入 Museum");
}

function openDetail(id) {
  const item = state.exhibits.find((entry) => entry.id === id);
  if (!item) return;
  const cover = item.coverData
    ? `<img src="${item.coverData}" alt="${escapeAttr(item.title)} 封面" />`
    : `<span class="cover-number">${escapeHtml(item.id)}</span><strong>${escapeHtml(item.coverLabel || makeCoverLabel(item.title))}</strong>`;

  elements.detailContent.innerHTML = `
    <div class="detail-article">
      <button class="icon-button detail-close" type="button" aria-label="关闭">×</button>
      <div class="detail-layout">
        <div class="detail-cover ${escapeAttr(item.coverStyle || "cover-paper")}">${cover}</div>
        <div class="detail-copy">
          <p class="eyebrow">Exhibit Detail</p>
          <h2>${escapeHtml(item.title)}</h2>
          <dl class="detail-list">
            <div class="detail-row"><dt>Platform</dt><dd>${escapeHtml(item.platform)}</dd></div>
            <div class="detail-row"><dt>Collection</dt><dd>${escapeHtml(item.collection || "未分类")}</dd></div>
            <div class="detail-row"><dt>Tags</dt><dd class="detail-tags">
              <span>${item.tags.length ? item.tags.map((tag) => `#${escapeHtml(tag)}`).join(" · ") : "暂未添加 Tag"}</span>
              <button class="inline-tag-edit" type="button" data-edit-tags-id="${escapeAttr(item.id)}">${item.tags.length ? "增删 Tag" : "＋ 添加 Tag"}</button>
            </dd></div>
            <div class="detail-row"><dt>Why I Saved This</dt><dd>${escapeHtml(item.whySaved || "还没有填写收藏原因。")}</dd></div>
            <div class="detail-row"><dt>Date Collected</dt><dd>${formatDate(item.createdAt)}</dd></div>
            <div class="detail-row"><dt>Original URL</dt><dd>${escapeHtml(item.url)}</dd></div>
          </dl>
          <div class="detail-actions">
            <a class="primary-button original-link" href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer">View Original ↗</a>
            <button class="secondary-button" type="button" data-edit-id="${escapeAttr(item.id)}">编辑</button>
            <button class="secondary-button" type="button" data-favorite-id="${escapeAttr(item.id)}">${item.favorite ? "取消 Favorite" : "加入 Favorite"}</button>
            <button class="text-button danger-button" type="button" data-delete-id="${escapeAttr(item.id)}">删除</button>
          </div>
        </div>
      </div>
    </div>`;

  elements.detailContent.querySelector(".detail-close").addEventListener("click", () => elements.detailDialog.close());
  elements.detailContent.querySelector("[data-edit-id]").addEventListener("click", () => openEditForm(item.id));
  elements.detailContent.querySelector("[data-edit-tags-id]").addEventListener("click", () => openEditForm(item.id));
  elements.detailContent.querySelector("[data-favorite-id]").addEventListener("click", () => toggleFavorite(item.id));
  elements.detailContent.querySelector("[data-delete-id]").addEventListener("click", () => deleteExhibit(item.id));
  if (!elements.detailDialog.open) elements.detailDialog.showModal();
}

function toggleFavorite(id) {
  const item = state.exhibits.find((entry) => entry.id === id);
  if (!item) return;
  item.favorite = !item.favorite;
  persist();
  renderAll();
  openDetail(id);
  showToast(item.favorite ? "已加入 Favorite" : "已取消 Favorite");
}

function deleteExhibit(id) {
  const item = state.exhibits.find((entry) => entry.id === id);
  if (!item || !window.confirm(`确定删除“${item.title}”吗？`)) return;
  state.exhibits = state.exhibits.filter((entry) => entry.id !== id);
  persist();
  renderAll();
  elements.detailDialog.close();
  showToast("Exhibit 已删除");
}

function saveCollection(event) {
  event.preventDefault();
  const name = elements.newCollectionName.value.trim();
  if (!name) return;
  if (!state.collections.includes(name)) {
    state.collections.push(name);
    persist();
    renderAll();
    showToast("Collection 已创建");
  } else showToast("这个 Collection 已经存在");
  elements.collectionDialog.close();
}

function renderEditingTags() {
  elements.selectedTagChips.innerHTML = editingTags.length
    ? editingTags.map((tag) => `
      <span class="selected-tag-chip">#${escapeHtml(tag)}
        <button type="button" data-remove-form-tag="${escapeAttr(tag)}" aria-label="移除 ${escapeAttr(tag)}">×</button>
      </span>`).join("")
    : `<span class="tag-editor-empty">还没有 Tag，这条链接会保存在“全部收藏”中。</span>`;

  elements.selectedTagChips.querySelectorAll("[data-remove-form-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      editingTags = editingTags.filter((tag) => tag !== button.dataset.removeFormTag);
      renderEditingTags();
    });
  });
}

function addTagFromInput() {
  const raw = normalizeTagName(elements.tagInput.value);
  if (!raw) return;
  const existing = (state.tags || []).find((tag) => tag.toLocaleLowerCase() === raw.toLocaleLowerCase());
  const tag = existing || raw;
  if (!editingTags.some((entry) => entry.toLocaleLowerCase() === tag.toLocaleLowerCase())) editingTags.push(tag);
  elements.tagInput.value = "";
  renderEditingTags();
}

function openTagDialog(tag = "") {
  elements.tagForm.reset();
  elements.originalTagName.value = tag;
  elements.tagName.value = tag;
  elements.tagDialogTitle.textContent = tag ? "重命名 Tag" : "新建 Tag";
  elements.tagDialog.showModal();
  requestAnimationFrame(() => elements.tagName.focus());
}

function saveTag(event) {
  event.preventDefault();
  const original = elements.originalTagName.value;
  const next = normalizeTagName(elements.tagName.value);
  if (!next) return;
  const duplicate = (state.tags || []).find((tag) => tag !== original && tag.toLocaleLowerCase() === next.toLocaleLowerCase());
  if (duplicate) {
    showToast("这个 Tag 已经存在");
    return;
  }

  if (original) {
    state.exhibits.forEach((item) => {
      item.tags = Array.from(new Set(item.tags.map((tag) => tag === original ? next : tag)));
    });
    state.tags = (state.tags || []).map((tag) => tag === original ? next : tag);
    if (selectedTagsPageTag === original) selectedTagsPageTag = next;
  } else {
    state.tags = Array.from(new Set([...(state.tags || []), next]));
    selectedTagsPageTag = next;
  }

  persist();
  renderAll();
  elements.tagDialog.close();
  showToast(original ? "Tag 已重命名" : "Tag 已创建");
}

function deleteTag(tag) {
  if (!window.confirm(`删除 Tag“${tag}”？收藏的链接不会被删除。`)) return;
  state.tags = (state.tags || []).filter((entry) => entry !== tag);
  state.exhibits.forEach((item) => { item.tags = item.tags.filter((entry) => entry !== tag); });
  if (selectedTagsPageTag === tag) selectedTagsPageTag = "";
  persist();
  renderAll();
  showToast("Tag 已删除，Exhibits 保持不变");
}

async function fetchLinkMetadata(url, announce = false) {
  const requestId = ++metadataRequestId;
  elements.urlFeedback.textContent = `已识别为 ${detectPlatform(url)}，正在抓取标题和封面…`;
  try {
    const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error("metadata unavailable");
    const metadata = await response.json();
    if (requestId !== metadataRequestId || extractUrl(elements.url.value) !== url) return;

    const currentTitle = elements.title.value.trim();
    if (metadata.title && (!currentTitle || currentTitle === suggestTitle(elements.url.value))) {
      elements.title.value = cleanMetadataTitle(metadata.title).slice(0, 120);
      syncCoverLabel();
    }

    if (metadata.image) {
      pendingCoverData = `/api/image?url=${encodeURIComponent(metadata.image)}`;
      showCoverImage(pendingCoverData);
      elements.urlFeedback.textContent = `已识别为 ${detectPlatform(url)}，并抓取到原封面。`;
      if (announce) showToast("已抓取原封面");
    } else {
      generateLayoutCover(false);
      elements.urlFeedback.textContent = `已识别为 ${detectPlatform(url)}；未找到公开封面，已生成排版封面。`;
      if (announce) showToast("未找到公开封面，已生成排版封面");
    }
  } catch {
    if (requestId !== metadataRequestId) return;
    generateLayoutCover(false);
    elements.urlFeedback.textContent = `已识别为 ${detectPlatform(url)}；平台限制抓取，已生成排版封面。`;
    if (announce) showToast("抓取受限，已生成排版封面");
  }
}

function generateLayoutCover(announce = true) {
  pendingCoverData = "";
  const source = `${elements.title.value}|${elements.platform.value}`;
  const hash = [...source].reduce((total, char) => total + char.charCodeAt(0), 0);
  pendingCoverStyle = coverStyles[hash % coverStyles.length];
  clearCover(false);
  syncCoverLabel();
  if (announce) showToast("已生成排版封面");
}

async function handleCoverUpload() {
  const file = elements.coverFile.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("请选择图片文件。");
    return;
  }
  try {
    pendingCoverData = await compressImage(file, 1000, 0.78);
    showCoverImage(pendingCoverData);
    showToast("封面已添加");
  } catch {
    showToast("封面处理失败，请换一张图片。" );
  }
}

function compressImage(file, maxDimension, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function showCoverImage(data) {
  elements.coverPreviewImage.src = data;
  elements.coverPreviewImage.onerror = () => {
    if (!elements.coverPreviewImage.hidden) {
      generateLayoutCover(false);
      elements.urlFeedback.textContent = "封面图片无法加载，已改用排版封面。";
    }
  };
  elements.coverPreviewImage.hidden = false;
  elements.coverPreviewPlaceholder.hidden = true;
}

function clearCover(clearPending = true) {
  if (clearPending) pendingCoverData = "";
  elements.coverFile.value = "";
  elements.coverPreviewImage.hidden = true;
  elements.coverPreviewImage.removeAttribute("src");
  elements.coverPreviewPlaceholder.hidden = false;
  elements.coverPreviewPlaceholder.classList.remove(...coverStyles);
  elements.coverPreviewPlaceholder.classList.add(pendingCoverStyle);
}

function syncCoverLabel() {
  elements.coverPreviewLabel.textContent = makeCoverLabel(elements.title.value || "NEW EXHIBIT");
  elements.coverPreviewPlaceholder.classList.remove(...coverStyles);
  elements.coverPreviewPlaceholder.classList.add(pendingCoverStyle);
}

function getTagCounts(exhibits) {
  return exhibits.reduce((counts, item) => {
    (item.tags || []).forEach((tag) => { counts[tag] = (counts[tag] || 0) + 1; });
    return counts;
  }, {});
}

function detectPlatform(urlString) {
  try {
    const host = new URL(urlString).hostname.toLowerCase();
    if (host.includes("xiaohongshu.com") || host.includes("xhslink.com")) return "小红书";
    if (host.includes("bilibili.com") || host.includes("b23.tv")) return "Bilibili";
    if (host.includes("douyin.com")) return "抖音";
    if (host === "mp.weixin.qq.com") return "微信公众号";
    return "Website";
  } catch {
    return "Website";
  }
}

function extractUrl(text) {
  return text.match(/https?:\/\/[^\s，。！？；、<>"']+/i)?.[0]?.replace(/[)）\]}】]+$/, "") || "";
}

function suggestTitle(text) {
  return text
    .replace(/https?:\/\/[^\s]+/gi, "")
    .replace(/复制打开[^，。！？]*/g, "")
    .replace(/打开(?:抖音|Dou音)搜索[^，。！？]*/gi, "")
    .replace(/直接观看视频/g, "")
    .replace(/\d+(\.\d+)?\s*/g, "")
    .replace(/[【】]/g, "")
    .replace(/[/:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function parseTags(value) {
  return Array.from(new Set(value.split(/[,，#\n]+/).map((tag) => tag.trim()).filter(Boolean)));
}

function normalizeTagName(value) {
  return value.replace(/^[#＃\s]+/, "").replace(/[,，\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 30);
}

function cleanMetadataTitle(value) {
  return String(value)
    .replace(/[_\-|｜]\s*哔哩哔哩(?:_bilibili)?\s*$/i, "")
    .replace(/[-_|｜]\s*(?:小红书|抖音|微信公众平台)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function makeCoverLabel(title) {
  const words = title.replace(/[，。！？：｜|]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.some((word) => /[a-z]/i.test(word))) return words.slice(0, 3).join("\n").toUpperCase();
  return title.replace(/[，。！？：｜|]/g, " ").slice(0, 10).replace(/\s+/g, "\n");
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date).replaceAll("/", ".");
}

function countLabel(count) {
  return `${count} ${count === 1 ? "Exhibit" : "Exhibits"}`;
}

function closeOnBackdrop(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  if (outside) event.currentTarget.close();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 2200);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}
