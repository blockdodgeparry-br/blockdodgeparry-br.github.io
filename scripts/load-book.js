document.addEventListener("DOMContentLoaded", function () {
  const contentPlaceholder = document.getElementById("content-placeholder");
  const pagesDirectory = "pages/";
  const pageFiles = [
    "creditos.html",
    "introducao.html",
    "criacao-de-personagens.html",
    "regras.html",
    "tarefas-complexas.html",
    "conflito-social.html",
    "combate.html",
    "carreiras-e-habilidades.html",
    "melhorando-seu-personagem.html",
    "armas-armaduras-e-equipamento.html",
    "magia.html",
    "narrando-aventuras.html",
    "amigos-inimigos-e-monstros.html",
    "ferramentas-e-tabelas.html",
  ]; // Add all your page filenames here

  pageFiles.forEach((file) => {
    fetch(pagesDirectory + file)
      .then((response) => response.text())
      .then((data) => {
        const div = document.createElement("div");
        div.innerHTML = data;
        contentPlaceholder.appendChild(div);
      })
      .catch((error) => console.error("Error loading page:", error));
  });
});
