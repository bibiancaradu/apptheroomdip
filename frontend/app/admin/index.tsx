import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalHours: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      // Fetch users
      const usersResponse = await fetch(`${BACKEND_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const users = await usersResponse.json();
      
      // Fetch approvals
      const approvalsResponse = await fetch(`${BACKEND_URL}/api/approvals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const approvals = await approvalsResponse.json();
      
      // Fetch current month entries
      const currentMonth = new Date().toISOString().slice(0, 7);
      const entriesResponse = await fetch(
        `${BACKEND_URL}/api/time-entries?month=${currentMonth}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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

  const handleExport = async () => {
    Alert.alert(
      'Esporta Consuntivo',
      'Seleziona il mese da esportare',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Mese Corrente',
          onPress: () => exportMonth(new Date().toISOString().slice(0, 7)),
        },
      ]
    );
  };

  const exportMonth = async (month: string) => {
    setExporting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        `${BACKEND_URL}/api/time-entries?month=${month}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const entries = await response.json();
      
      // Group by employee
      const byEmployee: any = {};
      entries.forEach((entry: any) => {
        if (!byEmployee[entry.user_name]) {
          byEmployee[entry.user_name] = {
            workHours: 0,
            vacationDays: 0,
            sickDays: 0,
            permitHours: 0,
            entries: [],
          };
        }
        
        byEmployee[entry.user_name].entries.push(entry);
        
        if (entry.status === 'approved') {
          if (entry.entry_type === 'work') {
            byEmployee[entry.user_name].workHours += entry.hours;
          } else if (entry.entry_type === 'vacation') {
            byEmployee[entry.user_name].vacationDays += 1;
          } else if (entry.entry_type === 'sick') {
            byEmployee[entry.user_name].sickDays += 1;
          } else if (entry.entry_type === 'permit') {
            byEmployee[entry.user_name].permitHours += entry.hours;
          }
        }
      });

      // Create summary text
      let summary = `CONSUNTIVO ORARI - ${month}\n`;
      summary += `THE ROOM BARBERIA\n\n`;
      summary += `================================\n\n`;
      
      Object.keys(byEmployee).forEach((name) => {
        const data = byEmployee[name];
        summary += `${name}:\n`;
        summary += `  Ore lavorate: ${data.workHours}h\n`;
        summary += `  Giorni ferie: ${data.vacationDays}\n`;
        summary += `  Giorni malattia: ${data.sickDays}\n`;
        summary += `  Ore permessi: ${data.permitHours}h\n`;
        summary += `\n`;
      });

      Alert.alert('Consuntivo', summary, [{ text: 'OK' }]);
    } catch (error) {
      console.error('Error exporting:', error);
      Alert.alert('Errore', 'Errore durante esportazione');
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

        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="download-outline" size={24} color="#fff" />
              <Text style={styles.exportButtonText}>Esporta Consuntivo Mensile</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  exportButton: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
