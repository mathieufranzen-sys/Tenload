# -*- coding: utf-8 -*-
"""Indice de charge du tendon (0-100) — conception et calibration sur données réelles."""
import json, math
from datetime import date, timedelta

STRAVA = json.load(open("strava.json", encoding="utf-8"))
NOTION = json.load(open("notion.json", encoding="utf-8"))

# ---------------------------------------------------------------- 1. charge mécanique
# Coût tendineux par kilomètre couru, selon l'allure. Un tendon d'Achille encaisse
# une charge élastique qui croît beaucoup plus vite que la vitesse.
KM_COST = {"recup": 0.9, "ef": 1.0, "long": 1.15, "am": 1.35, "seuil": 1.6, "vo2": 2.1}
# Coût par minute pour le non-couru.
MIN_COST = {
    "velo": 0.10,      # flexion plantaire soutenue : faible mais NON nulle (cf. ses pics du soir)
    "muscu-bas": 0.25, # charge lourde mais contrôlée, thérapeutique
    "escalade": 0.06,  # appuis en pointe
    "muscu-haut": 0.0,
    "hike": 0.05,
}

def classify(a):
    """Devine le type de charge d'une activité Strava."""
    n = a["name"].lower()
    if a["sport"] == "Ride":   return ("velo", None)
    if a["sport"] == "Weight": return (("muscu-bas" if any(k in n for k in
                                  ("jambe", "bas", "bulgare", "trx")) else "muscu-haut"), None)
    if a["sport"] == "Hike":   return ("hike", None)
    if a["sport"] == "Soccer": return ("escalade", None)   # sport d'appuis, même ordre de grandeur
    # course
    if any(k in n for k in ("fractionn", "x800", "x400", "x200", "test", "seuil", "tempo")):
        return ("run", "vo2" if any(k in n for k in ("fractionn", "x800", "x400", "x200", "test"))
                       else "seuil")
    if a["km"] >= 18: return ("run", "long")
    return ("run", "ef")

def daily_load(acts):
    """Charge tendineuse par jour, en 'km-équivalents'."""
    out = {}
    for a in acts:
        kind, zone = classify(a)
        if kind == "run":
            # une séance de qualité n'est pas rapide de bout en bout : 45 % à l'allure cible
            if zone in ("vo2", "seuil"):
                load = a["km"] * (0.45 * KM_COST[zone] + 0.55 * KM_COST["ef"])
            else:
                load = a["km"] * KM_COST[zone]
        else:
            load = a["min"] * MIN_COST[kind]
        out[a["date"]] = out.get(a["date"], 0) + load
    return out

LOAD = daily_load(STRAVA)

# ---------------------------------------------------------------- 2. douleur
PAIN = {r["date"]: r for r in NOTION}

def pain_score(d, hist):
    """Score douleur 0-10 pour décider de la séance du jour, calculé le matin de J.
    Trois entrées : la raideur au réveil de J, et la réaction retardée à la séance
    de J-1 (douleur du soir et pendant l'effort). Un pic isolé ne doit pas être
    dilué par une moyenne : on mélange le pondéré et le maximum récent."""
    dd = date.fromisoformat(d)
    today, yest = hist.get(d), hist.get((dd - timedelta(days=1)).isoformat())
    vals, ws = [], []
    if today and today.get("painWake") is not None:
        vals.append(today["painWake"]); ws.append(0.45)          # raideur matinale
    if yest and yest.get("painEvening") is not None:
        vals.append(yest["painEvening"]); ws.append(0.35)        # réaction retardée à hier
    if yest and yest.get("painEffort") is not None:
        vals.append(yest["painEffort"]); ws.append(0.20)         # ressenti en courant
    if not vals:
        # rien de saisi : on reporte la dernière valeur connue en la faisant décroître sur 3 jours
        for k in range(1, 5):
            r = hist.get((dd - timedelta(days=k)).isoformat())
            if not r: continue
            vs = [r[x] for x in ("painWake", "painEffort", "painEvening") if r.get(x) is not None]
            if vs: return max(vs) * max(0.0, 1 - k / 4)
        return None
    weighted = sum(v * w for v, w in zip(vals, ws)) / sum(ws)
    # maximum sur 72 h : un 5 isolé reste un signal, même entouré de zéros
    peak = 0.0
    for k in range(3):
        r = hist.get((dd - timedelta(days=k)).isoformat())
        if not r: continue
        for key in ("painWake", "painEffort", "painEvening"):
            if r.get(key) is not None: peak = max(peak, r[key])
    return 0.55 * weighted + 0.45 * peak

def trend(d, hist):
    """Pente de la douleur au réveil sur 4 jours, normalisée."""
    vs = []
    for k in range(3, -1, -1):
        day = (date.fromisoformat(d) - timedelta(days=k)).isoformat()
        r = hist.get(day)
        vs.append(r.get("painWake") if r and r.get("painWake") is not None else None)
    vs = [v for v in vs if v is not None]
    if len(vs) < 3: return 0.0
    n = len(vs); mx = (n - 1) / 2
    num = sum((i - mx) * (v - sum(vs) / n) for i, v in enumerate(vs))
    den = sum((i - mx) ** 2 for i in range(n))
    return max(0.0, num / den) if den else 0.0   # seule une hausse compte

# ---------------------------------------------------------------- 3. indice
def ewma(series, dates, d, halflife):
    """Moyenne exponentielle de la charge jusqu'à d inclus."""
    lam = 1 - math.exp(-math.log(2) / halflife)
    v = 0.0
    for day in dates:
        if day > d: break
        v = v + lam * (series.get(day, 0.0) - v)
    return v

