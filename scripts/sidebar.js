document.addEventListener("DOMContentLoaded", function () {
  fetch("nav.html")
    .then((response) => response.text())
    .then((data) => {
      document.getElementById("nav-placeholder").innerHTML = data;
    })
    .catch((error) => console.error("Error loading navigation:", error));
});

function toggleSidebar() {
  const sidebar = document.getElementById("nav-table");
  const body = document.body;
  if (sidebar.style.display === "none" || sidebar.style.display === "") {
    sidebar.style.display = "block";
    sidebar.style.height = "100vh";
    sidebar.style.overflowY = "scroll";
    body.classList.add("no-scroll");
  } else {
    sidebar.style.display = "none";
    body.classList.remove("no-scroll");
    sidebar.style.height = "auto";
    sidebar.style.overflowY = "hidden";
  }
}

function toggleSubnav(event) {
  console.log(event.target);
  const clickedParentElement = event.target.closest(".dropdown");
  const subnav = clickedParentElement.nextElementSibling;
  console.log("subnav: ", subnav);
  if (subnav.style.display === "none" || subnav.style.display === "") {
    subnav.style.display = "block";
  } else {
    subnav.style.display = "none";
  }
}

// function updateLinks() {
//   const navLinks = document.querySelectorAll("#nav-list a");
//   navLinks.forEach((link) => {
//     link.addEventListener("click", function (event) {
//       event.preventDefault();
//       const [page, fragment] = this.getAttribute("href")
//         .split("=")[1]
//         .split("#");
//       loadPage(page, fragment);
//       history.pushState(
//         { page, fragment },
//         "",
//         `?page=${page}${fragment ? `#${fragment}` : ""}`
//       );
//     });
//   });
// }
