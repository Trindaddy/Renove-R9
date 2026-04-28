from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Optional
import json
import asyncio
from datetime import datetime

class ConnectionManager:
    """Gerencia conexões WebSocket para atualizações em tempo real"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[int, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: Optional[int] = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_id:
            self.user_connections[user_id] = websocket
        print(f"🔗 WebSocket conectado. Total: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket, user_id: Optional[int] = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id and user_id in self.user_connections:
            del self.user_connections[user_id]
        print(f"🔌 WebSocket desconectado. Total: {len(self.active_connections)}")
    
    async def send_message(self, websocket: WebSocket, message: dict):
        try:
            await websocket.send_json(message)
        except Exception as e:
            print(f"Erro ao enviar mensagem: {e}")
    
    async def broadcast(self, message: dict):
        """Envia mensagem para todas as conexões ativas"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        
        # Limpar conexões mortas
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)
    
    async def notify_user(self, user_id: int, message: dict):
        """Envia notificação para um usuário específico"""
        if user_id in self.user_connections:
            await self.send_message(self.user_connections[user_id], message)

manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket, user_id: Optional[int] = None):
    """Endpoint WebSocket para atualizações em tempo real"""
    await manager.connect(websocket, user_id)
    
    try:
        while True:
            # Receber mensagem do cliente (ping/heartbeat)
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await manager.send_message(websocket, {
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                })
            
            elif message.get("type") == "subscribe_dashboard":
                await manager.send_message(websocket, {
                    "type": "subscription_confirmed",
                    "channel": "dashboard"
                })
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        print(f"Erro no WebSocket: {e}")
        manager.disconnect(websocket, user_id)

async def broadcast_disponibilidade(stats: dict):
    """Broadcast de atualização de disponibilidade para todos os clientes"""
    await manager.broadcast({
        "type": "disponibilidade_update",
        "data": stats,
        "timestamp": datetime.now().isoformat()
    })

async def broadcast_alerta_escassez(alerta: dict):
    """Broadcast de alerta de escassez"""
    await manager.broadcast({
        "type": "alerta_escassez",
        "data": alerta,
        "timestamp": datetime.now().isoformat()
    })

async def broadcast_emprestimo_realizado(emprestimo: dict):
    """Broadcast quando um novo empréstimo é realizado"""
    await manager.broadcast({
        "type": "emprestimo_realizado",
        "data": emprestimo,
        "timestamp": datetime.now().isoformat()
    })

async def broadcast_devolucao_realizada(devolucao: dict):
    """Broadcast quando uma devolução é realizada"""
    await manager.broadcast({
        "type": "devolucao_realizada",
        "data": devolucao,
        "timestamp": datetime.now().isoformat()
    })

# Importação tardia para evitar circular imports
from typing import Optional

