import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

LocaleConfig.locales['it'] = {
  monthNames: [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ],
  monthNamesShort: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
  dayNames: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'],
  today: 'Oggi',
};
LocaleConfig.defaultLocale = 'it';

interface TimeEntry {
  id: string;
  date: string;
  hours: number;
  location: string;
  entry_type: string;
  comments?: string;
  status: string;
}

const TYPE_COLORS: { [key: string]: string } = {
  work: '#27ae60',
  vacation: '#3498db',
  sick: '#e74c3c',
  permit: '#f39c12',
  holiday: '#e91e63',
  other: '#9b59b6',
};

const TYPE_LABELS: { [key: string]: string } = {
  work: 'Lavoro',
  vacation: 'Ferie',
  sick: 'Malattia',
  permit: 'Permesso',
  holiday: 'Festività',
  other: 'Altro',
};

export default function CalendarScreen() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchEntries();
  }, []);

  // Refresh data every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchEntries();
    }, [])
  );

  const handleAddForDate = () => {
    if (selectedDate) {
      setModalVisible(false);
      router.push({
        pathname: '/employee/add',
        params: { date: selectedDate },
      });
    }
  };

  const fetchEntries = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/time-entries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMarkedDates = () => {
    const marked: any = {};
    entries.forEach((entry) => {
      const dots = marked[entry.date]?.dots || [];
      dots.push({
        color: TYPE_COLORS[entry.entry_type] || '#999',
        key: entry.id,
      });
      marked[entry.date] = {
        dots,
        marked: true,
      };
    });
    if (selectedDate) {
      marked[selectedDate] = {
        ...(marked[selectedDate] || {}),
        selected: true,
        selectedColor: '#e74c3c',
      };
    }
    return marked;
  };

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
    setModalVisible(true);
  };

  const getEntriesForDate = (date: string): TimeEntry[] => {
    return entries.filter((e) => e.date === date);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e74c3c" />
      </View>
    );
  }

  const selectedEntries = selectedDate ? getEntriesForDate(selectedDate) : [];

  return (
    <ScrollView style={styles.container}>
      <Calendar
        markingType="multi-dot"
        markedDates={getMarkedDates()}
        onDayPress={handleDayPress}
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

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legenda</Text>
        <View style={styles.legendGrid}>
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <View key={type} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{TYPE_LABELS[type]}</Text>
            </View>
          ))}
        </View>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDate ? new Date(selectedDate).toLocaleDateString('it-IT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }) : ''}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Add button - always visible */}
              <TouchableOpacity
                style={styles.addEntryButton}
                onPress={handleAddForDate}
              >
                <Ionicons name="add-circle" size={22} color="#fff" />
                <Text style={styles.addEntryButtonText}>Aggiungi voce per questo giorno</Text>
              </TouchableOpacity>

              {selectedEntries.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Ionicons name="calendar-outline" size={48} color="#444" />
                  <Text style={styles.emptyDayText}>Nessuna voce per questa data</Text>
                </View>
              ) : (
                selectedEntries.map((entry) => (
                  <View key={entry.id} style={styles.entryCard}>
                    <View style={styles.entryHeader}>
                      <View style={[styles.entryBadge, { backgroundColor: TYPE_COLORS[entry.entry_type] }]}>
                        <Text style={styles.entryBadgeText}>
                          {TYPE_LABELS[entry.entry_type]}
                        </Text>
                      </View>
                      <Text style={styles.entryHours}>{entry.hours}h</Text>
                    </View>
                    <View style={styles.entryRow}>
                      <Ionicons name="location-outline" size={16} color="#999" />
                      <Text style={styles.entryLocation}>{entry.location}</Text>
                    </View>
                    {entry.comments && (
                      <Text style={styles.entryComments}>{entry.comments}</Text>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0c0c0c',
  },
  legend: {
    margin: 16,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0c0c0c',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textTransform: 'capitalize',
  },
  modalBody: {
    padding: 16,
  },
  addEntryButton: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  addEntryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyDayText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  entryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  entryBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  entryHours: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  entryLocation: {
    fontSize: 13,
    color: '#999',
  },
  entryComments: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#0c0c0c',
    borderRadius: 6,
  },
});
