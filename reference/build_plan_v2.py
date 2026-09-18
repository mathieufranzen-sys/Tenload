# -*- coding: utf-8 -*-
"""Plan Tenload v2 : 34 semaines, marathon de Paris le dimanche 4 avril 2027.

Refonte du 18 septembre 2026, d'après la méthode de Maxime Lopes (RunWise) et
les arbitrages de Mathieu :

  * prépa générale longue, spécifique court (5 semaines pour le marathon) ;
  * aucune séance dure hors bloc spécifique : effort 7,5/10 au maximum, trois
    à quatre répétitions en réserve à la fin ;
  * la sortie longue reste sous 45 % du volume de la semaine, et une semaine
    sur trois environ elle raccourcit — c'est la « pause de longue » ;
  * 20 à 30 minutes cumulées au seuil par semaine, trois séances de seuil pour
    une séance de vitesse ;
  * quatre courses, un vélo, deux renfos full body, aucun renfo un jour de
    course, l'escalade sort du plan et redevient un remplacement possible.

Les semaines 1 à 6 sont REPRISES TELLES QUELLES de l'ancien plan, archivé dans
reference/archives/. Les ressentis déjà saisis sont rattachés à la position
(semaine, jour, rang dans la journée) : les régénérer déplacerait le carnet.
Seule la séance du samedi de la semaine 6 est remplacée, à contenu près, par la
première prise de contact avec l'allure 10 km.
"""
import json
from datetime import date, timedelta
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
ARCHIVE = RACINE / "reference/archives/plan-2026-09-18-avant-refonte.json"
SORTIE = RACINE / "src/data/plan.json"

START = date(2026, 8, 10)     # lundi S1
RACE = date(2027, 4, 4)       # dimanche S34
MP = 277                      # allure marathon cible, s/km (3 h 15)
PREMIERE_GENEREE = 7          # les six premières semaines viennent de l'archive

ZONES = {
    "recup": {"label": "Récupération", "off": 75, "color": "ef"},
    "ef": {"label": "Endurance facile", "off": 50, "color": "ef"},
    "am": {"label": "Allure marathon", "off": 0, "color": "long"},
    "seuil": {"label": "Seuil", "off": -20, "color": "tempo"},
    "vo2": {"label": "Intervalles", "off": -40, "color": "inter"},
    "rep": {"label": "Répétitions", "off": -55, "color": "inter"},
}

BLOCS = [
    {"id": "A", "name": "Réathlétisation", "weeks": (1, 8),
     "focus": "Retour à la course sans douleur, quatre courses par semaine à partir de la S7. "
              "Le volume monte, l'intensité reste basse.",
     "color": "#4E8CFF"},
    {"id": "B", "name": "Bloc 10 km", "weeks": (9, 15),
     "focus": "20 km de Paris le 11 octobre en course de rythme, puis cinq séances à allure 10 km "
              "et le 10 km Hoka le 15 novembre. Le volume ne baisse pas pendant le bloc.",
     "color": "#3ECF8E"},
    {"id": "C", "name": "Volume", "weeks": (16, 26),
     "focus": "Le gros bloc : 55 puis 68 km par semaine, du seuil chaque jeudi, une séance de "
              "vitesse courte par mois. Semi test le 30 janvier.",
     "color": "#F5B32E"},
    {"id": "D", "name": "Spécifique marathon", "weeks": (27, 31),
     "focus": "Cinq semaines, pas plus : allure marathon en volume, trois sorties longues de "
              "30 km et plus, ravitaillement répété.",
     "color": "#FF7A3D"},
    {"id": "E", "name": "Affûtage", "weeks": (32, 34),
     "focus": "Le volume tombe, l'allure marathon reste. Dernière longue le 15 mars.",
     "color": "#E5484D"},
]

# ─── la forme de chaque semaine ────────────────────────────────────────────
# Sortie longue, en km. 0 = pas de sortie longue (semaine de course).
SL = {
    7: 18, 8: 24, 9: 16, 10: 18, 11: 22, 12: 24, 13: 16, 14: 0, 15: 18,
    16: 24, 17: 18, 18: 26, 19: 20, 20: 28, 21: 20, 22: 28, 23: 30, 24: 22,
    25: 0, 26: 20, 27: 28, 28: 30, 29: 32, 30: 24, 31: 32, 32: 28, 33: 18, 34: 0,
}

