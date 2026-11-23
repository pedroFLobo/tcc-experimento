# Roda o Stryker de um modelo em blocos (por camada), para poder retomar se o container reiniciar.
# Uso: python3 rodar-modelo.py <pasta-do-modelo>
import json, os, subprocess, sys, time
W = sys.argv[1]
BLOCOS = {
    'backend': {
        'domain': ['backend/src/domain/**/*.js'],
        'services': ['backend/src/services/**/*.js'],
        'repositories': ['backend/src/repositories/**/*.js'],
        'routes': ['backend/src/routes/**/*.js'],
        'outros': ['backend/src/app.js', 'backend/src/middleware/**/*.js', 'backend/src/utils/**/*.js'],
    },
    'frontend': {
        'pages': ['frontend/src/pages/**/*.{js,jsx}'],
        'components': ['frontend/src/components/**/*.{js,jsx}'],
        'outros': ['frontend/src/App.jsx', 'frontend/src/api/**/*.js', 'frontend/src/contexts/**/*.{js,jsx}', 'frontend/src/hooks/**/*.js', 'frontend/src/utils/**/*.js'],
    },
}
os.makedirs(f'{W}/reports/mutacao', exist_ok=True)
env = {**os.environ, 'CLINICA_AGORA': ''}
for area, blocos in BLOCOS.items():
    base = json.load(open(f'{W}/stryker.{"back" if area == "backend" else "front"}.json'))
    for nome, mutate in blocos.items():
        rel = f'reports/mutacao/{area}-{nome}'
        if os.path.exists(f'{W}/{rel}.json'):
            continue
        cfg = {**base, 'mutate': mutate, 'jsonReporter': {'fileName': f'{rel}.json'}, 'htmlReporter': {'fileName': f'{rel}.html'},
               'tempDirName': f'.stryker-tmp-{area}-{nome}'}
        p = f'{W}/stryker.{area}-{nome}.json'
        json.dump(cfg, open(p, 'w'), indent=2)
        t = time.time()
        with open(f'{W}/stryker-{area}-{nome}.log', 'w') as log:
            r = subprocess.run(['npx', 'stryker', 'run', p], cwd=W, env=env, stdout=log, stderr=subprocess.STDOUT)
        with open(f'{W}/tempos.txt', 'a') as f:
            f.write(f'{area}-{nome} exit={r.returncode} seg={int(time.time() - t)}\n')
