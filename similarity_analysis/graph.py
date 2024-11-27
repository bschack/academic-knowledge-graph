from rdflib import BNode, Graph, Namespace, URIRef, Literal, OWL, RDFS
from rdflib.namespace import RDF, XSD
from owlrl import DeductiveClosure, OWLRL_Semantics

from similarity import similarity
from sentiment import sentiment_difference

PCO = Namespace("http://example.org/paper_conflict_ontology#")
TOPIC_URI = "http://example.org/topic/"
PAPER_URI = "http://example.org/paper/"
CONFLICT_URI = "http://example.org/conflict/"

def apply_rules(graph):
    graph.add((PCO.hasConflictWith, RDF.type, OWL.ObjectProperty))
    graph.add((PCO.hasConflictWith, RDFS.domain, PCO.Paper))
    graph.add((PCO.hasConflictWith, RDFS.range, PCO.Paper))
    graph.add((PCO.hasConflictWith, RDF.type, OWL.SymmetricProperty))
    
    print("\nSaving updated ontology...")
    save_graph(graph, "paper_conflict_ontology.ttl")
    
    print("\nInferred relationships (via reasoner):")
    for s, p, o in graph.triples((None, PCO.hasConflictWith, None)):
        print(f"{s} {p} {o}")

# Helper function to create safe names
def safe_name(name):
    return name.replace(" ", "_").lower()

# Function to add a topic
def add_topic(graph, name):
    topic_uri = URIRef(f"{TOPIC_URI}{safe_name(name)}")
    graph.add((topic_uri, RDF.type, PCO.Topic))
    graph.add((topic_uri, PCO.has_name, Literal(name, datatype=XSD.string)))

# Function to get all existing topics
def get_all_topics(graph):
    topics = []
    for topic_uri in graph.subjects(RDF.type, PCO.Topic):
        topics.append(str(topic_uri))
    return topics

# Get all papers with a given topic
def get_all_papers_with_topic(graph, topic):
    topic_uri = URIRef(f"{TOPIC_URI}{safe_name(topic)}")
    papers = graph.subjects(PCO.has_topic, topic_uri)
    
    paper_details = []
    for paper in papers:
        details = {
            "uri": str(paper),
            "name": str(graph.value(paper, PCO.has_name, None)),
            "conclusion": str(graph.value(paper, PCO.has_conclusion, None)),
            "topics": [str(topic) for topic in graph.objects(paper, PCO.has_topic)]
        }
        paper_details.append(details)
    
    return paper_details

# Function to add a conflict
def add_conflict(graph, sentence1, sentence2, distance_score, conflict_score, paper1_id, paper2_id):
    conflict_id = f"{paper1_id}-{paper2_id}-{conflict_score}"
    conflict_uri = URIRef(f"{CONFLICT_URI}{conflict_id}")
    paper1_uri = URIRef(f"{PAPER_URI}{paper1_id}")
    paper2_uri = URIRef(f"{PAPER_URI}{paper2_id}")
    
    graph.add((conflict_uri, RDF.type, PCO.Conflict))
    graph.add((conflict_uri, PCO.has_conflicting_sentence_1, Literal(sentence1, datatype=XSD.string)))
    graph.add((conflict_uri, PCO.has_conflicting_sentence_2, Literal(sentence2, datatype=XSD.string)))
    graph.add((conflict_uri, PCO.has_distance_score, Literal(distance_score, datatype=XSD.float)))
    graph.add((conflict_uri, PCO.has_conflict_score, Literal(conflict_score, datatype=XSD.float)))
    graph.add((conflict_uri, PCO.related_to_paper_1, paper1_uri))
    graph.add((conflict_uri, PCO.related_to_paper_2, paper2_uri))

# Find conflics between two papers
def find_conflicts_between_papers(graph, paper_name, topic, conclusion, callback):
    paper_id = safe_name(paper_name)
    related_papers = get_all_papers_with_topic(graph, topic)
    base_conclusion = [s + '.' for s in conclusion.strip().split('.')]
    conflicts = []
    print(f"\r{topic} - 0%", end="")
    for iteration, paper in enumerate(related_papers):
        searched_conclusion = [s + '.' for s in paper['conclusion'].strip().split('.')]
        similarities = similarity(base_conclusion, searched_conclusion)
        sentiments = sentiment_difference(similarities)
        for i, s in enumerate(sentiments):
            if s['divergence'] > 1:
                conflicts.append({
                    "sentence1": s['sentence1'],
                    "sentence2": s['sentence2'],
                    "similarity": float(similarities[i]['similarity']),
                    "divergence": float(s['divergence']),
                    "paper1": paper_id,
                    "paper2": safe_name(paper['name'])
                })
                add_conflict(graph, s['sentence1'], s['sentence2'], similarities[i]['similarity'], s['divergence'], paper_id, safe_name(paper['name']))
        callback(conflicts, topic, round((iteration+1)/len(related_papers)*100))
        print(f"\r{topic} - {round((iteration+1)/len(related_papers)*100)}%", end="")
    print(f"\r{topic} - 100%")
    if len(conflicts) == 0:
        print(f"No conflict found between {paper_name} and other papers in {topic}")
    else:
        print(f"Found {len(conflicts)} conflicts between {paper_name} and other papers in {topic}")
    return conflicts

# Function to add a paper
def add_paper(graph, name, topics, conclusion):
    paper_uri = URIRef(f"{PAPER_URI}{safe_name(name)}")
    graph.add((paper_uri, RDF.type, PCO.Paper))
    graph.add((paper_uri, PCO.has_name, Literal(name, datatype=XSD.string)))
    graph.add((paper_uri, PCO.has_conclusion, Literal(conclusion, datatype=XSD.string)))
    existing_topics = get_all_topics(graph)
    for topic in topics:
        if safe_name(topic) not in existing_topics:
            add_topic(graph, topic)
        topic_uri = URIRef(f"{TOPIC_URI}{safe_name(topic)}")
        graph.add((paper_uri, PCO.has_topic, topic_uri))
        graph.add((topic_uri, RDF.type, PCO.Topic))
        graph.add((topic_uri, PCO.has_name, Literal(topic, datatype=XSD.string)))

# Function to iterate through all topics and find conflicts
def generate_conflicts(graph, name, topics, conclusion, callback):
    for topic in topics:
        find_conflicts_between_papers(graph, name, topic, conclusion, callback)

# Function to save the graph to a file
def save_graph(graph, filename):
    graph.serialize(destination=filename, format='turtle')

# Function to load the graph from a file
def load_graph(filename):
    graph = Graph()
    graph.parse(filename, format='turtle')
    return graph
