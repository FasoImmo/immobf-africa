"""
Génère ImmoBF_Africa_Presentation.pdf (format 16:9 / présentation)
Usage : python generate_presentation_pdf.py
"""

from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.units import cm
import os

# ── Dimensions 16:9 ───────────────────────────────────────────────────────────
W, H = 33.87*cm, 19.05*cm   # ~1920x1080 proportions en cm
OUT = os.path.join(os.path.dirname(__file__), "ImmoBF_Africa_Presentation.pdf")

# Couleurs
GREEN       = HexColor("#0E7C66")
GREEN_DARK  = HexColor("#0a5c4d")
ORANGE      = HexColor("#E8780A")
AMBER       = HexColor("#F6AD55")
NAVY        = HexColor("#1A3A6B")
WHITE_H     = HexColor("#FFFFFF")
LIGHT       = HexColor("#F0FAF6")
GREY        = HexColor("#555555")
LGREY       = HexColor("#EEEEEE")

c = pdfcanvas.Canvas(OUT, pagesize=(W, H))
c.setTitle("ImmoBF Africa — Présentation")
c.setAuthor("Africa DEV YAZID CONSULTING")

def gradient_bg(c, color1, color2):
    steps = 30
    for i in range(steps):
        t = i / steps
        r = color1.red + (color2.red - color1.red) * t
        g = color1.green + (color2.green - color1.green) * t
        b = color1.blue + (color2.blue - color1.blue) * t
        c.setFillColorRGB(r, g, b)
        c.rect(0, H * i / steps, W, H / steps + 1, fill=1, stroke=0)

def slide_header(c, tag, num, total):
    c.setFillColor(HexColor("#FFFFFF20"))
    c.rect(0, H - 1.2*cm, W, 1.2*cm, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(WHITE_H)
    c.drawString(0.8*cm, H - 0.85*cm, "ImmoBF Africa")
    c.setFont("Helvetica", 8)
    c.drawCentredString(W/2, H - 0.85*cm, tag)
    c.drawRightString(W - 0.8*cm, H - 0.85*cm, f"{num} / {total}")

def slide_footer(c):
    c.setFillColor(ORANGE)
    c.rect(0, 0, W, 0.5*cm, fill=1, stroke=0)
    c.setFont("Helvetica", 7)
    c.setFillColor(WHITE_H)
    c.drawCentredString(W/2, 0.15*cm, "www.immoafrica.online  |  contact@immoafrica.online")

def text(c, txt, x, y, size=10, bold=False, color=WHITE_H, align="left"):
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    c.setFillColor(color)
    if align == "center":
        c.drawCentredString(x, y, txt)
    elif align == "right":
        c.drawRightString(x, y, txt)
    else:
        c.drawString(x, y, txt)

def bullet_block(c, items, x, y, size=9, color=WHITE_H, spacing=0.55*cm):
    for item in items:
        c.setFillColor(ORANGE)
        c.circle(x + 0.15*cm, y + 0.18*cm, 0.08*cm, fill=1, stroke=0)
        c.setFont("Helvetica", size)
        c.setFillColor(color)
        c.drawString(x + 0.4*cm, y, item)
        y -= spacing
    return y

def card(c, x, y, w, h, bg=HexColor("#FFFFFF15"), radius=0.3*cm):
    c.setFillColor(bg)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=0)

TOTAL = 10

# ──────────────────────────────────────────────────────────────────────────────
# SLIDE 1 — COUVERTURE
# ──────────────────────────────────────────────────────────────────────────────
gradient_bg(c, GREEN, GREEN_DARK)

# Motif décoratif
c.setFillColor(HexColor("#FFFFFF08"))
for i in range(0, int(W/cm)+2, 3):
    c.circle(i*cm, H*0.3, 1.5*cm, fill=1, stroke=0)

# Bande orange droite
c.setFillColor(ORANGE)
c.rect(W - 0.8*cm, 0, 0.8*cm, H, fill=1, stroke=0)

