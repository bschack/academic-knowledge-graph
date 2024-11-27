from flask import Flask
from flask_socketio import SocketIO, emit
from graph import load_graph, add_paper, save_graph, generate_conflicts
import hashlib

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

@socketio.on('connect')
def handle_connect():
    print("Client connected!")
    emit('connection_response', {'status': 'connected'})

@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected!")

@socketio.on_error()
def error_handler(e):
    print(f"Error: {str(e)}")
    emit('error', {'error': str(e)})

@socketio.on('add_paper')
def handle_add_paper(data):
    print(data)

    def emit_conflict_progress(conflicts, topic: str, progress: int):
        emit('conflict', {
            "conflicts": conflicts,
            "topic": topic,
            "progress": progress
        })

    try:
        g = load_graph("paper_conflict_ontology.ttl")
        
        add_paper(g, data["title"], data["topics"], data["text"])
        
        save_graph(g, "paper_conflict_ontology.ttl")
        emit('paper_added', {
            "status": "success"
        })

        generate_conflicts(g, data["title"], data["topics"], data["text"], emit_conflict_progress)
        save_graph(g, "paper_conflict_ontology.ttl")

        graph_str = g.serialize(format='turtle').encode('utf-8')
        graph_hash = hashlib.sha256(graph_str).hexdigest()
        
        emit('graph_hash', {
            "graph_hash": graph_hash
        })
        
    except Exception as e:
        emit('error', {
            "status": "error",
            "message": str(e)
        })

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)