# Volume de course visé, en km. Il sert aux notes et au contrôle de la part
# que prend la sortie longue : au-delà de 45 %, une journée écrase la semaine.
VOLUME = {
    7: 52, 8: 54, 9: 48, 10: 46, 11: 54, 12: 56, 13: 48, 14: 36, 15: 44,
    16: 54, 17: 42, 18: 62, 19: 62, 20: 66, 21: 52, 22: 66, 23: 68, 24: 62,
    25: 48, 26: 50, 27: 66, 28: 68, 29: 72, 30: 64, 31: 72, 32: 62, 33: 44, 34: 30,
}

DECHARGE = {17, 21, 26}            # les vraies décharges
PAUSE_LONGUE = {7, 13, 19, 24, 30}  # la longue raccourcit, le volume tient
ALLEGEE_COURSE = {9, 14, 25}       # un dossard tombe dedans
DEBUT_DECALE = {10, 15}            # lendemain de course : rien avant mercredi
AFFUTAGE = {32, 33, 34}
# La part de la longue ne se juge pas sur une semaine de course ni sur son lendemain.
HORS_REGLE_PART = DEBUT_DECALE | set(COURSES) if False else DEBUT_DECALE | {9, 14, 25, 34}
ALLEGEE = DECHARGE | ALLEGEE_COURSE

# ─── les courses ───────────────────────────────────────────────────────────
COURSES = {
    9: {"jour": 6, "qualite": 3, "title": "20 km de Paris", "dist": 20, "zone": "seuil",
        "note": "Course bonus. Ton record est 1:33:24, soit 4:40/km, et ton niveau du moment te "
                "situe vers 4:25. Pars à 4:30 et décide au douzième kilomètre. Trois jours "
                "d'allègement seulement : la priorité reste le 10 km du 15 novembre, et cette "
                "course sert d'abord de répétition générale."},
    14: {"jour": 6, "qualite": 2, "title": "10 km Hoka de Paris", "dist": 10, "zone": "vo2",
         "note": "L'objectif de l'automne. Ton record est 40:12. Cinq séances à allure 10 km et "
                 "huit semaines de volume te situent entre 40:40 et 41:30. Pars à 4:05, pas plus "
                 "vite, et décide au sixième kilomètre. Ton chrono recalera ta forme projetée "
                 "depuis la feuille de séance."},
    25: {"jour": 5, "qualite": 3, "title": "Semi-marathon test", "dist": 21.1, "zone": "seuil",
         "note": "Le point de bascule du plan. Sous 1 h 30, l'objectif 3 h 15 tient. Au-delà de "
                 "1 h 35, on recale sur 3 h 25 sans état d'âme. Course officielle ou solo "
                 "chronométré, peu importe, mais à fond."},
    34: {"jour": 6, "qualite": 2, "title": "Marathon de Paris", "dist": 42.195, "zone": "am",
         "note": "Huit mois de travail. Les dix premiers kilomètres 5 s/km plus lents que "
                 "l'allure cible, puis tu t'installes. Le marathon commence au 30e kilomètre : "
                 "tout ce qui précède n'est que de la gestion. Même dans la forme de ta vie, ce "
                 "ne sera pas facile, et c'est normal."},
}

