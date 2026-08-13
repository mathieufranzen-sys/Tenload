# -*- coding: utf-8 -*-
"""Génère le plan 35 semaines (10/08/2026 -> Marathon de Paris 11/04/2027)."""
import json
from datetime import date, timedelta

START = date(2026, 8, 10)          # lundi S1
RACE = date(2027, 4, 11)           # dimanche S35

# ---------------------------------------------------------------- zones
# Toutes les allures sont dérivées de l'allure marathon cible (MP, s/km).
# offset en s/km par rapport à MP. Recalibré par le test 3 km.
ZONES = {
    "recup":  {"label": "Récupération",     "off": 75,  "color": "ef"},
    "ef":     {"label": "Endurance facile", "off": 50,  "color": "ef"},
    "am":     {"label": "Allure marathon",  "off": 0,   "color": "long"},
    "seuil":  {"label": "Seuil",            "off": -20, "color": "tempo"},
    "vo2":    {"label": "Intervalles",      "off": -40, "color": "inter"},
    "rep":    {"label": "Répétitions",      "off": -55, "color": "inter"},
}

# ---------------------------------------------------------------- blocs
BLOCS = [
    {"id": "A", "name": "Réathlétisation", "weeks": (1, 8),
     "focus": "Retour à la course sans douleur. Le vélo porte le volume, la muscu reconstruit le tendon. Sortie longue de 22 à 28 km.",
     "color": "#4E8CFF"},
    {"id": "B", "name": "Base aérobie", "weeks": (9, 16),
     "focus": "Construction du socle. Volume vers 50 km par semaine, seuil régulier, tendon consolidé.",
     "color": "#3ECF8E"},
    {"id": "C", "name": "Développement", "weeks": (17, 25),
     "focus": "Montée en puissance VMA et seuil, sorties longues à 32 km. Semi-marathon test le 30 janvier : c'est lui qui décide si l'objectif tient.",
     "color": "#F5B32E"},
    {"id": "D", "name": "Spécifique marathon", "weeks": (26, 32),
     "focus": "Allure marathon en volume. Les sorties longues portent des blocs à 4:37/km, l'allure du 11 avril.",
     "color": "#FF7A3D"},
    {"id": "E", "name": "Affûtage", "weeks": (33, 35),
     "focus": "On coupe le volume, on garde l'intensité. Fraîcheur maximale le 11 avril.",
     "color": "#E5484D"},
]

# Sortie longue : jamais +2 km d'une semaine sur l'autre (règle tendon).
# Les décharges sont des baisses libres, mais la remontée se refait à +2 max.
SL = {
    # S1 : semaine d'amorce, pas de sortie longue (25 km couru le dimanche 9 août)
    1: 0,
    # Bloc A — réathlétisation
    2: 22, 3: 24, 4: 26, 5: 22, 6: 24, 7: 26, 8: 28,
    # Bloc B — base aérobie
    9: 24, 10: 26, 11: 28, 12: 30, 13: 26, 14: 28, 15: 30, 16: 32,
    # Bloc C — développement (S25 = semi-marathon test, il fait office de sortie longue)
    17: 26, 18: 28, 19: 30, 20: 32, 21: 26, 22: 28, 23: 30, 24: 32, 25: 21.1,
    # Bloc D — spécifique marathon
    26: 22, 27: 24, 28: 26, 29: 28, 30: 30, 31: 32, 32: 26,
    # Bloc E — affûtage
    33: 28, 34: 20, 35: 12,
}
DELOAD = {5, 9, 13, 17, 21, 25, 32, 34}
NO_LONG_MONDAY = {1, 25, 35}   # amorce / semi test / marathon

