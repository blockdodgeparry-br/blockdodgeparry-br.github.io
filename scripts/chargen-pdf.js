// ============================================================
// chargen-pdf.js
// Fills the form-fillable PDF character sheet using pdf-lib.
// Works from a live generated character OR a saved Markdown file.
// Depends on: window.PDFLib, window.fontkit (CDN), FIXED_ITEMS
// and SKILL_DESCRIPTIONS from chargen-data.js.
// ============================================================

// ── Field name map (resolved from PDF annotation positions) ──

const PDF_FIELDS = {
  name:         "text_1klnm",

  // Stats — upper box = Atual (blank), lower = Máx (pre-filled)
  for_max:      "text_41vxjz",
  dex_max:      "text_43elqe",
  von_max:      "text_45dgel",
  guarda_max:   "text_47qkam",
  armor:        "text_50nkbi",
  // MD & FD: text_48ammb / text_49doyy — left blank

  // Background & Notes (3 large textareas)
  bg_left:      "textarea_5ektx",   // pronouns + appearance
  bg_mid:       "textarea_6nigh",   // souvenirs
  // bg_right   "textarea_7ctzj"    — left blank for GM

  // Inventory — 10 rows
  inv: [
    "text_51shhb", "text_52firc", "text_53rfns", "text_54gmjd", "text_55dxnw",
    "text_56tbke", "text_57cbwf", "text_58njvu", "text_59zcua", "text_60pzij",
  ],

  // Careers — 4 rows
  careers: ["text_35noin", "text_36lfvq", "text_37rfhc", "text_38tgqi"],

  // Skills — 10 textareas
  skills: [
    "textarea_25unwg", "textarea_26joef", "textarea_27nqqs", "textarea_28xkpi",
    "textarea_29celt", "textarea_30lbxl", "textarea_31usxk", "textarea_32acgp",
    "textarea_33sd",   "textarea_34uvtg",
  ],

  // Weapon proficiency name rows — 6
  weap_names: [
    "text_62ruzx", "text_63hkgj", "text_64qif",
    "text_65axxd", "text_66ejba", "text_67mfik",
  ],

  // Damage type finishing-blow checkboxes (5 per type)
  bludgeoning_checks: [
    "checkbox_18iqko", "checkbox_19qren", "checkbox_20buol",
    "checkbox_21ugob", "checkbox_22ohrh",
  ],
  piercing_checks: [
    "checkbox_98wbzz",  "checkbox_99qids",  "checkbox_100ssue",
    "checkbox_101qngv", "checkbox_102eiho",
  ],
  slashing_checks: [
    "checkbox_103nvnd", "checkbox_104qqdg", "checkbox_105nrje",
    "checkbox_106lbvi", "checkbox_107gojp",
  ],
};

// ── Normalized fill data structure ───────────────────────────
// {
//   name: string,
//   pronouns: string,
//   appearance: string,
//   FOR: number, DEX: number, VON: number, guarda: number,
//   armorValue: number,
//   careers:  [{ name, souvenir }],
//   skills:   [{ name, desc }],
//   dmgType:  "cortante" | "perfurante" | "contundente",
//   prefWeaponName: string,
//   inventoryLines: string[],   // up to 10, ready to write
//   weapProfNames:  string[],   // up to 6
// }

// ── Convert live char object → fill data ─────────────────────

function _charToFillData(char, identity) {
  const dmgShort = { perfurante: "Perf.", contundente: "Cont.", cortante: "Cort." };

  const inventoryLines = [];
  const armor = char.combo.armor;
  inventoryLines.push(`${armor.name} — ${armor.value} Arm.${armor.bulky ? " (Volumosa)" : ""}`);
  char.comboWeapons.forEach(w => {
    const props = w.properties.length ? `, ${w.properties.join(", ")}` : "";
    inventoryLines.push(`${w.name} — ${w.dice} ${w.speed}, ${dmgShort[w.type] || w.type}${props}`);
  });
  const pp = char.prefWeapon;
  const ppProps = pp.properties.length ? `, ${pp.properties.join(", ")}` : "";
  inventoryLines.push(`${pp.name} — ${pp.dice} ${pp.speed}, ${dmgShort[pp.type] || pp.type}${ppProps} (pref.)`);
  FIXED_ITEMS.forEach(it => inventoryLines.push(it.name));
  inventoryLines.push(`${char.coins} moedas`);

  const weapProfNames = [char.prefWeapon.name];
  char.comboWeapons.forEach(w => {
    if (!weapProfNames.includes(w.name)) weapProfNames.push(w.name);
  });

  return {
    name:           identity.name  || "",
    pronouns:       identity.pronouns    || "",
    appearance:     identity.appearance  || "",
    FOR: char.FOR, DEX: char.DEX, VON: char.VON, guarda: char.guarda,
    armorValue:     char.combo.armor.value,
    careers:        char.careerPicks.map(p => ({ name: p.career.name, souvenir: p.souvenir })),
    skills:         char.careerPicks.map(p => ({
                      name: p.skill,
                      desc: SKILL_DESCRIPTIONS?.[p.skill] ?? "",
                    })),
    dmgType:        char.dmgType,
    prefWeaponName: char.prefWeapon.name,
    inventoryLines,
    weapProfNames,
  };
}

