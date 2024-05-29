import pickle
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from keras.models import load_model
import librosa
import requests

import speech_recognition as sr

from pydub import AudioSegment
AudioSegment.converter = "C:\\ffmpeg\\bin\\ffmpeg.exe"
AudioSegment.ffmpeg = "C:\\ffmpeg\\bin\\ffmpeg.exe"
AudioSegment.ffprobe ="C:\\ffmpeg\\bin\\ffprobe.exe"



app = Flask(__name__)
CORS(app)
# app.config['MAX_CONTENT_LENGTH'] = 64 * 1024 * 1024
# Load the recommend_songs function from the .pkl file
def search_songs(df, partial_name):
    # Convert the partial name to lowercase for case-insensitive search
    partial_name = partial_name.lower()
    
    # Use boolean indexing to filter rows where the partial name is present in the song name
    filtered_df = df[df['song'].str.lower().str.contains(partial_name)]
    
    return filtered_df['song'][:10]
def recommend_songs(item_idx, num_neighbors, song):
    song_names = []
    if(item_idx == -1):
        song_names = list(search_songs(df, song))
        if(len(song_names) == 0):
            song_names = df['song'].sample(n=10).values.tolist()
    else :
        top_similar = top_similar_items(item_idx, num_neighbors)
        recommended_items = top_similar.index.tolist()
        song_names = list(df.iloc[recommended_items]['song'])
    return song_names
def top_similar_items(item_idx, num_neighbors=5):
    similar_songs = sim_matrix.loc[item_idx].sort_values(ascending=False)[1:]
    return similar_songs.head(num_neighbors)
def find_song_index(df, song_name):
    index = df.index[df['song'].str.lower() == song_name.lower()].tolist()

    if not index:
        return -1
    else:
        return index[0]

def extract_features(file_path, num_mfcc=13):
    with open(file_path, "rb") as file:
        # Load audio file
        audio, sr = librosa.load(file, sr=None)

        # Extract MFCC features
        mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=num_mfcc)
        mfccs_processed = np.mean(mfccs.T, axis=0)

    return mfccs_processed
with open('finale.pkl', 'rb') as f:
    loaded_functions = pickle.load(f)
with open('aud2.pkl', 'rb') as fi:
    loaded_func = pickle.load(fi)
model = load_model('temp.h5')
# Access functions from the loaded dictionary
recommend_songs = loaded_functions['recommend_songs']
top_similar_items = loaded_functions['top_similar_items']
sim_matrix  = loaded_functions['sim_matrix']
df = loaded_functions['df']
find_song_index = loaded_functions['find_song_index']


# model = loaded_func['predict']
extract_features = loaded_func['extract_features']
label_encoder = loaded_func['label_encoder']
# Create Flask application
@app.route('/')
def socket():
    print("hello")
    return "Hello world"

@app.route('/check', methods=['POST'])
def check():
    if 'file' not in request.files:
        return 'No file part'
    file = request.files['file']
    file.save('uploaded_file.wav')
    # return "Success"

    def convert_mp4_to_wav(mp4_file, wav_file):
        # Load the MP4 file
        audio = AudioSegment.from_file(mp4_file, format="3gp")
        
        # Export the audio to WAV format
        audio.export(wav_file, format="wav")

    # Specify input MP4 file and output WAV file paths
    input_mp4_file = r"C:\Users\badha\OneDrive\Desktop\ml\VoiceWave-Transcribe-main\backend\uploaded_file.wav"
    output_wav_file = r"C:\Users\badha\OneDrive\Desktop\ml\VoiceWave-Transcribe-main\backend\output.wav"
    # Convert MP4 to WAV
    convert_mp4_to_wav(input_mp4_file, output_wav_file)

    # folder_path = r'/'
    # filename = 'uploaded_file'
    file_path = './output.wav'
    # Do something with the uploaded file, e.g., save it to disk
    new_features = []
        
    features = extract_features(file_path)
    new_features.append(features)

    # Convert features to numpy array
    new_features = np.array(new_features)

    # Reshape features for model input
    new_features = new_features.reshape(new_features.shape[0], new_features.shape[1], 1)
    # list_data = new_features.tolist()
    # Do something with the file, like play it or process it
    # Here you can perform any operations you want with the audio file
    # data = {
    #     'features': list_data
    # }
    predictions = model.predict(new_features)
    predicted_labels = label_encoder.inverse_transform(np.argmax(predictions, axis=1))
    print(predicted_labels[0])
    
    # Initialize recognizer class                                       
    r = sr.Recognizer()
    # audio object                                                         
    audio = sr.AudioFile("output.wav")
    #read audio object and transcribe
    with audio as source:
        audio = r.record(source)                  
        result = r.recognize_google(audio)
    
    print(result)

    resp = {'pred':predicted_labels[0], 'text': result}
    return jsonify(resp)



# @app.route('/upload')
# def upload():
#     # Construct the full path to the audio file
#     print('hello')
#     folder_path = r'C:\Users\badha\OneDrive\Desktop\ml\VoiceWave-Transcribe-main\backend'
#     filename = 'uploaded_file.wav'
#     file_path = os.path.join(folder_path, filename)
#     resp = {}
#     # Check if the file exists
#     if os.path.exists(file_path):
#         # Access the audio file
#         new_features = []
        
#         features = extract_features(file_path)
#         new_features.append(features)

#         # Convert features to numpy array
#         new_features = np.array(new_features)

#         # Reshape features for model input
#         new_features = new_features.reshape(new_features.shape[0], new_features.shape[1], 1)
#         # list_data = new_features.tolist()
#         # Do something with the file, like play it or process it
#         # Here you can perform any operations you want with the audio file
#         # data = {
#         #     'features': list_data
#         # }
#         predictions = model.predict(new_features)
#         if(np.argmax(predictions, axis=1) < 1):
#             resp = {'pred' : 'unknown'}
#         else :
#             predicted_labels = label_encoder.inverse_transform(np.argmax(predictions, axis=1))
#             print(predicted_labels[0])
#             # print(model.predict(new_features))
#             # header = {'user-agent':"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0"}
#             # response = requests.get("https://eeg75wxefxn-496ff2e9c6d22116-5000-colab.googleusercontent.com/audio",headers=header)
#             # resp = response.json()
#             # print(response.content)
#             # Delete the audio file
#             resp = {'pred':predicted_labels[0]}
#         os.remove(file_path)
#         print(f"{filename} has been deleted.")
#     else:
#         print(f"File {filename} does not exist in the specified folder.")
#     return jsonify(resp)
# Example usage
# folder_path = r'C:\Users\Lenovo\Downloads'
# filename = 'audio.wav'  # Change this to the name of your audio file
# access_and_delete_audio_file(folder_path, filename)

    
# Define a route for recommending songs
@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.json
    # Get parameters from the request
    song = (data.get('song'))
    if(song == ""):
        return {}
    num_neighbors = int(data.get('num_neighbors'))
    idx = find_song_index(df, song)


#     # Call the recommend_songs function
    song_names = []
    song_names = recommend_songs(idx, num_neighbors, song)
    return jsonify({'recommended_items': song_names})



# Run the Flask application
if __name__ == '__main__':
    app.run('0.0.0.0',debug=True)
