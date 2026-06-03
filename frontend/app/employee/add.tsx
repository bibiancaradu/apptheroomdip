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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type EntryType = 'work' | 'vacation' | 'permit' | 'sick' | 'other';
type Location = 'Costabissara' | 'Vicenza Est';

const ENTRY_TYPES: { value: EntryType; label: string; icon: any; color: string }[] = [
  { value: 'work', label: 'Lavoro', icon: 'briefcase', color: '#27ae60' },
  { value: 'vacation', label: 'Ferie', icon: 'sunny', color: '#3498db' },
  { value: 'permit', label: 'Permesso', icon: 'time', color: '#f39c12' },
  { value: 'sick', label: 'Malattia', icon: 'medkit', color: '#e74c3c' },
  { value: 'other', label: 'Altro', icon: 'ellipsis-horizontal', color: '#9b59b6' },
];

export default function AddEntryScreen() {
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hours, setHours] = useState('');
  const [location, setLocation] = useState<Location>('Costabissara');
  const [entryType, setEntryType] = useState<EntryType>('work');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSubmit = async () => {
    if (!hours || parseFloat(hours) <= 0) {
      showAlert('Errore', 'Inserisci un numero di ore valido');
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
        showAlert('Successo', 'Voce aggiunta con successo');
        setHours('');
        setComments('');
        setEntryType('work');
        // Navigate to home tab instead of router.back()
        router.replace('/employee');
      } else {
        const data = await response.json();
        showAlert('Errore', data.detail || 'Errore durante l\'aggiunta');
      }
    } catch (error) {
      console.error('Error adding entry:', error);
      showAlert('Errore', 'Errore di connessione');
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

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.form}>
          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.label}>📅 Data</Text>
            {Platform.OS === 'web' ? (
              <TextInput
                style={styles.input}
                value={date.toISOString().split('T')[0]}
                onChangeText={(text) => {
                  const newDate = new Date(text);
                  if (!isNaN(newDate.getTime())) {
                    setDate(newDate);
                  }
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#666"
                {...({ type: 'date' } as any)}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar" size={20} color="#e74c3c" />
                  <Text style={styles.dateText}>{formatDate(date)}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                  />
                )}
              </>
            )}
          </View>

          {/* Hours */}
          <View style={styles.field}>
            <Text style={styles.label}>⏰ Ore Lavorate</Text>
            <TextInput
              style={styles.input}
              placeholder="Es: 8"
              placeholderTextColor="#666"
              value={hours}
              onChangeText={setHours}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Location - Visible Buttons */}
          <View style={styles.field}>
            <Text style={styles.label}>📍 Sede</Text>
            <View style={styles.optionsGrid}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  location === 'Costabissara' && styles.optionButtonActive,
                ]}
                onPress={() => setLocation('Costabissara')}
              >
                <Ionicons
                  name="business"
                  size={24}
                  color={location === 'Costabissara' ? '#fff' : '#999'}
                />
                <Text
                  style={[
                    styles.optionText,
                    location === 'Costabissara' && styles.optionTextActive,
                  ]}
                >
                  Costabissara
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  location === 'Vicenza Est' && styles.optionButtonActive,
                ]}
                onPress={() => setLocation('Vicenza Est')}
              >
                <Ionicons
                  name="business"
                  size={24}
                  color={location === 'Vicenza Est' ? '#fff' : '#999'}
                />
                <Text
                  style={[
                    styles.optionText,
                    location === 'Vicenza Est' && styles.optionTextActive,
                  ]}
                >
                  Vicenza Est
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Entry Type - Visible Buttons */}
          <View style={styles.field}>
            <Text style={styles.label}>🏷️ Tipo</Text>
            <View style={styles.typeGrid}>
              {ENTRY_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeButton,
                    entryType === type.value && { backgroundColor: type.color, borderColor: type.color },
                  ]}
                  onPress={() => setEntryType(type.value)}
                >
                  <Ionicons
                    name={type.icon}
                    size={22}
                    color={entryType === type.value ? '#fff' : '#999'}
                  />
                  <Text
                    style={[
                      styles.typeText,
                      entryType === type.value && styles.typeTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {(entryType === 'vacation' || entryType === 'permit') && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#f39c12" />
              <Text style={styles.infoText}>
                Questa richiesta richiede l&apos;approvazione dell&apos;amministratore
              </Text>
            </View>
          )}

          {/* Comments */}
          <View style={styles.field}>
            <Text style={styles.label}>📝 Note (Opzionale)</Text>
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
            style={[styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.submitButtonText}>Aggiungi Voce</Text>
              </>
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
    paddingBottom: 32,
  },
  form: {
    gap: 24,
  },
  field: {
    gap: 10,
  },
  label: {
    fontSize: 15,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    fontSize: 16,
    color: '#fff',
    textTransform: 'capitalize',
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
  },
  optionButtonActive: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  optionText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#fff',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    width: '31%',
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  typeText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#fff',
  },
  infoBox: {
    backgroundColor: '#f39c1222',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f39c12',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#f39c12',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#e74c3c',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
