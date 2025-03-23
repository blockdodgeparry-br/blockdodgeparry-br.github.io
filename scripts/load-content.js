function loadPage(hash) {
  let [page, subheader] = hash.split("#");
  console.log("Page: ", page, subheader); // Extract page and subheader
  page = page || "home"; // Default page

  fetch(`pages/${page}.html`)
    .then((response) => response.text())
    .then((html) => {
      document.getElementById("content-placeholder").innerHTML = html;

      // Scroll to the subheader AFTER content loads
      if (subheader) {
        setTimeout(() => {
          const target = document.getElementById(subheader);
          if (target) target.scrollIntoView({ behavior: "smooth" });
        }, 100); // Small delay to ensure rendering
      }
    });
  if (window.innerWidth < 768) {
    toggleSidebar();
  }
}

// Load default or hashed page on startup
document.addEventListener("DOMContentLoaded", () =>
  loadPage(window.location.hash.substring(1))
);

// Update content when the hash changes
window.addEventListener("hashchange", () =>
  loadPage(window.location.hash.substring(1))
);
