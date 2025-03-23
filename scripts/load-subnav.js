document.addEventListener("DOMContentLoaded", async function () {
  const pages = [
    { file: "introducao.html", subnavId: "introducao-subnav" },
    {
      file: "criacao-de-personagens.html",
      subnavId: "criacao-de-personagens-subnav",
    },
    { file: "regras.html", subnavId: "regras-subnav" },
    { file: "tarefas-complexas.html", subnavId: "tarefas-complexas-subnav" },
    { file: "conflito-social.html", subnavId: "conflito-social-subnav" },
    { file: "combate.html", subnavId: "combate-subnav" },
    {
      file: "carreiras-e-habilidades.html",
      subnavId: "carreiras-e-habilidades-subnav",
    },
    {
      file: "melhorando-seu-personagem.html",
      subnavId: "melhorando-seu-personagem-subnav",
    },
    {
      file: "armas-armaduras-e-equipamento.html",
      subnavId: "armas-armaduras-e-equipamento-subnav",
    },
    { file: "magia.html", subnavId: "magia-subnav" },
    { file: "narrando-aventuras.html", subnavId: "narrando-aventuras-subnav" },
    {
      file: "amigos-inimigos-e-monstros.html",
      subnavId: "amigos-inimigos-e-monstros-subnav",
    },
    {
      file: "ferramentas-e-tabelas.html",
      subnavId: "ferramentas-e-tabelas-subnav",
    },
    { file: "creditos.html", subnavId: "creditos-subnav" },
  ];

  for (const { file, subnavId } of pages) {
    try {
      const response = await fetch(`/pages/${file}`);
      if (!response.ok) {
        console.warn(`Failed to load ${file}`);
        continue;
      }

      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");

      const subnav = document.getElementById(subnavId);
      if (!subnav) {
        console.warn(`Subnav element '${subnavId}' not found.`);
        continue;
      }

      let headerIndex = 0;
      const headers = [...doc.querySelectorAll("h1, h2")].filter(
        (header, index) => header.tagName !== "H1" || index !== 0
      );

      headers.forEach((header) => {
        let id = header.id;
        if (!id) {
          id = `${file.replace(".html", "")}-header-${headerIndex++}`;
          header.id = id;
        } else {
          id = id.replace(".html", "");
        }

        noExtFile = file.replace(".html", "");

        const sublinkWrapper = document.getElementById(`${noExtFile}-subnav`);
        const sublink = document.createElement("li");
        sublink.innerHTML = `<a href="index.html#${noExtFile}#${id}">${header.textContent}</a>`;
        sublinkWrapper.appendChild(sublink);
      });
    } catch (error) {
      console.error(`Error loading subnav for ${file}:`, error);
    }
  }
});
