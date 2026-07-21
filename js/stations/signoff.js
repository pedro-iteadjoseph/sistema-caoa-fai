function mountSignOff(container) {
  return mountQualidadeGate(container, 'signoff', {
    acaoLiberar: 'liberacao-direta',
    tituloFila: 'Aguardando sign off',
  });
}
