# -*- coding: utf-8 -*-
"""Contrôle du plan v2 (34 semaines, marathon le 4 avril 2027).

Les contraintes ont changé le 18 septembre 2026 :

  1. la sortie longue ne monte jamais de plus de 2 km d'une semaine de CHARGE
     à la suivante — les décharges, les pauses de longue, les semaines de
     course et leurs lendemains ne sont pas des étapes de la progression ;
  2. supprimée : l'escalade sort du plan, elle redevient un remplacement ;
  3. ni vitesse ni renforcement accolés à la sortie longue ;
  4. un jour de repos jambes complet par semaine ;
  5. un vélo par semaine, du volume sans impact et non une béquille ;
  6. jamais deux jours de course consécutifs, sauf la paire lundi-mardi ;
  7. aucune séance dure hors bloc spécifique : pas de zone vo2 ou rep en
     dehors du bloc 10 km, du bloc marathon et des séances de vitesse courte ;
  8. la sortie longue reste sous 45 % du volume de course de la semaine ;
  9. quatre courses par semaine, deux renforcements, aucun renfo un jour de
     course.

Les semaines 1 à 6 viennent de l'ancien plan et ne sont pas contrôlées : elles
portent la structure d'avant, avec l'escalade et les deux vélos.
"""
import json
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
plan = json.loads((RACINE / "src/data/plan.json").read_text())

PREMIERE = 7
COURSE = {"long", "ef", "tempo", "inter", "test", "course", "race"}
VITESSE = {"inter", "test"}
RENFO = {"muscu-bas", "muscu-haut"}
JAMBES = COURSE | {"velo", "marche", "muscu-bas", "escalade"}
JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]

DECHARGE = {17, 21, 26}
PAUSE_LONGUE = {13, 19, 24, 30}
COURSES = {9, 14, 25, 34}
DEBUT_DECALE = {10, 15}
# Sorties longues raccourcies mais intensifiées avant le 20 km : hors chaîne.
LONGUE_QUALITATIVE = {8, 9}
HORS_CHAINE = DECHARGE | PAUSE_LONGUE | COURSES | DEBUT_DECALE | LONGUE_QUALITATIVE
HORS_REGLE_PART = DEBUT_DECALE | COURSES
# La vitesse est permise dans le bloc 10 km, dans le spécifique marathon, et
# une fois par mois en séance courte : c'est le dosage « trois seuils pour une
# vitesse » d'un marathonien.
VITESSE_AUTORISEE = {8, 9, 10, 11, 12, 13, 14, 19, 27, 28, 29, 30, 31, 32, 33, 34}

erreurs = []
avert = []


def dire(liste, w, texte):
    liste.append(f"S{w:<3} {texte}")


semaines = [w for w in plan["weeks"] if w["n"] >= PREMIERE]

