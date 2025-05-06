# Crear un archivo: backend/migration_update_user_id.py

from flask import Flask
from models import db, User, Conversation, Answer, Document
from config import get_config
from sqlalchemy import text

# Create a minimal app for database migration
app = Flask(__name__)
app.config.from_object(get_config())

db.init_app(app)

with app.app_context():
    try:
        # Ejecutar la alteración de la tabla
        with db.engine.connect() as connection:
            # Remover la restricción NOT NULL de user_id
            if db.engine.dialect.name == 'mysql':
                connection.execute(text("ALTER TABLE conversations MODIFY user_id INTEGER NULL"))
            elif db.engine.dialect.name == 'postgresql':
                connection.execute(text("ALTER TABLE conversations ALTER COLUMN user_id DROP NOT NULL"))
            else:
                print(f"Unsupported database dialect: {db.engine.dialect.name}")
                exit(1)
            
            connection.commit()
            
        print("Successfully updated conversations table - user_id can now be null")
        
        # Verificar el cambio
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        
        for column in inspector.get_columns('conversations'):
            if column['name'] == 'user_id':
                print(f"Column user_id nullable: {column['nullable']}")
                
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        import traceback
        traceback.print_exc()