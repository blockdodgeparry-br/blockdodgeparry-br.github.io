// ============================================================
// chargen-manual.js — User-driven character creation form
// Depends on: chargen-data.js (must load first), chargen.js,
//             chargen-print.js, chargen-pdf.js
// ============================================================

// ── State ────────────────────────────────────────────────────

const ms = {
  FOR: null, DEX: null, VON: null, guarda: null,
  ageRow: null, ageStr: null, useAge: false,
  useLuck: false, useSpecies: false,
  species: null,
  numSkills: 4,             // recalculated by age roll
  slots: [],                // [{ career, skill, souvenir }]
  dmgType: null,
  prefWeapon: null,
  combo: null,
  comboWeapons: [],
  coins: null,
};

// ── Bootstrap ────────────────────────────────────────────────

function manualInit() {
  _bindOptionalToggles();
  _buildCareerSlots(ms.numSkills);
  _populateComboSelect();
}

// ── Optional rule toggles ─────────────────────────────────────

function _bindOptionalToggles() {
  document.getElementById("opt-age").addEventListener("change", _onOptChange);
  document.getElementById("opt-luck").addEventListener("change", _onOptChange);
  document.getElementById("opt-species").addEventListener("change", _onOptChange);
  document.getElementById("opt-no-magic").addEventListener("change", _onCareerFilterChange);
  document.getElementById("opt-no-faith").addEventListener("change", _onCareerFilterChange);
}

function _onOptChange() {
  ms.useAge     = document.getElementById("opt-age").checked;
  ms.useLuck    = document.getElementById("opt-luck").checked;
  ms.useSpecies = document.getElementById("opt-species").checked;

  document.getElementById("age-section").style.display    = ms.useAge ? "block" : "none";
  document.getElementById("species-section").style.display = ms.useSpecies ? "block" : "none";
  document.getElementById("luck-note").style.display = ms.useLuck ? "block" : "none";

  // Reset age state when unchecked
  if (!ms.useAge) {
    ms.ageRow = null;
    ms.ageStr = null;
    ms.numSkills = 4;
    document.getElementById("age-result").innerHTML = "";
    _buildCareerSlots(4);
    _refreshAttrDisplays();
  }
}

function _onCareerFilterChange() {
  // Rebuild dropdowns preserving valid picks
  _buildCareerSlots(ms.numSkills);
}

// ── Attribute rolling ─────────────────────────────────────────

function rollAttr(attr) {
  const base = roll(6) + roll(6) + roll(6);
  ms[attr] = base;
  _refreshAttrDisplays();
}

function rollGuarda() {
  ms.guarda = roll(6);
  document.getElementById("guarda-val").textContent = ms.guarda;
}

function rollCoins() {
  ms.coins = roll(6) + roll(6) + roll(6);
  document.getElementById("coins-val").textContent = ms.coins + " moedas";
}

function _getEffective(attr) {
  const base = ms[attr];
  if (base === null) return null;
  if (!ms.ageRow) return base;
  const mod = ms.ageRow[attr.toLowerCase() + "Mod"];
  return Math.min(18, Math.max(3, base + (mod || 0)));
}

function _refreshAttrDisplays() {
  ["FOR", "DEX", "VON"].forEach(attr => {
    const eff = _getEffective(attr);
    const el = document.getElementById(attr.toLowerCase() + "-val");
    if (!el) return;
    if (eff === null) { el.textContent = "—"; return; }
    const base = ms[attr];
    const mod  = ms.ageRow ? (ms.ageRow[attr.toLowerCase() + "Mod"] || 0) : 0;
    el.textContent = eff;
    const noteEl = document.getElementById(attr.toLowerCase() + "-mod");
    if (noteEl) noteEl.textContent = (ms.ageRow && mod !== 0) ? (mod > 0 ? `+${mod}` : `${mod}`) : "";
  });
}

// ── Age rolling ───────────────────────────────────────────────

