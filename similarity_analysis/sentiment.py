from ctypes import Array
from scipy.special import softmax
import numpy as np
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import warnings
from transformers import logging

# Suppress specific warnings
logging.set_verbosity_error()

# Alternatively, suppress all warnings
warnings.filterwarnings("ignore")

def sentiment_difference(similarities):
    # print("Calculating sentiment... ", end="")
    # Load model directly

    tokenizer = AutoTokenizer.from_pretrained("cardiffnlp/twitter-roberta-base-sentiment-latest")
    model = AutoModelForSequenceClassification.from_pretrained("cardiffnlp/twitter-roberta-base-sentiment-latest")

    res = []

    for similarity in similarities:

        input1 = tokenizer(similarity['sentence1'], return_tensors="pt")
        input2 = tokenizer(similarity['sentence2'], return_tensors="pt")

        outputs1 = model(**input1)
        outputs2 = model(**input2)

        scores1 = outputs1[0][0].detach().numpy()
        scores1 = softmax(scores1)
        scores2 = outputs2[0][0].detach().numpy()
        scores2 = softmax(scores2)

        divergence = np.sum(np.abs(scores1 - scores2)) * similarity['similarity']
        # divergence = (0.4 * np.abs(scores1[0] - scores2[2]) + 0.2 * np.abs(scores1[2] - scores2[0]) + 0.4 * np.abs(scores1[1] - scores2[1])) # * triplet[2]

        # res.append([(scores1, triplet[0][1]), (scores2, triplet[1][1]), divergence])
        res.append({
            "sentence1": similarity['sentence1'],
            "sentiment1": scores1,
            "sentence2": similarity['sentence2'],
            "sentiment2": scores2,
            "divergence": divergence
        })

    # print("Done.")
    return res
