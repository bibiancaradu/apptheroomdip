import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ApprovalsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Approvazioni (Coming soon)</Text>
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
