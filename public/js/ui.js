const NULL_OVERRIDE = {
  getValue: () => 0,
  setAutoValue: () => {},
  setManualEnabled: () => {},
  isManual: () => false,
};

export function wireManualOverride({ fieldId, onChange }) {
  const wrap = document.querySelector(`.manual-override[data-field="${fieldId}"]`);
  if (!wrap) return NULL_OVERRIDE;

  const check = wrap.querySelector(".manual-check");
  const manual = document.getElementById(`${fieldId}_manual`);
  const slider = document.getElementById(fieldId);
  if (!check || !manual || !slider) return NULL_OVERRIDE;

  // copiar constraints
  if (slider.min !== "") manual.min = slider.min;
  if (slider.max !== "") manual.max = slider.max;
  if (slider.step !== "") manual.step = slider.step;

  const setState = (enabled, { syncManualFromSlider = true } = {}) => {
    check.checked = enabled;
    manual.disabled = !enabled;
    slider.disabled = enabled;
    wrap.classList.toggle("is-manual", enabled);
    if (enabled && syncManualFromSlider) manual.value = slider.value;
  };

  check.addEventListener("change", () => {
    setState(check.checked, { syncManualFromSlider: true });
    onChange();
  });

  manual.addEventListener("input", onChange);

  slider.addEventListener("input", () => {
    if (!check.checked) manual.value = slider.value;
    onChange();
  });

  setState(check.checked, { syncManualFromSlider: false });

  return {
    getValue: () => Number(check.checked ? manual.value : slider.value),
    setAutoValue: (v) => {
      slider.value = String(v);
      if (!check.checked) manual.value = String(v);
    },
    setManualEnabled: (enabled) => setState(enabled),
    isManual: () => !!check.checked,
  };
}

export function setLoading(el, isLoading, text = "") {
  if (!el) return;
  el.textContent = isLoading ? (text || "Cargando...") : "";
}