# ─── la séance de qualité du jeudi ─────────────────────────────────────────
# `zone` vo2 vaut 3:57/km, l'allure du 10 km ; `seuil` vaut 4:17.
# Les minutes cumulées au seuil sont la mesure de Maxime : 20 à 30 par semaine.
QUALITE = {
    7: ("Vitesse courte 8 x 200 m", 11, [("8 x 200 m", "rep"), ("récup 200 m très lente", ""), ("15 min", "seuil")],
        "Les 200 m sont trop courts pour accumuler du lactate : c'est de la coordination, pas de "
        "la VMA. Puis 15 minutes au seuil, à 4:17. Tu dois finir en pouvant en faire trois de plus."),
    8: ("Prise de contact 10 x 300 m", 12, [("10 x 300 m", "vo2"), ("récup 1 min 30", "")],
        "Première vraie prise de contact avec l'allure 10 km, onze jours avant le 20 km. Un 300 m "
        "à 4:00, c'est 1 min 12. Effort 7 sur 10 : si tu t'accroches dès la troisième, ralentis."),
    9: ("Seuil court 2 x 8 min", 9, [("2 x 8 min", "seuil"), ("récup 3 min", "")],
        "Dernière séance avant le 20 km de dimanche. Courte volontairement : elle entretient, "
        "elle ne construit pas. Le reste de la semaine s'allège à partir de jeudi soir."),
    10: ("Reprise 5 x 600 m", 11, [("5 x 600 m", "vo2"), ("récup 2 min", "")],
         "Le bloc 10 km reprend, quatre jours après le 20 km. Si les jambes sont encore lourdes, "
         "tu coupes après la troisième : une séance tronquée vaut mieux qu'une semaine perdue."),
    11: ("6 x 800 m allure 10 km", 13, [("6 x 800 m", "vo2"), ("récup 2 min", "")],
         "Cœur du bloc. 800 m à 4:05, soit 3 min 16. L'allure est celle du 15 novembre, pas plus "
         "vite : l'objectif est de l'installer, pas de la battre à l'entraînement."),
    12: ("5 x 1000 m allure 10 km", 14, [("5 x 1000 m", "vo2"), ("récup 2 min", "")],
         "La séance de référence du bloc. Cinq kilomètres à allure de course, fractionnés. Note "
         "tes sensations : c'est elle qui dira si 40:40 est jouable."),
    13: ("8 x 600 m allure 10 km", 12, [("8 x 600 m", "vo2"), ("récup 1 min 30", "")],
         "Dernière séance dure avant la course. Récupération plus courte, allure identique : on "
         "travaille la tolérance, pas la vitesse. La semaine s'allège à partir de vendredi."),
    14: ("Rappel d'allure 5 x 400 m", 8, [("5 x 400 m", "vo2"), ("récup 2 min", "")],
         "Mercredi, quatre jours avant le 10 km. On réveille l'allure, on ne la travaille pas. "
         "Tu dois finir cette séance en la trouvant trop courte."),
    15: ("Endurance et lignes droites", 11, [("6 x 15 s en ligne droite", "rep"), ("récup marchée 45 s", "")],
         "Semaine de reprise, aucune qualité. Six lignes droites pour garder la foulée vive, rien "
         "de plus. C'est la semaine d'après-course qui décide si tu gardes ton élan."),
    16: ("Seuil 5 x 6 min", 13, [("5 x 6 min", "seuil"), ("récup 2 min", "")],
         "Le gros bloc de volume commence. 30 minutes cumulées au seuil, proche du seuil 2 : pars "
         "au plus lent de la fourchette et monte sur la dernière."),
    17: ("Seuil 3 x 8 min", 12, [("3 x 8 min", "seuil"), ("récup 2 min", "")],
         "Décharge : la qualité ne bouge pas, c'est le volume autour qui se coupe. 24 minutes au "
         "seuil, un cran sous le seuil 2."),
    18: ("Seuil 3 x 10 min", 14, [("3 x 10 min", "seuil"), ("récup 2 min 30", "")],
         "Trente minutes au seuil, le format le plus directement transférable au marathon. "
         "Allure régulière du premier au dernier bloc."),
    19: ("Vitesse 10 x 300 m", 12, [("10 x 300 m", "rep"), ("récup 1 min 30", "")],
         "Une séance de vitesse pour trois de seuil, c'est le dosage d'un marathonien. Semaine de "
         "pause de longue : les jambes sont fraîches, c'est le bon moment."),
    20: ("Seuil 3 x 10 min", 14, [("3 x 10 min", "seuil"), ("récup 2 min 30", "")],
         "Même séance qu'en S18, sur un volume plus haut. C'est la répétition qui construit, pas "
         "la nouveauté."),
    21: ("Seuil 4 x 6 min", 12, [("4 x 6 min", "seuil"), ("récup 2 min", "")],
         "Décharge de fin d'année. Vingt-quatre minutes, effort 6,5 sur 10 maximum."),
    22: ("Seuil 2 x 15 min", 14, [("2 x 15 min", "seuil"), ("récup 3 min", "")],
         "Blocs longs : c'est là que se gagne la lucidité d'allure. Si tu dérives sur le second "
         "bloc, c'est que le premier était trop rapide."),
    23: ("Seuil 3 x 10 min", 15, [("3 x 10 min", "seuil"), ("récup 2 min 30", "")],
         "Plus grosse semaine du bloc de volume, 68 km. La séance reste raisonnable : c'est le "
         "volume qui travaille cette semaine, pas l'intensité."),
    24: ("Seuil court 4 x 5 min", 12, [("4 x 5 min", "seuil"), ("récup 2 min", "")],
         "Avant-dernière semaine avant le semi test. Vingt minutes au seuil, on garde de la marge."),
    25: ("Déverrouillage 4 x 400 m", 8, [("4 x 400 m", "am"), ("récup 2 min", "")],
         "Semi test samedi. Quatre accélérations à allure marathon pour réveiller les jambes, "
         "rien de plus."),
    26: ("Seuil 3 x 8 min", 12, [("3 x 8 min", "seuil"), ("récup 2 min", "")],
         "Décharge après le semi. La course de samedi dernier se paie ici, en volume."),
    27: ("Seuil long 2 x 15 min", 15, [("2 x 15 min", "seuil"), ("récup 3 min", "")],
         "Ouverture du bloc spécifique. À partir d'ici, l'allure marathon devient la référence de "
         "presque tout, et le seuil devient l'entretien."),
    28: ("5 x 2 km à allure marathon", 17, [("5 x 2 km", "am"), ("récup 2 min", "")],
         "Dix kilomètres à 4:37, fractionnés. Mémorise la sensation : c'est celle du 4 avril."),
    29: ("3 x 3 km à allure marathon", 16, [("3 x 3 km", "am"), ("récup 3 min", "")],
         "Blocs plus longs, même allure. Si tu dérives de plus de 3 s/km sur le dernier, ton "
         "allure cible est trop ambitieuse et on la revoit avant qu'il soit trop tard."),
    30: ("Seuil 6 x 1 km", 14, [("6 x 1 km", "seuil"), ("récup 1 min 30", "")],
         "Semaine de pause de longue au milieu du spécifique : la longue raccourcit, la séance "
         "reste. Six kilomètres au seuil, effort 7 sur 10."),
    31: ("16 km à allure marathon", 21, [("16 km", "am")],
         "La séance décisive du plan, dans la semaine du pic. Seize kilomètres en continu à 4:37, "
         "avec ravitaillement toutes les 45 minutes comme le jour J. Si elle passe, 3 h 15 est là."),
    32: ("Allure marathon 8 x 1 km", 14, [("8 x 1 km", "am"), ("récup 1 min", "")],
         "L'affûtage commence : le volume tombe, l'allure reste. Tu vas te sentir bizarrement "
         "frais, c'est le but."),
    33: ("Allure marathon 6 x 1 km", 12, [("6 x 1 km", "am"), ("récup 1 min", "")],
         "Deuxième semaine d'affûtage. Tu vas avoir envie d'en faire plus. N'en fais pas plus, "
         "c'est le piège classique."),
    34: ("Déverrouillage 4 x 400 m", 8, [("4 x 400 m", "am"), ("récup 2 min", "")],
         "Mercredi, quatre jours avant le marathon. Jambes légères, chaussures de course aux "
         "pieds pour les retrouver."),
}

