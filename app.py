from flask import Flask, render_template, redirect, request
import pandas as pd
import numpy as np

app = Flask(__name__)

FILE_PATH = 'static/data/final_merged_dataset.csv'
df = pd.read_csv(FILE_PATH)

@app.route('/')
def index():
    map_data = df['state'].value_counts().to_dict()
    return render_template('index.html', map_data=map_data)