# Structure de la sortie longue : liste de (km, zone) ; km=None => reste de la distance
SL_STRUCT = {}
for w, km in SL.items():
    if w <= 8:                      # bloc A : 100 % conversationnel
        SL_STRUCT[w] = [("all", "ef")]
    elif w <= 16:                   # bloc B : finish à allure marathon
        SL_STRUCT[w] = [("all", "ef")] if w in DELOAD else [("all-4", "ef"), (4, "am")]
    elif w <= 25:                   # bloc C : bloc AM au milieu
        SL_STRUCT[w] = [("all", "ef")] if w in DELOAD else [("all-6", "ef"), (6, "am")]
    elif w <= 32:                   # bloc D : gros volume à allure marathon
        if w in DELOAD:
            SL_STRUCT[w] = [("all-5", "ef"), (5, "am")]
        elif w <= 28:
            SL_STRUCT[w] = [("all-8", "ef"), (8, "am")]
        else:
            SL_STRUCT[w] = [("all-12", "ef"), (8, "am"), (4, "seuil")]
    else:
        SL_STRUCT[w] = [("all-5", "ef"), (5, "am")] if w == 33 else [("all", "ef")]

# ---------------------------------------------------------------- qualité
# type: test | cotes | fartlek | seuil | interval | progressif | course
QUALITE = {
 1:  {"t":"seuil","name":"Reprise 2 x 2 km au seuil","dist":9,
      "wu":[(2.5,"ef")],"main":[("2 x 2 km","seuil"),("récup 3 min souple","")],
      "cd":[(2,"recup")],
      "note":"Semaine d'amorce : ton test de 3 km du 8 août a déjà calibré le plan (12:02, soit 4:00/km), on ne le refait pas. Cette séance sert juste à réinstaller le rythme après les 25 km de dimanche. Si les jambes sont lourdes, tu coupes après le premier bloc."},
 2:  {"t":"cotes","name":"Côtes courtes 6 x 45 s","dist":9,
      "wu":[(2.5,"ef")],"main":[("6 x 45 s en côte modérée","effort 8/10, retour en marchant")],
      "cd":[(2.5,"recup")],
      "note":"Les côtes chargent le mollet sans l'impact de la vitesse à plat, et c'est un excellent stimulus pour un tendon en reconstruction. Retour en MARCHANT : la descente en courant est ce qui abîme."},
 3:  {"t":"fartlek","name":"Fartlek 8 x 1 min","dist":9,
      "wu":[(2.5,"ef")],"main":[("8 x (1 min vif + 1 min souple)","au ressenti, sans regarder la montre")],
      "cd":[(2,"recup")],
      "note":"Première séance rapide du bloc. Cherche la fluidité, pas le chrono. Tu dois finir en te disant que tu aurais pu en faire quatre de plus."},
 4:  {"t":"seuil","name":"Seuil 2 x 8 min","dist":9,
      "wu":[(2.5,"ef")],"main":[("2 x 8 min","seuil"),("récup 3 min souple","")],
      "cd":[(2,"recup")],"note":"Ton premier vrai seuil du bloc. À 4:17/km, c'est l'allure que tu tiendrais une heure en compétition."},
 5:  {"t":"interval","name":"5 x 1000 m","dist":10,
      "wu":[(2.5,"ef")],"main":[("5 x 1000 m","vo2"),("récup 90 s marche/trot","")],
      "cd":[(2,"recup")],"note":"Semaine de décharge, mais on garde l'intensité. Récupération active entre les répétitions, jamais à l'arrêt complet : le tendon aime rester chaud."},
 6:  {"t":"seuil","name":"Tempo 3 x 2 km","dist":11,
      "wu":[(2.5,"ef")],"main":[("3 x 2 km","seuil"),("récup 2 min","")],
      "cd":[(2,"recup")],"note":"Séance de seuil de référence, à comparer avec ton 2x2km du 19 juillet. Allure régulière du premier au dernier kilomètre."},
 7:  {"t":"interval","name":"6 x 800 m","dist":10,
      "wu":[(2.5,"ef")],"main":[("6 x 800 m","vo2"),("récup 90 s","")],
      "cd":[(2,"recup")],"note":"Tu as déjà fait cette séance le 23 juillet et le 4 juillet. Compare tes sensations à allure égale : c'est ton meilleur indicateur de progression."},
 8:  {"t":"seuil","name":"Tempo continu 20 min","dist":10,
      "wu":[(2.5,"ef")],"main":[("20 min continu","seuil")],
      "cd":[(2,"recup")],"note":"Fin du bloc A. Si tu arrives ici avec une douleur au réveil à 1 ou moins, le tendon a tourné la page et on peut ouvrir le volume."},
 9:  {"t":"interval","name":"8 x 400 m","dist":9,
      "wu":[(2.5,"ef")],"main":[("8 x 400 m","rep"),("récup 90 s","")],
      "cd":[(2,"recup")],"note":"Décharge. Vitesse pure et économie de course : foulée haute, appuis vifs, pas de recherche de volume."},
 10: {"t":"seuil","name":"2 x 3 km au seuil","dist":11,
      "wu":[(2.5,"ef")],"main":[("2 x 3 km","seuil"),("récup 3 min","")],
      "cd":[(2,"recup")],"note":"On allonge les blocs de seuil. C'est la qualité qui construit un marathon rapide, plus que les intervalles courts."},
 11: {"t":"interval","name":"5 x 1200 m","dist":11,
      "wu":[(2.5,"ef")],"main":[("5 x 1200 m","vo2"),("récup 2 min","")],
      "cd":[(2,"recup")],"note":"Séance exigeante. Si le mollet tire pendant l'échauffement, tu bascules sur du seuil : la VMA n'est pas le facteur limitant de ton marathon."},
 12: {"t":"seuil","name":"4 x 2 km au seuil","dist":12,
      "wu":[(2.5,"ef")],"main":[("4 x 2 km","seuil"),("récup 2 min","")],
      "cd":[(2,"recup")],"note":"8 km de seuil au total, le plus gros volume qualitatif depuis le début."},
 13: {"t":"fartlek","name":"Fartlek 10 x 1 min","dist":9,
      "wu":[(2.5,"ef")],"main":[("10 x (1 min vif + 1 min souple)","au ressenti")],
      "cd":[(2,"recup")],"note":"Décharge : du rythme sans contrainte de chrono."},
 14: {"t":"interval","name":"6 x 1000 m","dist":11,
      "wu":[(2.5,"ef")],"main":[("6 x 1000 m","vo2"),("récup 90 s","")],
      "cd":[(2,"recup")],"note":"Même séance qu'en semaine 5, une répétition de plus. Vise moins de 3 s d'écart entre le premier et le dernier."},
 15: {"t":"seuil","name":"Tempo continu 30 min","dist":12,
      "wu":[(2.5,"ef")],"main":[("30 min continu","seuil")],
      "cd":[(2,"recup")],"note":"Trente minutes au seuil : la séance la plus directement transférable vers le marathon."},
 16: {"t":"seuil","name":"3 x 3 km au seuil","dist":13,
      "wu":[(2.5,"ef")],"main":[("3 x 3 km","seuil"),("récup 3 min","")],
      "cd":[(2,"recup")],"note":"Fin du bloc B, avec une sortie longue de 32 km le lundi. Grosse semaine, la décharge arrive juste après."},
 17: {"t":"interval","name":"8 x 400 m","dist":9,
      "wu":[(2.5,"ef")],"main":[("8 x 400 m","rep"),("récup 90 s","")],
      "cd":[(2,"recup")],"note":"Décharge d'ouverture du bloc C. Entretien de la vivacité."},
 18: {"t":"interval","name":"6 x 1000 m","dist":11,
      "wu":[(2.5,"ef")],"main":[("6 x 1000 m","vo2"),("récup 90 s","")],
      "cd":[(2,"recup")],"note":"Novembre, il fait froid : rallonge l'échauffement de 5 minutes, un tendon froid est un tendon qui casse."},
 19: {"t":"progressif","name":"Progressif 13 km","dist":13,
      "wu":[(1,"ef")],
      "main":[("5 km","ef"),("4 km","am"),("3 km","seuil")],
      "cd":[(1,"recup")],"note":"Le negative split est la compétence marathon numéro un, et c'est exactement ce qui t'a manqué sur ton 23 km du 30 juillet. Finis plus vite que tu n'as commencé."},
 20: {"t":"seuil","name":"2 x 4 km au seuil","dist":13,
      "wu":[(2.5,"ef")],"main":[("2 x 4 km","seuil"),("récup 4 min","")],
      "cd":[(2,"recup")],"note":"Blocs longs au seuil, sur une semaine à 32 km de sortie longue. Mental et lucidité d'allure."},
 21: {"t":"interval","name":"8 x 500 m","dist":9,
      "wu":[(2.5,"ef")],"main":[("8 x 500 m","rep"),("récup 90 s","")],
      "cd":[(2,"recup")],"note":"Décharge de fin d'année. Entretien, rien de plus."},
 22: {"t":"interval","name":"5 x 1200 m","dist":12,
      "wu":[(2.5,"ef")],"main":[("5 x 1200 m","vo2"),("récup 2 min","")],
      "cd":[(2,"recup")],"note":"Dernière grosse séance de VMA avant le semi test. Après ça, tout devient spécifique marathon."},
 23: {"t":"seuil","name":"3 x 3 km au seuil","dist":14,
      "wu":[(2.5,"ef")],"main":[("3 x 3 km","seuil"),("récup 3 min","")],
      "cd":[(2,"recup")],"note":"Répétition générale du seuil, deux semaines avant le semi."},
 24: {"t":"seuil","name":"Tempo continu 35 min","dist":13,
      "wu":[(2.5,"ef")],"main":[("35 min continu","seuil")],
      "cd":[(2,"recup")],"note":"Dernière séance avant le semi test. Tu dois finir en ayant de la marge : si tu es cuit, lève le pied la semaine prochaine avant la course."},
 25: {"t":"course","name":"Semi-marathon test","dist":21.1,
      "wu":[(2,"ef")],"main":[("21,1 km","seuil")],
      "cd":[(1,"recup")],
      "note":"Le point de bascule du plan. Course officielle ou solo chronométré, peu importe, mais à fond. Objectif : 1 h 30 ou mieux, ce qui valide la trajectoire vers 3 h 15. Sous 1 h 25 avec une douleur restée sous 2, on rouvre le dossier sub-3 pour les dix dernières semaines. Au-delà de 1 h 35, on recale l'objectif sur 3 h 25 sans état d'âme."},
 26: {"t":"seuil","name":"3 x 4 km à allure marathon","dist":15,
      "wu":[(2,"ef")],"main":[("3 x 4 km","am"),("récup 3 min","")],
      "cd":[(1,"recup")],"note":"Ouverture du bloc spécifique. À partir d'ici, l'allure marathon devient l'allure de référence de presque tout ce que tu fais."},
 27: {"t":"interval","name":"6 x 1000 m","dist":11,
      "wu":[(2.5,"ef")],"main":[("6 x 1000 m","vo2"),("récup 90 s","")],
      "cd":[(2,"recup")],"note":"Entretien VMA. Ça garde la foulée vive quand le volume marathon commence à tout écraser."},
 28: {"t":"seuil","name":"2 x 5 km au seuil","dist":15,
      "wu":[(2.5,"ef")],"main":[("2 x 5 km","seuil"),("récup 4 min","")],
      "cd":[(2,"recup")],"note":"Dix kilomètres de seuil. Une des trois séances clés du plan, celle où tu sauras si 3 h 15 est acquis."},
 29: {"t":"seuil","name":"4 x 3 km à allure marathon","dist":16,
      "wu":[(2,"ef")],"main":[("4 x 3 km","am"),("récup 2 min","")],
      "cd":[(2,"recup")],"note":"Douze kilomètres à allure course, fractionnés. Mémorise la sensation : c'est très exactement celle du 11 avril."},
 30: {"t":"progressif","name":"10 km à allure marathon + 5 x 200 m","dist":15,
      "wu":[(2.5,"ef")],
      "main":[("10 km","am"),("5 x 200 m","rep")],
      "cd":[(1.5,"recup")],"note":"Allure marathon en continu, puis relance sur jambes fatiguées. Séance signature du bloc : c'est celle qui apprend au corps à accélérer au 35e km."},
 31: {"t":"seuil","name":"3 x 3 km au seuil","dist":14,
      "wu":[(2.5,"ef")],"main":[("3 x 3 km","seuil"),("récup 3 min","")],
      "cd":[(2,"recup")],"note":"Dernière grosse séance de seuil du plan, sur la semaine du pic à 32 km. Après, tout descend."},
 32: {"t":"interval","name":"5 x 1000 m","dist":11,
      "wu":[(2.5,"ef")],"main":[("5 x 1000 m","vo2"),("récup 90 s","")],
      "cd":[(2,"recup")],"note":"Décharge. L'affûtage commence la semaine prochaine, et à partir de maintenant, moins vaut mieux que plus."},
 33: {"t":"seuil","name":"2 x 3 km au seuil + 4 x 200 m","dist":12,
      "wu":[(2.5,"ef")],"main":[("2 x 3 km","seuil"),("récup 3 min",""),("4 x 200 m","rep")],
      "cd":[(1.5,"recup")],"note":"Affûtage, semaine 1. On garde la qualité, on coupe le volume."},
 34: {"t":"seuil","name":"3 km à allure marathon + 6 x 300 m","dist":10,
      "wu":[(2,"ef")],"main":[("3 km","am"),("6 x 300 m","rep")],
      "cd":[(1.5,"recup")],"note":"Affûtage, semaine 2. Tu vas te sentir bizarrement frais et avoir envie d'en faire plus. N'en fais pas plus, c'est le piège classique."},
 35: {"t":"course","name":"Marathon de Paris","dist":42.195,
      "wu":[("Échauffement 10 min marche + mobilité",None)],
      "main":[("42,195 km","am")],
      "cd":[("Marche 10 min, glaçage tendon le soir",None)],
      "note":"Huit mois de travail. Les dix premiers kilomètres volontairement 5 s/km plus lents que l'allure cible, puis tu t'installes. Le marathon commence au 30e kilomètre : tout ce qui précède n'est que de la gestion."},
}

