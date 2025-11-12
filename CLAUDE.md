# 🩺 MediParse

**MediParse** ist eine KI-basierte Software zur automatisierten Extraktion von Preis- und Vertragsdaten aus PDF-Dokumenten des Gesundheitswesens — insbesondere aus **Hilfsmittel-, Reha- und Apothekenverträgen** mit Krankenkassen (§127 SGB V).

Die Anwendung kombiniert moderne **Dokumentenverständnis-Modelle (OCR + KI)**, um unstrukturierte Vertrags-PDFs in **maschinenlesbare, validierte Preisdaten** umzuwandeln.  
Dadurch entfällt das manuelle Übertragen von Preisen aus langen Vertragstabellen, und Systeme wie Warenwirtschaft, ERP oder Abrechnungssoftware können direkt auf strukturierte Daten zugreifen.

---

## 🚀 Zielsetzung

MediParse wandelt PDF-Verträge, Preislisten und Anlagen aus dem Hilfsmittelbereich in **strukturierte, auswertbare Datenformate (CSV, JSON, Excel, API)** um.  
Ziel ist die **automatische Preis- und Vertragsdatenpflege** für Leistungserbringer im Gesundheitswesen (Sanitätshäuser, Apotheken, Reha-Technik, Hörgeräteakustiker usw.).

---

## 🧩 Hauptfunktionen

### 1. 📄 PDF-Import & OCR
- Annahme von gescannten oder textbasierten PDFs (auch mehrseitig).
- Automatische Texterkennung (OCR) mit Unterstützung für deutsche Formate und Dezimaltrennzeichen.
- Vorverarbeitung: Schieflagenkorrektur, Kontrastverbesserung, Layout-Erkennung.

### 2. 🧠 KI-gestützte Extraktion
- Kombination aus **Table Transformer** (Tabellenerkennung) und **LayoutLM/Donut** (semantische Analyse).
- Automatische Erkennung von:
    - Preislisten & Pauschalen
    - Gültigkeitszeiträumen (`valid_from`, `valid_to`)
    - Zuschlägen, Einheiten, Mengeneinheiten
    - Hilfsmittelnummern, PZN, Artikelbezeichnungen
    - Vertragsmetadaten (IK, Kasse, Vertrags-ID, Version)
- Confidence Scores pro extrahiertem Wert.

### 3. 🧾 Validierung & Normalisierung
- Einheitliche Umwandlung deutscher Zahlenformate (z. B. `1.234,56 €` → `1234.56`).
- Logikprüfungen: Preis > 0, Datumskonsistenz, Pflichtfelder vorhanden.
- Regelbasierte Zuordnung von Spaltenköpfen über Synonymlisten („Preis“, „Vergütung“, „Entgelt“, …).
- Erkennung und Auflösung von Fußnoten und Zuschlägen.

### 4. 🔄 Export & API
- Ausgabe in **CSV, JSON, Excel oder XML**.
- REST-API mit folgenden Endpunkten:
    - `POST /extract` → PDF upload & Start der Extraktion
    - `GET /jobs/{id}` → Status & Ergebnisse
    - `GET /contracts/{id}/prices` → Abfrage der Preisdaten
- Webhooks für automatisierte Verarbeitung (z. B. neue Vertragsversionen).

### 5. 🧍‍♀️ Human-in-the-Loop (optional)
- Review-UI zur manuellen Überprüfung von Unsicherheiten (Confidence < Schwellwert).
- Seitenvorschau mit hervorgehobenen Werten.
- Jede Korrektur fließt in das Training der Modelle zurück (Active Learning).

---

## 🧱 Technische Architektur

| Komponente | Technologie | Beschreibung |
|-------------|--------------|---------------|
| **Backend** | Python (FastAPI) | API, Verarbeitung, Jobsteuerung |
| **Worker** | Celery + Redis | Asynchrone Verarbeitung von PDFs |
| **OCR** | Tesseract (Deutsch) | Texterkennung bei gescannten Verträgen |
| **Tabellenerkennung** | Table Transformer (Microsoft) | Erkennung von Tabellen- und Zellstrukturen |
| **KI-Modelle** | LayoutLMv3 / Donut | Semantische Zuordnung von Feldern |
| **Datenbank** | PostgreSQL (JSONB) | Speicherung von Roh- und Extraktionsdaten |
| **Storage** | S3-kompatibel | Speicherung der Original-PDFs und Ergebnisse |
| **Frontend** | React / Next.js | Upload, Review, Validierung, Export |
| **Deployment** | Docker / Kubernetes | Skalierbare Container-Architektur |

---

## 🧾 Beispielausgabe (JSON)

```json
{
  "contract": {
    "payer_ik": "109500969",
    "payer_name": "Beispiel-Krankenkasse",
    "contract_id": "HM-2025-XY",
    "valid_from": "2025-01-01",
    "version": "1.2"
  },
  "prices": [
    {
      "reference_code": "11.40.01.1040",
      "description": "Kompressionsstrumpf Klasse II",
      "unit": "Paar",
      "price_gross": 59.90,
      "currency": "EUR",
      "is_flat_rate": false,
      "surcharges": [
        { "label": "Maßanfertigung", "amount": 12.00 }
      ],
      "valid_from": "2025-01-01",
      "notes": "Preis gilt je Paar; Ersatz nach 6 Monaten.",
      "confidence": 0.94,
      "source_page": 17
    }
  ]
}

## Development Commands

### Running the Development Server
```bash
npm run dev
```
Starts the Vite development server with Hot Module Replacement (HMR). The app will be available at `http://localhost:5173` by default.

### Building for Production
```bash
npm run build
```
Creates an optimized production build in the `dist/` directory.

### Linting
```bash
npm run lint
```
Runs ESLint across all JavaScript and JSX files. The configuration includes:
- React Hooks linting rules
- React Refresh plugin for Vite
- Custom rule: unused variables starting with uppercase or underscore are ignored

### Preview Production Build
```bash
npm run preview
```
Serves the production build locally for testing.

## Architecture

### Tech Stack
- **React 19.2.0**: Using functional components with hooks
- **Vite 7.2.2**: Build tool and dev server with fast HMR
- **ESLint**: Code quality enforcement with React-specific plugins

### Entry Points
- `index.html`: Root HTML file (Vite uses this as entry point)
- `src/main.jsx`: Application bootstrap, renders App component into DOM with React StrictMode
- `src/App.jsx`: Main application component

### Code Style
- Uses ES modules (`"type": "module"` in package.json)
- JSX file extension for React components
- React 19's modern patterns (no legacy hooks)
- ESLint configured for browser globals and ES2020+ features

### Build Configuration
- Vite is configured with the React plugin (`@vitejs/plugin-react`) which uses Babel for Fast Refresh
- Production builds go to `dist/` directory (ignored by ESLint)
