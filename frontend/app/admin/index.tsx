import React, { useEffect, useState, useCallback } from 'react';
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { exportMonthlyExcel } from '../../src/utils/excelExport';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
}

interface LocationStats {
  hoursByLocation: { [key: string]: number };
  hoursByEmployee: { [key: string]: { name: string; cb: number; ve: number; total: number } };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalHours: 0,
    pendingApprovals: 0,
  });
  const [locationStats, setLocationStats] = useState<LocationStats>({
    hoursByLocation: { Costabissara: 0, 'Vicenza Est': 0 },
    hoursByEmployee: {},
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

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

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

      const workEntries = entries.filter(
        (e: any) => e.status === 'approved' && e.entry_type === 'work'
      );

      const totalHours = workEntries.reduce((sum: number, e: any) => sum + e.hours, 0);

      // Aggregate by location and employee
      const hoursByLocation: { [key: string]: number } = { Costabissara: 0, 'Vicenza Est': 0 };
      const hoursByEmployee: { [key: string]: { name: string; cb: number; ve: number; total: number } } = {};

      workEntries.forEach((entry: any) => {
        hoursByLocation[entry.location] = (hoursByLocation[entry.location] || 0) + entry.hours;

        if (!hoursByEmployee[entry.user_name]) {
          hoursByEmployee[entry.user_name] = {
            name: entry.user_name,
            cb: 0,
            ve: 0,
            total: 0,
          };
        }
        if (entry.location === 'Costabissara') {
          hoursByEmployee[entry.user_name].cb += entry.hours;
        } else if (entry.location === 'Vicenza Est') {
          hoursByEmployee[entry.user_name].ve += entry.hours;
        }
        hoursByEmployee[entry.user_name].total += entry.hours;
      });

      setStats({
        totalEmployees: users.filter((u: any) => u.role === 'employee').length,
        totalHours,
        pendingApprovals: approvals.length,
      });
      setLocationStats({ hoursByLocation, hoursByEmployee });
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
        if (Platform.OS === 'web') {
          window.alert('Nessuna voce trovata per il mese selezionato');
        } else {
          Alert.alert('Attenzione', 'Nessuna voce trovata per il mese selezionato');
        }
        setExporting(false);
        return;
      }

      await exportMonthlyExcel(entries, month);
    } catch (error) {
      console.error('Error exporting:', error);
      if (Platform.OS === 'web') {
        window.alert('Errore durante la generazione del file Excel');
      } else {
        Alert.alert('Errore', 'Errore durante la generazione del file Excel');
      }
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

  const employeeList = Object.values(locationStats.hoursByEmployee).sort(
    (a, b) => b.total - a.total
  );

  const cbTotal = locationStats.hoursByLocation['Costabissara'] || 0;
  const veTotal = locationStats.hoursByLocation['Vicenza Est'] || 0;

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

        {/* Hours by Location */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📍 Ore per Sede - Mese Corrente</Text>
          <View style={styles.locationStatsGrid}>
            <View style={styles.locationStatCard}>
              <Ionicons name="business" size={28} color="#3498db" />
              <Text style={styles.locationName}>Costabissara</Text>
              <Text style={styles.locationHours}>{cbTotal}h</Text>
              <View style={styles.locationPercentBar}>
                <View
                  style={[
                    styles.locationPercentFill,
                    {
                      width: `${cbTotal + veTotal > 0 ? (cbTotal / (cbTotal + veTotal)) * 100 : 0}%`,
                      backgroundColor: '#3498db',
                    },
                  ]}
                />
              </View>
              <Text style={styles.locationPercent}>
                {cbTotal + veTotal > 0 ? Math.round((cbTotal / (cbTotal + veTotal)) * 100) : 0}%
              </Text>
            </View>

            <View style={styles.locationStatCard}>
              <Ionicons name="business" size={28} color="#e74c3c" />
              <Text style={styles.locationName}>Vicenza Est</Text>
              <Text style={styles.locationHours}>{veTotal}h</Text>
              <View style={styles.locationPercentBar}>
                <View
                  style={[
                    styles.locationPercentFill,
                    {
                      width: `${cbTotal + veTotal > 0 ? (veTotal / (cbTotal + veTotal)) * 100 : 0}%`,
                      backgroundColor: '#e74c3c',
                    },
                  ]}
                />
              </View>
              <Text style={styles.locationPercent}>
                {cbTotal + veTotal > 0 ? Math.round((veTotal / (cbTotal + veTotal)) * 100) : 0}%
              </Text>
            </View>
          </View>
        </View>

        {/* Hours by Employee */}
        {employeeList.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>👥 Ore per Dipendente - Mese Corrente</Text>
            {employeeList.map((emp) => (
              <View key={emp.name} style={styles.employeeRow}>
                <Text style={styles.employeeName}>{emp.name}</Text>
                <View style={styles.employeeStats}>
                  {emp.cb > 0 && (
                    <View style={[styles.employeeBadge, { backgroundColor: '#3498db22', borderColor: '#3498db' }]}>
                      <Text style={[styles.employeeBadgeText, { color: '#3498db' }]}>
                        CB: {emp.cb}h
                      </Text>
                    </View>
                  )}
                  {emp.ve > 0 && (
                    <View style={[styles.employeeBadge, { backgroundColor: '#e74c3c22', borderColor: '#e74c3c' }]}>
                      <Text style={[styles.employeeBadgeText, { color: '#e74c3c' }]}>
                        VE: {emp.ve}h
                      </Text>
                    </View>
                  )}
                  <Text style={styles.employeeTotal}>= {emp.total}h</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.exportSection}>
          <Text style={styles.sectionTitle}>📊 Esportazione Consuntivi</Text>
          <Text style={styles.sectionDescription}>
            Genera un file Excel professionale per l&apos;ufficio paghe con riepilogo, dettaglio e suddivisione per sede
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
                <Text style={styles.exportButtonText}>Esporta Excel Mensile</Text>
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
  container: { flex: 1, backgroundColor: '#0c0c0c' },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0c0c0c',
  },
  content: { padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#999', marginBottom: 24 },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16,
    width: '47%', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#333',
  },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 13, color: '#999' },
  sectionCard: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: '#333',
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 16 },
  locationStatsGrid: { flexDirection: 'row', gap: 12 },
  locationStatCard: {
    flex: 1, backgroundColor: '#0c0c0c', borderRadius: 10,
    padding: 14, alignItems: 'center', gap: 6,
  },
  locationName: { fontSize: 13, color: '#999', fontWeight: '600' },
  locationHours: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  locationPercentBar: {
    width: '100%', height: 6, backgroundColor: '#333',
    borderRadius: 3, overflow: 'hidden', marginTop: 4,
  },
  locationPercentFill: { height: '100%', borderRadius: 3 },
  locationPercent: { fontSize: 11, color: '#999' },
  employeeRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#333',
  },
  employeeName: { fontSize: 14, color: '#fff', fontWeight: '500', flex: 1 },
  employeeStats: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  employeeBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  employeeBadgeText: { fontSize: 11, fontWeight: '600' },
  employeeTotal: { fontSize: 13, color: '#fff', fontWeight: 'bold', marginLeft: 4 },
  exportSection: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 20,
    borderWidth: 1, borderColor: '#333',
  },
  sectionDescription: { fontSize: 13, color: '#999', marginBottom: 16, lineHeight: 18 },
  exportButton: {
    backgroundColor: '#e74c3c', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 12, padding: 16, borderRadius: 12,
  },
  exportButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  modalContainer: {
    flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0c0c0c', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 16, maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#333',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  monthOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#333',
  },
  monthOptionSelected: { backgroundColor: '#1a1a1a' },
  monthOptionText: { fontSize: 16, color: '#fff' },
});
