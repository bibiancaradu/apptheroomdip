import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exportMonthlyReport } from '../../src/utils/pdfExport';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  
  // Last 12 months
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalHours: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [monthModalVisible, setMonthModalVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const monthOptions = getMonthOptions();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      const usersResponse = await fetch(`${BACKEND_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const users = await usersResponse.json();

      const approvalsResponse = await fetch(`${BACKEND_URL}/api/approvals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const approvals = await approvalsResponse.json();

      const currentMonth = new Date().toISOString().slice(0, 7);
      const entriesResponse = await fetch(
        `${BACKEND_URL}/api/time-entries?month=${currentMonth}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const entries = await entriesResponse.json();

      const totalHours = entries
        .filter((e: any) => e.status === 'approved' && e.entry_type === 'work')
        .reduce((sum: number, e: any) => sum + e.hours, 0);

      setStats({
        totalEmployees: users.filter((u: any) => u.role === 'employee').length,
        totalHours,
        pendingApprovals: approvals.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (month: string) => {
    setMonthModalVisible(false);
    setExporting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        `${BACKEND_URL}/api/time-entries?month=${month}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const entries = await response.json();

      if (entries.length === 0) {
        Alert.alert('Attenzione', 'Nessuna voce trovata per il mese selezionato');
        setExporting(false);
        return;
      }

      await exportMonthlyReport(entries, month);
    } catch (error) {
      console.error('Error exporting:', error);
      Alert.alert('Errore', 'Errore durante la generazione del PDF');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e74c3c" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Dashboard Admin</Text>
        <Text style={styles.subtitle}>Benvenuto, Marius!</Text>

        <View style={styles.cardsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={32} color="#e74c3c" />
            <Text style={styles.statNumber}>{stats.totalEmployees}</Text>
            <Text style={styles.statLabel}>Dipendenti</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="time" size={32} color="#27ae60" />
            <Text style={styles.statNumber}>{stats.totalHours}h</Text>
            <Text style={styles.statLabel}>Ore Mese</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={32} color="#f39c12" />
            <Text style={styles.statNumber}>{stats.pendingApprovals}</Text>
            <Text style={styles.statLabel}>In Attesa</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="location" size={32} color="#3498db" />
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Sedi</Text>
          </View>
        </View>

        <View style={styles.exportSection}>
          <Text style={styles.sectionTitle}>Esportazione Consuntivi</Text>
          <Text style={styles.sectionDescription}>
            Genera un report PDF professionale per l&apos;ufficio paghe
          </Text>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => setMonthModalVisible(true)}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="document-text" size={24} color="#fff" />
                <Text style={styles.exportButtonText}>Esporta PDF Mensile</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={monthModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMonthModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleziona Mese</Text>
              <TouchableOpacity onPress={() => setMonthModalVisible(false)}>
                <Ionicons name="close" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={monthOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.monthOption,
                    item.value === selectedMonth && styles.monthOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedMonth(item.value);
                    handleExport(item.value);
                  }}
                >
                  <Text style={styles.monthOptionText}>{item.label}</Text>
                  {item.value === selectedMonth && (
                    <Ionicons name="checkmark" size={20} color="#e74c3c" />
                  )}
                </TouchableOpacity>
              )}
            />
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
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 32,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    width: '47%',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: '#999',
  },
  exportSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  exportButton: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  monthOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  monthOptionSelected: {
    backgroundColor: '#1a1a1a',
  },
  monthOptionText: {
    fontSize: 16,
    color: '#fff',
  },
});
