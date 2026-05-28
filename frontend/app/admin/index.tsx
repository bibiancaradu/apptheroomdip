import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboard() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Dashboard Admin</Text>
        <Text style={styles.subtitle}>Benvenuto, Marius!</Text>

        <View style={styles.cardsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={32} color="#e74c3c" />
            <Text style={styles.statNumber}>6</Text>
            <Text style={styles.statLabel}>Dipendenti</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="time" size={32} color="#27ae60" />
            <Text style={styles.statNumber}>-</Text>
            <Text style={styles.statLabel}>Ore Mese</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={32} color="#f39c12" />
            <Text style={styles.statNumber}>-</Text>
            <Text style={styles.statLabel}>In Attesa</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="location" size={32} color="#3498db" />
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Sedi</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
