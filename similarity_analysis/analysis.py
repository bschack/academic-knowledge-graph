import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"

def summarize_text(text):
    print("Summarizing text... ", end="")

    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
    tokenizer = AutoTokenizer.from_pretrained("google-t5/t5-base")
    model = AutoModelForSeq2SeqLM.from_pretrained("google-t5/t5-base")
    input_text = "summarize conclusions: " + text
    input_ids = tokenizer(input_text, return_tensors="pt", max_length=512, truncation=True).input_ids

    outputs = model.generate(input_ids, max_length=150, min_length=20, length_penalty=2.0, num_beams=4, early_stopping=True)

    summary = tokenizer.decode(outputs[0], skip_special_tokens=True)

    formatted_summary = set()
    for r in summary.split("."):
        r = r.strip()
        if r:
            r = r[0].upper() + r[1:] if r else r 
            if not r.endswith('.'):
                r = r + '.'
            formatted_summary.add(r)
    print("Done.")
    return list(formatted_summary)