# ---------------------------------------------------------------- muscu
MUSCU_BAS = {
 "A": {"name":"Bas du corps — protocole tendon",
   "ex":[("Stanish (excentrique mollet, 2 jambes)","3 x 15","tempo 3 s descente, charge 12 kg"),
         ("Pointes de pied statique jambe tendue","3 x 45 s","unilatéral, 12 kg"),
         ("Pointes de pied genou fléchi","3 x 12","unilatéral, soléaire"),
         ("Soulevé de terre unilatéral","3 x 12","10 kg"),
         ("Hip extension unilatéral","3 x 12",""),
         ("Fentes bulgares","3 x 10","2 x 6 kg"),
         ("Crab walk élastique","3 x 12 / côté",""),
         ("Squat talonnette","3 x 16","2 x 6 kg")]},
 "B": {"name":"Bas du corps — force & tendon",
   "ex":[("Stanish unilatéral","3 x 12","charge 16 kg, 3 s descente"),
         ("Pointes de pied lourdes (Alfredson)","3 x 15","unilatéral, charge progressive"),
         ("Squat","4 x 8","charge modérée"),
         ("Soulevé de terre roumain","3 x 10",""),
         ("Fentes marchées","3 x 12 / jambe",""),
         ("Pont fessier unilatéral","3 x 12",""),
         ("Excentrique ischios (nordic curl assisté)","3 x 6",""),
         ("Proprioception mono-podale","3 x 45 s","yeux fermés")]},
 "C": {"name":"Bas du corps — force & pliométrie douce",
   "ex":[("Stanish unilatéral","4 x 10","charge lourde"),
         ("Squat","4 x 6","lourd"),
         ("Soulevé de terre","4 x 6",""),
         ("Sauts sur place 2 pieds","3 x 20","protocole kiné, réception amortie"),
         ("Sauts unilatéraux","3 x 12","si douleur ≤ 2"),
         ("Fentes sautées","3 x 8",""),
         ("Mollets debout machine","4 x 12",""),
         ("Gainage latéral","3 x 45 s / côté","")]},
 "D": {"name":"Bas du corps — puissance spécifique",
   "ex":[("Stanish unilatéral","3 x 10","entretien, charge lourde"),
         ("Squat","3 x 5","explosif"),
         ("Montées de marche chargées","3 x 10 / jambe",""),
         ("Bondissements horizontaux","4 x 10",""),
         ("Mollets unilatéral lourd","4 x 10",""),
         ("Fentes bulgares","3 x 8","charge"),
         ("Gainage dynamique","3 x 45 s","")]},
 "E": {"name":"Bas du corps — entretien affûtage",
   "ex":[("Stanish unilatéral","2 x 10","charge légère"),
         ("Pointes de pied","2 x 15",""),
         ("Squat au poids du corps","2 x 15",""),
         ("Mobilité cheville + voûte plantaire","10 min",""),
         ("Gainage","2 x 40 s","")]},
}
MUSCU_HAUT = {
 "A": {"name":"Haut du corps — base",
   "ex":[("Pompes","4 x 12",""),("Développé militaire","4 x 10",""),
         ("Rowing élastique ou haltères","4 x 12",""),("Curl biceps","3 x 12",""),
         ("Dips sur banc","3 x 12",""),("Crunch + gainage planche","3 x 45 s","")]},
 "B": {"name":"Haut du corps — force",
   "ex":[("Tractions (assistées si besoin)","4 x 6",""),("Développé couché haltères","4 x 8",""),
         ("Développé militaire","4 x 8",""),("Rowing unilatéral","4 x 10",""),
         ("Élévations latérales","3 x 12",""),("Gainage planche + side","3 x 50 s","")]},
 "C": {"name":"Haut du corps — force & escalade",
   "ex":[("Tractions lestées","4 x 5",""),("Développé militaire","4 x 8",""),
         ("Rowing barre","4 x 8",""),("Face pull","3 x 15","santé d'épaule pour l'escalade"),
         ("Curl marteau","3 x 12",""),("Gainage anti-rotation","3 x 40 s / côté","")]},
 "D": {"name":"Haut du corps — entretien",
   "ex":[("Tractions","3 x 8",""),("Pompes lestées","3 x 12",""),
         ("Développé militaire","3 x 10",""),("Rowing","3 x 12",""),
         ("Gainage complet","3 x 45 s","")]},
 "E": {"name":"Haut du corps — léger",
   "ex":[("Tractions","2 x 8",""),("Pompes","2 x 15",""),
         ("Rowing élastique","2 x 15",""),("Gainage","2 x 40 s","")]},
}

