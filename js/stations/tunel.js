function mountTunel(container) {
  return mountQualidadeGate(container, 'tunel', {
    acaoLiberar: 'liberacao-final',
    tituloFila: 'No túnel de liberação',
  });
}
