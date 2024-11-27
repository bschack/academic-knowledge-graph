import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Function to summarize text
def summarize_text(text):
    print("Summarizing text... ", end="")
    # Load the tokenizer and model
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
    tokenizer = AutoTokenizer.from_pretrained("google-t5/t5-base")
    model = AutoModelForSeq2SeqLM.from_pretrained("google-t5/t5-base")
    # Prepend the task prefix for T5
    input_text = "summarize conclusions: " + text
    # Tokenize the input text
    input_ids = tokenizer(input_text, return_tensors="pt", max_length=512, truncation=True).input_ids
    # Generate summary
    outputs = model.generate(input_ids, max_length=150, min_length=20, length_penalty=2.0, num_beams=4, early_stopping=True)
    # Decode and return the summary
    summary = tokenizer.decode(outputs[0], skip_special_tokens=True)

    formatted_summary = set()
    for r in summary.split("."):
        r = r.strip()
        if r:  # Only process non-empty strings
            r = r[0].upper() + r[1:] if r else r  # Capitalize first letter if string exists
            if not r.endswith('.'):
                r = r + '.'
            formatted_summary.add(r)
    print("Done.")
    return list(formatted_summary)
