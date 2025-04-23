from flask import Flask, render_template, redirect, request
import pandas as pd
import numpy as np

app = Flask(__name__)

FILE_PATH = 'static/data/final_data.csv'
INCOME_FILE_PATH = 'static/data/income_data_cleaned.csv'
df = pd.read_csv(FILE_PATH)
income_df = pd.read_csv(INCOME_FILE_PATH)

@app.route('/')
def index():
    states_data = df['state'].value_counts().to_dict()

    cities_data_dict = {}
    state_income_data = {}
    # state : cities_data
    for state in states_data.keys():
        cities_data = df[df['state'] == state]['city'].value_counts().to_dict()
        cities_data_dict[state] = cities_data

        state_income_data[state] = income_df[income_df['State_ab'] == state]['Mean'].to_list()


    return render_template('index.html', 
                           states_data=states_data, 
                           cities_data_dict=cities_data_dict, 
                           df=df.to_dict(orient='records'), 
                           us_income_data=income_df['Mean'].to_list(),
                           state_income_data=state_income_data)