# backend/conversation_routes.py
from flask import Blueprint, request, jsonify, session
from models import db, Conversation, Answer, User
from app import client, merged_vectorstores, default_vs, nace_vs, load_chain, sector_db_map
import re

conversations = Blueprint('conversations', __name__)

@conversations.route('/conversations', methods=['GET'])
def get_conversations():
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    
    user_conversations = Conversation.query.filter_by(user_id=user_id).order_by(Conversation.updated_at.desc()).all()
    
    result = []
    for conv in user_conversations:
        result.append({
            'id': conv.id,
            'title': conv.title,
            'nace_sector': conv.nace_sector,
            'esrs_sector': conv.esrs_sector,
            'created_at': conv.created_at.isoformat(),
            'updated_at': conv.updated_at.isoformat()
        })
    
    return jsonify(result), 200

@conversations.route('/conversations/<int:conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    
    conversation = Conversation.query.filter_by(id=conversation_id, user_id=user_id).first()
    
    if not conversation:
        return jsonify({'error': 'Conversation not found'}), 404
    
    # Get all answers for this conversation
    answers = Answer.query.filter_by(conversation_id=conversation_id).order_by(Answer.created_at).all()
    
    messages = []
    for answer in answers:
        messages.append({
            'id': answer.id,
            'question': answer.question,
            'answer': answer.answer,
            'created_at': answer.created_at.isoformat()
        })
    
    return jsonify({
        'id': conversation.id,
        'title': conversation.title,
        'nace_sector': conversation.nace_sector,
        'esrs_sector': conversation.esrs_sector,
        'company_description': conversation.company_description,
        'created_at': conversation.created_at.isoformat(),
        'updated_at': conversation.updated_at.isoformat(),
        'messages': messages
    }), 200

@conversations.route('/conversations', methods=['POST'])
def create_conversation():
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    
    data = request.json
    company_desc = data.get('company_description', '')
    
    if not company_desc:
        return jsonify({'error': 'Company description is required'}), 400
    
    # Process company description to get NACE and ESRS sectors
    result = process_company_description(company_desc)
    
    # Use the AI model to generate a title for the conversation
    title = generate_conversation_title(company_desc)
    
    # Create a new conversation
    conversation = Conversation(
        user_id=user_id,
        nace_sector=result['nace_sector'],
        esrs_sector=result['esrs_sector'],
        company_description=company_desc,
        title=title
    )
    
    db.session.add(conversation)
    db.session.commit()
    
    return jsonify({
        'id': conversation.id,
        'title': conversation.title,
        'nace_sector': result['nace_sector'],
        'esrs_sector': result['esrs_sector'],
        'created_at': conversation.created_at.isoformat(),
        'updated_at': conversation.updated_at.isoformat()
    }), 201

@conversations.route('/conversations/<int:conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    
    conversation = Conversation.query.filter_by(id=conversation_id, user_id=user_id).first()
    
    if not conversation:
        return jsonify({'error': 'Conversation not found'}), 404
    
    db.session.delete(conversation)
    db.session.commit()
    
    return jsonify({'message': 'Conversation deleted successfully'}), 200

@conversations.route('/conversations/<int:conversation_id>/messages', methods=['POST'])
def add_message(conversation_id):
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    
    conversation = Conversation.query.filter_by(id=conversation_id, user_id=user_id).first()
    
    if not conversation:
        return jsonify({'error': 'Conversation not found'}), 404
    
    data = request.json
    question = data.get('question', '')
    
    if not question:
        return jsonify({'error': 'Question is required'}), 400
    
    # Get previous messages for context
    previous_answers = Answer.query.filter_by(conversation_id=conversation_id).order_by(Answer.created_at).all()
    conversation_history = []
    
    for ans in previous_answers:
        conversation_history.append(f"Q: {ans.question}")
        conversation_history.append(f"A: {ans.answer}")
    
    # Process question to get response
    qa_vs = default_vs
    
    if conversation.esrs_sector in sector_db_map:
        merged_data = merged_vectorstores.get(conversation.esrs_sector)
        
        if merged_data:
            qa_vs = merged_data['vectorstore']
    
    # Get relevant documents for the question
    from app import reranker
    retrieved_docs = qa_vs.similarity_search(question, k=10)
    
    ranked_docs = sorted(
        retrieved_docs,
        key=lambda doc: reranker.predict([(question, doc.page_content)]),
        reverse=True
    )[:5]
    
    context = "\n".join([doc.page_content for doc in ranked_docs])
    
    # Create the prompt for the model
    contextual_query = f"""
    Instructions:
    - Follow the ESRS standards.
    - Use the context provided for reference.
    - No need to include summary tables
    - Answer must be complete and accurate
    - Give brief and concise answers
    - Prioritize information quality over aesthetics
    - Don't show tables, only plain text
    - Don't say what was provided in context
    - Give answer in markdown format
    - Don't include numeric lists, only bullet points
    Question: {question}
    Context:
    {context}
    Take into account the previous conversation:
    {conversation_history}
    """
    
    answer_text = client.chat.completions.create(
        model="nvidia/llama-3.3-nemotron-super-49b-v1",
        messages=[{"role": "system", "content": "Be brief."
        "Only return the most COMPLETE and accurate answer. "
        "Avoid explanations, introductions, and additional context. "
        "No need to introduce a summary at the end. "},
                  {"role": "user", "content": contextual_query}],
        temperature=0,
        top_p=0.1,
        max_tokens=112000,
        frequency_penalty=0.1,
        presence_penalty=0,
        stream=False
    ).choices[0].message.content.strip()
    
    # Save the question and answer
    answer = Answer(
        conversation_id=conversation_id,
        question=question,
        answer=answer_text
    )
    
    db.session.add(answer)
    
    # Update the conversation's updated_at timestamp
    conversation.updated_at = db.func.current_timestamp()
    
    db.session.commit()
    
    return jsonify({
        'id': answer.id,
        'question': answer.question,
        'answer': answer.answer,
        'created_at': answer.created_at.isoformat()
    }), 201

def process_company_description(company_desc):
    # Import necessary functions from app.py
    from app import nace_vs, reranker, get_llm_response, special_sectors
    
    retrieved_docs = nace_vs.similarity_search(company_desc, k=3)
    
    ranked_docs = sorted(
        retrieved_docs,
        key=lambda doc: reranker.predict([(company_desc, doc.page_content)]),
        reverse=True
    )[:3]
    
    context = "\n".join([doc.page_content for doc in ranked_docs])
    
    contextual_query = f"""
    You are a NACE classification assistant.
    Your job is to identify and return the exact NACE code.

    Instructions:
    - Analyze the company description.
    - Use the context provided for reference.
    - Respond with ONLY the NACE code (e.g., 'A01.1' or 'B05').
    - Don't forget to include the letter

    Company description:
    {company_desc}

    Context:
    {context}
    """
    
    nace_result = get_llm_response(contextual_query)
    
    nace_result = re.sub(r'(\b[a-u]\b)', lambda m: m.group(1).upper(), nace_result)
    nace_result = re.sub(r'\.\s+', '.', nace_result)
    
    match = re.search(r'([A-U](\d{1,2})(\.\d{1,2}){0,2})', nace_result)
    
    if match:
        nace_sector = match.group(1)
        esrs_sector = special_sectors.get(nace_sector, "Agnostic")
    else:
        nace_sector = "Agnostic"
        esrs_sector = "Agnostic"
    
    return {
        'nace_sector': nace_sector,
        'esrs_sector': esrs_sector
    }

def generate_conversation_title(company_desc):
    # Generate a title for the conversation using the model
    title_prompt = f"""
    Generate a short, concise title (maximum 6 words) for a conversation about ESRS reporting for the following company description:
    
    "{company_desc}"
    
    The title should be descriptive of the company's sector or main activity. Return only the title without quotes or additional text.
    """
    
    title = client.chat.completions.create(
        model="nvidia/llama-3.3-nemotron-super-49b-v1",
        messages=[{"role": "system", "content": "Generate a concise title."},
                  {"role": "user", "content": title_prompt}],
        temperature=0.7,
        max_tokens=20,
        stream=False
    ).choices[0].message.content.strip()
    
    # Remove any quotes that might be in the response
    title = title.replace('"', '').replace("'", "")
    
    # Truncate if too long
    if len(title) > 50:
        title = title[:47] + "..."
    
    return title