const rdf = require("rdflib");
const fs = require("fs");

// Define namespaces - simplified to primarily use IAO and BFO
const RDF = rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
const bfo = rdf.Namespace("http://purl.obolibrary.org/obo/BFO_");
const iao = rdf.Namespace("http://purl.obolibrary.org/obo/IAO_");

/**
 * Creates or loads an RDF store from a Turtle file
 * @param {string} filePath - Path to the .ttl file
 * @returns {rdf.IndexedFormula} The loaded RDF store
 */
function initializeStore(filePath = "graph.ttl") {
    const store = rdf.graph();
    
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        try {
            rdf.parse(data, store, "http://example.org/", "text/turtle");
            console.log(`Store initialized with ${store.length} triples.`);
            
            // Enhanced debugging
            console.log('\nStore contents:');
            store.statements.forEach(statement => {
                console.log(`${statement.subject.value} -> ${statement.predicate.value} -> ${statement.object.value}`);
            });
            console.log('\n');
        } catch (error) {
            throw new Error(`Failed to parse TTL file: ${error.message}`);
        }
    }
    
    return store;
}

/**
 * Adds a paper to the store without manual inference
 */
function addPaperToStore(store, paperData, filePath) {
    const { 
        paperId, 
        title, 
        authorId, 
        publicationDate,
        sources = []
    } = paperData;
    
    const paper = rdf.sym(`http://example.org/ResearchPaper/${paperId}`);
    
    // Check if paper already exists
    const existingPaper = store.any(paper, RDF("type"), iao("0000013"));
    if (existingPaper) {
        return false;
    }
    
    // Create resources
    const titleLit = rdf.lit(title, "en");
    const author = rdf.sym(`http://example.org/Person/${authorId}`);
    
    // Add base triples
    store.add(paper, RDF("type"), iao("0000013")); // published paper
    store.add(paper, iao("0000235"), titleLit); // has title
    store.add(author, RDF("type"), iao("0000238")); // document author role
    store.add(paper, iao("0000142"), author); // has author

    if (publicationDate) {
        const dateLit = rdf.lit(publicationDate, rdf.sym('http://www.w3.org/2001/XMLSchema#date'));
        store.add(paper, iao("0000581"), dateLit); // has publication date
    }
    
    // Add citation relations
    sources.forEach(sourcePaperId => {
        const sourcePaper = rdf.sym(`http://example.org/ResearchPaper/${sourcePaperId}`);
        store.add(paper, iao("0000136"), sourcePaper); // cites
    });

    // Save to file
    const ttl = rdf.serialize(null, store, "http://example.org/", "text/turtle");
    fs.writeFileSync(filePath, ttl);
    
    return !existingPaper;
}

/**
 * Queries the store for papers by a specific author
 */
function getPapersByAuthor(store, authorId) {
    const author = rdf.sym(`http://example.org/Person/${authorId}`);
    const papers = store.statementsMatching(null, iao("0000142"), author);
    
    return papers.map(statement => ({
        paperId: statement.subject.value.split('/').pop(),
        title: store.anyValue(statement.subject, iao("0000235"))
    }));
}

/**
 * Get detailed paper information including citations
 */
function getPaperDetails(store, paperId) {
    const paper = rdf.sym(`http://example.org/ResearchPaper/${paperId}`);
    
    // Enhanced debugging
    console.log('Searching for paper:', paper.uri);
    const paperStatements = store.statementsMatching(paper);
    console.log('All statements for paper:', paperStatements.length);
    paperStatements.forEach(stmt => {
        console.log(`${stmt.predicate.value} -> ${stmt.object.value}`);
    });
    
    // Changed: Check if any statements exist for this paper
    if (paperStatements.length === 0) {
        throw new Error(`Paper ${paperId} not found`);
    }
    
    const title = store.anyValue(paper, iao("0000235"));
    const authorStatement = store.any(paper, iao("0000142"));
    const authorId = authorStatement && authorStatement.object ? 
        authorStatement.object.uri.split('/').pop() : null;
    
    const publicationDate = store.anyValue(paper, iao("0000581"));
    
    // Get papers this paper cites
    const sourceStatements = store.statementsMatching(paper, iao("0000136"));
    const sources = sourceStatements.map(statement => 
        statement.object.uri.split('/').pop()
    );
    
    // Get papers that cite this paper (now using the explicit isCitedBy relation)
    const citedByStatements = store.statementsMatching(paper, iao("0000219"));
    const citedBy = citedByStatements.map(statement => ({
        paperId: statement.subject.uri.split('/').pop(),
        title: store.anyValue(statement.subject, iao("0000235"))
    }));
    
    // Get papers by this author
    const authorPapers = authorId ? 
        store.statementsMatching(author, iao("0000142")).map(statement => ({
            paperId: statement.object.uri.split('/').pop(),
            title: store.anyValue(statement.object, iao("0000235"))
        })) : [];

    return {
        paperId,
        title,
        authorId,
        publicationDate,
        sources,
        citedBy,
        authorPapers
    };
}

module.exports = {
    initializeStore,
    addPaperToStore,
    getPapersByAuthor,
    getPaperDetails
};
