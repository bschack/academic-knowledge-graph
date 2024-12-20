'use server'
import { Namespace, graph, parse, sym, lit, serialize } from "rdflib";
import { existsSync, readFileSync, writeFileSync } from "fs";

// Define namespaces - simplified to primarily use IAO and BFO
const RDF = Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
const iao = Namespace("http://purl.obolibrary.org/obo/IAO_");
const local = Namespace("http://example.org/#");

/**
 * Creates or loads an RDF store from a Turtle file
 * @param {string} filePath - Path to the Turtle file
 * @param {boolean} debug - Whether to log debug information
 * @returns {IndexedFormula} The loaded RDF store
 */
export async function initializeStore(filePath = "graph.ttl", debug = false) {
    const store = graph();

    if (existsSync(filePath)) {
        const data = readFileSync(filePath, 'utf8');
        try {
            parse(data, store, "http://example.org/", "text/turtle");
            console.log(`Store initialized with ${store.length} triples.`);

            if (debug) {
                console.log('\nStore contents:');
                store.statements.forEach(statement => {
                    console.log(`${statement.subject.value} -> ${statement.predicate.value} -> ${statement.object.value}`);
                });
                console.log('\n');
            }
        } catch (error) {
            throw new Error(`Failed to parse TTL file: ${error.message}`);
        }
    } else {
        console.log('No file found');
    }

    return store;
}

/**
 * Gets the next available paper ID
 * @param {IndexedFormula} store - The RDF store
 * @returns {number} - Next available ID
 */
export async function getNextPaperId(store) {
    const papers = store.statementsMatching(null, RDF("type"), iao("0000013"));

    if (papers.length === 0) return 1;

    const ids = papers.map(stmt =>
        parseInt(stmt.subject.value.split('/').pop())
    );
    return Math.max(...ids) + 1;
}

/**
 * Adds a paper to the store
 * @param {IndexedFormula} store - The RDF store
 * @param {Object} paperData - Paper information
 * @param {string} paperData.title - Paper title
 * @param {string[]} paperData.authorUsernames - Array of author usernames
 * @param {string[]} paperData.topics - Array of research topics
 * @param {string} [paperData.publicationDate] - Publication date (YYYY-MM-DD)
 * @param {number[]} [paperData.citations] - Array of paper IDs this paper cites
 * @returns {Object} - Paper data including assigned ID
 */
export async function addPaperToStore(store, paperData) {
    const {
        title,
        authorUsernames,
        topics,
        publicationDate,
        citations = []
    } = paperData;

    // Validate required fields
    if (!title || !authorUsernames?.length || !topics?.length) {
        throw new Error('Title, at least one author, and at least one topic are required');
    }

    // Get next available paper ID (similar to author ID system)
    const paperId = await getNextPaperId(store);
    const paper = sym(`http://example.org/ResearchPaper/${paperId}`);

    // Add base paper information
    store.add(paper, RDF("type"), iao("0000013")); // research paper
    store.add(paper, iao("0000235"), lit(title.trim(), "en")); // has title

    // Add authors
    for (const username of authorUsernames) {
        const author = sym(`http://example.org/Person/${username}`);
        // Verify author exists
        const authorExists = store.statementsMatching(author, RDF("type"), iao("0000238")).length > 0;
        if (!authorExists) {
            throw new Error(`Author ${username} not found`);
        }
        store.add(paper, iao("0000142"), author); // has author
    }

    // Add research topics
    for (const topic of topics) {
        const cleanTopic = topic.trim().replace(/\s+/g, '_');
        const topicNode = sym(`http://example.org/Topic/${cleanTopic}`);
        store.add(paper, local("researchTopic"), topicNode);
        // Add topic to ontology if it doesn't exist
        if (!(store.statementsMatching(topicNode, RDF("type"), local("Topic")).length > 0)) {
            store.add(topicNode, RDF("type"), local("Topic"));
        }
    }

    // Add publication date if provided
    if (publicationDate) {
        const dateLit = lit(publicationDate, sym('http://www.w3.org/2001/XMLSchema#date'));
        store.add(paper, iao("0000581"), dateLit);
    }

    // Add citations
    for (const citedPaperId of citations) {
        const citedPaper = sym(`http://example.org/ResearchPaper/${citedPaperId}`);
        // Verify cited paper exists
        if (!store.statementsMatching(citedPaper, RDF("type"), iao("0000013")).length > 0) {
            throw new Error(`Cited paper ${citedPaperId} not found`);
        }
        store.add(paper, iao("0000136"), citedPaper);
    }

    // Save to file
    const ttl = serialize(null, store, "http://example.org/", "text/turtle");
    writeFileSync("graph.ttl", ttl);

    return {
        id: paperId,
        title,
        authorUsernames,
        topics,
        publicationDate,
        citations
    };
}

