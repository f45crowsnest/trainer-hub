/* ============================================================
   Winter Lock In Mini Challenge · WEEK 3 scoring + form logic
   Standalone on purpose: the live week 2 code (scoring.js) is
   untouched, this file owns everything week 3.
   ------------------------------------------------------------
   HOW WEEK 3 POINTS WORK (plain English):

   Cardio (fixed distance, race the clock):
   Rower 500m, SkiErg 500m, BikeErg 1000m. Faster time = more
   points. Your time is compared to a solid-adult baseline for
   your sex and machine, with the same gentle bodyweight
   adjustment and age bonus as week 2. 100 = a solid effort.

   Resistance (static holds, pick a bar colour):
   Front Rack Hold uses the Revo bars: Red 8kg, Blue 12kg, Black 16kg.
   Bicep Curl Hold uses the barbells: Red 15kg, Blue 20kg, Black 30kg.
   Score = hold seconds x (bar weight / your bodyweight), compared
   to a solid-adult baseline. Heavier bar or longer hold, more
   points. Same age bonus. 100 = a solid effort.
   ============================================================ */

var W3_CARDIO = {
  row:  { label: 'Rower 500m',   base: { m: 105, f: 122 }, minSec: 70, maxSec: 600, name: 'Rower 500m time' },
  ski:  { label: 'SkiErg 500m',  base: { m: 115, f: 132 }, minSec: 75, maxSec: 600, name: 'SkiErg 500m time' },
  bike: { label: 'BikeErg 1000m', base: { m: 110, f: 126 }, minSec: 60, maxSec: 600, name: 'Bike 1000m time' }
};

var W3_HOLDS = {
  rack: { label: 'Front Rack Hold', barName: 'Revo bar', bars: { red: 8, blue: 12, black: 16 }, base: { m: 9, f: 6.5 } },
  curl: { label: 'Bicep Curl Hold', barName: 'Barbell', bars: { red: 15, blue: 20, black: 30 }, base: { m: 7.5, f: 4.8 } }
};

var W3_HOLD_SECONDS = { min: 3, max: 600 };
var W3_REF_WEIGHT = { m: 75, f: 65 };

var W3_BOARD_ORDER = ['Front Rack Hold', 'Bicep Curl Hold', 'Rower 500m', 'SkiErg 500m', 'BikeErg 1000m'];

function w3AgeFactor(age) {
  var to65 = Math.min(Math.max(0, age - 30), 35);
  var past65 = Math.max(0, age - 65);
  return Math.min(1.8, 1 + 0.01 * to65 + 0.02 * past65);
}

function w3WeightAdj(sex, weight) {
  var adj = Math.pow(W3_REF_WEIGHT[sex] / weight, 0.15);
  return Math.min(1.12, Math.max(0.88, adj));
}

function w3CardioPoints(input, ergKey, totalSec) {
  var baseline = W3_CARDIO[ergKey].base[input.sex];
  return Math.round(100 * (baseline / totalSec) * w3WeightAdj(input.sex, input.weight) * w3AgeFactor(input.age));
}

function w3HoldPoints(input, holdKey, barKg, seconds) {
  var units = seconds * (barKg / input.weight);
  var baseline = W3_HOLDS[holdKey].base[input.sex];
  return Math.round(100 * (units / baseline) * w3AgeFactor(input.age));
}