# ─── la course du samedi ───────────────────────────────────────────────────
# Quatrième course de la semaine. En bloc spécifique marathon, elle porte des
# blocs à allure marathon ; ailleurs, c'est de l'endurance pure.
SAMEDI_AM = {27: 4, 28: 5, 29: 6, 30: 4, 31: 6}

# ─── le renforcement ───────────────────────────────────────────────────────
RENFO_JAMBES = [
    ("Stanish (excentrique mollet, 2 jambes)", "3 x 15", "tempo 3 s à la descente, charge progressive"),
    ("Mollets genou fléchi (soléaire)", "3 x 12", "unilatéral, c'est le muscle du tendon d'Achille"),
    ("Soulevé de terre roumain", "3 x 10", "chaîne postérieure, charge modérée"),
    ("Fentes bulgares", "3 x 10", "unilatéral, contrôle à la descente"),
    ("Gainage ventral et latéral", "3 x 45 s", ""),
]
RENFO_HAUT = [
    ("Tractions ou tirage vertical", "4 x 8", ""),
    ("Développé couché ou pompes lestées", "4 x 10", ""),
    ("Rowing haltère", "3 x 12", "unilatéral"),
    ("Épaules, élévations latérales", "3 x 15", ""),
    ("Stanish (excentrique mollet)", "3 x 12", "le protocole reste, même le jour du haut du corps"),
]


