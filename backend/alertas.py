from sqlalchemy.orm import Session
from typing import Dict
from datetime import datetime
import asyncio
from models import Notebook, Configuracao

async def verificar_alerta_escassez(db: Session) -> Dict:
    """
    Verifica se a quantidade de notebooks disponíveis está abaixo do limite configurado.
    Retorna um dicionário com informações do alerta.
    """
    total = db.query(Notebook).count()
    disponiveis = db.query(Notebook).filter(Notebook.status == "Disponível").count()
    
    config = db.query(Configuracao).filter(Configuracao.chave == "alerta_escassez_percentual").first()
    limite_percentual = float(config.valor) if config else 10.0
    
    percentual_atual = round((disponiveis / total * 100), 2) if total > 0 else 0
    
    alerta_ativo = percentual_atual < limite_percentual and total > 0
    
    mensagem = ""
    if alerta_ativo:
        mensagem = (
            f"⚠️ ALERTA DE ESCASSEZ: Apenas {disponiveis} de {total} notebooks disponíveis "
            f"({percentual_atual}%). Limite configurado: {limite_percentual}%. "
            f"Considere liberar notebooks reservados ou em manutenção."
        )
    
    return {
        "ativo": alerta_ativo,
        "percentual_atual": percentual_atual,
        "limite_percentual": limite_percentual,
        "quantidade_disponivel": disponiveis,
        "quantidade_total": total,
        "mensagem": mensagem,
        "timestamp": datetime.now().isoformat()
    }

def verificar_alerta_escassez_sync(db: Session) -> Dict:
    """Versão síncrona para uso em endpoints HTTP"""
    total = db.query(Notebook).count()
    disponiveis = db.query(Notebook).filter(Notebook.status == "Disponível").count()
    
    config = db.query(Configuracao).filter(Configuracao.chave == "alerta_escassez_percentual").first()
    limite_percentual = float(config.valor) if config else 10.0
    
    percentual_atual = round((disponiveis / total * 100), 2) if total > 0 else 0
    alerta_ativo = percentual_atual < limite_percentual and total > 0
    
    mensagem = ""
    if alerta_ativo:
        mensagem = (
            f"⚠️ ALERTA DE ESCASSEZ: Apenas {disponiveis} de {total} notebooks disponíveis "
            f"({percentual_atual}%). Limite configurado: {limite_percentual}%."
        )
    
    return {
        "ativo": alerta_ativo,
        "percentual_atual": percentual_atual,
        "limite_percentual": limite_percentual,
        "quantidade_disponivel": disponiveis,
        "quantidade_total": total,
        "mensagem": mensagem,
        "timestamp": datetime.now().isoformat()
    }

def notificar_alerta_escassez(alerta: Dict):
    """
    Dispara notificações do alerta de escassez.
    Preparado para integração com sistemas externos (e-mail, SMS, Slack, etc.)
    """
    if not alerta["ativo"]:
        return
    
    print(f"\n{'='*60}")
    print(f"ALERTA DE ESCASSEZ - {alerta['timestamp']}")
    print(f"{'='*60}")
    print(alerta["mensagem"])
    print(f"{'='*60}\n")
    
    # TODO: Integrar com serviços de notificação
    # - E-mail para coordenação
    # - Mensagem no Slack/Teams
    # - Push notification para app mobile
    # - WebSocket broadcast para dashboard

class MonitorEscassez:
    """
    Monitor contínuo de escassez que pode ser executado em background.
    Útil para integração com sistemas de fila (Celery, RQ, etc.)
    """
    
    def __init__(self, db_session_factory, intervalo_segundos: int = 300):
        self.db_session_factory = db_session_factory
        self.intervalo = intervalo_segundos
        self._running = False
    
    async def start(self):
        """Inicia o monitoramento contínuo"""
        self._running = True
        print(f"📊 Monitor de escassez iniciado (intervalo: {self.intervalo}s)")
        
        while self._running:
            try:
                db = self.db_session_factory()
                alerta = await verificar_alerta_escassez(db)
                if alerta["ativo"]:
                    notificar_alerta_escassez(alerta)
                db.close()
            except Exception as e:
                print(f"Erro no monitor de escassez: {e}")
            
            await asyncio.sleep(self.intervalo)
    
    def stop(self):
        """Para o monitoramento"""
        self._running = False
        print("📊 Monitor de escassez finalizado")

