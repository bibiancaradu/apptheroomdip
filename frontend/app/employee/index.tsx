import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface TimeEntry {
  id: string;
  date: string;
  hours: number;
  location: string;
  entry_type: string;
  comments?: string;
  status: string;
}

export default function EmployeeHomeScreen() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  useEffect(() => {
    fetchEntries();
  }, [selectedMonth]);

  // Refresh data every time the screen comes into focus (e.g. after adding entry)
  useFocusEffect(
    useCallback(() => {
      fetchEntries();
    }, [selectedMonth])
  );

  const fetchEntries = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        `${BACKEND_URL}/api/time-entries?month=${selectedMonth}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEntries();
  };

  const deleteEntry = async (id: string) => {
    const performDelete = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(
          `${BACKEND_URL}/api/time-entries/${id}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.ok) {
          fetchEntries();
          if (Platform.OS === 'web') {
            window.alert('Voce eliminata');
          } else {
            Alert.alert('Successo', 'Voce eliminata');
          }
        } else {
          const data = await response.json();
          if (Platform.OS === 'web') {
            window.alert('Errore: ' + (data.detail || 'Impossibile eliminare'));
          } else {
            Alert.alert('Errore', data.detail);
          }
        }
      } catch (error) {
        if (Platform.OS === 'web') {
          window.alert('Errore di connessione');
        } else {
          Alert.alert('Errore', 'Errore di connessione');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Vuoi eliminare questa voce?')) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Conferma',
        'Vuoi eliminare questa voce?',
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Elimina', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#27ae60';
      case 'pending':
        return '#f39c12';
      case 'rejected':
        return '#e74c3c';
      default:
        return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approvato';
      case 'pending':
        return 'In attesa';
      case 'rejected':
        return 'Rifiutato';
      default:
        return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'work':
        return 'Lavoro';
      case 'vacation':
        return 'Ferie';
      case 'sick':
        return 'Malattia';
      case 'permit':
        return 'Permesso';
      case 'other':
        return 'Altro';
      default:
        return type;
    }
  };

  const calculateTotalHours = () => {
    return entries
      .filter((e) => e.status === 'approved' && e.entry_type === 'work')
      .reduce((sum, e) => sum + e.hours, 0);
  };

  const renderEntry = ({ item }: { item: TimeEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{item.date}</Text>
        <TouchableOpacity
          onPress={() => deleteEntry(item.id)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={20} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Ionicons name="time-outline" size={18} color="#999" />
          <Text style={styles.hours}>{item.hours} ore</Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="location-outline" size={18} color="#999" />
          <Text style={styles.location}>{item.location}</Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="pricetag-outline" size={18} color="#999" />
          <Text style={styles.type}>{getTypeText(item.entry_type)}</Text>
        </View>

        <View style={styles.row}>
          <View
            style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
          >
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        {item.comments && (
          <View style={styles.commentsContainer}>
            <Text style={styles.comments}>{item.comments}</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e74c3c" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Totale Ore Lavorate</Text>
        <Text style={styles.summaryHours}>{calculateTotalHours()}h</Text>
        <Text style={styles.summaryMonth}>{selectedMonth}</Text>
      </View>

      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e74c3c"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>Nessuna voce per questo mese</Text>
          </View>
        }
      />
    </View>
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
  summary: {
    backgroundColor: '#1a1a1a',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  summaryTitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  summaryHours: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  summaryMonth: {
    fontSize: 16,
    color: '#999',
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    padding: 4,
  },
  cardBody: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hours: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  location: {
    fontSize: 14,
    color: '#999',
  },
  type: {
    fontSize: 14,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  commentsContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#0c0c0c',
    borderRadius: 8,
  },
  comments: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});