def bloc_of(w):
    for b in BLOCS:
        if b["weeks"][0] <= w <= b["weeks"][1]:
            return b
    raise ValueError(w)

def velo_min(w, second=False):
    b = bloc_of(w)["id"]
    base = {"A": 55, "B": 60, "C": 60, "D": 55, "E": 40}[b]
    if w in DELOAD: base -= 10
    return base - 15 if second else base

def ef_km(w):
    """3e course : EF courte, le mardi (récup active après la sortie longue)."""
    b = bloc_of(w)["id"]
    base = {"A": 7, "B": 9, "C": 10, "D": 11, "E": 6}[b]
    if w in DELOAD: base -= 1
    if w == 35: return 5
    return base

# ---------------------------------------------------------------- assemblage
weeks = []
for w in range(1, 36):
    mon = START + timedelta(days=(w - 1) * 7)
    b = bloc_of(w)
    bid = b["id"]
    dl = w in DELOAD
    q = QUALITE[w]

    # Sortie longue
    sl_km = SL[w]
    sl_struct = []
    for seg, zone in SL_STRUCT[w]:
        if isinstance(seg, str) and seg.startswith("all"):
            if seg == "all":
                km = sl_km
            else:
                km = sl_km - float(seg.split("-")[1])
            sl_struct.append({"km": round(km, 1), "zone": zone})
        else:
            sl_struct.append({"km": float(seg), "zone": zone})

    sessions = []
    # --- LUNDI : sortie longue
    if w == 1:
        sessions.append({"day": 0, "type": "velo", "title": "Récupération active — vélo 40 min",
            "cat": "Vélo", "dur": [40, 45],
            "note": "Tu as couru 25 km hier. Pas de sortie longue aujourd'hui : ce serait deux longues en deux jours, la pire chose pour un tendon qui sort de blessure. Vélo souple sans résistance, cadence 90 rpm, juste pour faire circuler. La vraie semaine 1 commence demain, et ta première sortie longue du plan est le lundi 17 août à 22 km.",
            "feedback": True})
    elif w == 35:
        sessions.append({"day": 0, "type": "ef", "title": "Déverrouillage 6 km",
            "cat": "Course facile", "dist": 6, "dur": [35, 40],
            "struct": [{"km": 6, "zone": "ef"}],
            "note": "Semaine de course. Jambes légères, rien de plus. Chaussures de course aux pieds pour les retrouver.", "feedback": True})
    elif w == 25:
        sessions.append({"day": 0, "type": "ef", "title": "Course facile de 10 km",
            "cat": "Course facile", "dist": 10, "dur": [55, 65],
            "struct": [{"km": 10, "zone": "ef"}],
            "note": "Semi-marathon test samedi : pas de sortie longue le lundi, c'est le semi qui joue ce rôle cette semaine. Reste tranquille.",
            "feedback": True})
    else:
        sessions.append({"day": 0, "type": "long",
            "title": f"Sortie longue de {sl_km:g} km".replace(".0", ""),
            "cat": "Sortie longue", "dist": sl_km,
            "dur": None, "struct": sl_struct,
            "note": ("Décharge : sortie longue raccourcie, tu dois finir en te sentant frais. "
                     if dl else "") +
                    ("Protocole course/marche autorisé (10 min course / 1 min marche) si le tendon est sensible au départ."
                     if bid == "A" else
                     "Bois 500 ml par heure et prends un gel toutes les 45 min à partir du 10e km."),
            "feedback": True})

    # --- MARDI : EF courte + renfo haut du corps
    sessions.append({"day": 1, "type": "ef", "title": f"Course facile de {ef_km(w):g} km",
        "cat": "Course facile", "dist": ef_km(w), "dur": None,
        "struct": [{"km": ef_km(w), "zone": "recup"}],
        "note": "Récupération active au lendemain de la sortie longue. Vraiment lent : c'est une limite haute, pas un objectif. Si la douleur au réveil dépasse 2/10, tu remplaces par 45 min de vélo Z2.",
        "swap": {"title": "Vélo Z2 45 min", "reason": "douleur réveil > 2"},
        "feedback": True})
    sessions.append({"day": 1, "type": "muscu-haut", "title": MUSCU_HAUT[bid]["name"],
        "cat": "Renforcement haut du corps", "dur": [40, 45],
        "ex": MUSCU_HAUT[bid]["ex"],
        "note": "Pas de charge sur les jambes aujourd'hui. Le tendon récupère de la sortie longue.",
        "feedback": True})

    # --- MERCREDI : escalade
    sessions.append({"day": 2, "type": "escalade", "title": "Escalade",
        "cat": "Escalade", "dur": [90, 120] if w != 35 else [60, 75],
        "note": ("Semaine de course : reste en 5b/5c, aucune tentative limite, aucun risque de chute. "
                 if w == 35 else "") +
                "Ta séance du mercredi soir. Aucune course, aucun renfo haut du corps aujourd'hui : les avant-bras et les épaules travaillent déjà. Évite les gros appuis en pointe prolongés, ils chargent le tendon en position raccourcie.",
        "feedback": True})

    # --- JEUDI : muscu bas + vélo
    light = w in (25, 35)
    sessions.append({"day": 3, "type": "muscu-bas",
        "title": MUSCU_BAS["E"]["name"] if light else MUSCU_BAS[bid]["name"],
        "cat": "Renforcement bas du corps", "dur": [25, 30] if light else [40, 45],
        "ex": MUSCU_BAS["E"]["ex"] if light else MUSCU_BAS[bid]["ex"],
        "note": ("Version allégée : grosse échéance ce week-end, on entretient sans fatiguer. "
                 if light else "") +
                "La séance la plus importante du plan pour ton tendon. Le protocole excentrique (Stanish) se fait lentement à la descente, une douleur de 3-4/10 pendant l'exercice est normale et même recherchée. Au-delà de 5, tu baisses la charge.",
        "feedback": True})
    sessions.append({"day": 3, "type": "velo", "title": f"Vélo Z2 {velo_min(w)} min",
        "cat": "Vélo", "dur": [velo_min(w), velo_min(w) + 10],
        "note": "Volume aérobie sans impact. Cadence 85-95 rpm, respiration contrôlée, tu dois pouvoir tenir une conversation.",
        "feedback": True})

    # --- VENDREDI : vélo récup
    sessions.append({"day": 4, "type": "velo", "title": f"Vélo récupération {velo_min(w, True)} min",
        "cat": "Vélo", "dur": [velo_min(w, True), velo_min(w, True) + 10],
        "note": "Vélo souple, jambes qui tournent. Objectif : arriver frais sur la séance de qualité de demain. Si les jambes sont lourdes, tu coupes, c'est prévu.",
        "optional": True, "feedback": True})

    # --- SAMEDI : qualité
    qtype = {"test": "test", "course": "course", "cotes": "inter", "fartlek": "inter",
             "interval": "inter", "seuil": "tempo", "progressif": "tempo"}[q["t"]]
    if w == 35:
        sessions.append({"day": 5, "type": "repos", "title": "Veille de course",
            "cat": "Repos", "dur": None,
            "note": "Marche 20 minutes maximum, jambes surélevées le reste du temps. Repas riche en glucides le midi plutôt que le soir. Dossard, gels, chaussures et tenue préparés avant 20 h. Glaçage du tendon si le moindre signal.",
            "feedback": False})
    else:
        sessions.append({"day": 5, "type": qtype, "title": q["name"],
            "cat": {"test": "Test", "course": "Course", "inter": "Intervalles",
                    "tempo": "Tempo"}[qtype],
            "dist": q["dist"], "dur": None,
            "wu": q["wu"], "main": q["main"], "cd": q["cd"],
            "note": q["note"], "feedback": True})

    # --- DIMANCHE : repos jambes / marathon
    if w == 35:
        sessions.append({"day": 6, "type": "race", "title": "Marathon de Paris",
            "cat": "Course", "dist": 42.195, "dur": None,
            "wu": q["wu"], "main": q["main"], "cd": q["cd"],
            "note": q["note"], "feedback": True})
    else:
        sessions.append({"day": 6, "type": "repos", "title": "Repos jambes complet",
            "cat": "Repos", "dur": None,
            "note": "Zéro charge sur les jambes. Étirements doux, mobilité cheville, glaçage du tendon si sensible. C'est ce jour-là que le tendon se répare, pas pendant les séances.",
            "feedback": True})

    weeks.append({
        "n": w, "bloc": bid, "blocName": b["name"], "monday": mon.isoformat(),
        "deload": dl, "sl": sl_km, "efKm": ef_km(w),
        "sessions": sessions,
    })

