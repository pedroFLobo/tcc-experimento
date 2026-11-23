#!/bin/bash
# Depois do orquestrador: completa blocos que faltaram (GLM backend, apos excluir o teste dependente).
# MUT_TRABALHO: pasta de trabalho com uma copia do Clinica+ por modelo em $MUT_TRABALHO/mut/<modelo>
SP=${MUT_TRABALHO:?defina MUT_TRABALHO}; CFG=$(cd "$(dirname "$0")" && pwd); D=$(dirname "$CFG")
log(){ echo "$(TZ=America/Sao_Paulo date '+%d/%m %H:%M:%S') $*" >> $D/logs/orquestrador.log; }
until grep -q 'TUDO CONCLUIDO' $D/logs/orquestrador.log; do sleep 30; done
for m in deepseek mimo glm nemotron gemini; do
  python3 $CFG/rodar-modelo.py $SP/mut/$m
done
log "PENDENTES fim: glm $(tr '\n' ' ' < $SP/mut/glm/tempos.txt)"
log "FINALIZADO"
