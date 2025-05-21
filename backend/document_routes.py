# backend/document_routes.py
from flask import Blueprint, request, jsonify, session
from models import db, Document, User
from datetime import datetime

documents = Blueprint('documents', __name__)

@documents.route('/documents', methods=['GET'])
def get_documents():
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    
    user_documents = Document.query.filter_by(user_id=user_id).order_by(Document.updated_at.desc()).all()
    
    result = []
    for doc in user_documents:
        result.append({
            'id': doc.id,
            'name': doc.name,
            'created_at': doc.created_at.isoformat(),
            'updated_at': doc.updated_at.isoformat()
        })
    
    return jsonify(result), 200

@documents.route('/documents/<int:document_id>', methods=['GET'])
def get_document(document_id):
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    
    document = Document.query.filter_by(id=document_id, user_id=user_id).first()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    return jsonify({
        'id': document.id,
        'name': document.name,
        'content': document.content,
        'created_at': document.created_at.isoformat(),
        'updated_at': document.updated_at.isoformat()
    }), 200

@documents.route('/documents', methods=['POST'])
def create_document():
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    
    data = request.json
    name = data.get('name', '')
    content = data.get('content', '')
    
    if not name:
        return jsonify({'error': 'Document name is required'}), 400
    
    # Create a new document
    document = Document(
        user_id=user_id,
        name=name,
        content=content
    )
    
    db.session.add(document)
    db.session.commit()
    
    return jsonify({
        'id': document.id,
        'name': document.name,
        'created_at': document.created_at.isoformat(),
        'updated_at': document.updated_at.isoformat()
    }), 201

@documents.route('/documents/<int:document_id>', methods=['PUT'])
def update_document(document_id):
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    
    document = Document.query.filter_by(id=document_id, user_id=user_id).first()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    data = request.json
    name = data.get('name')
    content = data.get('content')
    
    if name:
        document.name = name
    
    if content:
        document.content = content
    
    document.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'id': document.id,
        'name': document.name,
        'created_at': document.created_at.isoformat(),
        'updated_at': document.updated_at.isoformat()
    }), 200

@documents.route('/documents/<int:document_id>', methods=['DELETE'])
def delete_document(document_id):
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    
    document = Document.query.filter_by(id=document_id, user_id=user_id).first()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    db.session.delete(document)
    db.session.commit()
    
    return jsonify({'message': 'Document deleted successfully'}), 200