# Titre
text(c, "ImmoBF Africa", W/2, H*0.62, size=52, bold=True, align="center")
text(c, "Immobilier en Afrique de l'Ouest", W/2, H*0.50, size=22, color=AMBER, align="center")
text(c, "Achat · Location · Vente · Paiement Mobile Money", W/2, H*0.41, size=13, color=HexColor("#CCE8E1"), align="center")

# Drapeaux pays
flags_text = "🇧🇫  Burkina Faso    🇨🇮  Côte d'Ivoire    🇸🇳  Sénégal    🇲🇱  Mali    🇹🇬  Togo    🇧🇯  Bénin"
text(c, flags_text, W/2, H*0.28, size=10, color=HexColor("#A0D5C7"), align="center")

text(c, "www.immoafrica.online", W/2, H*0.12, size=11, color=HexColor("#80C4B0"), align="center")
text(c, "Septembre 2026", W/2, H*0.07, size=9, color=HexColor("#80C4B0"), align="center")

slide_header(c, "Couverture", 1, TOTAL)
slide_footer(c)
c.showPage()

# ──────────────────────────────────────────────────────────────────────────────
# SLIDE 2 — PROBLÈME
# ──────────────────────────────────────────────────────────────────────────────
c.setFillColor(NAVY)
c.rect(0, 0, W, H, fill=1, stroke=0)

# Accent vert gauche
c.setFillColor(GREEN)
c.rect(0, 0, 0.6*cm, H, fill=1, stroke=0)

text(c, "Le Problème", 1.5*cm, H*0.82, size=28, bold=True)
c.setFillColor(ORANGE)
c.rect(1.5*cm, H*0.78, 8*cm, 0.08*cm, fill=1, stroke=0)

problems = [
    ("Marché fragmenté", "Pas de plateforme centralisée pour l'Afrique de l'Ouest"),
    ("Paiements inadaptés", "Les portails existants ignorent le mobile money (Orange, Wave...)"),
    ("Manque de confiance", "Arnaques fréquentes, pas de système de vérification"),
    ("Barrière linguistique", "Peu de solutions bilingues FR/EN adaptées"),
    ("Accès limité au digital", "Apps non optimisées pour les connexions lentes"),
]
y = H * 0.68
for title, desc in problems:
    card(c, 1.4*cm, y - 0.2*cm, W - 2.5*cm, 1.1*cm, HexColor("#FFFFFF10"))
    c.setFillColor(ORANGE)
    c.circle(1.9*cm, y + 0.38*cm, 0.12*cm, fill=1, stroke=0)
    text(c, title, 2.2*cm, y + 0.28*cm, size=10, bold=True, color=AMBER)
    text(c, desc, 2.2*cm, y + 0.08*cm, size=9, color=HexColor("#AAAAAA"))
    y -= 1.35*cm

slide_header(c, "Contexte & Problème", 2, TOTAL)
slide_footer(c)
c.showPage()

# ──────────────────────────────────────────────────────────────────────────────
# SLIDE 3 — SOLUTION
# ──────────────────────────────────────────────────────────────────────────────
gradient_bg(c, GREEN, GREEN_DARK)

text(c, "Notre Solution", W/2, H*0.85, size=28, bold=True, align="center")
c.setFillColor(ORANGE)
c.rect(W/2 - 4*cm, H*0.81, 8*cm, 0.08*cm, fill=1, stroke=0)

solutions = [
    ("🏠", "Portail unifié", "Toutes les annonces d'Afrique de l'Ouest"),
    ("📱", "Mobile Money", "Orange Money · Moov · Wave intégrés"),
    ("🤖", "IA & Qualité", "Modération auto, estimation de prix, suggestions"),
    ("🔒", "Sécurité", "Escrow sécurisé pour chaque transaction"),
    ("🌍", "Multilingue", "Français & Anglais, adaptation culturelle"),
    ("⚡", "App native", "iOS & Android, mode hors ligne"),
]
cols = 3
x_start = 1.5*cm
card_w = (W - 3*cm) / cols - 0.4*cm
y_row1 = H * 0.62
y_row2 = H * 0.30

