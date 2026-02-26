<?php

namespace App\Enums;

enum EquipmentStatus: string
{
    case Disponivel = 'disponivel';
    case Manutencao = 'manutencao';
    case Ocupado = 'ocupado';
}

