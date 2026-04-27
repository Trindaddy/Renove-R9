export const EquipmentStatus = Object.freeze({
  Disponivel: 'disponivel',
  Manutencao: 'manutencao',
  Ocupado: 'ocupado'
});

export const EquipmentStatusLabel = Object.freeze({
  [EquipmentStatus.Disponivel]: 'Disponível',
  [EquipmentStatus.Manutencao]: 'Manutenção',
  [EquipmentStatus.Ocupado]: 'Em uso'
});

