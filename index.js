require('dotenv').config();
import { initializeStore, addPaperToStore, getPaperDetails, makeNewAuthor } from './src/lib/graph.js';
import HederaLogger from './src/lib/logging.js';
import GraphReasoner from './src/lib/reasoner.js';

const GRAPH_FILE = 'research-graph.ttl';
const myAccountId = process.env.MY_ACCOUNT_ID;
const myPrivateKey = process.env.MY_PRIVATE_KEY;

// // Initialize or load existing store
// const store = initializeStore(GRAPH_FILE);
// const reasoner = new GraphReasoner(store);

// // Find experts in Machine Learning
// const experts = reasoner.findTopicExperts('Machine_Learning');
// console.log('Machine Learning experts:', experts);

// // Find papers citing "Basic Machine Learning Techniques"
// const citations = reasoner.findPaperCitations('basic-machine-learning-techniques');
// console.log('Papers citing Basic ML:', citations);

// // Find papers related to "Advanced Machine Learning Techniques"
// const related = reasoner.findRelatedPapers('advanced-machine-learning-techniques');
// console.log('Related papers:', related);

function getTopics() {
    try {
        // Get topics container
        const topicList = document.querySelector('#topic-list ul');
        if (!topicList) {
            throw new Error('Topic list container not found');
        }

        // Initialize store and reasoner
        const store = initializeStore(GRAPH_FILE);
        const reasoner = new GraphReasoner(store);

        // Get all topics
        const topics = reasoner.getAllTopics();

        // Create and append topic elements
        topics.forEach(topic => {
            const li = document.createElement('li');
            li.innerHTML = `
                <h3>${topic.name}</h3>
                <p>Papers: ${topic.paperCount}</p>
            `;
            topicList.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading topics:', error);
        // Optionally display error to user
        const topicList = document.querySelector('#topic-list ul');
        if (topicList) {
            topicList.innerHTML = '<li class="error">Error loading topics</li>';
        }
    }
}

// const paper1 = addPaperToStore(store, {
//   title: "Basic Machine Learning Techniques",
//   authorUsernames: ["bschack"],
//   topics: ["Machine Learning"],
//   publicationDate: "2022-03-21",
//   citations: []
// }, GRAPH_FILE);

// const paper2 = addPaperToStore(store, {
//   title: "Advanced Machine Learning Techniques",
//   authorUsernames: ["bschack", "jdoe"],
//   topics: ["Machine Learning", "Artificial Intelligence"],
//   publicationDate: "2024-03-21",
//   citations: ["Basic Machine Learning Techniques"]
// }, GRAPH_FILE);

// Query papers
// const paper1Details = getPaperDetails(store, "1234");
// console.log(paper1Details);

// const author1 = {
//   username: "bschack",
//   firstName: "Ben",
//   lastName: "Schack",
//   institution: "Lehigh_University"
// };

// const author2 = {
//   username: "jdoe",
//   firstName: "John",
//   lastName: "Doe",
//   institution: "Stanford"
// };

// const result1 = makeNewAuthor(store, author1, GRAPH_FILE);
// // Would get ID: 1

// const result2 = makeNewAuthor(store, author2, GRAPH_FILE);

// const logger = new HederaLogger(myAccountId, myPrivateKey);

// // Wrap the async operations in an async function
// async function main() {
//     // Store hash
//     // const result = await logger.hashAndStoreGraph(GRAPH_FILE);
//     // console.log('File ID:', result.fileId);

//     // Verify later
//     const verification = await logger.verifyLatestGraph(GRAPH_FILE);
//     console.log('Graph is valid:', verification.isValid);
//     console.log('Hash:', verification.storedHash);
//     console.log('Current hash:', verification.currentHash);
// }

// Call the async function
// main().catch(console.error);