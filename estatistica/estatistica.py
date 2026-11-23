# Testes estatisticos entre os 5 modelos (aprovacao, nota do juiz, mutation score).
# Uso: python3 estatistica.py   ->  estatistica/
import csv, glob, json, os, itertools, random
import numpy as np
from scipy import stats
import openpyxl

SP = os.environ['MUT_TRABALHO']  # pasta com mut/<modelo>/reports/mutacao
EXP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = f'{EXP}/estatistica'
CONS = f'{EXP}/metricas/casos-consolidados.csv'
MODELOS = ['deepseek', 'mimo', 'glm', 'gemini', 'nemotron']
DETECT, UNDET = {'Killed', 'Timeout'}, {'Survived', 'NoCoverage'}
B = 2000
rng = np.random.default_rng(2026)
os.makedirs(OUT, exist_ok=True)


def holm(ps):
    idx = sorted(range(len(ps)), key=lambda i: ps[i])
    adj, mx = [0] * len(ps), 0
    for r, i in enumerate(idx):
        mx = max(mx, min(1, (len(ps) - r) * ps[i]))
        adj[i] = mx
    return adj


def wilson(k, n, z=1.96):
    if n == 0:
        return (None, None)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (round(100 * (c - h), 2), round(100 * (c + h), 2))


def cliff(a, b):
    a, b = np.asarray(a), np.asarray(b)
    gt = sum((x > b).sum() for x in a)
    lt = sum((x < b).sum() for x in a)
    return (gt - lt) / (len(a) * len(b))


def boot_mean(x):
    x = np.asarray(x, float)
    ms = [rng.choice(x, len(x)).mean() for _ in range(B)]
    return (round(float(np.percentile(ms, 2.5)), 3), round(float(np.percentile(ms, 97.5)), 3))


abas = {}
cons = list(csv.DictReader(open(CONS, encoding='utf-8-sig'), delimiter=';'))

# A. Taxa de aprovacao
lin, tab = [], []
for m in MODELOS:
    rs = [r for r in cons if r['modelo'] == m]
    k = sum(r['status'] == 'passou' for r in rs)
    lo, hi = wilson(k, len(rs))
    lin.append({'modelo': m, 'casos': len(rs), 'aprovados': k, 'taxa': round(100 * k / len(rs), 2), 'ic95_inf': lo, 'ic95_sup': hi})
    tab.append([k, len(rs) - k])
chi2, p, dof, _ = stats.chi2_contingency(tab)
n = sum(map(sum, tab))
global_ap = {'teste': 'qui-quadrado 5x2', 'chi2': round(chi2, 2), 'gl': dof, 'p': p, 'V_de_Cramer': round(np.sqrt(chi2 / n), 3)}
pares = list(itertools.combinations(range(5), 2))
ps = [stats.fisher_exact([tab[i], tab[j]])[1] for i, j in pares]
pa = holm(ps)
par_ap = [{'A': MODELOS[i], 'B': MODELOS[j], 'taxaA': lin[i]['taxa'], 'taxaB': lin[j]['taxa'], 'p_fisher': ps[t], 'p_holm': pa[t], 'significativo_5%': pa[t] < 0.05} for t, (i, j) in enumerate(pares)]
abas['aprovacao'] = lin + [{}] + [global_ap] + [{}] + par_ap

# B. Nota do juiz
lin, grupos = [], []
for m in MODELOS:
    x = [float(r['juiz_nota']) for r in cons if r['modelo'] == m and r['juiz_nota']]
    grupos.append(x)
    lo, hi = boot_mean(x)
    lin.append({'modelo': m, 'n': len(x), 'media': round(float(np.mean(x)), 3), 'mediana': float(np.median(x)), 'dp': round(float(np.std(x, ddof=1)), 3), 'ic95_media_inf': lo, 'ic95_media_sup': hi})
H, p = stats.kruskal(*grupos)
N = sum(map(len, grupos))
global_j = {'teste': 'Kruskal-Wallis', 'H': round(H, 2), 'gl': 4, 'p': p, 'epsilon2': round(H / ((N * N - 1) / (N + 1)), 4)}
ps = [stats.mannwhitneyu(grupos[i], grupos[j])[1] for i, j in pares]
pa = holm(ps)
par_j = [{'A': MODELOS[i], 'B': MODELOS[j], 'mediaA': lin[i]['media'], 'mediaB': lin[j]['media'], 'p_mannwhitney': ps[t], 'p_holm': pa[t], 'delta_de_Cliff': round(cliff(grupos[i], grupos[j]), 3), 'significativo_5%': pa[t] < 0.05} for t, (i, j) in enumerate(pares)]
abas['nota-juiz'] = lin + [{}] + [global_j] + [{}] + par_j


