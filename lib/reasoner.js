import rdf from 'rdflib';

export default class GraphReasoner {
    constructor(store) {
        this.store = store;
    }

    /**
     * Find all experts for a given topic using property chain reasoning
     * (:hasExpert = inverse(:researchTopic) ∘ inverse(:hasAuthor))
     */
    findTopicExperts(topicName) {
        const topic = rdf.sym(`http://example.org/Topic/${topicName}`);
        const expertsMap = new Map();

        // Find papers with this topic
        const papers = this.store.statementsMatching(
            null,
            rdf.sym('http://example.org/#researchTopic'),
            topic
        );

        // For each paper, get its authors
        papers.forEach(paperStmt => {
            const paper = paperStmt.subject;
            const authorStmts = this.store.statementsMatching(
                paper,
                rdf.sym('http://purl.obolibrary.org/obo/IAO_0000142'),
                null
            );
            
            authorStmts.forEach(authorStmt => {
                const author = authorStmt.object;
                const username = this.store.anyValue(author, rdf.sym('http://purl.obolibrary.org/obo/IAO_0000304'));
                
                if (!expertsMap.has(username)) {
                    expertsMap.set(username, {
                        username,
                        firstName: this.store.anyValue(author, rdf.sym('http://purl.obolibrary.org/obo/IAO_0000302')),
                        lastName: this.store.anyValue(author, rdf.sym('http://purl.obolibrary.org/obo/IAO_0000303'))
                    });
                }
            });
        });

        return Array.from(expertsMap.values());
    }

    /**
     * Find all papers that cite this paper (inverse citations)
     */
    findPaperCitations(paperSlug) {
        const paper = rdf.sym(`http://example.org/ResearchPaper/${paperSlug}`);
        const citingPapers = new Set();

        const citations = this.store.statementsMatching(
            null,
            rdf.sym('http://purl.obolibrary.org/obo/IAO_0000136'),
            paper
        );

        citations.forEach(citation => {
            const citingPaper = citation.subject;
            citingPapers.add({
                slug: citingPaper.value.split('/').pop(),
                title: this.store.anyValue(citingPaper, rdf.sym('http://purl.obolibrary.org/obo/IAO_0000235'))
            });
        });

        return Array.from(citingPapers);
    }

    /**
     * Find all papers on related topics (shares at least one topic)
     */
    findRelatedPapers(paperSlug) {
        const paper = rdf.sym(`http://example.org/ResearchPaper/${paperSlug}`);
        const relatedPapers = new Set();

        // Get paper's topics
        const topicStmts = this.store.statementsMatching(
            paper,
            rdf.sym('http://example.org/#researchTopic'),
            null
        );

        // For each topic, find other papers
        topicStmts.forEach(topicStmt => {
            const topic = topicStmt.object;
            const papers = this.store.statementsMatching(
                null,
                rdf.sym('http://example.org/#researchTopic'),
                topic
            );

            papers.forEach(paperStmt => {
                const relatedPaper = paperStmt.subject;
                if (relatedPaper.value !== paper.value) {
                    relatedPapers.add({
                        slug: relatedPaper.value.split('/').pop(),
                        title: this.store.anyValue(relatedPaper, rdf.sym('http://purl.obolibrary.org/obo/IAO_0000235'))
                    });
                }
            });
        });

        return Array.from(relatedPapers);
    }

    /**
     * Get all topics in the graph
     * @returns {Array<Object>} Array of topic objects with name and expert count
     */
    getAllTopics() {
        const topics = new Map();
        
        const topicStmts = this.store.statementsMatching(
            null,
            rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
            rdf.sym('http://example.org/#Topic')
        );

        topicStmts.forEach(stmt => {
            const topicUri = stmt.subject;
            const name = topicUri.value.split('/').pop().replace(/_/g, ' ');
            
            // Count papers for this topic
            const paperCount = this.store.statementsMatching(
                null,
                rdf.sym('http://example.org/#researchTopic'),
                topicUri
            ).length;

            topics.set(name, {
                name,
                paperCount,
                slug: name.replace(/\s+/g, '_')
            });
        });

        return Array.from(topics.values());
    }