for i, (icon, title, desc) in enumerate(solutions):
    col = i % cols
    row = i // cols
    cx = x_start + col * (card_w + 0.4*cm)
    cy = y_row1 if row == 0 else y_row2
    card(c, cx, cy, card_w, 2.3*cm, HexColor("#FFFFFF15"), 0.3*cm)
    text(c, icon, cx + card_w/2, cy + 1.7*cm, size=20, align="center")
    text(c, title, cx + card_w/2, cy + 1.1*cm, size=10, bold=True, align="center")
    text(c, desc, cx + card_w/2, cy + 0.35*cm, size=8, color=AMBER, align="center")

slide_header(c, "Notre Solution", 3, TOTAL)
slide_footer(c)
c.showPage()

# ──────────────────────────────────────────────────────────────────────────────
# SLIDE 4 — CHIFFRES CLÉS
# ──────────────────────────────────────────────────────────────────────────────
c.setFillColor(HexColor("#0A1628"))
c.rect(0, 0, W, H, fill=1, stroke=0)
c.setFillColor(GREEN)
c.rect(0, 0, 0.6*cm, H, fill=1, stroke=0)

text(c, "Chiffres Clés", W/2, H*0.87, size=28, bold=True, align="center")
c.setFillColor(ORANGE)
c.rect(W/2 - 4*cm, H*0.83, 8*cm, 0.08*cm, fill=1, stroke=0)

kpis = [
    ("6", "Pays couverts", "Zone UEMOA"),
    ("9+", "Opérateurs paiement", "Mobile Money"),
    ("2", "Apps natives", "iOS & Android"),
    ("99,9%", "Uptime cible", "SLA Vercel + Railway"),
]
kw = (W - 3*cm) / 4 - 0.3*cm
kx = 1.5*cm
for i, (val, label, sub) in enumerate(kpis):
    cx = kx + i * (kw + 0.3*cm)
    card(c, cx, H*0.38, kw, 3.5*cm, HexColor("#FFFFFF10"), 0.4*cm)
    text(c, val, cx + kw/2, H*0.38 + 2.6*cm, size=30, bold=True, color=ORANGE, align="center")
    text(c, label, cx + kw/2, H*0.38 + 1.6*cm, size=10, bold=True, align="center")
    text(c, sub, cx + kw/2, H*0.38 + 0.8*cm, size=8, color=HexColor("#AAAAAA"), align="center")

# Stack résumé
text(c, "Stack : Next.js · Node.js · PostgreSQL · Redis · React Native", W/2, H*0.22, size=10, color=HexColor("#AAAAAA"), align="center")

slide_header(c, "Chiffres Clés", 4, TOTAL)
slide_footer(c)
c.showPage()

# ──────────────────────────────────────────────────────────────────────────────
# SLIDE 5 — MARCHÉS
# ──────────────────────────────────────────────────────────────────────────────
gradient_bg(c, NAVY, HexColor("#0d2040"))
c.setFillColor(GREEN)
c.rect(0, 0, 0.6*cm, H, fill=1, stroke=0)

text(c, "Marchés Cibles", W/2, H*0.87, size=28, bold=True, align="center")
c.setFillColor(ORANGE)
c.rect(W/2 - 4*cm, H*0.83, 8*cm, 0.08*cm, fill=1, stroke=0)