def bloc_of(w):
    for b in BLOCS:
        if b["weeks"][0] <= w <= b["weeks"][1]:
            return b
    raise ValueError(w)


def km(v):
    return f"{v:g}".replace(".0", "")


COURSE_TYPES = {"long", "ef", "tempo", "inter", "course", "race"}


def volume_reel(sessions):
    """Les kilomètres de course de la semaine, tels qu'ils sont écrits."""
    return sum(x.get("dist") or 0 for x in sessions if x["type"] in COURSE_TYPES)


def sortie_longue(w, jour, volume=None):
    """La sortie longue, avec ses blocs à allure marathon en bloc spécifique."""
    dist = SL[w]
    bid = bloc_of(w)["id"]
    if bid in ("A", "B") or w in ALLEGEE or w in PAUSE_LONGUE:
        struct = [{"km": dist, "zone": "ef"}]
    elif bid == "C":
        struct = [{"km": dist - 6, "zone": "ef"}, {"km": 6, "zone": "am"}]
    elif bid == "D":
        bloc_am = 8 if dist >= 30 else 6
        struct = [{"km": dist - bloc_am, "zone": "ef"}, {"km": bloc_am, "zone": "am"}]
    else:
        struct = [{"km": dist - 5, "zone": "ef"}, {"km": 5, "zone": "am"}]

    part = round(dist / (volume or VOLUME[w]) * 100)
    notes = []
    if w in PAUSE_LONGUE:
        notes.append("Pause de longue : elle raccourcit pour que la semaine s'assimile, le volume "
                     "ne baisse pas pour autant. Une semaine sur trois environ.")
    if w in DECHARGE:
        notes.append("Décharge : tu dois finir en te sentant frais.")
    if jour == 3:
        notes.append("Déplacée au jeudi : la course de dimanche dernier prend la place du lundi.")
    notes.append(f"Elle pèse {part} % de ta semaine, la limite est 45 %.")
    notes.append("Sucre avant de partir." if dist < 18 else
                 "Sucre avant de partir, un gel toutes les 45 minutes, 20 g de protéines au retour.")
    return {"day": jour, "type": "long", "title": f"Sortie longue de {km(dist)} km",
            "cat": "Sortie longue", "dist": dist, "dur": None, "struct": struct,
            "note": " ".join(notes), "feedback": True}


def course_facile(w, jour, dist, recup=True):
    zone = "recup" if recup else "ef"
    note = ("Récupération active au lendemain de la sortie longue. Vraiment lent : c'est une "
            "limite haute, pas un objectif. Si ta raideur au réveil dépasse 2, tu passes au vélo."
            if recup else
            "Endurance pure, conversation fluide. Tu dois pouvoir parler en phrases complètes.")
    s = {"day": jour, "type": "ef", "title": f"Course facile de {km(dist)} km",
         "cat": "Course facile", "dist": dist, "dur": None,
         "struct": [{"km": dist, "zone": zone}], "note": note, "feedback": True}
    if recup:
        s["swap"] = {"title": "Vélo Z2 45 min", "reason": "raideur au réveil > 2"}
    return s


def seance_qualite(w, jour):
    nom, dist, principal, note = QUALITE[w]
    if w in DECHARGE:
        dist -= 2
    zones = {z for _, z in principal if z}
    type_ = "inter" if zones & {"vo2", "rep"} else "tempo"
    return {"day": jour, "type": type_, "title": nom,
            "cat": "Intervalles" if type_ == "inter" else "Tempo",
            "dist": dist, "dur": None,
            "wu": [(3, "ef"), ("4 x 15 s en ligne droite", "rep")],
            "main": principal, "cd": [(2, "recup")],
            "note": note + " Effort 7,5 sur 10 au maximum, et trois à quatre répétitions en "
                           "réserve à la fin : au-delà, la séance n'est plus du seuil et tu la "
                           "paies toute la semaine.",
            "feedback": True}


