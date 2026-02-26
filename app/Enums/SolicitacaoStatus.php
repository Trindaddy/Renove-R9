<?php

namespace App\Enums;

enum SolicitacaoStatus: string
{
    case Pendente = 'pendente';
    case Ativo = 'ativo';
    case Cancelado = 'cancelado';
}