    /**
     * Get all authors in the graph
     * @returns {Array<Object>} Array of author objects
     */
    getAllAuthors() {
        const authors = new Map();
        
        const authorStmts = this.store.statementsMatching(
            null,
            rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
            rdf.sym('http://purl.obolibrary.org/obo/IAO_0000238')
        );

        authorStmts.forEach(stmt => {
            const author = stmt.subject;
            const username = this.store.anyValue(author, rdf.sym('http://purl.obolibrary.org/obo/IAO_0000304'));
            
            if (!authors.has(username)) {
                // Count papers by this author
                const paperCount = this.store.statementsMatching(
                    null,
                    rdf.sym('http://purl.obolibrary.org/obo/IAO_0000142'),
                    author
                ).length;

                authors.set(username, {
                    username,
                    firstName: this.store.anyValue(author, rdf.sym('http://purl.obolibrary.org/obo/IAO_0000302')),
                    lastName: this.store.anyValue(author, rdf.sym('http://purl.obolibrary.org/obo/IAO_0000303')),
                    paperCount
                });
            }
        });

        return Array.from(authors.values());
    }

    /**
     * Get all papers in the graph
     * @param {Object} options Optional filtering and sorting options
     * @param {string} options.sortBy Sort by 'date' or 'title' (default: 'date')
     * @param {boolean} options.descending Sort in descending order (default: true)
     * @returns {Array<Object>} Array of paper objects
     */
    getAllPapers(options = { sortBy: 'date', descending: true }) {
        const papers = new Map();
        
        const paperStmts = this.store.statementsMatching(
            null,
            rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
            rdf.sym('http://purl.obolibrary.org/obo/IAO_0000013')
        );

        paperStmts.forEach(stmt => {
            const paper = stmt.subject;
            const slug = paper.value.split('/').pop();
            
            if (!papers.has(slug)) {
                // Get paper details
                const title = this.store.anyValue(paper, rdf.sym('http://purl.obolibrary.org/obo/IAO_0000235'));
                const date = this.store.anyValue(paper, rdf.sym('http://purl.obolibrary.org/obo/IAO_0000581'));
                
                // Get authors
                const authorStmts = this.store.statementsMatching(
                    paper,
                    rdf.sym('http://purl.obolibrary.org/obo/IAO_0000142'),
                    null
                );
                
                const authors = authorStmts.map(authorStmt => ({
                    username: this.store.anyValue(authorStmt.object, rdf.sym('http://purl.obolibrary.org/obo/IAO_0000304')),
                    firstName: this.store.anyValue(authorStmt.object, rdf.sym('http://purl.obolibrary.org/obo/IAO_0000302')),
                    lastName: this.store.anyValue(authorStmt.object, rdf.sym('http://purl.obolibrary.org/obo/IAO_0000303'))
                }));

                // Get topics
                const topicStmts = this.store.statementsMatching(
                    paper,
                    rdf.sym('http://example.org/#researchTopic'),
                    null
                );
                
                const topics = topicStmts.map(topicStmt => 
                    topicStmt.object.value.split('/').pop().replace(/_/g, ' ')
                );

                papers.set(slug, {
                    slug,
                    title,
                    date,
                    authors,
                    topics
                });
            }
        });

        let results = Array.from(papers.values());

        // Sort results
        results.sort((a, b) => {
            if (options.sortBy === 'date') {
                return options.descending 
                    ? new Date(b.date) - new Date(a.date)
                    : new Date(a.date) - new Date(b.date);
            } else if (options.sortBy === 'title') {
                return options.descending
                    ? b.title.localeCompare(a.title)
                    : a.title.localeCompare(b.title);
            }
            return 0;
        });

        return results;
    }
}

module.exports = GraphReasoner;