def renfo(jour, jambes=True):
    return {"day": jour, "type": "muscu-bas" if jambes else "muscu-haut",
            "title": "Renfo full body — jambes dominantes" if jambes else "Renfo full body — haut dominant",
            "cat": "Renforcement", "dur": [45, 55],
            "ex": RENFO_JAMBES if jambes else RENFO_HAUT,
            "note": ("Jour sans course. Le protocole excentrique passe en premier, c'est le "
                     "traitement du tendon et il fait baisser ton indice le lendemain."
                     if jambes else
                     "Jour sans course. Le haut du corps ne charge pas le tendon, et le Stanish "
                     "reste : c'est un traitement, pas un complément."),
            "feedback": True}


def velo(jour, minutes):
    return {"day": jour, "type": "velo", "title": f"Vélo Z2 {minutes} min", "cat": "Vélo",
            "dur": [minutes, minutes + 10],
            "note": "Le seul vélo de la semaine. Ce n'est plus une béquille, c'est du volume "
                    "aérobie sans impact au sol : cadence 90 rpm, rien dans les jambes.",
            "feedback": True}


def repos(jour):
    return {"day": jour, "type": "repos", "title": "Repos jambes complet", "cat": "Repos",
            "dur": None,
            "note": "Le jour de repos de la contrainte 4. Mobilité de cheville, étirements doux. "
                    "C'est lui qui fait baisser ton indice de charge.",
            "feedback": True}


def course_dossard(w):
    c = COURSES[w]
    return {"day": c["jour"], "type": "race" if w == 34 else "course", "title": c["title"],
            "cat": "Course", "dist": c["dist"], "dur": None,
            "struct": [{"km": c["dist"], "zone": c["zone"]}],
            "note": c["note"], "feedback": True}


def semaine(w):
    """Les séances d'une semaine, dans la nouvelle disposition."""
    s = []
    bid = bloc_of(w)["id"]
    ef_court = 6 if w in DECHARGE else 8 if VOLUME[w] < 55 else 10
    ef_samedi = max(6 if w in DECHARGE else 8,
                    round((VOLUME[w] - SL[w] - ef_court - QUALITE[w][1]) / 2) * 2)

    if w in DEBUT_DECALE:
        # Lendemain de course : rien avant mercredi, la longue passe au jeudi.
        s.append(repos(0))
        s.append(course_facile(w, 1, 6, recup=True))
        s.append(renfo(2, jambes=False))
        s.append(velo(2, 45))
        s.append(sortie_longue(w, 3))
        s.append(renfo(4, jambes=False))
        s.append(seance_qualite(w, 5))
        s.append(repos(6))
        return s

    if w in COURSES:
        c = COURSES[w]
        if w == 9:
            s.append(sortie_longue(w, 0))
            s.append(course_facile(w, 1, 6, recup=True))
            s.append(renfo(2, jambes=True))
            s.append(velo(2, 45))
            s.append(seance_qualite(w, 3))
            s.append(renfo(4, jambes=False))
            s.append(repos(5))
        elif w == 25:
            s.append(course_facile(w, 0, 8, recup=False))
            s.append(course_facile(w, 1, 6, recup=True))
            s.append(renfo(2, jambes=True))
            s.append(velo(2, 45))
            s.append(seance_qualite(w, 3))
            s.append(renfo(4, jambes=False))
        else:
            s.append(course_facile(w, 0, 8, recup=False))
            s.append(renfo(1, jambes=True) if w == 14 else repos(1))
            s.append(seance_qualite(w, 2))
            s.append(renfo(3, jambes=False))
            s.append({"day": 4, "type": "ef", "title": "Déverrouillage 5 km",
                      "cat": "Course facile", "dist": 5, "dur": None,
                      "struct": [{"km": 5, "zone": "ef"}],
                      "note": "Cinq kilomètres et trois accélérations de 20 s, puis tu rentres. "
                              "Les jambes doivent rester en réserve.",
                      "feedback": True})
            s.append(repos(5))
        s.append(course_dossard(w))
        return s

    # La semaine type
    s.append(sortie_longue(w, 0))
    s.append(course_facile(w, 1, ef_court, recup=True))
    s.append(renfo(2, jambes=True))
    s.append(velo(2, 60 if w not in ALLEGEE else 45))
    s.append(seance_qualite(w, 3))
    s.append(renfo(4, jambes=False))
    am = SAMEDI_AM.get(w)
    if am:
        s.append({"day": 5, "type": "tempo", "title": f"Endurance avec {am} km à allure marathon",
                  "cat": "Tempo", "dist": ef_samedi, "dur": None,
                  "struct": [{"km": ef_samedi - am, "zone": "ef"}, {"km": am, "zone": "am"}],
                  "note": "Deuxième contact de la semaine avec l'allure du 4 avril, sur jambes "
                          "déjà chargées. C'est ça, l'endurance spécifique.",
                  "feedback": True})
    else:
        s.append(course_facile(w, 5, ef_samedi, recup=False))
    s.append(repos(6))
    return s


