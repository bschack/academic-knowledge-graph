const { initializeStore, addPaperToStore, getPaperDetails } = require('./lib/graph');

const GRAPH_FILE = 'research-graph.ttl';

// Initialize or load existing store
const store = initializeStore(GRAPH_FILE);

// Add papers to the store
const paper1 = {
    paperId: "1234",
    title: "Original Research",
    authorId: "JohnDoe",
    publicationDate: "2020-01-01"
};

const paper2 = {
    paperId: "5678",
    title: "Follow-up Research",
    authorId: "JaneSmith",
    publicationDate: "2024-03-20",
    sources: ["1234"]
};

// Add papers to the persistent store
addPaperToStore(store, paper1, GRAPH_FILE);
addPaperToStore(store, paper2, GRAPH_FILE);

// Query papers
const paper1Details = getPaperDetails(store, "1234");
console.log(paper1Details);