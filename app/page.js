'use client'

import { useState, useEffect } from 'react';
import { getTopicsFromStore, getPapersForTopic } from './lib/search';
import { verifyLatestGraph } from './lib/logging';
function App() {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [topics, setTopics] = useState([]);
  const [papers, setPapers] = useState([]);
  const [error, setError] = useState(null);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    async function fetchTopics() {
      try {
        const topicsData = await getTopicsFromStore();
        setTopics(topicsData);
      } catch (error) {
        console.error('Failed to fetch topics:', error);
        setError(error.message);
      }
    }

    fetchTopics();
  }, []);

  useEffect(() => {
    if (selectedTopic) {
      getPapersForTopic(selectedTopic.id).then(papers => {
        setPapers(papers);
      });
    }
  }, [selectedTopic]);

  useEffect(() => {
    verifyLatestGraph().then(result => {
      setIsVerified(result.isValid);
    });
  }, []);

  if (error) {
    return <div>Error loading topics: {error}</div>;
  }

  return (
    <main className="App">
      <h1>Topics</h1>
      {!isVerified ? <div>Graph is not verified</div> : <div>Graph is verified!</div>}
      <ul>
        {topics.map(topic => (
          <li key={topic.id} onClick={() => setSelectedTopic(topic)}>
            {topic.name}
          </li>
        ))}
      </ul>
      {selectedTopic && (
        <div>
          <h2>{selectedTopic.name}</h2>
          <ul>
            {papers.map(paper => (
              <li key={paper.id}>{paper.title}</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

export default App;
