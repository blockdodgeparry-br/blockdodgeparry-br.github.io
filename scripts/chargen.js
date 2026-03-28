// ============================================================
// chargen.js — Block, Dodge, Parry character generator logic
// Depends on: chargen-data.js (must be loaded first)
// ============================================================

// ── Dice utilities ───────────────────────────────────────────

function roll(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function roll3d6() {
  return roll(6) + roll(6) + roll(6);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Age helpers ──────────────────────────────────────────────

function getAgeRow(d6Result) {
  return AGE_TABLE.find(row => row.rolls.includes(d6Result));
}

function calcSkillCount(row) {
  switch (row.skillsFormula) {
    case "fixed":   return row.skillsFixed;
    case "d4":      return roll(4);
    case "min2d4":  return Math.min(roll(4), roll(4));
    case "max2d4":  return Math.max(roll(4), roll(4));
    default:        return 4;
  }
}

// ── Attribute descriptor ─────────────────────────────────────

function descriptor(stat, value) {
  if (value <= 6)  return ATTRIBUTE_DESCRIPTORS[stat].low;
  if (value >= 15) return ATTRIBUTE_DESCRIPTORS[stat].high;
  return null;
}

// ── Skill description lookup ─────────────────────────────────

function skillDesc(name) {
  return SKILL_DESCRIPTIONS[name] || null;
}

// ── Core generator ───────────────────────────────────────────

function generateCharacter() {
  const useAge     = document.getElementById("opt-age").checked;
  const useLuck    = document.getElementById("opt-luck").checked;
  const useSpecies = document.getElementById("opt-species").checked;
  const noMagic    = document.getElementById("opt-no-magic").checked;
  const noFaith    = document.getElementById("opt-no-faith").checked;

  // 1 ── Attributes (raw)
  let FOR = roll3d6();
  let DEX = roll3d6();
  let VON = roll3d6();

  // 2 ── Age (optional)
  let ageRow = null, ageStr = null, numSkills = 4;
  if (useAge) {
    ageRow = getAgeRow(roll(6));
    const ageYears = ageRow.ageBase + roll(ageRow.ageDice);
    ageStr = `${ageYears} anos — ${ageRow.name} (${ageRow.experience})`;
    numSkills = calcSkillCount(ageRow);
    // Apply modifiers (floor at 3, ceiling at 18)
    FOR = Math.min(18, Math.max(3, FOR + ageRow.forMod));
    DEX = Math.min(18, Math.max(3, DEX + ageRow.dexMod));
    VON = Math.min(18, Math.max(3, VON + ageRow.vonMod));
  }

  // 3 ── Guard
  const guarda = roll(6);

  // 4 ── Luck
  const sorte = useLuck ? 10 : null;

  // 5 ── Species
  const species = useSpecies ? pickRandom(SPECIES_TRAITS) : null;

  // 6 ── Careers & Skills
  const availableCareers = CAREERS.filter(c => {
    if (noMagic && c.isMagic) return false;
    if (noFaith && c.isFaith) return false;
    return true;
  });

  // Safety: if somehow no careers available, fall back to Mercenário
  const careerPool = availableCareers.length > 0 ? availableCareers : CAREERS;

  const pickedSkillNames = new Set();
  const careerPicks = [];

  for (let i = 0; i < numSkills; i++) {
    // Find careers that still have at least one unchosen skill
    const careersWithSkills = careerPool.filter(c =>
      c.skills.some(s => !pickedSkillNames.has(s))
    );
    if (careersWithSkills.length === 0) break; // exhausted all unique skills

    const career = pickRandom(careersWithSkills);
    const available = career.skills.filter(s => !pickedSkillNames.has(s));
    const skill = pickRandom(available);

    pickedSkillNames.add(skill);
    const souvenir = career.souvenirs[roll(4) - 1];
    careerPicks.push({ career, skill, souvenir });
  }

  // 7 ── Preferred weapon
  const dmgTypes = ["perfurante", "contundente", "cortante"];
  const dmgType = pickRandom(dmgTypes);
  
  // Get all weapons of this damage type (including both special-effect and ranged)
  const availableWeapons = WEAPONS.filter(w => w.type === dmgType);
  const prefWeapon = pickRandom(availableWeapons);

  // 8 ── Starting equipment combo
  const combo = pickRandom(STARTING_COMBOS);
  const comboWeapons = [];
  
  // Select weapons matching the combo's speed requirement
  // Fast (d6): any Fast weapon
  // Balanced (d8): any Balanced weapon
  // Slow (d10): any Slow weapon
  const diceForSpeed = {
    "Rápida":      "d6",
    "Equilibrada": "d8",
    "Lenta":       "d10",
  };
  const targetDice = diceForSpeed[combo.weaponSpeed];
  const pool = WEAPONS.filter(w => w.speed === combo.weaponSpeed && w.dice === targetDice);

  for (let i = 0; i < combo.weaponCount; i++) {
    if (pool.length > 0) {
      comboWeapons.push(pickRandom(pool));
    }
  }

  // 9 ── Coins
  const coins = roll(6) + roll(6) + roll(6);

  return {
    FOR, DEX, VON, guarda, sorte, species,
    ageRow, ageStr, useAge, useLuck, useSpecies,
    careerPicks, dmgType, prefWeapon,
    combo, comboWeapons, coins,
  };
}

// ── Inventory slot calculator ────────────────────────────────

function calcSlots(char) {
  let slots = 0;
  // Fixed items
  FIXED_ITEMS.forEach(it => { slots += it.slots; });
  // Preferred weapon
  slots += char.prefWeapon.slots;
  // Combo armor
  slots += char.combo.armor.slots;
  // Combo weapons
  char.comboWeapons.forEach(w => { slots += w.slots; });
  return slots;
}

// ── Markdown renderer ────────────────────────────────────────

function buildMarkdown(char, name, pronouns, appearance) {
  const displayName = name.trim() || "Sem Nome";
  const lines = [];

  lines.push(`# ${displayName} — Ficha de Personagem`);
  lines.push(``);

  if (pronouns.trim())   lines.push(`**Pronomes:** ${pronouns.trim()}`);
  if (appearance.trim()) lines.push(`**Aparência:** ${appearance.trim()}`);
  if (pronouns.trim() || appearance.trim()) lines.push(``);

  // Age
  if (char.useAge && char.ageStr) {
    lines.push(`**Idade:** ${char.ageStr}`);
    const row = char.ageRow;
    const mods = [];
    if (row.forMod !== 0) mods.push(`FOR ${row.forMod > 0 ? "+" : ""}${row.forMod}`);
    if (row.dexMod !== 0) mods.push(`DEX ${row.dexMod > 0 ? "+" : ""}${row.dexMod}`);
    if (row.vonMod !== 0) mods.push(`VON ${row.vonMod > 0 ? "+" : ""}${row.vonMod}`);
    if (mods.length) lines.push(`*(modificadores aplicados: ${mods.join(", ")})*`);
    lines.push(``);
  }

  // Attributes
  lines.push(`## Atributos`);
  lines.push(``);
  lines.push(`| FOR | DEX | VON | Guarda |`);
  lines.push(`|-----|-----|-----|--------|`);
  lines.push(`| ${char.FOR}  | ${char.DEX}  | ${char.VON}  | ${char.guarda}      |`);
  lines.push(``);

  // Descriptors
  const dFor = descriptor("FOR", char.FOR);
  const dDex = descriptor("DEX", char.DEX);
  const dVon = descriptor("VON", char.VON);
  if (dFor || dDex || dVon) {
    const descs = [dFor, dDex, dVon].filter(Boolean);
    lines.push(`*${descs.join(" · ")}*`);
    lines.push(``);
  }

  // Luck
  if (char.useLuck) {
    lines.push(`**Sorte:** ${char.sorte} pontos`);
    lines.push(``);
  }

  // Species
  if (char.useSpecies && char.species) {
    lines.push(`## Espécie Fantástica`);
    lines.push(``);
    lines.push(`**${char.species.name}** *(${char.species.examples})*`);
    lines.push(`${char.species.description}`);
    lines.push(``);
  }

  // Careers & Skills
  lines.push(`## Carreiras & Habilidades`);
  lines.push(``);
  char.careerPicks.forEach(pick => {
    const desc = skillDesc(pick.skill) ? ` — ${skillDesc(pick.skill)}` : "";
    lines.push(`- **${pick.career.name}** → ${pick.skill}${desc}`);
  });
  lines.push(``);

  // Preferred weapon
  const dmgLabel = { perfurante: "Perfurante", contundente: "Contundente", cortante: "Cortante" }[char.dmgType];
  lines.push(`## Arma Preferida`);
  lines.push(``);
  lines.push(`**Tipo de Dano:** ${dmgLabel} *(proficiência de tipo concedida)*`);
  const wpProps = char.prefWeapon.properties.join(", ");
  lines.push(`**Arma (proficiência):** ${char.prefWeapon.name} — ${char.prefWeapon.dice} ${char.prefWeapon.speed}${wpProps ? `, ${wpProps}` : ""}`);
  lines.push(``);

  // Inventory
  const usedSlots = calcSlots(char);
  lines.push(`## Inventário (${usedSlots}/10 espaços)`);
  lines.push(``);
  lines.push(`**Armadura/Proteção**`);
  const armor = char.combo.armor;
  lines.push(`- ${armor.name} — ${armor.value} Arm.${armor.bulky ? ", Volumosa" : ""} *(${armor.slots} ${armor.slots === 1 ? "espaço" : "espaços"})*`);
  lines.push(``);
  lines.push(`**Armas (equipamento inicial)**`);
  char.comboWeapons.forEach(w => {
    const props = w.properties.join(", ");
    lines.push(`- ${w.name} — ${w.dice} ${w.speed}, ${dmgTypePT(w.type)}${props ? `, ${props}` : ""} *(${w.slots} ${w.slots === 1 ? "espaço" : "espaços"})*`);
  });
  lines.push(``);
  lines.push(`**Arma Preferida (recebida)**`);
  const ppProps = char.prefWeapon.properties.join(", ");
  lines.push(`- ${char.prefWeapon.name} — ${char.prefWeapon.dice} ${char.prefWeapon.speed}, ${dmgTypePT(char.prefWeapon.type)}${ppProps ? `, ${ppProps}` : ""} *(${char.prefWeapon.slots} ${char.prefWeapon.slots === 1 ? "espaço" : "espaços"})*`);
  lines.push(``);
  lines.push(`**Itens Padrão**`);
  FIXED_ITEMS.forEach(it => {
    lines.push(`- ${it.name}${it.slots > 0 ? ` *(${it.slots} ${it.slots === 1 ? "espaço" : "espaços"})*` : ""}`);
  });
  lines.push(`- ${char.coins} moedas`);
  lines.push(``);

  // Souvenirs
  lines.push(`## Souvenir(s)`);
  lines.push(``);
  char.careerPicks.forEach(pick => {
    lines.push(`- **${pick.career.name}:** ${pick.souvenir}`);
  });
  lines.push(``);

  // Rumors
  lines.push(`## Boatos`);
  lines.push(``);
  lines.push(`- *(Boato verdadeiro sobre a região — a definir com o Mestre)*`);
  lines.push(`- *(Boato falso sobre a região — a definir com o Mestre)*`);

  return lines.join("\n");
}

function dmgTypePT(type) {
  return { perfurante: "Perfurante", contundente: "Contundente", cortante: "Cortante" }[type] || type;
}

// ── Preview renderer (visual HTML summary) ───────────────────

function renderPreview(char, name, pronouns, appearance) {
  const displayName = name.trim() || "Sem Nome";

  // ── Stat boxes ──
  const statBoxes = document.getElementById("stat-boxes");
  const dFor = descriptor("FOR", char.FOR);
  const dDex = descriptor("DEX", char.DEX);
  const dVon = descriptor("VON", char.VON);
  statBoxes.innerHTML = [
    makeStatBox("FOR", char.FOR, dFor),
    makeStatBox("DEX", char.DEX, dDex),
    makeStatBox("VON", char.VON, dVon),
    makeStatBox("Guarda", char.guarda, null),
    char.useLuck ? makeStatBox("Sorte", char.sorte, null) : "",
  ].join("");

  // ── Preview content ──
  const preview = document.getElementById("preview-content");
  let html = "";

  // Identity
  html += `<div class="preview-block">`;
  html += `<h3>Identidade</h3>`;
  html += `<p><strong>${escHtml(displayName)}</strong>`;
  if (pronouns.trim()) html += ` &nbsp;·&nbsp; ${escHtml(pronouns.trim())}`;
  html += `</p>`;
  if (appearance.trim()) html += `<p style="font-style:italic;margin-top:4px;">${escHtml(appearance.trim())}</p>`;
  html += `</div>`;

  // Age
  if (char.useAge && char.ageStr) {
    const row = char.ageRow;
    const mods = [];
    if (row.forMod !== 0) mods.push(`FOR ${row.forMod > 0 ? "+" : ""}${row.forMod}`);
    if (row.dexMod !== 0) mods.push(`DEX ${row.dexMod > 0 ? "+" : ""}${row.dexMod}`);
    if (row.vonMod !== 0) mods.push(`VON ${row.vonMod > 0 ? "+" : ""}${row.vonMod}`);
    html += `<div class="preview-block">`;
    html += `<h3>Idade</h3>`;
    html += `<p>${escHtml(char.ageStr)}`;
    if (mods.length) html += ` <span class="age-badge">mods: ${mods.join(", ")}</span>`;
    html += `</p></div>`;
  }

  // Species
  if (char.useSpecies && char.species) {
    html += `<div class="preview-block">`;
    html += `<h3>Espécie</h3>`;
    html += `<p><strong>${escHtml(char.species.name)}</strong> <span class="species-badge">${escHtml(char.species.examples)}</span></p>`;
    html += `<p class="skill-desc">${escHtml(char.species.description)}</p>`;
    html += `</div>`;
  }

  // Careers
  html += `<div class="preview-block">`;
  html += `<h3>Carreiras & Habilidades</h3>`;
  char.careerPicks.forEach((pick, idx) => {
    const desc = skillDesc(pick.skill);
    html += `<div class="career-pick">`;
    html += `<strong>${escHtml(pick.career.name)}</strong> → ${escHtml(pick.skill)}`;
    html += ` <button class="skill-reroll-btn" onclick="reroleSkill(${idx})" title="Sortear nova habilidade">🎲</button>`;
    if (desc) html += `<div class="skill-desc">${escHtml(desc)}</div>`;
    html += `</div>`;
  });
  html += `</div>`;

  // Preferred weapon
  const dmgLabel = dmgTypePT(char.dmgType);
  const wpProps = char.prefWeapon.properties.join(", ");
  html += `<div class="preview-block">`;
  html += `<h3>Arma Preferida</h3>`;
  html += `<p><strong>Tipo:</strong> ${dmgLabel}`;
  html += ` &nbsp;·&nbsp; <strong>${escHtml(char.prefWeapon.name)}</strong>`;
  html += ` ${char.prefWeapon.dice} ${char.prefWeapon.speed}`;
  if (wpProps) html += ` — <em>${escHtml(wpProps)}</em>`;
  html += ` <button class="skill-reroll-btn" onclick="rerolePreferredWeapon()" title="Sortear nova arma preferida">🎲</button>`;
  html += `</p></div>`;

  // Inventory
  const usedSlots = calcSlots(char);
  html += `<div class="preview-block">`;
  html += `<h3>Inventário</h3>`;
  html += `<ul class="inventory-list">`;
  html += `<li>${escHtml(char.combo.armor.name)} — ${char.combo.armor.value} Arm.${char.combo.armor.bulky ? " (Volumosa)" : ""} <em>(${char.combo.armor.slots} espaço${char.combo.armor.slots !== 1 ? "s" : ""})</em></li>`;
  char.comboWeapons.forEach(w => {
    const props = w.properties.join(", ");
    html += `<li>${escHtml(w.name)} — ${w.dice}${props ? ` <em>${escHtml(props)}</em>` : ""}</li>`;
  });
  html += `<li><strong>${escHtml(char.prefWeapon.name)}</strong> (arma preferida) — ${char.prefWeapon.dice}${wpProps ? ` <em>${escHtml(wpProps)}</em>` : ""}</li>`;
  FIXED_ITEMS.forEach(it => {
    html += `<li>${escHtml(it.name)}</li>`;
  });
  html += `<li>${char.coins} moedas</li>`;
  html += `</ul>`;
  html += `<p class="slot-tally">Espaços usados: ${usedSlots} / 10</p>`;
  html += `</div>`;

  // Souvenirs
  html += `<div class="preview-block">`;
  html += `<h3>Souvenir(s)</h3>`;
  html += `<ul class="inventory-list">`;
  char.careerPicks.forEach(pick => {
    html += `<li><strong>${escHtml(pick.career.name)}:</strong> ${escHtml(pick.souvenir)}</li>`;
  });
  html += `</ul></div>`;

  preview.innerHTML = html;
}

function makeStatBox(label, value, note) {
  return `<div class="stat-box">
    <div class="stat-label">${label}</div>
    <div class="stat-value">${value}</div>
    ${note ? `<div class="stat-note">${escHtml(note)}</div>` : ""}
  </div>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Global state for re-rolling ─────────────────────────────

let currentCharacter = null;
let currentIdentity = { name: "", pronouns: "", appearance: "" };

// ── Re-roll individual skill ─────────────────────────────────

function reroleSkill(careerIndex) {
  if (!currentCharacter) return;

  const char = currentCharacter;
  const pick = char.careerPicks[careerIndex];
  if (!pick) return;

  // Get skills from that career
  const career = pick.career;

  // Find all skills already chosen in other picks
  const otherChosenSkills = new Set(
    char.careerPicks
      .map((p, idx) => idx !== careerIndex ? p.skill : null)
      .filter(Boolean)
  );

  // Available skills are ones not in otherChosenSkills
  const available = career.skills.filter(s => !otherChosenSkills.has(s));

  if (available.length === 0) {
    // No unique skills left; keep current
    return;
  }

  // Pick a new one (prefer not to repeat their current skill)
  const candidates = available.filter(s => s !== pick.skill);
  const newSkill = candidates.length > 0 ? pickRandom(candidates) : pickRandom(available);

  pick.skill = newSkill;

  // Refresh display
  renderPreview(char, currentIdentity.name, currentIdentity.pronouns, currentIdentity.appearance);
  document.getElementById("markdown-output").value =
    buildMarkdown(char, currentIdentity.name, currentIdentity.pronouns, currentIdentity.appearance);
}

// ── Re-roll preferred weapon ─────────────────────────────────

function rerolePreferredWeapon() {
  if (!currentCharacter) return;

  const char = currentCharacter;

  // Pick a new damage type
  const dmgTypes = ["perfurante", "contundente", "cortante"];
  const newDmgType = pickRandom(dmgTypes);
  char.dmgType = newDmgType;

  // Get all weapons of this damage type
  const availableWeapons = WEAPONS.filter(w => w.type === newDmgType);
  
  if (availableWeapons.length === 0) {
    // Fallback (shouldn't happen)
    char.prefWeapon = pickRandom(WEAPONS.filter(w => w.specialEffect));
  } else {
    char.prefWeapon = pickRandom(availableWeapons);
  }

  // Refresh display
  renderPreview(char, currentIdentity.name, currentIdentity.pronouns, currentIdentity.appearance);
  document.getElementById("markdown-output").value =
    buildMarkdown(char, currentIdentity.name, currentIdentity.pronouns, currentIdentity.appearance);
}

// ── Entry point ──────────────────────────────────────────────

function generate() {
  const name       = document.getElementById("char-name").value;
  const pronouns   = document.getElementById("char-pronouns").value;
  const appearance = document.getElementById("char-appearance").value;

  currentIdentity = { name, pronouns, appearance };
  currentCharacter = generateCharacter();

  renderPreview(currentCharacter, name, pronouns, appearance);

  document.getElementById("markdown-output").value =
    buildMarkdown(currentCharacter, name, pronouns, appearance);

  const section = document.getElementById("output-section");
  section.style.display = "block";
  section.scrollIntoView({ behavior: "smooth", block: "start" });

  // Reset copy button state
  const copyBtn = document.getElementById("copy-btn");
  copyBtn.textContent = "📋 Copiar Markdown";
  copyBtn.classList.remove("copied");
}

// ── Copy to clipboard ────────────────────────────────────────

function copyMarkdown() {
  const ta = document.getElementById("markdown-output");
  ta.select();
  ta.setSelectionRange(0, 999999);

  let copied = false;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(ta.value).then(() => {
      markCopied();
    }).catch(() => {
      document.execCommand("copy");
      markCopied();
    });
  } else {
    document.execCommand("copy");
    markCopied();
  }
}

function markCopied() {
  const btn = document.getElementById("copy-btn");
  btn.textContent = "✅ Copiado!";
  btn.classList.add("copied");
  setTimeout(() => {
    btn.textContent = "📋 Copiar Markdown";
    btn.classList.remove("copied");
  }, 2500);
}
