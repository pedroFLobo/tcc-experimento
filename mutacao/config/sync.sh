#!/bin/bash
# MUT_TRABALHO: pasta de trabalho com uma copia do Clinica+ por modelo em $MUT_TRABALHO/mut/<modelo>
SP=${MUT_TRABALHO:?defina MUT_TRABALHO}; CFG=$(cd "$(dirname "$0")" && pwd); D=$(dirname "$CFG")
while true; do
  { echo "Atualizado em $(TZ=America/Sao_Paulo date '+%d/%m %H:%M:%S') (horario de Brasilia)"
  for m in deepseek mimo glm nemotron gemini; do
    for l in $SP/mut/$m/stryker-*.log; do
      [ -f "$l" ] || continue; b=$(basename $l .log)
      sed 's/\x1b\[[0-9;]*m//g' $l > $D/logs/$m-$b.log
      echo "$m ${b#stryker-}: $(grep -E 'Mutation testing|Final|ERROR|Done in' $D/logs/$m-$b.log | tail -1)"
    done
    [ -f $SP/mut/$m/tempos.txt ] && cp $SP/mut/$m/tempos.txt $D/logs/$m-tempos.txt
  done; } > $D/ANDAMENTO.txt
  sleep 30
done
