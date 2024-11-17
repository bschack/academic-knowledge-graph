require('dotenv').config();
const { initializeStore, addPaperToStore, getPaperDetails, makeNewAuthor } = require('./lib/graph');
const HederaLogger = require('./lib/logging');

const GRAPH_FILE = 'research-graph.ttl';
const myAccountId = process.env.MY_ACCOUNT_ID;
const myPrivateKey = process.env.MY_PRIVATE_KEY;

// Initialize or load existing store
const store = initializeStore(GRAPH_FILE);

// const paper1 = addPaperToStore(store, {
//   title: "Basic Machine Learning Techniques",
//   authorIds: [1],
//   topics: ["Machine Learning", "Artificial Intelligence"],
//   publicationDate: "2022-03-21",
//   citations: []
// }, GRAPH_FILE);

// const paper2 = addPaperToStore(store, {
//   title: "Advanced Machine Learning Techniques",
//   authorIds: [1, 2],
//   topics: ["Machine Learning", "Artificial Intelligence"],
//   publicationDate: "2024-03-21",
//   citations: [1]
// }, GRAPH_FILE);

// Add papers to the persistent store
// addPaperToStore(store, paper1, GRAPH_FILE);
// addPaperToStore(store, paper2, GRAPH_FILE);

// Query papers
// const paper1Details = getPaperDetails(store, "1234");
// console.log(paper1Details);

// const author1 = {
//   firstName: "Ben",
//   lastName: "Schack",
//   institution: "Lehigh_University"
// };

// const author2 = {
//   firstName: "John",
//   lastName: "Doe",
//   institution: "Stanford"
// };

// const result1 = makeNewAuthor(store, author1, GRAPH_FILE);
// // Would get ID: 1

// const result2 = makeNewAuthor(store, author2, GRAPH_FILE);

const logger = new HederaLogger(myAccountId, myPrivateKey);

// Wrap the async operations in an async function
async function main() {
    // Store hash
    // const result = await logger.hashAndStoreGraph(GRAPH_FILE);
    // console.log('File ID:', result.fileId);

    // Verify later
    const verification = await logger.verifyLatestGraph(GRAPH_FILE);
    console.log('Graph is valid:', verification.isValid);
    console.log('Hash:', verification.storedHash);
    console.log('Current hash:', verification.currentHash);
}

// Call the async function
main().catch(console.error);