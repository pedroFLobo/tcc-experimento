# Consistencia do juiz (teste-reteste): compara as notas originais com o rejulgamento de uma amostra de lotes.
import csv, glob, io, os, json
import numpy as np
from scipy import stats
EXP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = f'{EXP}/avaliacao/juiz'
R = f'{EXP}/avaliacao/juiz-reteste'
OUT = f'{EXP}/estatistica'
CRIT = ['aderencia', 'correcao', 'oraculo', 'clareza', 'relevancia']


def ler(p):
    return {r['caso']: r for r in csv.DictReader(io.StringIO(open(p, encoding='utf-8-sig').read().strip()), delimiter=';')}


def kappa_quad(a, b, cats=(2, 4, 6, 8, 10)):
    k = len(cats); ix = {c: i for i, c in enumerate(cats)}
    O = np.zeros((k, k))
    for x, y in zip(a, b):
        O[ix[x], ix[y]] += 1
    W = np.array([[(i - j) ** 2 for j in range(k)] for i in range(k)]) / (k - 1) ** 2
    E = np.outer(O.sum(1), O.sum(0)) / O.sum()
    return 1 - (W * O).sum() / (W * E).sum() if (W * E).sum() else None


def icc_a1(a, b):  # ICC(2,1) concordancia absoluta, 2 medidas
    X = np.column_stack([a, b]).astype(float); n, k = X.shape
    gm = X.mean(); msr = k * ((X.mean(1) - gm) ** 2).sum() / (n - 1); msc = n * ((X.mean(0) - gm) ** 2).sum() / (k - 1)
    sse = ((X - X.mean(1, keepdims=True) - X.mean(0, keepdims=True) + gm) ** 2).sum(); mse = sse / ((n - 1) * (k - 1))
    return (msr - mse) / (msr + (k - 1) * mse + k * (msc - mse) / n)


pares = []
for p in sorted(glob.glob(f'{R}/lote-*.csv')):
    o, r = ler(f'{J}/{os.path.basename(p)}'), ler(p)
    for c in r:
        pares.append((os.path.basename(p)[:-4], c, o[c], r[c]))
res = {'lotes': sorted({x[0] for x in pares}), 'casos': len(pares), 'criterios': {}}
for c in CRIT:
    a = [int(x[2][c]) for x in pares]; b = [int(x[3][c]) for x in pares]
    res['criterios'][c] = {'concordancia_exata': round(100 * np.mean(np.array(a) == np.array(b)), 1),
                           'dentro_de_1_ponto_da_escala': round(100 * np.mean(np.abs(np.array(a) - np.array(b)) <= 2), 1),
                           'kappa_ponderado_quadratico': round(float(kappa_quad(a, b)), 3)}
a = [float(x[2]['nota']) for x in pares]; b = [float(x[3]['nota']) for x in pares]
res['nota'] = {'ICC_2_1': round(float(icc_a1(a, b)), 3), 'spearman': round(float(stats.spearmanr(a, b)[0]), 3),
               'diferenca_media_reteste_menos_original': round(float(np.mean(np.array(b) - np.array(a))), 3),
               'diferenca_absoluta_media': round(float(np.mean(np.abs(np.array(b) - np.array(a)))), 3),
               'wilcoxon_p': float(stats.wilcoxon(a, b)[1]) if any(x != y for x, y in zip(a, b)) else 1.0,
               'media_original': round(float(np.mean(a)), 3), 'media_reteste': round(float(np.mean(b)), 3)}
por_lote = {}
for l in res['lotes']:
    aa = [float(x[2]['nota']) for x in pares if x[0] == l]; bb = [float(x[3]['nota']) for x in pares if x[0] == l]
    por_lote[l] = {'casos': len(aa), 'media_original': round(np.mean(aa), 2), 'media_reteste': round(np.mean(bb), 2)}
res['porLote'] = por_lote
os.makedirs(OUT, exist_ok=True)
json.dump(res, open(f'{OUT}/consistencia-juiz.json', 'w'), ensure_ascii=False, indent=1)
with open(f'{OUT}/consistencia-juiz-casos.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f, delimiter=';'); w.writerow(['lote', 'caso'] + [f'{c}_orig' for c in CRIT + ['nota']] + [f'{c}_reteste' for c in CRIT + ['nota']])
    for l, c, o, r in pares:
        w.writerow([l, c] + [o[k] for k in CRIT + ['nota']] + [r[k] for k in CRIT + ['nota']])
print(json.dumps(res, ensure_ascii=False, indent=1))