# C. Mutation score (mesmos mutantes para todos os modelos)
def carregar(m, area):
    muts = {}
    for p in glob.glob(f'{SP}/mut/{m}/reports/mutacao/{area}-*.json'):
        for arq, f in json.load(open(p))['files'].items():
            rel = arq.split(f'/mut/{m}/')[-1]
            for mu in f['mutants']:
                l = mu['location']
                muts[(rel, l['start']['line'], l['start']['column'], l['end']['line'], l['end']['column'], mu['mutatorName'], mu.get('replacement', ''))] = mu['status']
    return muts


resumo_mut = {}
for area in ('backend', 'frontend'):
    d = {m: carregar(m, area) for m in MODELOS}
    comuns = sorted(k for k in set.intersection(*[set(v) for v in d.values()]) if all(d[m][k] in DETECT | UNDET for m in MODELOS))
    X = np.array([[1 if d[m][k] in DETECT else 0 for m in MODELOS] for k in comuns])
    lin = []
    for j, m in enumerate(MODELOS):
        col = X[:, j]
        bs = [col[rng.integers(0, len(col), len(col))].mean() for _ in range(B)]
        lin.append({'modelo': m, 'mutantes': len(col), 'detectados': int(col.sum()), 'score': round(100 * col.mean(), 2),
                    'ic95_inf': round(100 * float(np.percentile(bs, 2.5)), 2), 'ic95_sup': round(100 * float(np.percentile(bs, 97.5)), 2)})
    k = X.shape[1]
    Cj, Ri = X.sum(0), X.sum(1)
    Q = (k - 1) * (k * (Cj ** 2).sum() - Cj.sum() ** 2) / (k * Ri.sum() - (Ri ** 2).sum())
    pq = stats.chi2.sf(Q, k - 1)
    glob_m = {'teste': f'Cochran Q ({area})', 'Q': round(float(Q), 2), 'gl': k - 1, 'p': float(pq), 'mutantes': len(comuns)}
    ps, info = [], []
    for i, j in pares:
        b = int(((X[:, i] == 1) & (X[:, j] == 0)).sum())
        c = int(((X[:, i] == 0) & (X[:, j] == 1)).sum())
        p = stats.binomtest(b, b + c, 0.5).pvalue if b + c else 1.0
        ps.append(p)
        info.append((i, j, b, c))
    pa = holm(ps)
    par_m = [{'A': MODELOS[i], 'B': MODELOS[j], 'scoreA': lin[i]['score'], 'scoreB': lin[j]['score'], 'so_A_detecta': b, 'so_B_detecta': c,
              'p_mcnemar_exato': ps[t], 'p_holm': pa[t], 'significativo_5%': pa[t] < 0.05} for t, (i, j, b, c) in enumerate(info)]
    abas[f'mutacao-{area}'] = lin + [{}] + [glob_m] + [{}] + par_m
    resumo_mut[area] = {'scores': lin, 'global': glob_m, 'pares': par_m}

# Saidas
wb = openpyxl.Workbook(); wb.remove(wb.active)
for nome, linhas in abas.items():
    ws = wb.create_sheet(nome)
    blocos, atual = [], []
    for l in linhas:
        if not l:
            blocos.append(atual); atual = []
        else:
            atual.append(l)
    blocos.append(atual)
    for bl in blocos:
        if not bl:
            continue
        cols = list(dict.fromkeys(c for l in bl for c in l))
        ws.append(cols)
        for l in bl:
            ws.append([l.get(c) for c in cols])
        ws.append([])
wb.save(f'{OUT}/estatistica.xlsx')
json.dump({'aprovacao': {'global': global_ap, 'pares': par_ap}, 'notaJuiz': {'global': global_j, 'pares': par_j}, 'mutacao': resumo_mut},
          open(f'{OUT}/estatistica.json', 'w'), ensure_ascii=False, indent=1, default=float)
for nome, linhas in abas.items():
    print('==', nome)
    for l in linhas:
        if l:
            print({k: (round(v, 4) if isinstance(v, float) else v) for k, v in l.items()})
