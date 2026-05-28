import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function EmployeesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Gestione Dipendenti (Coming soon)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#999',
    fontSize: 16,
  },
});
