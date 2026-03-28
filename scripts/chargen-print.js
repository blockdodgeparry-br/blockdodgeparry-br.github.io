// ============================================================
// chargen-print.js
// Fills and controls the printable A4 character sheet modal.
// Depends on: FIXED_ITEMS (chargen-data.js), currentCharacter
// and currentIdentity (chargen.js globals).
// ============================================================

function openPrintSheet(char, identity) {
  if (!char) return;
  _fillPrintSheet(char, identity || { name: "", pronouns: "", appearance: "" });
  document.getElementById("print-sheet").style.display = "flex";
  document.body.classList.add("no-scroll");
}

function closePrintSheet() {
  document.getElementById("print-sheet").style.display = "none";
  document.body.classList.remove("no-scroll");
}

function triggerPrint() {
  window.print();
}

// ── Main fill function ───────────────────────────────────────

function _fillPrintSheet(char, identity) {
  // Name
  const nameEl = document.getElementById("ps-name");
  if (nameEl) nameEl.textContent = identity.name || "";

  // Stats — Máx pre-filled; Atual left blank for play tracking
  _setText("ps-for",      char.FOR);
  _setText("ps-dex",      char.DEX);
  _setText("ps-von",      char.VON);
  _setText("ps-guarda",   char.guarda);
  _setText("ps-armadura", char.combo.armor.value);

  // Careers (up to 4 field lines)
  const careersEl = document.getElementById("ps-careers-list");
  if (careersEl) {
    careersEl.innerHTML = "";
    const names = char.careerPicks.map(p => p.career.name);
    for (let i = 0; i < 4; i++) {
      careersEl.appendChild(_fieldLine(names[i] || ""));
    }
  }

  // Skills (up to 10 field lines)
  const skillsEl = document.getElementById("ps-skills-list");
  if (skillsEl) {
    skillsEl.innerHTML = "";
    const skills = char.careerPicks.map(p => p.skill);
    for (let i = 0; i < 10; i++) {
      skillsEl.appendChild(_fieldLine(skills[i] || ""));
    }
  }

  // Inventory (10 slots; bulky items get a filled bracket indicator)
  const invEl = document.getElementById("ps-inventory-list");
  if (invEl) {
    invEl.innerHTML = "";
    const items = _buildInventoryItems(char);
    for (let i = 0; i < 10; i++) {
      const item = items[i] || { name: "", bulky: false };
      invEl.appendChild(_invRow(item.name, item.bulky));
    }
  }

  // Proficiências Tipo de Dano — starting value of 1 in the character's damage type
  ["cortante", "perfurante", "contundente"].forEach(type => {
    const el = document.getElementById("ps-prof-" + type);
    if (el) el.textContent = char.dmgType === type ? "1" : "";
  });

  // Proficiências Armas — 3 blank weapon-proficiency rows
  const weapEl = document.getElementById("ps-prof-weapons-list");
  if (weapEl) {
    weapEl.innerHTML = "";
    for (let i = 0; i < 3; i++) {
      weapEl.appendChild(_weapProfRow());
    }
  }
}

// ── Inventory item list builder ──────────────────────────────

function _buildInventoryItems(char) {
  const items = [];
  const armor = char.combo.armor;
  items.push({ name: `${armor.name} — ${armor.value} Arm.`, bulky: armor.bulky });

  char.comboWeapons.forEach(w => {
    items.push({ name: `${w.name} (${w.dice})`, bulky: w.slots >= 2 });
  });

  items.push({
    name: `${char.prefWeapon.name} (${char.prefWeapon.dice}) — pref.`,
    bulky: char.prefWeapon.slots >= 2,
  });

  FIXED_ITEMS.forEach(it => {
    items.push({ name: it.name, bulky: false });
  });

  items.push({ name: `${char.coins} moedas`, bulky: false });
  return items;
}

// ── DOM helpers ──────────────────────────────────────────────

function _setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function _fieldLine(text) {
  const div = document.createElement("div");
  div.className = "ps-field-row";
  const span = document.createElement("span");
  span.className = "ps-ruled ps-ruled-full";
  span.textContent = text;
  div.appendChild(span);
  return div;
}

function _invRow(text, bulky) {
  const div = document.createElement("div");
  div.className = "ps-inv-row";
  const span = document.createElement("span");
  span.className = "ps-ruled ps-ruled-full";
  span.textContent = text;
  const bracket = document.createElement("span");
  bracket.className = bulky ? "ps-bracket ps-bracket-filled" : "ps-bracket";
  div.appendChild(span);
  div.appendChild(bracket);
  return div;
}

function _weapProfRow() {
  const div = document.createElement("div");
  div.className = "ps-weap-prof-row";
  const span = document.createElement("span");
  span.className = "ps-ruled ps-ruled-full";
  const bracket = document.createElement("span");
  bracket.className = "ps-bracket";
  const five = document.createElement("span");
  five.className = "ps-slash-five";
  five.textContent = "/5";
  div.appendChild(span);
  div.appendChild(bracket);
  div.appendChild(five);
  return div;
}