function rollAge() {
  const d6 = roll(6);
  const row = getAgeRow(d6);
  ms.ageRow = row;
  const years = row.ageBase + roll(row.ageDice);
  ms.ageStr = `${years} anos — ${row.name} (${row.experience})`;

  // Recalculate skill count (use a fresh roll for formulas)
  ms.numSkills = calcSkillCount(row);

  const mods = [];
  if (row.forMod !== 0) mods.push(`FOR ${row.forMod > 0 ? "+" : ""}${row.forMod}`);
  if (row.dexMod !== 0) mods.push(`DEX ${row.dexMod > 0 ? "+" : ""}${row.dexMod}`);
  if (row.vonMod !== 0) mods.push(`VON ${row.vonMod > 0 ? "+" : ""}${row.vonMod}`);

  const modStr = mods.length ? ` <em style="font-size:0.88em;color:#555;">(${mods.join(", ")})</em>` : "";
  document.getElementById("age-result").innerHTML =
    `<strong>${ms.ageStr}</strong>${modStr}<br>` +
    `<em style="font-size:0.88em;color:#555;">Slots de carreira: ${ms.numSkills}</em>`;

  _refreshAttrDisplays();
  _buildCareerSlots(ms.numSkills);
}

// ── Species rolling ───────────────────────────────────────────

function rollSpecies() {
  ms.species = pickRandom(SPECIES_TRAITS);
  document.getElementById("species-result").innerHTML =
    `<strong>${ms.species.name}</strong> <em>(${ms.species.examples})</em><br>` +
    `<span style="font-size:0.9em;">${ms.species.description}</span>`;
}

// ── Career slot management ────────────────────────────────────

function _buildCareerSlots(n) {
  ms.numSkills = n;
  const container = document.getElementById("career-slots");
  const existingSlots = ms.slots.slice(0, n);
  // Pad to n with null entries
  while (existingSlots.length < n) existingSlots.push(null);
  ms.slots = existingSlots;

  container.innerHTML = "";
  for (let i = 0; i < n; i++) {
    container.appendChild(_makeCareerSlotEl(i));
  }
}

function _filteredCareers() {
  const noMagic = document.getElementById("opt-no-magic").checked;
  const noFaith = document.getElementById("opt-no-faith").checked;
  return CAREERS.filter(c => {
    if (noMagic && c.isMagic) return false;
    if (noFaith && c.isFaith) return false;
    return true;
  });
}

function _chosenSkillsExcluding(excludeIndex) {
  return new Set(
    ms.slots
      .map((s, i) => (i !== excludeIndex && s) ? s.skill : null)
      .filter(Boolean)
  );
}

function _makeCareerSlotEl(i) {
  const wrap = document.createElement("div");
  wrap.className = "career-slot";
  wrap.dataset.index = i;

  const label = document.createElement("div");
  label.className = "career-slot-label";
  label.textContent = `Carreira ${i + 1}`;
  wrap.appendChild(label);

  const row = document.createElement("div");
  row.className = "career-slot-row";

  // Career select
  const careerSel = document.createElement("select");
  careerSel.id = `career-sel-${i}`;
  careerSel.className = "chargen-select";
  const blankOpt = document.createElement("option");
  blankOpt.value = "";
  blankOpt.textContent = "— Escolha uma carreira —";
  careerSel.appendChild(blankOpt);
  _filteredCareers().forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    if (ms.slots[i] && ms.slots[i].career.id === c.id) opt.selected = true;
    careerSel.appendChild(opt);
  });
  careerSel.addEventListener("change", () => onCareerChange(i));

  // Skill select
  const skillSel = document.createElement("select");
  skillSel.id = `skill-sel-${i}`;
  skillSel.className = "chargen-select";
  const blankSkill = document.createElement("option");
  blankSkill.value = "";
  blankSkill.textContent = "— Escolha uma habilidade —";
  skillSel.appendChild(blankSkill);
  // Pre-populate if prior career was chosen
  if (ms.slots[i]?.career) {
    _populateSkillSelect(i, ms.slots[i].career);
  }
  skillSel.addEventListener("change", () => onSkillChange(i));

  row.appendChild(careerSel);
  row.appendChild(skillSel);
  wrap.appendChild(row);

  // Souvenir display + reroll
  const souvenirRow = document.createElement("div");
  souvenirRow.className = "souvenir-row";
  souvenirRow.id = `souvenir-row-${i}`;
  if (ms.slots[i]?.souvenir) {
    souvenirRow.innerHTML = _souvenirHTML(i, ms.slots[i].souvenir);
  }
  wrap.appendChild(souvenirRow);

  return wrap;
}

