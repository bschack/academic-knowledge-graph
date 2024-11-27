from numpy import floating
import torch

def similarity(text1, text2):
    # print("Calculating similarity... ", end="")
    # Import our models. The package will take care of downloading the models automatically
    from scipy.spatial.distance import cosine
    from transformers import AutoModel, AutoTokenizer
    tokenizer = AutoTokenizer.from_pretrained("princeton-nlp/sup-simcse-bert-base-uncased")
    model = AutoModel.from_pretrained("princeton-nlp/sup-simcse-bert-base-uncased")

    text1 = [t.strip() for t in text1]
    text2 = [t.strip() for t in text2]

    # Tokenize input texts for both sets
    inputs_set_1 = tokenizer(text1, padding=True, truncation=True, return_tensors="pt")
    inputs_set_2 = tokenizer(text2, padding=True, truncation=True, return_tensors="pt")

    # Get the embeddings for both sets
    with torch.no_grad():
        embeddings_set_1 = model(**inputs_set_1, output_hidden_states=True, return_dict=True).pooler_output
        embeddings_set_2 = model(**inputs_set_2, output_hidden_states=True, return_dict=True).pooler_output

    # Define a threshold for conflict
    conflict_threshold = 0.5

    similarities: list[dict] = []

    # Calculate cosine similarities and identify conflicts
    for i, t1 in enumerate(text1):
        for j, t2 in enumerate(text2):
            if i < embeddings_set_1.size(0) and j < embeddings_set_2.size(0):
                cosine_sim = 1 - cosine(embeddings_set_1[i], embeddings_set_2[j])
                if cosine_sim >= conflict_threshold:
                    # similarities.append(((t1, i), (t2, j), cosine_sim))
                    similarities.append({
                        "sentence1": t1,
                        "index1": i,
                        "sentence2": t2,
                        "index2": j,
                        "similarity": cosine_sim
                    })

    # print("Done.")
    return similarities