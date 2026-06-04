import React, { useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

LocaleConfig.locales['it'] = {
  monthNames: [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
  ],
  monthNamesShort: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
  dayNames: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'],
  today: 'Oggi',
};
LocaleConfig.defaultLocale = 'it';

type EntryType = 'work' | 'vacation' | 'permit' | 'sick' | 'holiday' | 'other';
type Location = 'Costabissara' | 'Vicenza Est';

const ENTRY_TYPES: { value: EntryType; label: string; icon: any; color: string }[] = [
  { value: 'work', label: 'Lavoro', icon: 'briefcase', color: '#27ae60' },
  { value: 'vacation', label: 'Ferie', icon: 'sunny', color: '#3498db' },
  { value: 'permit', label: 'Permesso', icon: 'time', color: '#f39c12' },
  { value: 'sick', label: 'Malattia', icon: 'medkit', color: '#e74c3c' },
  { value: 'holiday', label: 'Festività', icon: 'gift', color: '#e91e63' },
  { value: 'other', label: 'Altro', icon: 'ellipsis-horizontal', color: '#9b59b6' },
];

const QUICK_HOURS = ['4', '4,5', '6', '7', '7,5', '8', '8,5', '9'];

const dateToString = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function AddEntryScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const [date, setDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [hours, setHours] = useState('');
  const [location, setLocation] = useState<Location>('Costabissara');
  const [entryType, setEntryType] = useState<EntryType>('work');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (params.date) {
      const parsed = new Date(params.date);
      if (!isNaN(parsed.getTime())) {
        setDate(parsed);
      }
    }
  }, [params.date]);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const parseHours = (input: string): number => {
    // Accept both comma and dot as decimal separator (Italian users use comma)
    const normalized = input.replace(',', '.').trim();
    return parseFloat(normalized);
  };

  const handleSubmit = async () => {
    const hoursValue = parseHours(hours);
    if (!hours || isNaN(hoursValue) || hoursValue <= 0) {
      showAlert('Errore', 'Inserisci un numero di ore valido (es: 8 oppure 7,5)');
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
          date: dateToString(date),
          hours: hoursValue,
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

  const changeDate = (days: number) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    setDate(newDate);
  };

  const goToToday = () => {
    setDate(new Date());
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  const onCalendarDayPress = (day: any) => {
    setDate(new Date(day.dateString));
    setShowCalendar(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.form}>
          {/* Date with Arrow Navigation + Calendar Tap */}
          <View style={styles.field}>
            <Text style={styles.label}>📅 Data</Text>
            <View style={styles.dateNavigator}>
              <TouchableOpacity
                style={styles.dateArrowButton}
                onPress={() => changeDate(-1)}
              >
                <Ionicons name="chevron-back" size={28} color="#e74c3c" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateDisplay}
                onPress={() => setShowCalendar(true)}
              >
                <Text style={styles.dateText}>{formatDate(date)}</Text>
                <View style={styles.dateHint}>
                  <Ionicons name="calendar" size={12} color="#999" />
                  <Text style={styles.dateHintText}>Tocca per calendario</Text>
                </View>
                {isToday(date) && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>OGGI</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateArrowButton}
                onPress={() => changeDate(1)}
              >
                <Ionicons name="chevron-forward" size={28} color="#e74c3c" />
              </TouchableOpacity>
            </View>

            <View style={styles.quickJumps}>
              <TouchableOpacity
                style={styles.quickJumpButton}
                onPress={() => changeDate(-7)}
              >
                <Text style={styles.quickJumpText}>-7 giorni</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickJumpButton}
                onPress={() => changeDate(-1)}
              >
                <Text style={styles.quickJumpText}>Ieri</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickJumpButton, isToday(date) && styles.quickJumpButtonActive]}
                onPress={goToToday}
              >
                <Text style={[styles.quickJumpText, isToday(date) && styles.quickJumpTextActive]}>Oggi</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hours with Quick Selectors */}
          <View style={styles.field}>
            <Text style={styles.label}>⏰ Ore Lavorate</Text>
            <TextInput
              style={styles.input}
              placeholder="Es: 8 oppure 7,5 oppure 7,25"
              placeholderTextColor="#666"
              value={hours}
              onChangeText={setHours}
              keyboardType="decimal-pad"
            />
            <Text style={styles.hint}>Puoi usare la virgola: 7,5 = 7 ore e mezza, 7,25 = 7 ore e un quarto</Text>
            <View style={styles.quickHoursGrid}>
              {QUICK_HOURS.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[
                    styles.quickHourButton,
                    hours === h && styles.quickHourButtonActive,
                  ]}
                  onPress={() => setHours(h)}
                >
                  <Text
                    style={[
                      styles.quickHourText,
                      hours === h && styles.quickHourTextActive,
                    ]}
                  >
                    {h}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location */}
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

          {/* Entry Type */}
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

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleziona Data</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={28} color="#999" />
              </TouchableOpacity>
            </View>
            <Calendar
              current={dateToString(date)}
              onDayPress={onCalendarDayPress}
              markedDates={{
                [dateToString(date)]: {
                  selected: true,
                  selectedColor: '#e74c3c',
                },
              }}
              theme={{
                backgroundColor: '#0c0c0c',
                calendarBackground: '#0c0c0c',
                textSectionTitleColor: '#999',
                selectedDayBackgroundColor: '#e74c3c',
                selectedDayTextColor: '#fff',
                todayTextColor: '#e74c3c',
                dayTextColor: '#fff',
                textDisabledColor: '#444',
                monthTextColor: '#fff',
                arrowColor: '#e74c3c',
                textMonthFontWeight: 'bold',
                textDayFontSize: 14,
                textMonthFontSize: 18,
              }}
            />
          </View>
        </View>
      </Modal>
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
  hint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  dateArrowButton: {
    padding: 16,
    backgroundColor: '#1a1a1a',
  },
  dateDisplay: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  dateHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dateHintText: {
    fontSize: 10,
    color: '#999',
  },
  todayBadge: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  quickJumps: {
    flexDirection: 'row',
    gap: 8,
  },
  quickJumpButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  quickJumpButtonActive: {
    backgroundColor: '#e74c3c22',
    borderColor: '#e74c3c',
  },
  quickJumpText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
  },
  quickJumpTextActive: {
    color: '#e74c3c',
  },
  quickHoursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  quickHourButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  quickHourButtonActive: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  quickHourText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
  },
  quickHourTextActive: {
    color: '#fff',
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#0c0c0c',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
