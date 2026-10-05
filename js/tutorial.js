// ============================================
// TUTORIAL.JS - Tutorial System
// ============================================

const Tutorial = (() => {
  let currentStep = 0;
  let started = false;

  function start() {
    started = true;
    currentStep = 0;
    showStep(0);
    document.getElementById('btn-tutorial-next').addEventListener('click', nextStep);
    document.getElementById('btn-tutorial-skip').addEventListener('click', skip);

    // Listen for objective completions
    GameState.on('objective:complete', (obj) => {
      checkAutoAdvance(obj);
    });
  }

  function showStep(index) {
    if (index >= TUTORIAL_STEPS.length) { complete(); return; }

    const step = TUTORIAL_STEPS[index];
    document.getElementById('tutorial-step-badge').textContent = `Step ${index + 1} / ${TUTORIAL_STEPS.length}`;
    document.getElementById('tutorial-icon').textContent = step.icon;
    document.getElementById('tutorial-title').textContent = step.title;
    document.getElementById('tutorial-desc').textContent = step.desc;

    const keysEl = document.getElementById('tutorial-keys');
    keysEl.innerHTML = '';
    if (step.keys && step.keys.length > 0) {
      for (const k of step.keys) {
        const span = document.createElement('span');
        span.className = 'key-hint';
        span.textContent = k;
        keysEl.appendChild(span);
      }
    }

    GameState.set('tutorialStep', index);
  }

  function nextStep() {
    currentStep++;
    if (currentStep >= TUTORIAL_STEPS.length) { complete(); return; }
    showStep(currentStep);
  }

  function checkAutoAdvance(objective) {
    if (!started) return;
    const guidedStep = {
      pickupCrate: 5,
      stockShelf: 10,
      setPrices: 8,
      useComputer: 9,
      placeOrder: 11,
      openStore: 12,
    }[objective];
    if (guidedStep !== undefined) {
      currentStep = guidedStep;
      showStep(currentStep);
      return;
    }
    const step = TUTORIAL_STEPS[currentStep];
    if (!step) return;
    if (step.objective === objective) {
      // Auto-advance after short delay
      setTimeout(() => {
        UI.toast('✅ Objective complete!', 'success');
        nextStep();
      }, 800);
    }
  }

  function skip() {
    document.getElementById('tutorial-panel').classList.add('hidden');
    complete();
    UI.toast('Tutorial skipped. Good luck running your empire!', 'info');
  }

  function complete() {
    started = false;
    GameState.set('tutorialComplete', true);
    document.getElementById('tutorial-panel').classList.add('hidden');
    UI.notify('🎉 Tutorial Complete!', 'You\'re ready to build your Retail Empire!', 'profit');
    UI.toast('🎉 Tutorial complete! Now build your empire!', 'success');
  }

  return { start, nextStep, skip };
})();
