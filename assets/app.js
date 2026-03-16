(function () {
  const docs = window.ALSOSWAP_DOCS || [];
  const navEl = document.getElementById("nav");
  const docEl = document.getElementById("doc");
  const pagerEl = document.getElementById("pager");
  const searchInput = document.getElementById("searchInput");

  let activeSlug = docs[0] ? docs[0].slug : "";

  const bySlug = new Map(docs.map((doc) => [doc.slug, doc]));

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toText(html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  }

  function groupDocs(items) {
    const grouped = new Map();
    items.forEach((doc) => {
      if (!grouped.has(doc.group)) {
        grouped.set(doc.group, []);
      }
      grouped.get(doc.group).push(doc);
    });
    return grouped;
  }

  function renderNav(items) {
    navEl.innerHTML = "";

    groupDocs(items).forEach((groupDocsList, groupName) => {
      const groupLabel = document.createElement("div");
      groupLabel.className = "nav-group";
      groupLabel.textContent = groupName;
      navEl.appendChild(groupLabel);

      groupDocsList.forEach((doc) => {
        const button = document.createElement("button");
        button.textContent = doc.title;
        button.className = doc.slug === activeSlug ? "active" : "";
        button.onclick = function () {
          searchInput.value = "";
          activeSlug = doc.slug;
          window.location.hash = doc.slug;
          renderCurrentState();
        };
        navEl.appendChild(button);
      });
    });
  }

  function renderPager(currentSlug) {
    const currentIndex = docs.findIndex((doc) => doc.slug === currentSlug);
    if (currentIndex === -1) {
      pagerEl.innerHTML = "";
      return;
    }

    const prev = currentIndex > 0 ? docs[currentIndex - 1] : null;
    const next = currentIndex < docs.length - 1 ? docs[currentIndex + 1] : null;

    const prevHtml = prev
      ? '<a href="#' +
        prev.slug +
        '"><div class="label">Previous</div><div class="title">' +
        prev.title +
        "</div></a>"
      : "<div></div>";
    const nextHtml = next
      ? '<a class="right" href="#' +
        next.slug +
        '"><div class="label">Next</div><div class="title">' +
        next.title +
        "</div></a>"
      : "<div></div>";

    pagerEl.innerHTML = prevHtml + nextHtml;
  }

  function renderDoc(doc) {
    if (!doc) {
      docEl.innerHTML = "<h1>Not found</h1><p class='lead'>The selected page does not exist.</p>";
      pagerEl.innerHTML = "";
      document.title = "AlsoSwap Protocol Docs";
      return;
    }

    docEl.innerHTML = doc.content;
    renderPager(doc.slug);
    document.title = doc.title + " | AlsoSwap Docs";
    window.scrollTo(0, 0);
  }

  function buildSearchResults(query) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return null;
    }

    const escaped = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchPattern = new RegExp(escaped, "g");

    const matches = docs
      .map((doc) => {
        const haystack = (doc.title + " " + doc.summary + " " + toText(doc.content)).toLowerCase();
        const score = (haystack.match(searchPattern) || []).length;
        return { doc, score, matched: haystack.includes(normalizedQuery) };
      })
      .filter((result) => result.matched)
      .sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title));

    const itemsHtml = matches.length
      ? "<ul>" +
        matches
          .slice(0, 20)
          .map(function (result) {
            return (
              '<li><a href="#' +
              result.doc.slug +
              '" data-slug="' +
              result.doc.slug +
              '">' +
              escapeHtml(result.doc.title) +
              "</a> <span class='small'>- " +
              escapeHtml(result.doc.summary) +
              "</span></li>"
            );
          })
          .join("") +
        "</ul>"
      : "<p class='small'>No matching topics found.</p>";

    return {
      html:
        "<h1>Search</h1>" +
        "<p class='lead'>Results for <code>" +
        escapeHtml(query) +
        "</code></p>" +
        "<div class='search-results'><h3>Matching topics</h3>" +
        itemsHtml +
        "</div>",
      items: matches.map((result) => result.doc),
    };
  }

  function resolveFromHash() {
    const hash = window.location.hash.replace(/^#/, "").trim();
    if (!hash) {
      return null;
    }
    return bySlug.get(hash) || null;
  }

  function renderCurrentState() {
    const query = searchInput.value;
    const searchResults = buildSearchResults(query);

    if (searchResults) {
      docEl.innerHTML = searchResults.html;
      pagerEl.innerHTML = "";
      renderNav(searchResults.items);
      document.title = "Search | AlsoSwap Docs";
      docEl.querySelectorAll("a[data-slug]").forEach((anchor) => {
        anchor.addEventListener("click", function () {
          searchInput.value = "";
        });
      });
      return;
    }

    const hashedDoc = resolveFromHash();
    if (hashedDoc) {
      activeSlug = hashedDoc.slug;
      renderDoc(hashedDoc);
      renderNav(docs);
      return;
    }

    const firstDoc = docs[0] || null;
    if (firstDoc) {
      activeSlug = firstDoc.slug;
      renderDoc(firstDoc);
      renderNav(docs);
    }
  }

  searchInput.addEventListener("input", renderCurrentState);
  searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      searchInput.value = "";
      renderCurrentState();
    }
  });

  window.addEventListener("hashchange", renderCurrentState);
  window.addEventListener("keydown", function (event) {
    const targetTag = event.target && event.target.tagName;
    if (event.key === "/" && targetTag !== "INPUT" && targetTag !== "TEXTAREA") {
      event.preventDefault();
      searchInput.focus();
    }
  });

  renderCurrentState();
})();
