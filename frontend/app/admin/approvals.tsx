import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface TimeEntry {
  id: string;
  user_name: string;
  date: string;
  hours: number;
  location: string;
  entry_type: string;
  comments?: string;
  status: string;
}

export default function ApprovalsScreen() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/approvals`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      }
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingApprovals();
  };

  const handleApproval = async (entryId: string, status: 'approved' | 'rejected') => {
    setProcessingId(entryId);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/approvals/${entryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        Alert.alert(
          'Successo',
          status === 'approved' ? 'Richiesta approvata' : 'Richiesta rifiutata'
        );
        fetchPendingApprovals();
      } else {
        const data = await response.json();
        Alert.alert('Errore', data.detail || 'Errore durante l\'operazione');
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      Alert.alert('Errore', 'Errore di connessione');
    } finally {
      setProcessingId(null);
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'vacation':
        return 'Ferie';
      case 'permit':
        return 'Permesso';
      case 'sick':
        return 'Malattia';
      case 'other':
        return 'Altro';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'vacation':
        return '#3498db';
      case 'permit':
        return '#f39c12';
      case 'sick':
        return '#e74c3c';
      default:
        return '#999';
    }
  };

  const renderEntry = ({ item }: { item: TimeEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <Ionicons name="person-circle" size={24} color="#e74c3c" />
          <Text style={styles.userName}>{item.user_name}</Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.entry_type) }]}>
          <Text style={styles.typeText}>{getTypeText(item.entry_type)}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={18} color="#999" />
          <Text style={styles.date}>{item.date}</Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="time-outline" size={18} color="#999" />
          <Text style={styles.hours}>{item.hours} ore</Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="location-outline" size={18} color="#999" />
          <Text style={styles.location}>{item.location}</Text>
        </View>

        {item.comments && (
          <View style={styles.commentsContainer}>
            <Text style={styles.commentsLabel}>Note:</Text>
            <Text style={styles.comments}>{item.comments}</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleApproval(item.id, 'rejected')}
          disabled={processingId === item.id}
        >
          {processingId === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Rifiuta</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleApproval(item.id, 'approved')}
          disabled={processingId === item.id}
        >
          {processingId === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Approva</Text>
            </>
          )}
        </TouchableOpacity>
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
            <Ionicons name="checkmark-done-circle" size={64} color="#27ae60" />
            <Text style={styles.emptyText}>Nessuna richiesta in attesa</Text>
            <Text style={styles.emptySubtext}>Tutte le richieste sono state processate</Text>
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
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  cardBody: {
    gap: 12,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  date: {
    fontSize: 16,
    color: '#fff',
  },
  hours: {
    fontSize: 16,
    color: '#fff',
  },
  location: {
    fontSize: 14,
    color: '#999',
  },
  commentsContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#0c0c0c',
    borderRadius: 8,
  },
  commentsLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontWeight: '600',
  },
  comments: {
    fontSize: 14,
    color: '#fff',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
  },
  approveButton: {
    backgroundColor: '#27ae60',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});