/**
 * Get detailed paper information
 * @param {IndexedFormula} store - The RDF store
 * @param {number} paperId - Paper ID to retrieve
 * @returns {Object} - Paper details
 */
export async function getPaperDetails(store, paperId) {
    const paper = sym(`http://example.org/ResearchPaper/${paperId}`);

    // Verify paper exists
    if (!store.any(paper, RDF("type"), iao("0000013"))) {
        throw new Error(`Paper ${paperId} not found`);
    }

    // Get basic information
    const title = store.anyValue(paper, iao("0000235"));
    const publicationDate = store.anyValue(paper, iao("0000581"));

    // Get authors
    const authorStatements = store.statementsMatching(paper, iao("0000142"));
    const authors = authorStatements.map(stmt => ({
        username: stmt.object.value.split('/').pop(),
        firstName: store.anyValue(stmt.object, iao("0000302")),
        lastName: store.anyValue(stmt.object, iao("0000303"))
    }));

    // Get topics
    const topicStatements = store.statementsMatching(paper, local("researchTopic"));
    const topics = topicStatements.map(stmt =>
        stmt.object.value.split('/').pop().replace(/_/g, ' ')
    );

    // Get citations
    const citationStatements = store.statementsMatching(paper, iao("0000136"));
    const citations = citationStatements.map(stmt =>
        parseInt(stmt.object.value.split('/').pop())
    );

    return {
        id: paperId,
        title,
        authors,
        topics,
        publicationDate,
        citations
    };
}

/**
 * Creates a new author in the store
 * @param {IndexedFormula} store - The RDF store
 * @param {Object} authorData - Author information
 * @param {string} authorData.username - Author's unique username
 * @param {string} authorData.firstName - Author's first name
 * @param {string} authorData.lastName - Author's last name
 * @param {string} authorData.institution - Author's institution
 * @returns {Object} - Author data
 */
export async function makeNewAuthor(store, authorData) {
    const { username, firstName, lastName, institution } = authorData;

    if (!username || !firstName || !lastName || !institution) {
        throw new Error('Username, first name, last name, and institution are required');
    }

    // Check if username already exists
    const existingAuthor = store.any(null, iao("0000304"), lit(username));
    if (existingAuthor) {
        throw new Error(`Username ${username} already exists`);
    }

    const author = sym(`http://example.org/Person/${username}`);

    // Add author information
    store.add(author, RDF("type"), iao("0000238")); // document author role
    store.add(author, iao("0000304"), lit(username)); // username
    store.add(author, iao("0000302"), lit(firstName, "en")); // first name
    store.add(author, iao("0000303"), lit(lastName, "en")); // last name

    const institutionNode = sym(`http://example.org/Institution/${institution}`);
    store.add(author, iao("0000303"), institutionNode);

    // Save to file
    const ttl = serialize(null, store, "http://example.org/", "text/turtle");
    writeFileSync("graph.ttl", ttl);

    console.log(`Added author ${username} to store`);
    return {
        username,
        firstName,
        lastName,
        institution
    };
}