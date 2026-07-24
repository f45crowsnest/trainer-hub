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

function initChallengePage(challenge) {
  var state = { sex: null, event: null };
  var resultInput = document.getElementById('f-result');

  document.querySelectorAll('.seg-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var group = btn.dataset.group;
      state[group] = btn.dataset.value;
      document.querySelectorAll('.seg-btn[data-group="' + group + '"]').forEach(function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      // each erg gets its own believable input range and example
      if (group === 'event' && challenge === 'cardio') {
        var lim = CARDIO_LIMITS[state.event];
        resultInput.min = lim.min;
        resultInput.max = lim.max;
        resultInput.placeholder = state.event === 'bike' ? 'e.g. 1050' : 'e.g. 520';
      }
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

    if (!state.event) {
      return fail(challenge === 'resistance' ? 'Please pick your lift.' : 'Please pick your erg.');
    }

    var resultLimits = challenge === 'resistance' ? LIMITS.resistanceResult : CARDIO_LIMITS[state.event];
    var result = numberField('f-result', resultLimits);
    if (result === null) return null;

    // typo guard: a 12RM implying a far-beyond-elite 1RM for this sex and
    // lift is almost certainly a wrong number, better to ask than save garbage
    if (challenge === 'resistance') {
      var relative = (result * EPLEY_12RM_FACTOR) / weight;
      var baseline = STRENGTH_BASELINES[state.event][state.sex];
      if (relative / baseline > MAX_BASELINE_MULTIPLE) {
        return fail('That lift does not look right next to your bodyweight. Double check both numbers, or grab a coach.', resultInput);
      }
    }

    return {
      challenge: challenge, name: name, sex: state.sex,
      age: age, weight: weight, height: height,
      event: state.event, result: result
    };
  }

  function saveRecord(input, points) {
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
    data.append('event', EVENT_LABELS[input.event]);
    data.append('result', String(input.result));
    data.append('points', String(points));
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

  submitBtn.addEventListener('click', function () {
    var input = readForm();
    if (!input) return;

    submitBtn.disabled = true;
    var points = challenge === 'resistance' ? resistancePoints(input) : cardioPoints(input);
    saveRecord(input, points);

    document.getElementById('score-number').textContent = String(points);
    document.getElementById('score-msg').textContent = scoreMessage(points, input.name);
    document.getElementById('form-view').style.display = 'none';
    var scoreView = document.getElementById('score-view');
    scoreView.classList.add('show');
    window.scrollTo(0, 0);
  });

  var defaultPrivacyText = document.getElementById('score-privacy').textContent;

  document.getElementById('again-btn').addEventListener('click', function () {
    document.getElementById('score-view').classList.remove('show');
    document.getElementById('form-view').style.display = '';
    document.getElementById('f-result').value = '';
    document.getElementById('score-privacy').textContent = defaultPrivacyText;
    submitBtn.disabled = false;
    window.scrollTo(0, 0);
  });
}