pays = [
    ("🇧🇫", "Burkina Faso", "Marché principal", GREEN),
    ("🇨🇮", "Côte d'Ivoire", "En déploiement", ORANGE),
    ("🇸🇳", "Sénégal", "En déploiement", ORANGE),
    ("🇲🇱", "Mali", "Planifié Q1 2027", HexColor("#888888")),
    ("🇹🇬", "Togo", "Planifié Q2 2027", HexColor("#888888")),
    ("🇧🇯", "Bénin", "Planifié Q2 2027", HexColor("#888888")),
]
pw = (W - 3*cm) / 3 - 0.3*cm
for i, (flag, name, status, col) in enumerate(pays):
    col_i = i % 3
    row_i = i // 3
    cx = 1.5*cm + col_i * (pw + 0.3*cm)
    cy = H*0.60 if row_i == 0 else H*0.33
    card(c, cx, cy, pw, 1.9*cm, HexColor("#FFFFFF10"), 0.3*cm)
    text(c, flag, cx + 0.5*cm, cy + 1.15*cm, size=20)
    text(c, name, cx + 1.8*cm, cy + 1.35*cm, size=11, bold=True)
    text(c, status, cx + 1.8*cm, cy + 0.65*cm, size=9, color=col)

# Population totale
text(c, "Population cible : ~150 millions d'habitants · Taux smartphone : 45-65% selon pays",
     W/2, H*0.16, size=9, color=HexColor("#AAAAAA"), align="center")

slide_header(c, "Marchés & Expansion", 5, TOTAL)
slide_footer(c)
c.showPage()

# ──────────────────────────────────────────────────────────────────────────────
# SLIDE 6 — STACK TECHNIQUE
# ──────────────────────────────────────────────────────────────────────────────
c.setFillColor(HexColor("#0E1E1A"))
c.rect(0, 0, W, H, fill=1, stroke=0)
c.setFillColor(ORANGE)
c.rect(0, 0, 0.6*cm, H, fill=1, stroke=0)

text(c, "Architecture Technique", W/2, H*0.87, size=26, bold=True, align="center")
c.setFillColor(GREEN)
c.rect(W/2 - 4*cm, H*0.83, 8*cm, 0.08*cm, fill=1, stroke=0)

layers = [
    ("Frontend", "Next.js 14 · React · Material UI · Leaflet", GREEN),
    ("Mobile", "React Native · Expo SDK 51 · iOS & Android", HexColor("#0066CC")),
    ("Backend API", "Node.js · Express · REST · JWT · WebSocket", ORANGE),
    ("Base de données", "PostgreSQL · Redis · Backups quotidiens", NAVY),
    ("Infra / DevOps", "Vercel · Railway · GitHub Actions · Sentry", HexColor("#6B21A8")),
    ("Paiements", "9 opérateurs Mobile Money · Escrow · Webhooks", HexColor("#B45309")),
]
lw = (W - 3*cm)
ly = H * 0.73
for comp, tech, col in layers:
    card(c, 1.5*cm, ly, lw, 0.9*cm, HexColor("#FFFFFF08"), 0.2*cm)
    c.setFillColor(col)
    c.rect(1.5*cm, ly, 0.25*cm, 0.9*cm, fill=1, stroke=0)
    text(c, comp, 2.2*cm, ly + 0.55*cm, size=9, bold=True, color=col)
    text(c, tech, 7.5*cm, ly + 0.55*cm, size=9, color=HexColor("#CCCCCC"))
    ly -= 1.05*cm

slide_header(c, "Stack Technique", 6, TOTAL)
slide_footer(c)
c.showPage()

# ──────────────────────────────────────────────────────────────────────────────
# SLIDE 7 — PAIEMENTS
# ──────────────────────────────────────────────────────────────────────────────
gradient_bg(c, HexColor("#3D1A00"), HexColor("#1A0A00"))
c.setFillColor(ORANGE)
c.rect(0, 0, 0.6*cm, H, fill=1, stroke=0)

text(c, "Paiement Mobile Money", W/2, H*0.87, size=26, bold=True, color=AMBER, align="center")
c.setFillColor(ORANGE)
c.rect(W/2 - 4*cm, H*0.83, 8*cm, 0.08*cm, fill=1, stroke=0)

