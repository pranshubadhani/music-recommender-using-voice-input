import { StatusBar } from "expo-status-bar";
import { React, useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, TextInput } from "react-native";
import { Audio } from "expo-av";
import axios from "axios";
import * as FileSystem from "expo-file-system";
import { FontAwesome5 } from "@expo/vector-icons";
import LottieView from "lottie-react-native";

import * as Sharing from 'expo-sharing';

export default function App() {
  const [recording, setRecording] = useState();
  const [recordings, setRecordings] = useState([]);
  const [resultSpeech, setResultSpeech] = useState([]);
  const [inputSearch, setInputSearch] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [predict, setPredict] = useState(true);

  //Funcion para iniciar grabacion
  async function startRecording() {
    try {
      //Permisos de microfono
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === "granted") {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        //Configuracion del audio
        const recordingOptions = {
          android: {
            extension: ".wav",
            outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_PCM,
            audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM,
          },
          ios: {
            extension: ".wav",
            audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
        };
        setIsRecording(true);
        const { recording } = await Audio.Recording.createAsync(
          recordingOptions
        );
        setRecording(recording);
      } else {
        console.error("No se acepto los permiso");
      }
    } catch (err) {
      console.error("Fallo en accesibilidad", err);
    }
  }


  //Stop recording
  async function stopRecording() {
    setRecording(undefined);
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    await recording.stopAndUnloadAsync();
    let updatedRecordings = [...recordings];
    const fileName = `recording${Date.now()}.wav`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    // const result = await FileSystem.downloadAsync(
    //   fileUri,
    //   FileSystem.documentDirectory + filename
    // );
    await FileSystem.moveAsync({
      from: recording.getURI(),
      to: fileUri,
    });

    // const { sound } = await recording.createNewLoadedSoundAsync();

    // Create a sound object from the recording
    const { sound } = await Audio.Sound.createAsync({ uri: fileUri });

    // Play the recorded audio
    await sound.playAsync();

    updatedRecordings.push({
      sound: sound,
      file: fileUri,
    });
    setRecordings(updatedRecordings);







    // downloadRecording(fileUri);
    setRecordings([]);
    setIsRecording(false);

    // Example usage:
    // Assuming you have the fileUri and fileName from your recording
    sendFileToServer(fileUri, fileName);

    //sending to backend
    async function sendFileToServer(fileUri, fileName) {
      try {
        // Create a new FormData object
        const formData = new FormData();

        // Append the file to the FormData object
        // Note: The 'uri' field is specific to React Native and might not work in a web environment
        formData.append('file', {
          uri: fileUri, // The local file URI
          type: 'audio/wav', // Adjust the MIME type as needed
          name: fileName, // The file name
        });

        // Make a POST request to your server
        const response = await axios.post('http://192.168.3.180:5000/check', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log('Upload successful', response.data);
        // setInputSearch(response.data.text);
        if (predict) {
          setInputSearch(response.data.text);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }








    const fetchData = async () => {
      try {
        const response = await axios.get('http://192.168.3.180:5000/socket');
        console.log(response.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }







  async function handleSearch() {
    try {
      const response = await fetch('http://192.168.3.180:5000/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ song: inputSearch, num_neighbors: 10 }),
      });

      // if (!response.ok) {
      //   throw new Error('Failed to fetch data');
      // }

      const data = await response.json();
      // Handle the response data from the backend
      console.log('Search results:', data);
      setResultSpeech(data.recommended_items);
    } catch (error) {
      console.error('Error:', error.message);
    }
  }

  const handleResultPress = () => {
    if (predict) {
      setPredict(false);
    }
    else {
      setPredict(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.containerTitle}>
        <Text style={styles.textTitle}>Music Recommender</Text>
      </View>
      <View style={styles.searchBarContainer}>
        <View>
          <TextInput
            style={styles.searchInput}
            placeholder="Type name of song"
            value={inputSearch}
            onChangeText={text => setInputSearch(text)}
          />
        </View>
        <View style={styles.rightSide}>
          <TouchableOpacity
            style={styles.recordButtonContainer}
            onPress={recording ? stopRecording : startRecording}
          >
            <FontAwesome5
              name={recording ? "microphone-slash" : "microphone"}
              size={20}
              color="#f0ffff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.searchButtonContainer}
            onPress={handleSearch}
          >
            <FontAwesome5
              name={"search"}
              size={20}
              color="#f0ffff"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.containerResultText}>
        {isRecording && (
          <LottieView
            source={require("./assets/AnimationSpeech.json")}
            autoPlay={startRecording}
            style={{ width: 100, height: 100 }}
          />
        )}
        <TouchableOpacity onPress={handleResultPress}><Text style={styles.textResultSpeech}>Result:{"\n"}</Text></TouchableOpacity>

        <View style={styles.textResultSpeech}>
          {
            resultSpeech ? (resultSpeech.map((recommendation, index) => (
              <View key={index}>
                <Text style={styles.textResultSpeech}>🎶 {recommendation}</Text>
              </View>
            ))) : (<Text style={styles.textResultSpeech}>Type something</Text>)
          }

        </View>
        {/* <TouchableOpacity
          style={styles.clearButton}
          onPress={clearResultSpeech}
        >
          <Text style={styles.textClearButton}>Clear</Text>
        </TouchableOpacity> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3CABFF",
    alignItems: "center",
    justifyContent: "center",
  },

  containerTitle: {
    alignItems: "center",
    width: "99%",
    height: "30%",
    justifyContent: "center",
  },

  textTitle: {
    fontSize: 40,
    color: "white",
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
    width: '80%',
    height: 45
  },
  rightSide: {
    flexDirection: "row",
  },

  recordButtonContainer: {
    backgroundColor: "#77C2FC",
    borderRadius: 15,
    marginRight: 5,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },

  searchButtonContainer: {
    backgroundColor: "#77C2FC",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },

  lottie: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },

  containerResultText: {
    alignItems: "center",
    width: "80%",
    flex: 1,
  },

  textResultSpeech: {
    fontSize: 20,
    color: "white",
  },

  clearButton: {
    width: "30%",
    height: "15%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 5,
    backgroundColor: "#77C2FC",
  },

  textClearButton: {
    color: "white",
    fontSize: 20,
  },
});