def compute(d, load, hist, dates, memo=None):
    A = ewma(load, dates, d, 3.5)     # aiguë   (demi-vie 3,5 j)
    C = ewma(load, dates, d, 14.0)    # chronique (demi-vie 14 j)
    R = A / C if C > 0.5 else 1.0

    # --- mécanique
    m1 = 30 * min(1, max(0, (R - 0.90) / 0.70))          # emballement aigu/chronique
    l1 = load.get((date.fromisoformat(d) - timedelta(days=1)).isoformat(), 0)
    l2 = load.get((date.fromisoformat(d) - timedelta(days=2)).isoformat(), 0)
    recent = l1 + 0.55 * l2
    m2 = 20 * min(1, max(0, recent / (2.6 * C))) if C > 0.5 else 0   # fraîcheur immédiate

    # --- douleur : elle doit pouvoir faire basculer l'indice à elle seule
    ps = pain_score(d, hist)
    p = 85 * (min(10, ps) / 10) ** 1.15 if ps is not None else 0.0
    t = 6 * min(1, trend(d, hist) / 1.5)

    # --- monotonie (Foster) : une charge sans jour vraiment léger use le tendon
    w = [load.get((date.fromisoformat(d) - timedelta(days=k)).isoformat(), 0.0)
         for k in range(7)]
    mu = sum(w) / 7
    sd = (sum((x - mu) ** 2 for x in w) / 7) ** 0.5
    mono = (mu / sd) if sd > 0.3 else 0
    mo = 8 * min(1, max(0, (mono - 1.3) / 1.2))

    # --- crédits : ce qui fait BAISSER l'indice
    cr = 0.0
    y = (date.fromisoformat(d) - timedelta(days=1)).isoformat()
    ry, rd = hist.get(y), hist.get(d)
    if ry and "Renfo Bas" in (ry.get("activities") or []): cr += 6   # excentrique = thérapeutique
    if ry and ry.get("jumps"):  cr += 2
    if ry and ry.get("icing"):  cr += 2
    if ry and load.get(y, 0) < 2: cr += 5                            # vraie journée de repos

    idx = m1 + m2 + p + t + mo - cr
    # planchers garantis : les seuils que Mathieu a posés ne peuvent pas être contournés
    # par un indice bas ailleurs. Douleur déclarée >= 4 -> orange, >= 6 -> rouge, >= 8 -> noir.
    floor = 0.0
    for k in (0, 1):
        r = hist.get((date.fromisoformat(d) - timedelta(days=k)).isoformat())
        if not r: continue
        mx = max([r[x] for x in ("painWake", "painEffort", "painEvening")
                  if r.get(x) is not None] or [0])
        dec = 1.0 if k == 0 else 0.92
        if mx >= 8: floor = max(floor, 80 * dec)
        elif mx >= 6: floor = max(floor, 65 * dec)
        elif mx >= 4: floor = max(floor, 50 * dec)
    # mémoire d'épisode : après un pic, le tendon reste sensibilisé même si la douleur retombe
    if memo:
        for k in range(1, 6):
            prev = memo.get((date.fromisoformat(d) - timedelta(days=k)).isoformat())
            if prev is not None and prev >= 60:
                floor = max(floor, prev * (0.74 ** k))
    idx = max(idx, floor)
    return dict(idx=max(0, min(100, round(idx))), floor=round(floor), A=round(A, 1), C=round(C, 1),
                R=round(R, 2), m1=round(m1), m2=round(m2), p=round(p), t=round(t),
                mo=round(mo), cr=round(cr), pain=None if ps is None else round(ps, 2))

def band(i):
    if i < 30: return "VERT   tout autorisé"
    if i < 50: return "JAUNE  plan nominal"
    if i < 65: return "ORANGE ni vitesse ni muscu bas, sortie longue -20%"
    if i < 80: return "ROUGE  aucune course, vélo Z2 + haut du corps"
    return "NOIR   repos complet des jambes"

dates = sorted(set(list(LOAD) + list(PAIN)))
alld = []
d0, d1 = date.fromisoformat(dates[0]), date.fromisoformat(dates[-1])
while d0 <= d1:
    alld.append(d0.isoformat()); d0 += timedelta(days=1)

print(f"{'date':12s} {'chg':>5s} {'A':>5s} {'C':>5s} {'R':>5s} {'méca':>5s} {'dlr':>4s} {'cré':>4s} {'IDX':>4s}  bande")
for d in alld[-30:]:
    r = compute(d, LOAD, PAIN, alld)
    acts = [a["name"][:16] for a in STRAVA if a["date"] == d]
    print(f"{d} {LOAD.get(d,0):5.1f} {r['A']:5.1f} {r['C']:5.1f} {r['R']:5.2f} "
          f"{r['m1']+r['m2']+r['mo']:5d} {r['p']:4d} {-r['cr']:4d} {r['idx']:4d}  {band(r['idx'])[:38]:38s} {', '.join(acts)[:34]}")

vals = [compute(d, LOAD, PAIN, alld)["idx"] for d in alld[-45:]]
print(f"\nsur 45 jours : min {min(vals)}  médiane {sorted(vals)[len(vals)//2]}  max {max(vals)}")
print("répartition :", {b: sum(1 for v in vals if band(v).startswith(b))
                        for b in ("VERT", "JAUNE", "ORANGE", "ROUGE", "NOIR")})