function w3FormatTime(totalSec) {
  var m = Math.floor(totalSec / 60);
  var s = Math.round(totalSec % 60);
  if (s === 60) { m += 1; s = 0; }
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function w3ScoreMessage(points, name) {
  var first = name.split(' ')[0];
  if (points >= 170) return 'Off the charts, ' + first + '. Double check the numbers with a coach, then take a bow.';
  if (points >= 130) return 'Are you serious, ' + first + '? That is a monster score. 🔥';
  if (points >= 110) return 'Strong work, ' + first + '. That is well above the bar.';
  if (points >= 90) return 'Solid effort, ' + first + '. Right where you want to be.';
  if (points >= 70) return 'Good work, ' + first + '. You are on the board, now we build.';
  return 'You showed up and tested, ' + first + '. That is the whole point of week 3. Onwards.';
}

function w3PrefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ---------------- page wiring ---------------- */

function initWeek3Page(kind) {
  var state = { sex: null, rack: null, curl: null };

  document.querySelectorAll('.seg-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var group = btn.dataset.group;
      state[group] = btn.dataset.value;
      document.querySelectorAll('.seg-btn[data-group="' + group + '"]').forEach(function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
    });
  });

  var errorEl = document.getElementById('form-error');
  var submitBtn = document.getElementById('submit-btn');

  function clearFieldErrors() {
    errorEl.classList.remove('show');
    document.querySelectorAll('.input-error').forEach(function (el) {
      el.classList.remove('input-error');
      el.removeAttribute('aria-invalid');
    });
  }

  function fail(message, fieldEl) {
    errorEl.textContent = message;
    errorEl.classList.add('show');
    if (fieldEl) {
      fieldEl.classList.add('input-error');
      fieldEl.setAttribute('aria-invalid', 'true');
      fieldEl.focus({ preventScroll: true });
      fieldEl.scrollIntoView({ behavior: w3PrefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
    } else {
      errorEl.scrollIntoView({ behavior: w3PrefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
    }
    return null;
  }

  function numberField(id, min, max, label) {
    var el = document.getElementById(id);
    if (el.validity && el.validity.badInput) {
      return fail('That ' + label + ' does not look like a number. Digits only.', el);
    }
    var value = parseFloat(el.value);
    if (isNaN(value)) return fail('Please fill in your ' + label + '.', el);
    if (value < min || value > max) {
      return fail('That ' + label + ' does not look right. It should be between ' + min + ' and ' + max + '.', el);
    }
    return value;
  }

  // reads a minutes + seconds pair; both empty = skipped (undefined),
  // bad = null, good = total seconds
  function timePair(minId, secId, cfg) {
    var minEl = document.getElementById(minId);
    var secEl = document.getElementById(secId);
    var minRaw = minEl.value.trim();
    var secRaw = secEl.value.trim();
    if (minRaw === '' && secRaw === '') return undefined;

    var mins = minRaw === '' ? 0 : parseFloat(minRaw);
    var secs = secRaw === '' ? 0 : parseFloat(secRaw);
    if (isNaN(mins) || mins < 0 || mins > 9 || mins % 1 !== 0) {
      return fail('Minutes for the ' + cfg.name + ' should be a whole number from 0 to 9.', minEl);
    }
    if (isNaN(secs) || secs < 0 || secs >= 60) {
      return fail('Seconds for the ' + cfg.name + ' go from 0 to 59. Put the minutes in the first box.', secEl);
    }
    var total = mins * 60 + secs;
    if (total < cfg.minSec || total > cfg.maxSec) {
      return fail('That ' + cfg.name + ' does not look right. Check it against the erg screen.', secEl);
    }
    return total;
  }

  function readForm() {
    clearFieldErrors();

    var nameEl = document.getElementById('f-name');
    var name = nameEl.value.trim();
    if (!name) return fail('Please write your name so the record saves properly.', nameEl);
    if (!state.sex) return fail('Please tap Female or Male.');

    var age = numberField('f-age', 14, 90, 'age');
    if (age === null) return null;
    var weight = numberField('f-weight', 30, 250, 'weight');
    if (weight === null) return null;
    var height = numberField('f-height', 120, 230, 'height');
    if (height === null) return null;

    var input = { name: name, sex: state.sex, age: age, weight: weight, height: height };
    var entries = [];

    if (kind === 'cardio') {
      for (var ergKey in W3_CARDIO) {
        var cfg = W3_CARDIO[ergKey];
        var total = timePair('f-' + ergKey + '-min', 'f-' + ergKey + '-sec', cfg);
        if (total === null) return null;
        if (total === undefined) continue;
        entries.push({
          label: cfg.label,
          resultStr: w3FormatTime(total),
          points: w3CardioPoints(input, ergKey, total)
        });
      }
      if (!entries.length) return fail('Fill in a time for at least one erg.', document.getElementById('f-row-min'));
    } else {
      for (var holdKey in W3_HOLDS) {
        var hold = W3_HOLDS[holdKey];
        var secEl = document.getElementById('f-' + holdKey + '-sec');
        var secRaw = secEl.value.trim();
        var colour = state[holdKey];
        if (secRaw === '' && !colour) continue; // hold skipped entirely
        if (secRaw === '') return fail('You picked a bar for the ' + hold.label + ', now add your hold seconds.', secEl);
        if (!colour) return fail('Pick your bar colour for the ' + hold.label + '.');
        var seconds = numberField('f-' + holdKey + '-sec', W3_HOLD_SECONDS.min, W3_HOLD_SECONDS.max, hold.label + ' seconds');
        if (seconds === null) return null;
        var barKg = hold.bars[colour];
        entries.push({
          label: hold.label,
          resultStr: colour.charAt(0).toUpperCase() + colour.slice(1) + ' ' + barKg + 'kg x ' + Math.round(seconds) + 's',
          points: w3HoldPoints(input, holdKey, barKg, seconds)
        });
      }
      if (!entries.length) return fail('Fill in at least one hold: pick a colour and your seconds.');
    }

    input.entries = entries;
    return input;
  }

  function saveRecord(input, entry) {
    var privacyEl = document.getElementById('score-privacy');
    if (typeof MINI_CONFIG === 'undefined' || !MINI_CONFIG.SHEET_URL) {
      privacyEl.textContent =
        'Heads up: saving is not switched on yet, so tell Jino your score. It is still private. 🔒';
      return;
    }
    var data = new FormData();
    data.append('challenge', kind);
    data.append('name', input.name);
    data.append('sex', input.sex === 'm' ? 'Male' : 'Female');
    data.append('age', String(input.age));
    data.append('weightKg', String(input.weight));
    data.append('heightCm', String(input.height));
    data.append('event', entry.label);
    data.append('result', entry.resultStr);
    data.append('points', String(entry.points));
    data.append('week', '3');
    fetch(MINI_CONFIG.SHEET_URL, { method: 'POST', mode: 'no-cors', body: data, keepalive: true })
      .catch(function () {
        privacyEl.textContent =
          'No internet right now, so the save did not go through. Tell Jino your score, it is still private. 🔒';
      });
  }

  function buildBoardList(catLabel, scores, ownEntries) {
    var mine = ownEntries
      .filter(function (e) { return e.label === catLabel; })
      .map(function (e) { return e.points; });
    var pending = scores.slice();
    mine.forEach(function (p) {
      var i = pending.indexOf(p);
      if (i === -1) scores.push(p); else pending.splice(i, 1);
    });
    scores.sort(function (a, b) { return b - a; });

    var listEl = document.createElement('ol');
    listEl.className = 'board-list';
    var unmarked = mine.slice();
    scores.forEach(function (pts, i) {
      var li = document.createElement('li');
      li.className = 'board-row';
      var rank = document.createElement('span');
      rank.className = 'board-rank';
      rank.textContent = String(i + 1);
      var val = document.createElement('span');
      val.className = 'board-points';
      val.textContent = pts + ' pts';
      li.appendChild(rank);
      li.appendChild(val);
      var mineIdx = unmarked.indexOf(pts);
      if (mineIdx !== -1) {
        unmarked.splice(mineIdx, 1);
        li.classList.add('board-you');
        var tag = document.createElement('span');
        tag.className = 'board-you-tag';
        tag.textContent = 'YOU';
        li.appendChild(tag);
      }
      listEl.appendChild(li);
    });
    return listEl;
  }

  // The board endpoint takes several seconds to wake up (free Google script),
  // so we fetch it while the member is still filling in the form. At submit
  // the cached copy shows instantly, then a fresh fetch quietly updates it.
  var cachedBoard = null;

  function fetchBoardData() {
    if (typeof MINI_CONFIG === 'undefined' || !MINI_CONFIG.SHEET_URL) {
      return Promise.reject(new Error('no sheet url'));
    }
    return fetch(MINI_CONFIG.SHEET_URL + '?week=3')
      .then(function (res) { return res.json(); });
  }

  fetchBoardData()
    .then(function (data) { cachedBoard = data; })
    .catch(function () { /* prefetch failed, submit-time fetch will retry */ });

  function renderBoard(ownEntries) {
    if (cachedBoard) renderBoardFromData(cachedBoard, ownEntries);
    fetchBoardData()
      .then(function (data) {
        cachedBoard = data;
        renderBoardFromData(data, ownEntries);
      })
      .catch(function () { /* cached render (if any) stands, else board stays hidden */ });
  }

  function renderBoardFromData(data, ownEntries) {
    var section = (data && data[kind]) || {};
        var groups = Array.isArray(section) ? {} : section;

        var keys = Object.keys(groups).filter(function (k) { return (groups[k] || []).length; });
        ownEntries.forEach(function (e) {
          if (keys.indexOf(e.label) === -1) keys.push(e.label);
        });
        keys.sort(function (a, b) {
          var ia = W3_BOARD_ORDER.indexOf(a), ib = W3_BOARD_ORDER.indexOf(b);
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });

    var wrap = document.getElementById('board-groups');
    wrap.innerHTML = '';
    keys.forEach(function (cat) {
      var scores = (groups[cat] || []).map(Number).filter(function (n) { return !isNaN(n); });
      var h = document.createElement('h3');
      h.className = 'board-cat';
      h.textContent = cat;
      wrap.appendChild(h);
      wrap.appendChild(buildBoardList(cat, scores, ownEntries));
    });
    document.getElementById('board').hidden = false;
  }

  var defaultPrivacyText = document.getElementById('score-privacy').textContent;

  submitBtn.addEventListener('click', function () {
    var input = readForm();
    if (!input) return;

    submitBtn.disabled = true;
    input.entries.forEach(function (entry) { saveRecord(input, entry); });

    var best = Math.max.apply(null, input.entries.map(function (e) { return e.points; }));
    document.getElementById('score-number').textContent = String(best);
    document.getElementById('score-msg').textContent = w3ScoreMessage(best, input.name);

    var breakdownEl = document.getElementById('score-breakdown');
    breakdownEl.innerHTML = '';
    if (input.entries.length > 1) {
      input.entries.forEach(function (entry) {
        var li = document.createElement('li');
        li.textContent = entry.label + ' (' + entry.resultStr + '): ' + entry.points + ' pts';
        breakdownEl.appendChild(li);
      });
      breakdownEl.hidden = false;
    } else {
      breakdownEl.hidden = true;
    }

    document.getElementById('form-view').style.display = 'none';
    document.getElementById('score-view').classList.add('show');
    window.scrollTo(0, 0);
    renderBoard(input.entries);
  });

  document.getElementById('again-btn').addEventListener('click', function () {
    document.getElementById('score-view').classList.remove('show');
    document.getElementById('form-view').style.display = '';
    document.querySelectorAll('.result-field').forEach(function (el) { el.value = ''; });
    document.getElementById('score-privacy').textContent = defaultPrivacyText;
    document.getElementById('board').hidden = true;
    document.getElementById('score-breakdown').hidden = true;
    submitBtn.disabled = false;
    window.scrollTo(0, 0);
  });
}
