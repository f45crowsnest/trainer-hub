/* ============================================================
   Winter Lock In Mini Challenge · scoring + form logic
   ------------------------------------------------------------
   HOW THE POINTS WORK (plain English, so any coach can explain):

   Resistance (12 rep max on squat or bench):
   1. Estimate a one rep max from the 12 rep weight (Epley: x 1.4).
   2. Divide by bodyweight, so lighter members are not punished.
   3. Compare against a baseline for their sex and lift.
      A solid everyday adult effort scores about 100.
   4. Age bonus: +1% per year over 30, capped at +35%.
      A 60 year old gets a 30% lift on their score.
   Height is recorded for Jino's records but does not change points
   (bodyweight already does that job).

   Cardio (2 minute erg, metres):
   1. Gentle bodyweight adjustment (big engines move ergs easier),
      capped at +/-12% so it never dominates.
   2. Compare metres against a baseline for their sex and machine.
   3. Same age bonus as resistance.

   100 points = a solid effort for anyone, any age, any size.
   ============================================================ */

var EPLEY_12RM_FACTOR = 1.4; // 1RM estimate = 12RM weight x (1 + 12/30)

var STRENGTH_BASELINES = {          // est. 1RM as a multiple of bodyweight
  squat: { m: 1.25, f: 0.95 },
  bench: { m: 0.95, f: 0.60 }
};

var CARDIO_BASELINES = {            // metres in 2 minutes, solid adult effort
  row:  { m: 560, f: 480 },
  ski:  { m: 520, f: 440 },
  bike: { m: 1100, f: 950 }
};

var CARDIO_REF_WEIGHT = { m: 75, f: 65 }; // kg reference for the erg adjustment

function ageFactor(age) {
  // +1% per year from 30 to 65, then +2% per year beyond 65 (capped at +80%),
  // so the oldest members keep earning a fair bonus instead of flatlining.
  var to65 = Math.min(Math.max(0, age - 30), 35);
  var past65 = Math.max(0, age - 65);
  return Math.min(1.8, 1 + 0.01 * to65 + 0.02 * past65);
}

function resistancePoints(input) {
  var est1RM = input.result * EPLEY_12RM_FACTOR;
  var relative = est1RM / input.weight;
  var baseline = STRENGTH_BASELINES[input.event][input.sex];
  return Math.round(100 * (relative / baseline) * ageFactor(input.age));
}

function cardioPoints(input) {
  var ref = CARDIO_REF_WEIGHT[input.sex];
  var weightAdj = Math.pow(ref / input.weight, 0.15);
  weightAdj = Math.min(1.12, Math.max(0.88, weightAdj));
  var baseline = CARDIO_BASELINES[input.event][input.sex];
  return Math.round(100 * ((input.result * weightAdj) / baseline) * ageFactor(input.age));
}

function scoreMessage(points, name) {
  var first = name.split(' ')[0];
  if (points >= 170) return 'Off the charts, ' + first + '. Double check the numbers with a coach, then take a bow.';
  if (points >= 130) return 'Are you serious, ' + first + '? That is a monster score. 🔥';
  if (points >= 110) return 'Strong work, ' + first + '. That is well above the bar.';
  if (points >= 90) return 'Solid effort, ' + first + '. Right where you want to be.';
  if (points >= 70) return 'Good work, ' + first + '. You are on the board, now we build.';
  return 'You showed up and tested, ' + first + '. That is the whole point of week 2. Onwards.';
}

/* ---------------- form wiring ---------------- */

var EVENT_LABELS = {
  squat: 'Barbell Squat', bench: 'Bench Press',
  row: 'Rower', ski: 'SkiErg', bike: 'BikeErg'
};

var LIMITS = {
  age: { min: 14, max: 90, label: 'age' },
  weight: { min: 30, max: 250, label: 'weight' },
  height: { min: 120, max: 230, label: 'height' },
  resistanceResult: { min: 5, max: 300, label: '12 rep weight' }
};

// each erg gets its own believable range: 900m rowed in 2 minutes is
// beyond world record, but a bike shows roughly double the metres
var CARDIO_LIMITS = {
  row:  { min: 100, max: 900, label: 'metres' },
  ski:  { min: 100, max: 900, label: 'metres' },
  bike: { min: 200, max: 2600, label: 'metres' }
};

// a lift more than 2.75x the solid-adult baseline for that sex and lift is
// almost certainly a typo (that is beyond elite territory for this crowd)
var MAX_BASELINE_MULTIPLE = 2.75;

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

