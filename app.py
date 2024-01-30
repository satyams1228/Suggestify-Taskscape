from flask import Flask, request, jsonify
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from transformers import DistilBertTokenizer, DistilBertModel
import torch
from difflib import get_close_matches

app = Flask(__name__)

# Load CSV file
file_path = 'Book1.csv'  # Replace with your actual file path
df = pd.read_csv(file_path, encoding='latin1')

# Ensure the "Task" column is not empty
df = df.dropna(subset=['Task'])

# Load pre-trained DistilBERT model and tokenizer (a smaller version of BERT)
tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')
model = DistilBertModel.from_pretrained('distilbert-base-uncased')

# Batch processing for BERT embeddings
batch_tasks = df['Task'].tolist()
batch_tokens = tokenizer(batch_tasks, return_tensors='pt', truncation=True, padding=True)

with torch.no_grad():
    batch_outputs = model(**batch_tokens)

# Extract embeddings for each task in the batch
batch_embeddings = batch_outputs.last_hidden_state.mean(dim=1).squeeze().numpy()

# Compute the cosine similarity between BERT embeddings
cosine_sim = cosine_similarity(batch_embeddings, batch_embeddings)

# Function to preprocess tasks
def preprocess_task(task):
    return task.lower().strip()

# Function to get BERT embedding for a single task
def get_embedding(task):
    task_tokens = tokenizer(task, return_tensors='pt', truncation=True, padding=True)

    with torch.no_grad():
        task_output = model(**task_tokens)

    task_embedding = task_output.last_hidden_state.mean(dim=1).squeeze().numpy()
    return task_embedding

# Function to get recommendations based on BERT embedding similarity
def get_recommendations(user_task, cosine_sim=cosine_sim, df=df):
    user_task = preprocess_task(user_task)

    # Use a more flexible string matching approach
    task_matches = get_close_matches(user_task, df['Task'].apply(preprocess_task), n=2, cutoff=0.8)

    if task_matches:
        # Remove the exact match from the matches
        task_matches = [match for match in task_matches if match != user_task]

        if task_matches:
            matched_task = task_matches[0]
            task_indices = df[df['Task'].apply(preprocess_task) == matched_task].index
            task_index = task_indices[0]

            sim_scores = list(enumerate(cosine_sim[task_index]))
            sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
            sim_scores = sim_scores[:10]  # Get top 10 similar tasks

            task_indices = [i[0] for i in sim_scores]
            return df['Task'].iloc[task_indices].tolist()
    
    # If no close match is found, check for similarity within the dataset
    user_embedding = get_embedding(user_task)
    dataset_embeddings = batch_embeddings

    # Compute cosine similarity between user's task and all tasks in the dataset
    sim_scores = cosine_similarity([user_embedding], dataset_embeddings).flatten()
    sim_scores = list(enumerate(sim_scores))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    sim_scores = sim_scores[:10]  # Get top 10 similar tasks in the dataset

    task_indices = [i[0] for i in sim_scores]
    return df['Task'].iloc[task_indices].tolist()

# Flask route to recommend tasks
@app.route('/recommend', methods=['POST'])
def recommend_tasks():
    try:
        user_task = request.json['user_task']
        recommendations = get_recommendations(user_task)
        return jsonify({"user_task": user_task, "recommendations": recommendations})
    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == '__main__':
    app.run(debug=True)