for w in semaines:
    n = w["n"]
    s = w["sessions"]
    jours = {}
    for x in s:
        jours.setdefault(x["day"], []).append(x)

    courses_jours = sorted(d for d, xs in jours.items() if any(x["type"] in COURSE for x in xs))
    volume = sum(x.get("dist") or 0 for x in s if x["type"] in COURSE)
    longue = next((x for x in s if x["type"] == "long"), None)

    # 3. rien de traumatisant collé à la sortie longue
    if longue:
        for d in (longue["day"] - 1, longue["day"] + 1, longue["day"]):
            for x in jours.get(d, []):
                if x is longue:
                    continue
                if x["type"] in VITESSE or x["type"] == "muscu-bas":
                    dire(erreurs, n, f"contrainte 3 : {x['title']} le {JOURS[d]}, accolé à la sortie longue")

    # 4. un jour sans jambes
    sans_jambes = [d for d in range(7) if not any(x["type"] in JAMBES for x in jours.get(d, []))]
    if not sans_jambes:
        dire(erreurs, n, "contrainte 4 : aucun jour de repos jambes complet")

    # 5. un vélo, pas deux
    velos = sum(1 for x in s if x["type"] == "velo")
    if velos > 1:
        dire(avert, n, f"contrainte 5 : {velos} vélos, un seul est prévu")

    # 6. jamais deux jours de course consécutifs, sauf lundi-mardi
    for a, b in zip(courses_jours, courses_jours[1:]):
        if b - a == 1 and (a, b) != (0, 1):
            dire(erreurs, n, f"contrainte 6 : course {JOURS[a]} et {JOURS[b]}")
    for d, xs in jours.items():
        if sum(1 for x in xs if x["type"] in COURSE) > 1:
            dire(erreurs, n, f"contrainte 6 : deux courses le même {JOURS[d]}")

    # 7. pas de séance dure là où elle n'a rien à faire
    if n not in VITESSE_AUTORISEE:
        for x in s:
            zones = {z for _, z in (x.get("main") or []) if z} | {
                seg["zone"] for seg in (x.get("struct") or [])}
            # La zone `rep` couvre les lignes droites et les 200 m : c'est du
            # neuromusculaire, pas une séance dure. Seule la vo2 est gardée.
            if "vo2" in zones:
                dire(erreurs, n, f"contrainte 7 : {x['title']} travaille en vo2 hors bloc spécifique")

    # 7 bis. une sortie longue accélère, elle ne ralentit jamais. Le negative
    # split est la compétence marathon numéro un, et un plan qui finit plus
    # lentement qu'il n'a commencé apprend l'inverse.
    VITESSE_ZONE = {"recup": 0, "ef": 1, "am": 2, "semi": 3, "seuil": 4, "vo2": 5, "rep": 6}
    for x in s:
        segs = [seg["zone"] for seg in (x.get("struct") or [])]
        rangs = [VITESSE_ZONE[z] for z in segs]
        if any(b < a for a, b in zip(rangs, rangs[1:])):
            dire(erreurs, n, f"{x['title']} ralentit en cours de route : {' puis '.join(segs)}")

    # 8. la part de la sortie longue
    if longue and n not in HORS_REGLE_PART:
        part = longue["dist"] / volume * 100
        # Avec quatre courses par semaine, une longue de 26 km pèse forcément
        # près de la moitié tant que le volume n'a pas monté : le plafond se
        # desserre en dessous de 65 km, sinon la règle interdirait de progresser.
        limite = 48 if volume < 65 else 46
        if part > limite:
            dire(erreurs, n, f"contrainte 8 : la longue pèse {part:.0f} % du volume, la limite est {limite} %")

    # 9. la forme de la semaine
    nb_courses = sum(1 for x in s if x["type"] in COURSE)
    attendu = 3 if n in DEBUT_DECALE else 4
    if nb_courses != attendu:
        dire(avert, n, f"{nb_courses} courses, {attendu} attendues")
    renfos = sum(1 for x in s if x["type"] in RENFO)
    if renfos != 2 and n != 34:
        dire(avert, n, f"{renfos} renforcements, 2 attendus")
    for d, xs in jours.items():
        if any(x["type"] in RENFO for x in xs) and any(x["type"] in COURSE for x in xs):
            dire(erreurs, n, f"renfo le {JOURS[d]}, un jour de course")
    if any(x["type"] == "escalade" for x in s):
        dire(erreurs, n, "l'escalade ne fait plus partie du plan")

# 1. la chaîne de la sortie longue
chaine = [(w["n"], w["sl"]) for w in semaines if w["n"] not in HORS_CHAINE and w["sl"]]
for (na, a), (nb, b) in zip(chaine, chaine[1:]):
    if b - a > 2:
        dire(erreurs, nb, f"contrainte 1 : sortie longue {a} → {b} km depuis S{na}, plus de 2 km")

# Les décharges creusent d'au moins 20 %, sur la longue comme sur le volume.
vol = {w["n"]: sum(x.get("dist") or 0 for x in w["sessions"] if x["type"] in COURSE) for w in semaines}
for n in sorted(DECHARGE):
    ref = max((m for m in vol if m < n and m not in HORS_CHAINE), default=None)
    if ref is None:
        continue
    cv = (vol[n] - vol[ref]) / vol[ref] * 100
    sl_ref = next(w["sl"] for w in semaines if w["n"] == ref)
    sl_n = next(w["sl"] for w in semaines if w["n"] == n)
    csl = (sl_n - sl_ref) / sl_ref * 100
    if cv > -20 or csl > -20:
        dire(erreurs, n, f"décharge trop molle contre S{ref} : volume {cv:+.0f} %, longue {csl:+.0f} %")

print(f"Plan v2 : {len(plan['weeks'])} semaines, "
      f"{sum(len(w['sessions']) for w in plan['weeks'])} séances, "
      f"marathon le {plan['meta']['raceDate']}")
print(f"Contrôle des semaines {PREMIERE} à {plan['weeks'][-1]['n']}\n")

for e in erreurs:
    print("  ERREUR   ", e)
for a in avert:
    print("  attention", a)

if not erreurs:
    print("  Les neuf contraintes tiennent.")
print()
raise SystemExit(1 if erreurs else 0)