operators = [
    "Orange Money", "Moov Money", "Wave",
    "Flutterwave", "FedaPay", "CinetPay",
    "PawaPay", "BarkaPay", "PayDunya",
]
ow = (W - 3*cm) / 3 - 0.4*cm
for i, op in enumerate(operators):
    col_i = i % 3
    row_i = i // 3
    cx = 1.5*cm + col_i * (ow + 0.4*cm)
    cy = H*0.64 - row_i * 1.5*cm
    card(c, cx, cy, ow, 1.1*cm, HexColor("#FFFFFF12"), 0.25*cm)
    text(c, op, cx + ow/2, cy + 0.38*cm, size=9.5, bold=True, color=AMBER, align="center")

# Escrow
card(c, 1.5*cm, H*0.13, W - 3*cm, 1.3*cm, HexColor("#FFFFFF10"), 0.3*cm)
text(c, "🔒  Système Escrow sécurisé : les fonds sont bloqués pendant la transaction — libérés uniquement à la validation",
     W/2, H*0.21, size=9, color=HexColor("#CCCCCC"), align="center")
text(c, "Reçus PDF automatiques · Réconciliation quotidienne · Remboursements gérés",
     W/2, H*0.16, size=8, color=HexColor("#AAAAAA"), align="center")

slide_header(c, "Paiements Mobile Money", 7, TOTAL)
slide_footer(c)
c.showPage()

# ──────────────────────────────────────────────────────────────────────────────
# SLIDE 8 — MODÈLE ÉCONOMIQUE
# ──────────────────────────────────────────────────────────────────────────────
c.setFillColor(HexColor("#0A1020"))
c.rect(0, 0, W, H, fill=1, stroke=0)
c.setFillColor(GREEN)
c.rect(0, 0, 0.6*cm, H, fill=1, stroke=0)

text(c, "Modèle Économique", W/2, H*0.87, size=26, bold=True, align="center")
c.setFillColor(ORANGE)
c.rect(W/2 - 4*cm, H*0.83, 8*cm, 0.08*cm, fill=1, stroke=0)

revenues = [
    ("Commission", "% sur chaque transaction\n(achat, location, commission)", GREEN, "Principal"),
    ("Abonnements", "Visibilité premium\npour agences et promoteurs", ORANGE, "Récurrent"),
    ("Boost annonce", "Mise en avant\npour particuliers", NAVY, "À l'acte"),
    ("API B2B", "Accès API\npour développeurs et agences", HexColor("#6B21A8"), "Abonnement"),
]
rw = (W - 3*cm) / 4 - 0.3*cm
for i, (title, desc, col, typ) in enumerate(revenues):
    cx = 1.5*cm + i * (rw + 0.3*cm)
    card(c, cx, H*0.35, rw, 3.5*cm, HexColor("#FFFFFF10"), 0.4*cm)
    c.setFillColor(col)
    c.rect(cx, H*0.35 + 3.3*cm, rw, 0.2*cm, fill=1, stroke=0)
    text(c, title, cx + rw/2, H*0.35 + 2.6*cm, size=11, bold=True, color=col, align="center")
    # Description multi-ligne
    lines = desc.split('\n')
    y_d = H*0.35 + 1.8*cm
    for line in lines:
        text(c, line, cx + rw/2, y_d, size=8, color=HexColor("#CCCCCC"), align="center")
        y_d -= 0.5*cm
    text(c, typ, cx + rw/2, H*0.35 + 0.3*cm, size=8, color=AMBER, align="center")

text(c, "Modèle éprouvé : commission faible + volume élevé = revenu scalable pan-africain",
     W/2, H*0.22, size=10, color=HexColor("#AAAAAA"), align="center")

slide_header(c, "Modèle Économique", 8, TOTAL)
slide_footer(c)
c.showPage()

