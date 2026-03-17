# ReviewGuards – Projektübersicht

## Was ist ReviewGuards?

B2B-SaaS-Plattform zur Entfernung negativer Amazon-Bewertungen.
Geschäftsmodell: **Erfolgsbasiert** – Kunden zahlen nur bei erfolgreicher Entfernung (€129–€99 pro Bewertung je nach Volumen).

---

## Öffentliche Seiten (Marketing)

| Seite | URL | Beschreibung |
|-------|-----|-------------|
| **Homepage** | `reviewguards.de` | Landing Page mit Hero, So-funktioniert-es, Case Studies, FAQ, Kontaktformular |
| **Pricing** | `reviewguards.de/pricing.html` | Interaktiver Preisrechner mit Staffelpreisen |
| **Review Checker** | `reviewguards.de/review-checker.html` | Kostenloses Tool – Kunden können Bewertungen prüfen lassen ohne Anmeldung |
| **Impressum** | `reviewguards.de/impressum.html` | Rechtlich erforderlich |
| **Datenschutz** | `reviewguards.de/datenschutz.html` | DSGVO-Datenschutzerklärung |

---

## Kunden-App (nach Login)

| Seite | URL | Beschreibung |
|-------|-----|-------------|
| **Login** | `reviewguards.de/app/login.html` | Anmeldung & Registrierung |
| **Passwort-Reset** | `reviewguards.de/app/reset-password.html` | Passwort zurücksetzen |
| **Onboarding** | `reviewguards.de/app/onboarding.html` | 4-Schritte-Setup: Daten, Produkte importieren, Vollmacht (DocuSeal), Zusammenfassung |
| **Dashboard** | `reviewguards.de/app/dashboard.html` | Produkte verwalten, ASIN hinzufügen, Monitoring aktivieren → Bewertungen werden analysiert |
| **Offene Fälle** | `reviewguards.de/app/open-cases.html` | Geflaggte Bewertungen prüfen, genehmigen oder ablehnen |
| **Entfernte Bewertungen** | `reviewguards.de/app/removed-reviews.html` | Übersicht aller erfolgreich entfernten Bewertungen |
| **Rechnungen** | `reviewguards.de/app/invoices.html` | Rechnungen einsehen & bezahlen (Stripe) |

---

## Admin-Backend

| Seite | URL | Beschreibung |
|-------|-----|-------------|
| **Admin-Dashboard** | `reviewguards.de/app/admin.html` | Passwortgeschützt, alle Kundenfälle verwalten |

### Admin-Funktionen:
- Alle Fälle aller Kunden einsehen
- Filtern nach Kunde, Status, Datum
- Status-Pipeline: **Ausstehend → In Bearbeitung → Entfernt**
- Bei "Entfernt" → automatische Email an Kunden

---

## Kompletter Ablauf

### Kundenreise:
1. **Registrieren** → `app/login.html`
2. **Onboarding** → Name, Brand, Marktplatz, Produkte importieren, Vollmacht unterschreiben
3. **Dashboard** → Produkte hinzufügen (per ASIN) und Monitoring aktivieren
4. **Analyse** → System prüft Bewertungen automatisch auf Verstöße
5. **Offene Fälle** → Kunde genehmigt oder lehnt geflaggte Bewertungen ab
6. **Team arbeitet** → Admin sieht genehmigte Fälle, setzt auf "In Bearbeitung", entfernt Bewertung bei Amazon
7. **Benachrichtigung** → Kunde bekommt Email wenn Bewertung entfernt wurde
8. **Rechnung** → Kunde klickt "Jetzt bezahlen", Stripe-Rechnung wird erstellt und per Email geschickt
9. **Zahlung** → Kunde zahlt über Stripe (14 Tage Zahlungsziel)

### Team-Workflow (Admin):
1. Email-Benachrichtigung bei neuen Fällen → `team@reviewguards.de`
2. Admin-Dashboard öffnen → Fälle sichten
3. Status auf "In Bearbeitung" setzen → bei Amazon bearbeiten
4. Status auf "Entfernt" setzen → Kunde wird automatisch benachrichtigt
5. Kunde erstellt Rechnung und bezahlt

---

## Externe Dienste

| Dienst | Zweck | Wo konfiguriert |
|--------|-------|-----------------|
| **Supabase** | Datenbank, Auth, Edge Functions | `lgrnmiszhhahfcmctmwo.supabase.co` → [Supabase Dashboard](https://supabase.com/dashboard) |
| **Stripe** | Rechnungen & Zahlungen | [Stripe Dashboard](https://dashboard.stripe.com) |
| **Resend** | Email-Versand (noreply@reviewguards.de) | [Resend Dashboard](https://resend.com) |
| **RapidAPI** | Amazon-Produktdaten & Bewertungen abrufen | [RapidAPI Dashboard](https://rapidapi.com) |
| **DocuSeal** | Digitale Vollmacht-Unterschrift | [DocuSeal Dashboard](https://docuseal.co) |
| **GitHub Pages** | Hosting der Website | [Repo](https://github.com/adsmasters/reviewguards-website) |
| **Raidboxes** | Domain DNS (reviewguards.de) | [Raidboxes Dashboard](https://my.raidboxes.io) |

---

## Supabase Edge Functions (Backend-Logik)

| Funktion | Beschreibung |
|----------|-------------|
| `contact-form` | Kontaktformular → Email an Team + Bestätigung an Kunde |
| `notify-new-cases` | Email an Team wenn neue Fälle geflaggt werden |
| `notify-review-removed` | Email an Kunde wenn Bewertung erfolgreich entfernt |
| `create-invoice` | Erstellt Stripe-Rechnung für entfernte Bewertungen |
| `stripe-webhook` | Empfängt Stripe-Events (Zahlung erfolgreich/fehlgeschlagen) |

---

## Datenbank-Tabellen (Supabase)

| Tabelle | Inhalt |
|---------|--------|
| `profiles` | Kundendaten (Name, Firma, Brand, Marktplatz) |
| `products` | Amazon-Produkte (ASIN, Rating, Status) |
| `cases` | Geflaggte Bewertungen (Titel, Text, Gründe, Status) |
| `removed_reviews` | Erfolgreich entfernte Bewertungen (inkl. Abrechnungsstatus) |
| `invoices` | Rechnungen (Betrag, Status, Stripe-Link) |

---

## Offene Punkte

1. **analyzeReviews() Heuristik** — Die aktuellen Kriterien für entfernbare Bewertungen sind Platzhalter. Müssen nach Anwaltsgespräch mit den echten Amazon-Richtlinien-Kriterien ersetzt werden (betrifft `review-checker.html` und `dashboard.html`).

---

## Preismodell

| Volumen | Preis pro Bewertung |
|---------|-------------------|
| 1–9 Bewertungen | €129 |
| 10–49 Bewertungen | €119 |
| 50–99 Bewertungen | €109 |
| 100+ Bewertungen | €99 |