# ─── assemblage ────────────────────────────────────────────────────────────
archive = json.loads(ARCHIVE.read_text())
weeks = []

for w in range(1, 35):
    lundi = START + timedelta(days=(w - 1) * 7)
    b = bloc_of(w)
    if w < PREMIERE_GENEREE:
        ancienne = next(x for x in archive["weeks"] if x["n"] == w)
        ancienne = dict(ancienne)
        ancienne["bloc"] = b["id"]
        ancienne["blocName"] = b["name"]
        ancienne["deload"] = w in DECHARGE or ancienne.get("deload", False)
        if w == 6:
            # La qualité du samedi devient la première prise de contact avec
            # l'allure 10 km. Même jour, même rang : le carnet ne bouge pas.
            for i, s in enumerate(ancienne["sessions"]):
                if s["day"] == 5 and s["type"] in ("tempo", "inter"):
                    ancienne["sessions"][i] = {
                        **s, "type": "inter", "cat": "Intervalles",
                        "title": "Prise de contact 6 x 300 m", "dist": 12,
                        "wu": [(3, "ef"), ("4 x 15 s en ligne droite", "rep")],
                        "main": [("6 x 300 m", "vo2"), ("récup 90 s", ""), ("10 min", "seuil")],
                        "cd": [(2, "recup")],
                        "note": "Première prise de contact avec l'allure 10 km, huit semaines "
                                "avant la course. Un 300 m à 4:00, c'est 1 min 12. Effort 7 sur "
                                "10 : tu dois finir en pouvant en faire trois de plus. Si ta "
                                "raideur au réveil dépasse 2, tu remplaces par 2 x 10 min au seuil.",
                    }
        weeks.append(ancienne)
        continue

    sessions = semaine(w)
    vol = volume_reel(sessions)
    for i, x in enumerate(sessions):
        if x["type"] == "long":
            sessions[i] = sortie_longue(w, x["day"], volume=vol)
    weeks.append({
        "n": w, "bloc": b["id"], "blocName": b["name"], "monday": lundi.isoformat(),
        "deload": w in DECHARGE, "sl": SL[w],
        "efKm": 8 if VOLUME[w] < 55 else 10,
        "sessions": sessions,
    })

plan = {
    "meta": {**archive["meta"], "raceDate": RACE.isoformat(),
             "weeks": 34, "targetMarathonPace": MP},
    "zones": archive.get("zones", ZONES),
    "blocs": BLOCS,
    "weeks": weeks,
}
SORTIE.write_text(json.dumps(plan, ensure_ascii=False, indent=1))

total = sum(len(w["sessions"]) for w in weeks)
print(f"{len(weeks)} semaines, {total} séances, marathon le {RACE}")
for w in weeks[PREMIERE_GENEREE - 1:]:
    n = w["n"]
    vol = volume_reel(w["sessions"])
    part = round(SL[n] / vol * 100) if SL[n] else 0
    courses = sum(1 for s in w["sessions"] if s["type"] in COURSE_TYPES)
    drapeau = "  ⚠ part > 45 %" if part > 45 and n not in HORS_REGLE_PART else ""
    print(f"  S{n:>2} {w['monday']} longue {SL[n]:>4} km  volume {vol:>5.1f} km  "
          f"part {part:>3} %  {courses} courses{drapeau}")
