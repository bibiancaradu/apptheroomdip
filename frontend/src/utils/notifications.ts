import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('weekly-reminder', {
        name: 'Promemoria Settimanale',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#e74c3c',
      });
    }

    return true;
  } catch (error) {
    console.error('Error registering notifications:', error);
    return false;
  }
}

export async function scheduleWeeklyReminder(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    await cancelWeeklyReminder();

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'THE ROOM BARBERIA',
        body: 'Ricordati di inserire le ore della settimana!',
        sound: true,
        data: { type: 'weekly-reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 2,
        hour: 9,
        minute: 0,
      } as any,
    });

    return identifier;
  } catch (error) {
    console.error('Error scheduling reminder:', error);
    return null;
  }
}

export async function cancelWeeklyReminder(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if ((notification.content.data as any)?.type === 'weekly-reminder') {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch (error) {
    console.error('Error canceling reminder:', error);
  }
}

export async function hasScheduledReminder(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.some(
      (notification) =>
        (notification.content.data as any)?.type === 'weekly-reminder'
    );
  } catch (error) {
    return false;
  }
}
