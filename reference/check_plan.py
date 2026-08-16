# -*- coding: utf-8 -*-
"""Vérifie que le plan respecte les 5 contraintes de Mathieu."""
import json, sys
p = json.load(open("plan.json", encoding="utf-8"))
W = p["weeks"]
errs, warns = [], []

# ---------------------------------------------------------------- exceptions
# Deux courses réelles tombent un dimanche, le jour de repos jambes : le 20 km
# de Paris le 11 octobre 2026 (S9) et le 10 km Hoka le 15 novembre (S14). Elles
# bousculent leur semaine et la suivante, et Mathieu a tranché sur la façon dont
# elles la bousculent. Ces écarts-là sont donc autorisés NOMMÉMENT, jamais par
# catégorie : un écart identique qui apparaîtrait ailleurs reste une erreur.
#
# Rien d'autre ne bouge. Les contraintes 1 (+2 km), 3 (vitesse et renfo bas
# jamais accolés à la longue), 4 (un repos jambes complet) et 6 (jamais deux
# jours de course consécutifs) tiennent sur les 35 semaines, courses comprises.
EXCEPTIONS = {
    "S9: mercredi contient inter (8 x 400 m)":
        "qualité avancée au mercredi, la course occupe le samedi et le dimanche",
    "S14: mercredi contient inter (6 x 1000 m)":
        "qualité avancée au mercredi, la course occupe le samedi et le dimanche",
    "S10: 1 vélo(s)":
        "le vélo Z2 du jeudi cède la place à la sortie longue déplacée",
    "S15: 1 vélo(s)":
        "le vélo Z2 du jeudi cède la place à la sortie longue déplacée",
}
ATTENDUS = {
    "S10: 2 courses": "lundi en repos au lendemain de la course, l'EF saute",
    "S15: 2 courses": "lundi en repos au lendemain de la course, l'EF saute",
}

# 1) sortie longue : increment <= 2 km
prev = None
for w in W:
    if w["n"] == 35: break
    if w["sl"] == 0: continue            # S1 : semaine d'amorce, pas de sortie longue
    if prev is not None and w["sl"] - prev > 2:
        errs.append(f"S{w['n']}: sortie longue {prev} -> {w['sl']} = +{w['sl']-prev} km")
    prev = w["sl"]

# 2) mercredi : ni course ni renfo haut
RUN = {"long", "ef", "inter", "tempo", "test", "race", "course"}
for w in W:
    for s in w["sessions"]:
        if s["day"] == 2 and (s["type"] in RUN or s["type"] == "muscu-haut"):
            errs.append(f"S{w['n']}: mercredi contient {s['type']} ({s['title']})")

# 3) vitesse & muscu bas jamais accolées à la sortie longue
SPEED = {"inter", "tempo", "test", "course", "race"}
for w in W:
    days = {}
    for s in w["sessions"]:
        days.setdefault(s["day"], []).append(s["type"])
    long_days = [d for d, t in days.items() if "long" in t]
    for ld in long_days:
        for adj in (ld - 1, ld + 1):
            if adj in days:
                bad = [t for t in days[adj] if t in SPEED or t == "muscu-bas"]
                if bad:
                    errs.append(f"S{w['n']}: {bad} le jour {adj}, accolé à la sortie longue (jour {ld})")
        # veille de la SL = dernier jour de la semaine précédente
    # bord de semaine : dimanche precedent -> lundi SL
for i, w in enumerate(W[:-1]):
    nxt = W[i + 1]
    sun = [s["type"] for s in w["sessions"] if s["day"] == 6]
    mon_next = [s["type"] for s in nxt["sessions"] if s["day"] == 0]
    if "long" in mon_next:
        bad = [t for t in sun if t in SPEED or t == "muscu-bas"]
        if bad:
            errs.append(f"S{w['n']} dimanche {bad} accolé à la sortie longue de S{nxt['n']}")

# 4) un jour de repos jambes complet par semaine
LEG = RUN | {"muscu-bas", "velo", "escalade"}
for w in W:
    if w["n"] == 35: continue
    busy = {s["day"] for s in w["sessions"] if s["type"] in LEG}
    free = set(range(7)) - busy
    if not free:
        errs.append(f"S{w['n']}: aucun jour de repos jambes")

# 5) 2 vélos, 2 muscu, escalade mercredi, 3 courses
AMORCE = 1   # S1 : pas de sortie longue (25 km courus la veille), 3 vélos et 2 courses
for w in W:
    if w["n"] in (35, AMORCE): continue
    c = {}
    for s in w["sessions"]:
        c[s["type"]] = c.get(s["type"], 0) + 1
    if c.get("velo", 0) != 2: errs.append(f"S{w['n']}: {c.get('velo',0)} vélo(s)")
    if c.get("muscu-bas", 0) != 1: errs.append(f"S{w['n']}: muscu bas x{c.get('muscu-bas',0)}")
    if c.get("muscu-haut", 0) != 1: errs.append(f"S{w['n']}: muscu haut x{c.get('muscu-haut',0)}")
    if c.get("escalade", 0) != 1: errs.append(f"S{w['n']}: escalade x{c.get('escalade',0)}")
    runs = sum(v for k, v in c.items() if k in RUN)
    if runs != 3: warns.append(f"S{w['n']}: {runs} courses")

# 6) jamais 2 jours de course consécutifs sauf lun/mar (SL + récup) volontaire
for w in W:
    if w["n"] == AMORCE: continue
    rd = sorted({s["day"] for s in w["sessions"] if s["type"] in RUN})
    for a, b in zip(rd, rd[1:]):
        if b - a == 1 and (a, b) != (0, 1):
            warns.append(f"S{w['n']}: courses consécutives jours {a}-{b}")

# 7) dates
from datetime import date
assert W[0]["monday"] == "2026-08-10", W[0]["monday"]
assert W[34]["monday"] == "2027-04-05"
assert p["meta"]["raceDate"] == "2027-04-11"

print(f"Semaines: {len(W)}  Séances: {sum(len(w['sessions']) for w in W)}")
print(f"Sortie longue: {[w['sl'] for w in W]}")
print(f"Volume course/sem approx: bloc A {W[0]['sl']+W[0]['efKm']}km + qualité")
print()

# Un écart documenté qui DISPARAÎT compte aussi : soit le plan a changé sans
# qu'on mette la liste à jour, soit le vérificateur ne voit plus ce qu'il
# devrait voir. Dans les deux cas il faut le savoir.
attendus_absents = [k for k in EXCEPTIONS if k not in errs] + [k for k in ATTENDUS if k not in warns]
ecarts = [e for e in errs if e in EXCEPTIONS]
errs = [e for e in errs if e not in EXCEPTIONS]
warns = [x for x in warns if x not in ATTENDUS]

if ecarts:
    print("Écarts documentés (courses du 11 octobre et du 15 novembre) :")
    for e in ecarts:
        print(f"  ~ {e}  →  {EXCEPTIONS[e]}")
    print()
if attendus_absents:
    errs += [f"écart documenté introuvable, la liste est à revoir : {k}" for k in attendus_absents]

if errs:
    print("ERREURS:"); [print("  x", e) for e in errs]
else:
    print("Toutes les contraintes dures sont respectées.")
if warns:
    print("Avertissements:"); [print("  !", x) for x in warns]
sys.exit(1 if errs else 0)
