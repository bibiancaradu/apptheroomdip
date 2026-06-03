import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Switch,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  registerForNotifications,
  scheduleWeeklyReminder,
  cancelWeeklyReminder,
  hasScheduledReminder,
} from '../../src/utils/notifications';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
}

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [togglingNotifications, setTogglingNotifications] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadUser();
    checkNotificationStatus();
  }, []);

  const loadUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        setUser(JSON.parse(userStr));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNotificationStatus = async () => {
    const enabled = await hasScheduledReminder();
    setNotificationsEnabled(enabled);
  };

  const toggleNotifications = async (value: boolean) => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Non disponibile',
        'Le notifiche settimanali sono disponibili solo nell\'app mobile (Expo Go o build nativa)'
      );
      return;
    }

    setTogglingNotifications(true);
    try {
      if (value) {
        const hasPermission = await registerForNotifications();
        if (!hasPermission) {
          Alert.alert(
            'Permessi negati',
            'Concedi i permessi per ricevere il promemoria settimanale ogni lunedì alle 9:00'
          );
          setTogglingNotifications(false);
          return;
        }
        const id = await scheduleWeeklyReminder();
        if (id) {
          setNotificationsEnabled(true);
          Alert.alert(
            'Promemoria attivato',
            'Riceverai un promemoria ogni lunedì alle 9:00 per inserire le ore della settimana'
          );
        }
      } else {
        await cancelWeeklyReminder();
        setNotificationsEnabled(false);
        Alert.alert('Promemoria disattivato', 'Non riceverai più promemoria settimanali');
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Errore', 'Errore durante la gestione delle notifiche');
    } finally {
      setTogglingNotifications(false);
    }
  };

  const handleLogout = () => {
    const performLogout = async () => {
      try {
        await AsyncStorage.clear();
        if (Platform.OS === 'web') {
          window.location.href = '/login';
        } else {
          router.replace('/login');
        }
      } catch (error) {
        console.error('Logout error:', error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Vuoi uscire?')) {
        performLogout();
      }
    } else {
      Alert.alert(
        'Conferma',
        'Vuoi uscire?',
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Esci', style: 'destructive', onPress: performLogout },
        ]
      );
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
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color="#fff" />
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.username}>@{user?.username}</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="briefcase-outline" size={20} color="#999" />
            <Text style={styles.infoLabel}>Ruolo</Text>
            <Text style={styles.infoValue}>Dipendente</Text>
          </View>
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Impostazioni</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications-outline" size={24} color="#e74c3c" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Promemoria settimanale</Text>
                <Text style={styles.settingDescription}>
                  Ogni lunedì alle 9:00
                </Text>
              </View>
            </View>
            {togglingNotifications ? (
              <ActivityIndicator color="#e74c3c" />
            ) : (
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: '#333', true: '#e74c3c' }}
                thumbColor="#fff"
                disabled={Platform.OS === 'web'}
              />
            )}
          </View>

          {Platform.OS === 'web' && (
            <Text style={styles.webNote}>
              ⚠️ Le notifiche sono disponibili solo nell&apos;app mobile
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
          <Text style={styles.logoutText}>Esci</Text>
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
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#999',
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#999',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  settingsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  webNote: {
    fontSize: 12,
    color: '#f39c12',
    marginTop: 12,
    fontStyle: 'italic',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  logoutText: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '600',
  },
});