plan = {
    "meta": {
        "athlete": "Mathieu",
        "goal": "Marathon de Paris",
        "goalLabel": "3 h 15",
        "test3k": 722,        # 12:02 le 08/08/2026, 4:00/km
        "fitnessPace": 289,   # projection marathon depuis le test : 4:49/km
        "raceDate": RACE.isoformat(),
        "start": START.isoformat(),
        "weeks": 35,
        "targetMarathonPace": 277,   # 4:37/km = 3 h 15, objectif choisi le 09/08
        "constraints": [
            "Sortie longue : +2 km maximum d'une semaine sur l'autre",
            "Escalade le mercredi soir : aucune course ni renfo haut du corps ce jour-là",
            "Séance de vitesse et renfo bas du corps jamais accolés à la sortie longue",
            "Un jour de repos jambes complet par semaine (dimanche)",
            "2 séances de vélo remplacent les petites EF tant que le tendon n'est pas guéri",
        ],
    },
    "zones": ZONES,
    "blocs": BLOCS,
    "weeks": weeks,
}

with open("plan.json", "w", encoding="utf-8") as f:
    json.dump(plan, f, ensure_ascii=False, separators=(",", ":"))
print("ok", len(weeks), "semaines,", sum(len(w["sessions"]) for w in weeks), "séances")
