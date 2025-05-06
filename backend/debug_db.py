# Crear archivo: backend/debug_database.py

from flask import Flask
from models import db, User, Conversation, Answer
from config import get_config
from sqlalchemy import inspect

# Create a minimal app for debugging the database
app = Flask(__name__)
app.config.from_object(get_config())

db.init_app(app)

with app.app_context():
    print("=== VERIFICANDO CONVERSACIONES ===")
    
    # Verificar todas las conversaciones
    conversations = Conversation.query.all()
    print(f"\nTotal de conversaciones: {len(conversations)}")
    
    for conv in conversations:
        print(f"\nConversación ID: {conv.id}")
        print(f"  User ID: {conv.user_id} {'(NULL)' if conv.user_id is None else ''}")
        print(f"  Title: {conv.title}")
        print(f"  NACE Sector: {conv.nace_sector}")
        print(f"  Created: {conv.created_at}")
        
        # Verificar si el usuario existe
        if conv.user_id:
            user = User.query.get(conv.user_id)
            if user:
                print(f"  User: {user.username} ({user.email})")
            else:
                print(f"  ERROR: User ID {conv.user_id} no existe!")
        
        # Contar respuestas
        answers_count = Answer.query.filter_by(conversation_id=conv.id).count()
        print(f"  Respuestas: {answers_count}")
    
    print("\n=== VERIFICANDO USUARIOS ===")
    users = User.query.all()
    print(f"\nTotal de usuarios: {len(users)}")
    
    for user in users:
        print(f"\nUsuario ID: {user.id}")
        print(f"  Username: {user.username}")
        print(f"  Email: {user.email}")
        print(f"  Verificado: {user.is_verified}")
        
        # Contar conversaciones
        conv_count = Conversation.query.filter_by(user_id=user.id).count()
        print(f"  Conversaciones: {conv_count}")
    
    print("\n=== VERIFICANDO CONVERSACIONES ANÓNIMAS ===")
    anonymous_convs = Conversation.query.filter_by(user_id=None).all()
    print(f"\nConversaciones anónimas: {len(anonymous_convs)}")
    
    for conv in anonymous_convs:
        print(f"  ID: {conv.id}, Title: {conv.title}")
        print(f"  Created: {conv.created_at}")
    
    print("\n=== VERIFICANDO ESQUEMA DE TABLA CONVERSATIONS ===")
    inspector = inspect(db.engine)
    for column in inspector.get_columns('conversations'):
        print(f"  {column['name']}: {column['type']}, nullable: {column['nullable']}")