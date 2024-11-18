'use server'
import { initializeStore } from './graph';
import { sym } from 'rdflib';

export async function getTopicsFromStore() {
  const store = await initializeStore('./research-graph.ttl');

  // Find all nodes that are of type Topic
  const topicStatements = store.statementsMatching(
    null,
    sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
    sym('http://example.org/#Topic')
  );

  // Extract and format topic names, returning only the data we need
  return topicStatements.map(statement => ({
    id: statement.subject.value.split('/').pop(),
    name: statement.subject.value.split('/').pop().replace(/_/g, ' ')
  }));
}

export async function getPapersForTopic(topicId) {
  const store = await initializeStore('./research-graph.ttl');

  const topic = sym(`http://example.org/Topic/${topicId}`);

  // Find papers that have this topic
  const paperStatements = store.statementsMatching(
    null,
    sym('http://example.org/#researchTopic'),
    topic
  );

  // Extract and format paper information
  return paperStatements.map(statement => {
    const paper = statement.subject;
    return {
      id: paper.value.split('/').pop(),
      title: store.anyValue(paper, sym('http://purl.obolibrary.org/obo/IAO_0000235')),
      publicationDate: store.anyValue(paper, sym('http://purl.obolibrary.org/obo/IAO_0000581'))
    };
  });
}