function _populateSkillSelect(index, career) {
  const sel = document.getElementById(`skill-sel-${index}`);
  if (!sel) return;
  const taken = _chosenSkillsExcluding(index);
  const currentSkill = ms.slots[index]?.skill || "";

  sel.innerHTML = "";
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "— Escolha uma habilidade —";
  sel.appendChild(blank);

  career.skills.forEach(s => {
    if (taken.has(s) && s !== currentSkill) return; // hide taken skills
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    if (s === currentSkill) opt.selected = true;
    sel.appendChild(opt);
  });
}

function onCareerChange(i) {
  const careerSel = document.getElementById(`career-sel-${i}`);
  const careerId = careerSel.value;
  const career = CAREERS.find(c => c.id === careerId) || null;

  if (!career) {
    ms.slots[i] = null;
    const skillSel = document.getElementById(`skill-sel-${i}`);
    if (skillSel) { skillSel.innerHTML = ""; const b = document.createElement("option"); b.value = ""; b.textContent = "— Escolha uma habilidade —"; skillSel.appendChild(b); }
    document.getElementById(`souvenir-row-${i}`).innerHTML = "";
    return;
  }

  // Auto-roll souvenir
  const souvenir = career.souvenirs[roll(4) - 1];
  ms.slots[i] = { career, skill: "", souvenir };

  _populateSkillSelect(i, career);
  document.getElementById(`souvenir-row-${i}`).innerHTML = _souvenirHTML(i, souvenir);
}

function onSkillChange(i) {
  const skillSel = document.getElementById(`skill-sel-${i}`);
  const skill = skillSel.value;
  if (ms.slots[i]) ms.slots[i].skill = skill;

  // Propagate deduplication to all other slots
  for (let j = 0; j < ms.numSkills; j++) {
    if (j === i) continue;
    if (ms.slots[j]?.career) _populateSkillSelect(j, ms.slots[j].career);
  }
}

function rerollSouvenir(i) {
  if (!ms.slots[i]?.career) return;
  const souvenir = ms.slots[i].career.souvenirs[roll(4) - 1];
  ms.slots[i].souvenir = souvenir;
  document.getElementById(`souvenir-row-${i}`).innerHTML = _souvenirHTML(i, souvenir);
}

function _souvenirHTML(i, souvenir) {
  return `<span class="souvenir-label">Souvenir:</span>
          <span class="souvenir-text">${souvenir}</span>
          <button class="skill-reroll-btn" onclick="rerollSouvenir(${i})" title="Rolar novamente">🎲</button>`;
}

// ── Damage type + preferred weapon ───────────────────────────

function onDmgTypeChange() {
  const sel    = document.getElementById("dmg-type-sel");
  ms.dmgType   = sel.value || null;
  ms.prefWeapon = null;
  _populateWeaponSelect();
}

function _populateWeaponSelect() {
  const sel = document.getElementById("pref-weapon-sel");
  sel.innerHTML = "";
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "— Escolha uma arma —";
  sel.appendChild(blank);

  if (!ms.dmgType) return;
  WEAPONS.filter(w => w.type === ms.dmgType).forEach(w => {
    const opt = document.createElement("option");
    opt.value = w.name;
    opt.textContent = `${w.name} — ${w.dice} ${w.speed}${w.properties.length ? ", " + w.properties.join(", ") : ""}`;
    if (ms.prefWeapon?.name === w.name) opt.selected = true;
    sel.appendChild(opt);
  });
}

function onWeaponChange() {
  const name = document.getElementById("pref-weapon-sel").value;
  ms.prefWeapon = WEAPONS.find(w => w.name === name) || null;
}

// ── Starting equipment combo ──────────────────────────────────

function _populateComboSelect() {
  const sel = document.getElementById("combo-sel");
  sel.innerHTML = "";
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "— Escolha um equipamento inicial —";
  sel.appendChild(blank);

  STARTING_COMBOS.forEach((c, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = `${c.armor.name} (${c.armor.value} Arm.) + ${c.weaponCount}× arma ${c.weaponSpeed.toLowerCase()}`;
    sel.appendChild(opt);
  });
}

