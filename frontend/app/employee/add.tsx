import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AddEntryScreen() {
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hours, setHours] = useState('');
  const [location, setLocation] = useState('Costabissara');
  const [entryType, setEntryType] = useState('work');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!hours || parseFloat(hours) <= 0) {
      Alert.alert('Errore', 'Inserisci un numero di ore valido');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/time-entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: date.toISOString().split('T')[0],
          hours: parseFloat(hours),
          location,
          entry_type: entryType,
          comments: comments || null,
        }),
      });

      if (response.ok) {
        Alert.alert('Successo', 'Voce aggiunta con successo');
        // Reset form
        setHours('');
        setComments('');
        setEntryType('work');
        router.back();
      } else {
        const data = await response.json();
        Alert.alert('Errore', data.detail || 'Errore durante l\'aggiunta');
      }
    } catch (error) {
      console.error('Error adding entry:', error);
      Alert.alert('Errore', 'Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Data</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {date.toISOString().split('T')[0]}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Ore Lavorate</Text>
            <TextInput
              style={styles.input}
              placeholder="Es: 8"
              placeholderTextColor="#666"
              value={hours}
              onChangeText={setHours}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Sede</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={location}
                onValueChange={setLocation}
                style={styles.picker}
                dropdownIconColor="#fff"
              >
                <Picker.Item label="Costabissara" value="Costabissara" />
                <Picker.Item label="Vicenza Est" value="Vicenza Est" />
              </Picker>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Tipo</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={entryType}
                onValueChange={setEntryType}
                style={styles.picker}
                dropdownIconColor="#fff"
              >
                <Picker.Item label="Lavoro" value="work" />
                <Picker.Item label="Ferie" value="vacation" />
                <Picker.Item label="Permesso" value="permit" />
                <Picker.Item label="Malattia" value="sick" />
                <Picker.Item label="Altro" value="other" />
              </Picker>
            </View>
          </View>

          {(entryType === 'vacation' || entryType === 'permit') && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ⚠️ Questa richiesta richiede l'approvazione dell'amministratore
              </Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Note (Opzionale)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Aggiungi note..."
              placeholderTextColor="#666"
              value={comments}
              onChangeText={setComments}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Aggiungi Voce</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  form: {
    gap: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
  },
  dateText: {
    fontSize: 16,
    color: '#fff',
  },
  pickerContainer: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
  },
  infoBox: {
    backgroundColor: '#f39c1222',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f39c12',
  },
  infoText: {
    fontSize: 14,
    color: '#f39c12',
  },
  button: {
    backgroundColor: '#e74c3c',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
