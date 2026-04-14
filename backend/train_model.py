import pandas as pd
import pickle
import re

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer

# Load dataset
fake_df = pd.read_csv("fake_or_real_news.csv/Fake.csv")
true_df = pd.read_csv("fake_or_real_news.csv/True.csv")

# Add labels
fake_df["label"] = 0   # Fake
true_df["label"] = 1   # Real

# Combine both
df = pd.concat([fake_df, true_df], ignore_index=True)

# Preprocessing
def clean_text(text):
    text = text.lower()
    text = re.sub(r'[^a-zA-Z]', ' ', text)
    return text

df['text'] = df['text'].apply(clean_text)

X = df['text']
y = df['label']   # 0 = Fake, 1 = Real

# TF-IDF
vectorizer = TfidfVectorizer(stop_words='english', max_df=0.7)
X_vectorized = vectorizer.fit_transform(X)

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X_vectorized, y, test_size=0.2, random_state=42
)

# Model
model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)

# Save
import os

os.makedirs("ml_model", exist_ok=True)

pickle.dump(model, open("ml_model/model.pkl", "wb"))
pickle.dump(vectorizer, open("ml_model/vectorizer.pkl", "wb"))


print("Model trained successfully ✅")