function onComboChange() {
  const idx = document.getElementById("combo-sel").value;
  if (idx === "") { ms.combo = null; ms.comboWeapons = []; document.getElementById("combo-weapons-display").textContent = ""; return; }

  ms.combo = STARTING_COMBOS[parseInt(idx)];
  const diceForSpeed = { "Rápida": "d6", "Equilibrada": "d8", "Lenta": "d10" };
  const targetDice = diceForSpeed[ms.combo.weaponSpeed];
  const pool = WEAPONS.filter(w => w.speed === ms.combo.weaponSpeed && w.dice === targetDice);

  ms.comboWeapons = [];
  for (let i = 0; i < ms.combo.weaponCount; i++) {
    if (pool.length > 0) ms.comboWeapons.push(pickRandom(pool));
  }

  document.getElementById("combo-weapons-display").textContent =
    ms.comboWeapons.map(w => `${w.name} (${w.dice})`).join(", ");
}

// ── Build final character object ──────────────────────────────

function buildCharFromManual() {
  return {
    FOR:     _getEffective("FOR"),
    DEX:     _getEffective("DEX"),
    VON:     _getEffective("VON"),
    guarda:  ms.guarda,
    sorte:   ms.useLuck ? 10 : null,
    species: ms.species,
    ageRow:  ms.ageRow,
    ageStr:  ms.ageStr,
    useAge:     ms.useAge,
    useLuck:    ms.useLuck,
    useSpecies: ms.useSpecies,
    careerPicks: ms.slots.filter(s => s?.career && s?.skill).map(s => ({
      career:   s.career,
      skill:    s.skill,
      souvenir: s.souvenir || "",
    })),
    dmgType:     ms.dmgType,
    prefWeapon:  ms.prefWeapon,
    combo:       ms.combo,
    comboWeapons: ms.comboWeapons,
    coins:       ms.coins,
  };
}

// ── Validation ────────────────────────────────────────────────

function _validate(char) {
  const errors = [];
  if (char.FOR === null)  errors.push("Role FOR");
  if (char.DEX === null)  errors.push("Role DEX");
  if (char.VON === null)  errors.push("Role VON");
  if (char.guarda === null) errors.push("Role Guarda");
  if (char.coins === null)  errors.push("Role Moedas");
  if (!char.dmgType)        errors.push("Escolha um Tipo de Dano");
  if (!char.prefWeapon)     errors.push("Escolha uma Arma Preferida");
  if (!char.combo)          errors.push("Escolha um Equipamento Inicial");
  if (ms.useAge && !ms.ageRow) errors.push("Role a Idade");
  if (ms.useSpecies && !ms.species) errors.push("Role a Espécie");

  const filledSlots = (char.careerPicks || []).length;
  if (filledSlots === 0) errors.push("Escolha ao menos uma carreira e habilidade");

  return errors;
}

// ── Entry point ───────────────────────────────────────────────

let manualCurrentCharacter = null;
let manualCurrentIdentity  = { name: "", pronouns: "", appearance: "" };

function generateManual() {
  const name       = document.getElementById("char-name").value;
  const pronouns   = document.getElementById("char-pronouns").value;
  const appearance = document.getElementById("char-appearance").value;

  manualCurrentIdentity = { name, pronouns, appearance };
  const char = buildCharFromManual();

  const errors = _validate(char);
  if (errors.length) {
    alert("Preencha os seguintes campos antes de continuar:\n• " + errors.join("\n• "));
    return;
  }

  manualCurrentCharacter = char;

  renderPreview(char, name, pronouns, appearance);
  document.getElementById("markdown-output").value =
    buildMarkdown(char, name, pronouns, appearance);

  const section = document.getElementById("output-section");
  section.style.display = "block";
  section.scrollIntoView({ behavior: "smooth", block: "start" });

  const copyBtn = document.getElementById("copy-btn");
  copyBtn.textContent = "📋 Copiar Markdown";
  copyBtn.classList.remove("copied");
}
