'use server'
import { sym } from 'rdflib';

// Convert class methods to standalone async functions
export async function findTopicExperts(store, topicName) {
    const topic = sym(`http://example.org/Topic/${topicName}`);
    const expertsMap = new Map();

    // Find papers with this topic
    const papers = store.statementsMatching(
        null,
        sym('http://example.org/#researchTopic'),
        topic
    );

    // For each paper, get its authors
    papers.forEach(paperStmt => {
        const paper = paperStmt.subject;
        const authorStmts = store.statementsMatching(
            paper,
            sym('http://purl.obolibrary.org/obo/IAO_0000142'),
            null
        );

        authorStmts.forEach(authorStmt => {
            const author = authorStmt.object;
            const username = store.anyValue(author, sym('http://purl.obolibrary.org/obo/IAO_0000304'));

            if (!expertsMap.has(username)) {
                expertsMap.set(username, {
                    username,
                    firstName: store.anyValue(author, sym('http://purl.obolibrary.org/obo/IAO_0000302')),
                    lastName: store.anyValue(author, sym('http://purl.obolibrary.org/obo/IAO_0000303'))
                });
            }
        });
    });

    return Array.from(expertsMap.values());
}

export async function findPaperCitations(store, paperSlug) {
    const paper = sym(`http://example.org/ResearchPaper/${paperSlug}`);
    const citingPapers = new Set();

    const citations = store.statementsMatching(
        null,
        sym('http://purl.obolibrary.org/obo/IAO_0000136'),
        paper
    );

    citations.forEach(citation => {
        const citingPaper = citation.subject;
        citingPapers.add({
            slug: citingPaper.value.split('/').pop(),
            title: store.anyValue(citingPaper, sym('http://purl.obolibrary.org/obo/IAO_0000235'))
        });
    });

    return Array.from(citingPapers);
}

export async function findRelatedPapers(store, paperSlug) {
    const paper = sym(`http://example.org/ResearchPaper/${paperSlug}`);
    const relatedPapers = new Set();

    const topicStmts = store.statementsMatching(
        paper,
        sym('http://example.org/#researchTopic'),
        null
    );

    topicStmts.forEach(topicStmt => {
        const topic = topicStmt.object;
        const papers = store.statementsMatching(
            null,
            sym('http://example.org/#researchTopic'),
            topic
        );

        papers.forEach(paperStmt => {
            const relatedPaper = paperStmt.subject;
            if (relatedPaper.value !== paper.value) {
                relatedPapers.add({
                    slug: relatedPaper.value.split('/').pop(),
                    title: store.anyValue(relatedPaper, sym('http://purl.obolibrary.org/obo/IAO_0000235'))
                });
            }
        });
    });

    return Array.from(relatedPapers);
}

export async function getAllTopics(store) {
    const topics = new Map();

    const topicStmts = store.statementsMatching(
        null,
        sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        sym('http://example.org/#Topic')
    );

    topicStmts.forEach(stmt => {
        const topicUri = stmt.subject;
        const name = topicUri.value.split('/').pop().replace(/_/g, ' ');

        const paperCount = store.statementsMatching(
            null,
            sym('http://example.org/#researchTopic'),
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

export async function getAllAuthors(store) {
    const authors = new Map();

    const authorStmts = store.statementsMatching(
        null,
        sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        sym('http://purl.obolibrary.org/obo/IAO_0000238')
    );

    authorStmts.forEach(stmt => {
        const author = stmt.subject;
        const username = store.anyValue(author, sym('http://purl.obolibrary.org/obo/IAO_0000304'));

        if (!authors.has(username)) {
            const paperCount = store.statementsMatching(
                null,
                sym('http://purl.obolibrary.org/obo/IAO_0000142'),
                author
            ).length;

            authors.set(username, {
                username,
                firstName: store.anyValue(author, sym('http://purl.obolibrary.org/obo/IAO_0000302')),
                lastName: store.anyValue(author, sym('http://purl.obolibrary.org/obo/IAO_0000303')),
                paperCount
            });
        }
    });

    return Array.from(authors.values());
}

export async function getAllPapers(store, options = { sortBy: 'date', descending: true }) {
    const papers = new Map();

    const paperStmts = store.statementsMatching(
        null,
        sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        sym('http://purl.obolibrary.org/obo/IAO_0000013')
    );

    paperStmts.forEach(stmt => {
        const paper = stmt.subject;
        const slug = paper.value.split('/').pop();

        if (!papers.has(slug)) {
            // Get paper details
            const title = store.anyValue(paper, sym('http://purl.obolibrary.org/obo/IAO_0000235'));
            const date = store.anyValue(paper, sym('http://purl.obolibrary.org/obo/IAO_0000581'));

            // Get authors
            const authorStmts = store.statementsMatching(
                paper,
                sym('http://purl.obolibrary.org/obo/IAO_0000142'),
                null
            );

            const authors = authorStmts.map(authorStmt => ({
                username: store.anyValue(authorStmt.object, sym('http://purl.obolibrary.org/obo/IAO_0000304')),
                firstName: store.anyValue(authorStmt.object, sym('http://purl.obolibrary.org/obo/IAO_0000302')),
                lastName: store.anyValue(authorStmt.object, sym('http://purl.obolibrary.org/obo/IAO_0000303'))
            }));

            // Get topics
            const topicStmts = store.statementsMatching(
                paper,
                sym('http://example.org/#researchTopic'),
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