// ── Parse Markdown → fill data ────────────────────────────────

function parseMarkdownToFillData(text) {
  const lines = text.split("\n");

  // Helper: get first capture of a regex against full text
  const grab = (re) => { const m = text.match(re); return m ? m[1].trim() : ""; };

  // Name from H1: "# Name — Ficha de Personagem"
  const name = grab(/^#\s+(.+?)\s+—\s+Ficha de Personagem/m);

  const pronouns   = grab(/\*\*Pronomes:\*\*\s*(.+)/);
  const appearance = grab(/\*\*Aparência:\*\*\s*(.+)/);

  // Stats from markdown table row:  | 14  | 9  | 11  | 4      |
  const statsRow = text.match(/^\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/m);
  const FOR    = statsRow ? parseInt(statsRow[1]) : 0;
  const DEX    = statsRow ? parseInt(statsRow[2]) : 0;
  const VON    = statsRow ? parseInt(statsRow[3]) : 0;
  const guarda = statsRow ? parseInt(statsRow[4]) : 0;

  // Armor value from "- Name — X Arm."
  const armorMatch = text.match(/^-\s+.+?—\s+(\d+)\s+Arm\./m);
  const armorValue = armorMatch ? parseInt(armorMatch[1]) : 0;

  // Careers & Skills from "- **Career** → Skill — desc"
  const careers = [];
  const skills  = [];
  const careerRe = /^-\s+\*\*(.+?)\*\*\s+→\s+(.+?)(?:\s+—\s+(.+))?$/gm;
  let cm;
  while ((cm = careerRe.exec(text)) !== null) {
    careers.push({ name: cm[1].trim(), souvenir: "" });
    skills.push({ name: cm[2].trim(), desc: (cm[3] || "").trim() });
  }

  // Souvenirs from "## Souvenir(s)" section: "- **Career:** souvenir text"
  const souvenirSection = text.match(/## Souvenir\(s\)([\s\S]*?)(?=^##|\Z)/m);
  if (souvenirSection) {
    const souvenirRe = /^-\s+\*\*(.+?):\*\*\s*(.+)$/gm;
    let sm;
    while ((sm = souvenirRe.exec(souvenirSection[1])) !== null) {
      const idx = careers.findIndex(c => c.name === sm[1].trim());
      if (idx >= 0) careers[idx].souvenir = sm[2].trim();
    }
  }

  // Damage type from "**Tipo de Dano:** Cortante"
  const dmgRaw = grab(/\*\*Tipo de Dano:\*\*\s*(\w+)/);
  const dmgTypeMap = { cortante: "cortante", perfurante: "perfurante", contundente: "contundente" };
  const dmgType = dmgTypeMap[dmgRaw.toLowerCase()] ?? "cortante";

  // Preferred weapon name from "**Arma (proficiência):** Name — ..."
  const prefWeaponName = grab(/\*\*Arma \(profici[êe]ncia\):\*\*\s*(.+?)\s*—/);

  // Inventory: collect all "- item" lines from the Inventário section
  const invSection = text.match(/## Invent[aá]rio[\s\S]*?(?=^##|\Z)/m);
  const inventoryLines = [];
  if (invSection) {
    const invLineRe = /^-\s+(.+)$/gm;
    let im;
    while ((im = invLineRe.exec(invSection[0])) !== null) {
      // Strip markdown emphasis and slot annotations like *(1 espaço)*
      const cleaned = im[1]
        .replace(/\*\([^)]+\)\*/g, "")   // *(X espaços)*
        .replace(/\*\*/g, "")
        .trim();
      if (cleaned) inventoryLines.push(cleaned);
    }
  }

  // Weapon proficiency names: preferred weapon first
  const weapProfNames = prefWeaponName ? [prefWeaponName] : [];

  return {
    name, pronouns, appearance,
    FOR, DEX, VON, guarda, armorValue,
    careers, skills,
    dmgType, prefWeaponName,
    inventoryLines,
    weapProfNames,
  };
}

// ── Core PDF fill + download ──────────────────────────────────

async function _doFillAndDownload(fillData, btnId, filename) {
  const btn = btnId ? document.getElementById(btnId) : null;
  const originalText = btn ? btn.textContent : "";
  if (btn) { btn.textContent = "⏳ Gerando…"; btn.disabled = true; }

  try {
    if (!window.PDFLib)  throw new Error("pdf-lib não carregou.");
    if (!window.fontkit) throw new Error("fontkit não carregou.");

    const { PDFDocument } = window.PDFLib;

    const [pdfBytes, fontBytes] = await Promise.all([
      fetch("assets/BDP - Character Sheet - Form Fillable (1).pdf")
        .then(r => { if (!r.ok) throw new Error("PDF não encontrado."); return r.arrayBuffer(); }),
      fetch("assets/fonts/Alegreya-VariableFont_wght.ttf")
        .then(r => { if (!r.ok) throw new Error("Fonte não encontrada."); return r.arrayBuffer(); }),
    ]);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    pdfDoc.registerFontkit(window.fontkit);
    const font = await pdfDoc.embedFont(fontBytes);
    const form = pdfDoc.getForm();

    function setText(fieldName, value) {
      try {
        const f = form.getTextField(fieldName);
        f.setText(String(value ?? ""));
        f.updateAppearances(font);
      } catch (_) {}
    }

    function checkField(fieldName) {
      try { form.getCheckBox(fieldName).check(); } catch (_) {}
    }

    // Name
    setText(PDF_FIELDS.name, fillData.name);

    // Stats
    setText(PDF_FIELDS.for_max,    fillData.FOR);
    setText(PDF_FIELDS.dex_max,    fillData.DEX);
    setText(PDF_FIELDS.von_max,    fillData.VON);
    setText(PDF_FIELDS.guarda_max, fillData.guarda);
    setText(PDF_FIELDS.armor,      fillData.armorValue);

    // Background
    const bgLeft = [fillData.pronouns, fillData.appearance].filter(Boolean).join("\n");
    setText(PDF_FIELDS.bg_left, bgLeft);
    const souvenirText = fillData.careers
      .filter(c => c.souvenir)
      .map(c => `${c.name}: ${c.souvenir}`)
      .join("\n");
    setText(PDF_FIELDS.bg_mid, souvenirText);

    // Careers
    fillData.careers.forEach((c, i) => {
      if (PDF_FIELDS.careers[i]) setText(PDF_FIELDS.careers[i], c.name);
    });

    // Skills
    fillData.skills.forEach((s, i) => {
      if (!PDF_FIELDS.skills[i]) return;
      setText(PDF_FIELDS.skills[i], s.desc ? `${s.name}\n${s.desc}` : s.name);
    });

    // Inventory
    PDF_FIELDS.inv.forEach((fieldName, i) => {
      setText(fieldName, fillData.inventoryLines[i] ?? "");
    });

    // Weapon proficiency names
    PDF_FIELDS.weap_names.forEach((fieldName, i) => {
      setText(fieldName, fillData.weapProfNames[i] ?? "");
    });

    // Damage type checkbox
    const dmgCheckMap = {
      contundente: PDF_FIELDS.bludgeoning_checks[0],
      perfurante:  PDF_FIELDS.piercing_checks[0],
      cortante:    PDF_FIELDS.slashing_checks[0],
    };
    if (dmgCheckMap[fillData.dmgType]) checkField(dmgCheckMap[fillData.dmgType]);

    // Download
    const filledBytes = await pdfDoc.save();
    const blob = new Blob([filledBytes], { type: "application/pdf" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

  } catch (err) {
    console.error("[chargen-pdf] Erro:", err);
    alert(`Erro ao gerar PDF:\n${err.message}`);
  } finally {
    if (btn) { btn.textContent = originalText; btn.disabled = false; }
  }
}

// ── Public entry points ───────────────────────────────────────

function _safeFilename(name) {
  return (name || "personagem")
    .replace(/[^\w\s\-áéíóúâêôãõàçÁÉÍÓÚÂÊÔÃÕÀÇ]/g, "")
    .trim() || "personagem";
}

async function downloadFilledPDF(char, identity) {
  const fillData = _charToFillData(char, identity);
  await _doFillAndDownload(fillData, "pdf-btn", `${_safeFilename(identity.name)} - Ficha BDP.pdf`);
}

async function handleMarkdownUpload() {
  const input = document.getElementById("md-upload");
  if (!input.files.length) { alert("Selecione um arquivo Markdown primeiro."); return; }
  const file = input.files[0];
  const text = await file.text();
  const fillData = parseMarkdownToFillData(text);
  const baseName = file.name.replace(/\.(md|txt)$/i, "");
  await _doFillAndDownload(fillData, "md-pdf-btn", `${_safeFilename(fillData.name || baseName)} - Ficha BDP.pdf`);
}
