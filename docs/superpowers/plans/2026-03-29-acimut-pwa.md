# PWA de Acimut Solar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir la calculadora actual en una app web estática preparada para móvil que funcione siempre con coordenadas manuales y, cuando se publique por HTTPS, añada GPS, instalación y caché offline.

**Architecture:** Mantener `acimut_solar.html` como la entrada principal, mover la lógica a `app.js`, añadir un pequeño motor de referencia en Python para pruebas numéricas y completar la capa PWA con `manifest.webmanifest` y `sw.js`.

**Tech Stack:** HTML, CSS, JavaScript vanilla, Python 3 `unittest`, Service Worker, Web App Manifest.

---

### Task 1: Crear la base de verificación numérica

**Files:**
- Create: `tests/test_acimut_core.py`
- Create: `acimut_core.py`

- [ ] **Step 1: Write the failing test**

```python
import unittest

from acimut_core import calculate_reference_azimuth, norm_gon


class AcimutCoreTests(unittest.TestCase):
    def test_norm_gon_wraps_values(self):
        self.assertEqual(norm_gon(-10), 390)
        self.assertEqual(norm_gon(410), 10)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest -v tests/test_acimut_core.py`
Expected: `ImportError` or module missing.

- [ ] **Step 3: Write minimal implementation**

```python
def norm_gon(value):
    value = value % 400
    if value < 0:
        value += 400
    return value
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m unittest -v tests/test_acimut_core.py`
Expected: `OK`.

### Task 2: Cubrir un caso real de cálculo

**Files:**
- Modify: `tests/test_acimut_core.py`
- Modify: `acimut_core.py`

- [ ] **Step 1: Write the failing test**

```python
result = calculate_reference_azimuth(
    fecha="2026-03-29",
    hora_utc=(10, 15, 30),
    latitud=40.4168,
    longitud=-3.7038,
    lectura_vertical_gon=55.32,
    lectura_hz_sol_gon=123.4567,
    lectura_hz_ref_gon=0.0,
)
self.assertAlmostEqual(result["azimut_sol_gon"], 142.2119929053, places=6)
self.assertAlmostEqual(result["azimut_referencia_gon"], 18.7552929053, places=6)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest -v tests/test_acimut_core.py`
Expected: failure because `calculate_reference_azimuth` is missing or incomplete.

- [ ] **Step 3: Write minimal implementation**

```python
def calculate_reference_azimuth(...):
    ...
    return {
        "azimut_sol_gon": az_sol_gon,
        "azimut_referencia_gon": az_ref_gon,
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m unittest -v tests/test_acimut_core.py`
Expected: `OK`.

### Task 3: Rehacer la app web para móvil y PWA

**Files:**
- Modify: `acimut_solar.html`
- Create: `app.js`
- Create: `manifest.webmanifest`
- Create: `sw.js`
- Create: `icons/icon.svg`

- [ ] **Step 1: Replace the inline script and add app-shell hooks**

```html
<link rel="manifest" href="./manifest.webmanifest">
<script src="./app.js" defer></script>
```

- [ ] **Step 2: Add mode and install UI**

```html
<div class="section mode-card">
  <div class="section-title">Modo de uso</div>
  <p id="appModeText"></p>
  <button class="btn-secondary" id="installBtn" hidden>Instalar en el móvil</button>
</div>
```

- [ ] **Step 3: Implement the browser logic**

```javascript
if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js");
}
```

- [ ] **Step 4: Verify the HTML references and offline assets**

Run: `python3 -m py_compile acimut_core.py servidor.py`
Expected: no output.

### Task 4: Document the real GPS limitation and supported workflows

**Files:**
- Create: `README.md`
- Modify: `servidor.py`

- [ ] **Step 1: Write concise usage docs**

```md
1. Abrir `acimut_solar.html` directamente: funciona sin red, con coordenadas manuales.
2. Publicar la misma carpeta en GitHub Pages: habilita GPS, instalación y offline tras la primera visita.
```

- [ ] **Step 2: Correct the local server messaging**

```python
print("Nota: el GPS requiere HTTPS; usa GitHub Pages para móvil.")
```

- [ ] **Step 3: Run full verification**

Run: `python3 -m unittest -v tests/test_acimut_core.py && python3 -m py_compile acimut_core.py servidor.py`
Expected: tests passing and no syntax errors.
