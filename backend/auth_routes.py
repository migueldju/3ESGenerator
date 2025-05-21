# backend/auth_routes.py
from flask import Blueprint, request, jsonify, session, current_app, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Conversation, Answer, Document
from email_service import EmailService
import uuid
from datetime import datetime, timedelta
import os

auth = Blueprint('auth', __name__)
email_service = EmailService()

# Initialize email service with app config
@auth.record
def record_params(setup_state):
    app = setup_state.app
    email_service.init_app(app)

@auth.route('/register', methods=['POST'])
def register():
    data = request.json
    
    # Check if email already exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    # Check if username already exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already taken'}), 400
    
    # Create new user
    user = User(
        username=data['username'],
        email=data['email']
    )
    user.set_password(data['password'])
    
    # Generate verification token
    user.verification_token = user.generate_token()
    
    # Save user to database
    db.session.add(user)
    db.session.commit()
    
    # Generate verification URL
    verification_url = url_for('auth.verify_email', token=user.verification_token, _external=True)
    
    # Send verification email
    email_sent = email_service.send_verification_email(user, verification_url)
    
    if email_sent:
        return jsonify({'message': 'Registration successful! Please check your email to verify your account.'}), 201
    else:
        return jsonify({'error': 'Failed to send verification email'}), 500

@auth.route('/verify-email/<token>', methods=['GET'])
def verify_email(token):
    user = User.query.filter_by(verification_token=token).first()
    
    if not user:
        return jsonify({'error': 'Invalid verification token'}), 400
    
    user.is_verified = True
    user.verification_token = None
    db.session.commit()
    
    return jsonify({'message': 'Email verified successfully! You can now log in.'}), 200

@auth.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    if not user.is_verified:
        return jsonify({'error': 'Please verify your email before logging in'}), 403
    
    # Set user session
    session['user_id'] = user.id
    session['username'] = user.username
    
    return jsonify({
        'message': 'Logged in successfully',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    }), 200

@auth.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200

@auth.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    
    if not user:
        # Don't reveal that the email doesn't exist (security)
        return jsonify({'message': 'If a user with that email exists, a password reset link has been sent.'}), 200
    
    # Generate reset token
    user.reset_token = user.generate_token()
    user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
    db.session.commit()
    
    # Generate reset URL
    reset_url = url_for('auth.reset_password', token=user.reset_token, _external=True)
    
    # Send reset email
    email_sent = email_service.send_password_reset_email(user, reset_url)
    
    if email_sent:
        return jsonify({'message': 'If a user with that email exists, a password reset link has been sent.'}), 200
    else:
        return jsonify({'error': 'Failed to send email'}), 500

@auth.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    data = request.json
    user = User.query.filter_by(reset_token=token).first()
    
    if not user or user.reset_token_expiry < datetime.utcnow():
        return jsonify({'error': 'Invalid or expired reset token'}), 400
    
    user.set_password(data['password'])
    user.reset_token = None
    user.reset_token_expiry = None
    db.session.commit()
    
    return jsonify({'message': 'Password reset successfully'}), 200

@auth.route('/user-profile', methods=['GET'])
def user_profile():
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email
    }), 200

@auth.route('/check-auth', methods=['GET'])
def check_auth():
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user:
            return jsonify({
                'authenticated': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            }), 200
    
    return jsonify({'authenticated': False}), 200