var CARDIO_FIELD_LABELS = { row: 'Rower metres', ski: 'SkiErg metres', bike: 'Bike metres' };

function initChallengePage(challenge) {
  var state = { sex: null, event: null };

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
      fieldEl.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
    } else {
      errorEl.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
    }
    return null;
  }

  function numberField(id, limits) {
    var el = document.getElementById(id);
    if (el.validity && el.validity.badInput) {
      return fail('That ' + limits.label + ' does not look like a number. Digits only, like ' + limits.min + '.', el);
    }
    var value = parseFloat(el.value);
    if (isNaN(value)) return fail('Please fill in your ' + limits.label + '.', el);
    if (value < limits.min || value > limits.max) {
      return fail('That ' + limits.label + ' does not look right. It should be between ' + limits.min + ' and ' + limits.max + '.', el);
    }
    return value;
  }

  // like numberField, but an empty box just means "did not do this one"
  // returns: undefined = left empty, null = invalid, number = good value
  function optionalNumberField(id, limits, label) {
    var el = document.getElementById(id);
    if (el.validity && el.validity.badInput) {
      return fail('That ' + label + ' entry does not look like a number. Digits only, or leave it empty.', el);
    }
    if (el.value.trim() === '') return undefined;
    var value = parseFloat(el.value);
    if (isNaN(value)) return undefined;
    if (value < limits.min || value > limits.max) {
      return fail(label + ' should be between ' + limits.min + ' and ' + limits.max + ', or left empty.', el);
    }
    return value;
  }

  function readForm() {
    clearFieldErrors();

    var nameEl = document.getElementById('f-name');
    var name = nameEl.value.trim();
    if (!name) return fail('Please write your name so the record saves properly.', nameEl);
    if (!state.sex) return fail('Please tap Female or Male.');

    var age = numberField('f-age', LIMITS.age);
    if (age === null) return null;
    var weight = numberField('f-weight', LIMITS.weight);
    if (weight === null) return null;
    var height = numberField('f-height', LIMITS.height);
    if (height === null) return null;

    var entries = [];

    if (challenge === 'resistance') {
      if (!state.event) return fail('Please pick your lift.');
      var resultInput = document.getElementById('f-result');
      var result = numberField('f-result', LIMITS.resistanceResult);
      if (result === null) return null;

      // typo guard: a 12RM implying a far-beyond-elite 1RM for this sex and
      // lift is almost certainly a wrong number, better to ask than save garbage
      var relative = (result * EPLEY_12RM_FACTOR) / weight;
      var baseline = STRENGTH_BASELINES[state.event][state.sex];
      if (relative / baseline > MAX_BASELINE_MULTIPLE) {
        return fail('That lift does not look right next to your bodyweight. Double check both numbers, or grab a coach.', resultInput);
      }
      entries.push({ event: state.event, result: result });
    } else {
      // one form, up to three ergs: fill in the ones you did
      var ergIds = { row: 'f-row', ski: 'f-ski', bike: 'f-bike' };
      for (var erg in ergIds) {
        var metres = optionalNumberField(ergIds[erg], CARDIO_LIMITS[erg], CARDIO_FIELD_LABELS[erg]);
        if (metres === null) return null;
        if (metres !== undefined) entries.push({ event: erg, result: metres });
      }
      if (!entries.length) {
        return fail('Fill in metres for at least one erg.', document.getElementById('f-row'));
      }
    }

    return {
      challenge: challenge, name: name, sex: state.sex,
      age: age, weight: weight, height: height,
      entries: entries
    };
  }

  function saveRecord(input, entry) {
    var privacyEl = document.getElementById('score-privacy');
    if (typeof MINI_CONFIG === 'undefined' || !MINI_CONFIG.SHEET_URL) {
      privacyEl.textContent =
        'Heads up: saving is not switched on yet, so tell Jino your score. It is still private. 🔒';
      return;
    }
    var data = new FormData();
    data.append('challenge', input.challenge);
    data.append('name', input.name);
    data.append('sex', input.sex === 'm' ? 'Male' : 'Female');
    data.append('age', String(input.age));
    data.append('weightKg', String(input.weight));
    data.append('heightCm', String(input.height));
    data.append('event', EVENT_LABELS[entry.event]);
    data.append('result', String(entry.result));
    data.append('points', String(entry.points));
    data.append('week', '2');
    // Cross-site rules block reading Apps Script's reply, so success stays
    // silent. keepalive lets the request finish even if they close the tab,
    // and the catch turns a dead connection into an honest message.
    fetch(MINI_CONFIG.SHEET_URL, { method: 'POST', mode: 'no-cors', body: data, keepalive: true })
      .catch(function () {
        privacyEl.textContent =
          'No internet right now, so the save did not go through. Tell Jino your score, it is still private. 🔒';
      });
  }

  // anonymous board: fetches points (never names) back from the records
  // endpoint and shows where this score sits. If the endpoint is not ready
  // or the network is down, the board simply stays hidden.
  var BOARD_CATEGORY_ORDER = ['Barbell Squat', 'Bench Press', 'Rower', 'SkiErg', 'BikeErg'];

  function buildBoardList(catLabel, scores, ownEntries) {
    // include just-submitted scores that have not landed in the sheet yet
    var mine = ownEntries
      .filter(function (e) { return e.label === catLabel || catLabel === 'All scores'; })
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

  function renderBoard(ownEntries) {
    if (typeof MINI_CONFIG === 'undefined' || !MINI_CONFIG.SHEET_URL) return;
    fetch(MINI_CONFIG.SHEET_URL + '?week=2')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var section = (data && data[challenge]) || {};
        // older script versions return one flat list, newer ones group by event
        var groups = Array.isArray(section) ? { 'All scores': section } : section;

        var keys = Object.keys(groups).filter(function (k) { return (groups[k] || []).length || ownEntries.some(function (e) { return e.label === k; }); });
        // make sure a category the member just scored in always shows
        ownEntries.forEach(function (e) {
          if (keys.indexOf(e.label) === -1 && !Array.isArray(section)) keys.push(e.label);
        });
        keys.sort(function (a, b) {
          var ia = BOARD_CATEGORY_ORDER.indexOf(a), ib = BOARD_CATEGORY_ORDER.indexOf(b);
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });

        var wrap = document.getElementById('board-groups');
        wrap.innerHTML = '';
        keys.forEach(function (cat) {
          var scores = (groups[cat] || []).map(Number).filter(function (n) { return !isNaN(n); });
          if (keys.length > 1 || cat !== 'All scores') {
            var h = document.createElement('h3');
            h.className = 'board-cat';
            h.textContent = cat;
            wrap.appendChild(h);
          }
          wrap.appendChild(buildBoardList(cat, scores, ownEntries));
        });
        document.getElementById('board').hidden = false;
      })
      .catch(function () { /* board stays hidden, the score still stands */ });
  }

  submitBtn.addEventListener('click', function () {
    var input = readForm();
    if (!input) return;

    submitBtn.disabled = true;
    input.entries.forEach(function (entry) {
      var single = {
        sex: input.sex, age: input.age, weight: input.weight,
        event: entry.event, result: entry.result
      };
      entry.points = challenge === 'resistance' ? resistancePoints(single) : cardioPoints(single);
      saveRecord(input, entry);
    });

    var best = Math.max.apply(null, input.entries.map(function (e) { return e.points; }));
    document.getElementById('score-number').textContent = String(best);
    document.getElementById('score-msg').textContent = scoreMessage(best, input.name);

    // multiple ergs in one go: show the per-erg breakdown under the big number
    var breakdownEl = document.getElementById('score-breakdown');
    if (breakdownEl) {
      breakdownEl.innerHTML = '';
      if (input.entries.length > 1) {
        input.entries.forEach(function (entry) {
          var li = document.createElement('li');
          li.textContent = EVENT_LABELS[entry.event] + ': ' + entry.points + ' pts';
          breakdownEl.appendChild(li);
        });
        breakdownEl.hidden = false;
      } else {
        breakdownEl.hidden = true;
      }
    }

    document.getElementById('form-view').style.display = 'none';
    var scoreView = document.getElementById('score-view');
    scoreView.classList.add('show');
    window.scrollTo(0, 0);
    renderBoard(input.entries.map(function (e) {
      return { label: EVENT_LABELS[e.event], points: e.points };
    }));
  });

  var defaultPrivacyText = document.getElementById('score-privacy').textContent;

  document.getElementById('again-btn').addEventListener('click', function () {
    document.getElementById('score-view').classList.remove('show');
    document.getElementById('form-view').style.display = '';
    document.querySelectorAll('.result-field').forEach(function (el) { el.value = ''; });
    document.getElementById('score-privacy').textContent = defaultPrivacyText;
    document.getElementById('board').hidden = true;
    var breakdownEl = document.getElementById('score-breakdown');
    if (breakdownEl) breakdownEl.hidden = true;
    submitBtn.disabled = false;
    window.scrollTo(0, 0);
  });
}
