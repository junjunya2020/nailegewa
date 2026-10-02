(() => {
  'use strict';
  const levels = [{ types: 4, label: '关卡 01' }, { types: 5, label: '关卡 02' }, { types: 6, label: '关卡 03' }];
  const assets = Array.from({ length: 6 }, (_, i) => `tiles/color${i}.webp`);
  const laughSounds = Array.from({ length: 5 }, (_, i) => new Audio(`bgm/combo${i + 1}.mp3`));
  const positions = [[12,35,0],[28,26,0],[44,36,0],[60,27,0],[76,37,0],[20,55,0],[38,58,0],[56,54,0],[72,59,0],[20,16,1],[38,18,1],[56,15,1],[68,27,1],[29,40,1],[48,38,1],[66,44,1],[37,62,1],[55,60,1],[31,27,2],[49,25,2],[39,45,2],[57,45,2],[48,59,2],[42,35,3]];
  const board = document.querySelector('#board'); const trayNode = document.querySelector('#tray'); const overlay = document.querySelector('#overlay'); const toast = document.querySelector('#toast');
  let level = 0; let tiles = []; let tray = []; let history = []; let limit = 7; let active = false; let pendingMoves = 0; let inventory = { remove: 2, undo: 2, expand: 1 };
  const shuffle = (items) => { const copy = [...items]; for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; };
  const overlaps = (a, b) => Math.abs(a.x - b.x) < 15 && Math.abs(a.y - b.y) < 18;
  const isCovered = (tile) => tiles.some((other) => !other.removed && !other.pending && other.z > tile.z && overlaps(tile, other));

  function buildLevel() {
    const typeCount = levels[level].types; const source = shuffle(Array.from({ length: typeCount }, (_, type) => Array(6).fill(type)).flat());
    const selected = shuffle(positions).slice(0, typeCount * 6).map((pos, index) => ({ id: `tile-${index}`, x: pos[0], y: pos[1], z: pos[2], type: null, removed: false }));
    const remaining = [...selected]; const clickOrder = [];
    while (remaining.length) { const free = remaining.filter((tile) => !remaining.some((other) => other.z > tile.z && overlaps(tile, other))); const pick = free[Math.floor(Math.random() * free.length)]; clickOrder.push(pick); remaining.splice(remaining.indexOf(pick), 1); }
    clickOrder.forEach((tile, index) => { tile.type = source[index]; }); tiles = selected; tray = []; history = []; limit = 7; pendingMoves = 0; inventory = { remove: 2, undo: 2, expand: 1 }; render();
  }

  function render() {
    board.innerHTML = '';
    tiles.filter((tile) => !tile.removed).sort((a, b) => a.z - b.z).forEach((tile) => { const node = document.createElement('button'); node.className = `tile${isCovered(tile) ? ' covered' : ''}`; node.dataset.id = tile.id; node.style.left = `calc(${tile.x}% - 32px)`; node.style.top = `calc(${tile.y}% - 38px)`; node.style.zIndex = tile.z + 1; node.innerHTML = `<span class="face"><img src="${assets[tile.type]}" alt="蛙纹牌"></span>`; node.addEventListener('click', () => selectTile(tile.id)); board.appendChild(node); });
    trayNode.innerHTML = ''; for (let index = 0; index < limit; index += 1) { const item = tray[index]; const node = document.createElement('div'); node.className = item ? 'tray-card' : 'slot'; node.innerHTML = item ? `<img src="${assets[item.type]}" alt="">` : '·'; trayNode.appendChild(node); }
    document.querySelector('#remaining').textContent = tiles.filter((tile) => !tile.removed).length; document.querySelector('#limitText').textContent = limit; document.querySelector('#levelText').textContent = levels[level].label;
    document.querySelectorAll('[data-tool]').forEach((button) => { const key = button.dataset.tool; button.disabled = !active || inventory[key] === 0; button.querySelector('span').textContent = inventory[key]; });
  }

  function selectTile(id) {
    const tile = tiles.find((item) => item.id === id); if (!tile) return;
    const slotIndex = Math.min(tray.length + pendingMoves, limit - 1);
    animateToTray(tile, document.querySelector(`[data-id="${tile.id}"]`), slotIndex);
  }

  function animateToTray(tile, node, slotIndex) {
    if (!node) return; const emptySlot = trayNode.children[Math.min(slotIndex, limit - 1)] || trayNode.lastElementChild; if (!emptySlot) return;
    const start = node.getBoundingClientRect(); const target = emptySlot.getBoundingClientRect();
    const x = target.left + (target.width - start.width) / 2 - start.left; const y = target.top + (target.height - start.height) / 2 - start.top;
    const snapshot = { removed: new Set(tiles.filter((item) => item.removed).map((item) => item.id)), tray: tray.map((item) => item.id) };
    history.push(snapshot);
    pendingMoves += 1; tile.pending = true; node.classList.add('moving'); node.style.setProperty('--move-x', `${x}px`); node.style.setProperty('--move-y', `${y}px`);
    requestAnimationFrame(() => requestAnimationFrame(() => node.classList.add('traveling')));
    window.setTimeout(() => { tile.removed = true; tile.pending = false; tray.push(tile); pendingMoves -= 1; if (tray.filter((item) => item.type === tile.type).length >= 3) { tray = tray.filter((item) => item.type !== tile.type); playLaugh(); announce('奶蛙笑出声了！'); } if (pendingMoves === 0) { render(); checkState(); } }, 450);
  }
  function checkState() {
    if (!tiles.some((tile) => !tile.removed)) { active = false; level += 1; if (level >= levels.length) { level = 0; showDialog('🐸', '奶蛙通关了', '三场关卡全部完成，下一轮会从第一关重新开始。', '再玩一次'); } else showDialog('✨', '这一关完成了', `下一站：${levels[level].label}，会多一种蛙纹。`, '继续游戏'); return; }
    if (tray.length >= limit) { active = false; showDialog('📱', '奶蛙手机槽满了', '调整收集顺序后再试一次吧。', '重新开始'); }
  }
  function announce(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(announce.timer); announce.timer = setTimeout(() => toast.classList.remove('show'), 1500); }
  function showDialog(icon, title, text, buttonText) { overlay.innerHTML = `<div class="dialog"><div class="big">${icon}</div><h2>${title}</h2><p>${text}</p><button id="start">${buttonText}</button></div>`; overlay.hidden = false; document.querySelector('#start').addEventListener('click', () => { overlay.hidden = true; active = true; buildLevel(); }); }
  function useTool(key) {
    if (!active || pendingMoves > 0 || inventory[key] === 0) return;
    if (key === 'remove') { const free = tiles.filter((tile) => !tile.removed && !tile.pending && !isCovered(tile)); const tile = free[Math.floor(Math.random() * free.length)]; if (!tile) { announce('没有可以移出的奶蛙'); return; } const node = document.querySelector(`[data-id="${tile.id}"]`); inventory.remove -= 1; animateToTray(tile, node, tray.length); announce('移出一只奶蛙'); return; }
    if (key === 'undo') { const snapshot = history.pop(); if (!snapshot) { announce('没有可以撤销的操作'); return; } tiles.forEach((tile) => { tile.removed = snapshot.removed.has(tile.id); }); tray = snapshot.tray.map((id) => tiles.find((tile) => tile.id === id)).filter(Boolean); inventory.undo -= 1; render(); announce('已撤销上一步'); return; }
    if (key === 'expand') { limit = 9; inventory.expand -= 1; announce('手机槽多开了两格位置'); }
    render(); checkState();
  }
  function playLaugh() { const sound = laughSounds[Math.floor(Math.random() * laughSounds.length)]; sound.currentTime = 0; sound.volume = 0.7; sound.play().catch(() => {}); }
  document.querySelectorAll('[data-tool]').forEach((button) => button.addEventListener('click', () => useTool(button.dataset.tool)));
  document.querySelector('#start').addEventListener('click', () => { overlay.hidden = true; active = true; buildLevel(); }); render();
})();
