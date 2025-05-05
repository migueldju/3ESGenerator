# debug_db.py
from flask import Flask
from models import db, User, Conversation, Answer
from config import get_config
import os

# Create a minimal app for debugging the database
app = Flask(__name__)
app.config.from_object(get_config())

db.init_app(app)

with app.app_context():
    # Verificar si las tablas existen
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    
    print("=== TABLAS EN LA BASE DE DATOS ===")
    for table in tables:
        print(f"- {table}")
    
    print("\n=== VERIFICANDO CONTENIDO ===")
    
    # Verificar usuarios
    users = User.query.all()
    print(f"\nUsuarios encontrados: {len(users)}")
    for user in users:
        print(f"  Usuario ID: {user.id}, Username: {user.username}, Email: {user.email}")
    
    # Verificar conversaciones
    conversations = Conversation.query.all()
    print(f"\nConversaciones encontradas: {len(conversations)}")
    for conv in conversations:
        print(f"  Conversación ID: {conv.id}, User ID: {conv.user_id}, Title: {conv.title}")
    
    # Verificar respuestas
    answers = Answer.query.all()
    print(f"\nRespuestas encontradas: {len(answers)}")
    for answer in answers:
        print(f"  Respuesta ID: {answer.id}, Conversation ID: {answer.conversation_id}")
        print(f"    Pregunta: {answer.question[:50]}...")
        print(f"    Respuesta: {answer.answer[:50]}...")
    
    print("\n=== VERIFICANDO RESTRICCIONES DE CLAVES EXTERNAS ===")
    conversations = Conversation.query.all()
    for conv in conversations:
        user = User.query.get(conv.user_id)
        if user:
            print(f"  Conversación {conv.id} tiene usuario válido: {user.username}")
        else:
            print(f"  ERROR: Conversación {conv.id} tiene user_id inválido: {conv.user_id}")
    
    answers = Answer.query.all()
    for answer in answers:
        conv = Conversation.query.get(answer.conversation_id)
        if conv:
            print(f"  Respuesta {answer.id} tiene conversación válida: {conv.id}")
        else:
            print(f"  ERROR: Respuesta {answer.id} tiene conversation_id inválido: {answer.conversation_id}")