# ──────────────────────────────────────────────────────────────────────────────
# SLIDE 9 — ROADMAP
# ──────────────────────────────────────────────────────────────────────────────
gradient_bg(c, GREEN_DARK, HexColor("#051510"))
c.setFillColor(ORANGE)
c.rect(0, 0, 0.6*cm, H, fill=1, stroke=0)

text(c, "Roadmap 2026 – 2028", W/2, H*0.87, size=26, bold=True, align="center")
c.setFillColor(ORANGE)
c.rect(W/2 - 4*cm, H*0.83, 8*cm, 0.08*cm, fill=1, stroke=0)

# Timeline horizontale
milestones = [
    ("Q4 2026", "Lancement CI & SN\nVisites virtuelles 360°", ORANGE),
    ("Q1 2027", "App mobile v2\nSignature électronique", GREEN),
    ("Q2 2027", "Mali · Togo · Bénin\nModule agence", AMBER),
    ("Q3 2027", "IA avancée\nChatbot multilingue", HexColor("#60A5FA")),
    ("2028", "Afrique centrale\net orientale", HexColor("#A78BFA")),
]

# Ligne de temps
y_line = H * 0.52
c.setStrokeColor(HexColor("#FFFFFF30"))
c.setLineWidth(2)
c.line(1.5*cm, y_line, W - 1.5*cm, y_line)

mw = (W - 3*cm) / 5
for i, (period, events, col) in enumerate(milestones):
    mx = 1.5*cm + i * mw + mw/2
    # Point sur la ligne
    c.setFillColor(col)
    c.circle(mx, y_line, 0.25*cm, fill=1, stroke=0)
    # Période
    text(c, period, mx, y_line + 0.5*cm, size=9, bold=True, color=col, align="center")
    # Événements en dessous
    y_e = y_line - 0.9*cm
    for line in events.split('\n'):
        text(c, line, mx, y_e, size=8.5, color=HexColor("#CCCCCC"), align="center")
        y_e -= 0.5*cm

text(c, "✅ Actuellement opérationnel au Burkina Faso — Extension en cours", W/2, H*0.2, size=10, color=AMBER, align="center")

slide_header(c, "Roadmap & Vision", 9, TOTAL)
slide_footer(c)
c.showPage()

# ──────────────────────────────────────────────────────────────────────────────
# SLIDE 10 — CONTACT
# ──────────────────────────────────────────────────────────────────────────────
gradient_bg(c, GREEN, GREEN_DARK)

text(c, "Contactez-nous", W/2, H*0.82, size=30, bold=True, align="center")
c.setFillColor(ORANGE)
c.rect(W/2 - 4*cm, H*0.78, 8*cm, 0.1*cm, fill=1, stroke=0)

contacts = [
    ("🌐", "www.immoafrica.online"),
    ("✉️", "contact@immoafrica.online"),
    ("🤖", "play.google.com  |  App Store"),
    ("📍", "Ouagadougou, Burkina Faso — Africa DEV YAZID CONSULTING"),
]
y_c = H * 0.65
for icon, info in contacts:
    card(c, W/2 - 9*cm, y_c, 18*cm, 0.9*cm, HexColor("#FFFFFF12"), 0.2*cm)
    text(c, f"{icon}  {info}", W/2, y_c + 0.3*cm, size=11, align="center")
    y_c -= 1.1*cm

text(c, "Merci pour votre attention", W/2, H*0.2, size=20, bold=True, color=AMBER, align="center")
text(c, "ImmoBF Africa — L'immobilier africain, simplifié.", W/2, H*0.13, size=11, color=HexColor("#CCE8E1"), align="center")

c.setFillColor(ORANGE)
c.rect(W - 0.8*cm, 0, 0.8*cm, H, fill=1, stroke=0)

slide_header(c, "Contact", 10, TOTAL)
slide_footer(c)
c.showPage()

# ── Sauvegarde ────────────────────────────────────────────────────────────────
c.save()
print(f"✅ Présentation générée → {OUT}")
