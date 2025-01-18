import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, View, StyleSheet, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import installations from '@react-native-firebase/installations';
import inAppMessaging from '@react-native-firebase/in-app-messaging';

function App() {
  const [notificationColor, setNotificationColor] = useState('#ef7d13');
  const [notificationTitle, setNotificationTitle] = useState('Welcome!');
  const [notificationContent, setNotificationContent] = useState('Firebase Messaging Test App');
  const [featureTestResults, setFeatureTestResults] = useState({
    realTimeNotification: false,
    realTimeDataOnly: false,
    customizableAlerts: false,
    topicSubscription: false,
  });
  const [scenarioTriggered, setScenarioTriggered] = useState('No scenario triggered yet');
  const [inAppMessageShown, setInAppMessageShown] = useState(false); // Track if in-app message is shown

  useEffect(() => {
    const requestUserPermission = async () => {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Authorization status:', authStatus);
        getFcmToken();
        logInstallationId();
        subscribeToTopic();
      }
    };

    const getFcmToken = async () => {
      try {
        const token = await messaging().getToken();
        if (token) {
          console.log('FCM Token:', token);
        }
      } catch (error) {
        console.error('Failed to get FCM token:', error);
      }
    };

    const logInstallationId = async () => {
      try {
        const installationId = await installations().getId();
        console.log('Firebase Installation ID:', installationId);
      } catch (error) {
        console.error('Failed to get Firebase Installation ID:', error);
      }
    };

    const subscribeToTopic = async () => {
      try {
        await messaging().subscribeToTopic('news');
        setFeatureTestResults(prev => ({
          ...prev,
          topicSubscription: true,
        }));
        console.log('Subscribed to "news" topic');
      } catch (error) {
        console.error('Failed to subscribe to topic:', error);
      }
    };

    requestUserPermission();

    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('New foreground message:', remoteMessage);

      const title = remoteMessage.notification?.title || 'New Notification';
      const body = remoteMessage.notification?.body || 'You have a new message';

      if (remoteMessage.notification && remoteMessage.data.customizableAlert === 'true') {
        setFeatureTestResults(prev => ({
          ...prev,
          customizableAlerts: true,
        }));
        Alert.alert('Customizable Alert', body, [{ text: 'OK' }], { cancelable: true });
        setScenarioTriggered('Customizable alert received in foreground');
      }

      if (remoteMessage.notification && !remoteMessage.data.customizableAlert) {
        setFeatureTestResults(prev => ({
          ...prev,
          realTimeNotification: true,
        }));
        Alert.alert(title, body, [{ text: 'OK' }], { cancelable: true });
        setScenarioTriggered('Notification received in foreground');
      }

      if (remoteMessage.data && !remoteMessage.notification) {
        setFeatureTestResults(prev => ({
          ...prev,
          realTimeDataOnly: true,
        }));
        setScenarioTriggered('Data-only message received in foreground');
      }

      setNotificationTitle(title);
      setNotificationContent(body);
      setNotificationColor('#ef7d13');
    });

    // Display In-App message
    const displayInAppMessage = () => {
      inAppMessaging()
        .triggerEvent('app_open') // Trigger event when the app opens
        .then(() => {
          setInAppMessageShown(true);
          console.log('In-App message successfully triggered and assumed displayed');
        })
        .catch(error => console.error('Failed to trigger in-app message:', error));
    };

    displayInAppMessage(); // Call the function to display in-app message when the app opens

    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Background Message:', remoteMessage);

      if (remoteMessage.data && !remoteMessage.notification) {
        setFeatureTestResults(prev => ({
          ...prev,
          realTimeDataOnly: true,
        }));
        setScenarioTriggered('App received background data-only message');
      }

      if (remoteMessage.notification && remoteMessage.data.customizableAlert === 'true') {
        setFeatureTestResults(prev => ({
          ...prev,
          customizableAlerts: true,
        }));
        setScenarioTriggered('Customizable alert received in background');
      }

      if (remoteMessage.notification && !remoteMessage.data.customizableAlert) {
        setFeatureTestResults(prev => ({
          ...prev,
          realTimeNotification: true,
        }));
        setScenarioTriggered('Notification received in background');
      }
    });

    const handleNotificationOpenedApp = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification caused app to open from background:', remoteMessage);

      if (remoteMessage.notification) {
        setScenarioTriggered('App opened via notification');
        setFeatureTestResults(prev => ({
          ...prev,
          realTimeNotification: true,
        }));
        const title = remoteMessage.notification.title || 'No Title';
        const body = remoteMessage.notification.body || 'No Body';
        setNotificationTitle(title);
        setNotificationContent(body);
      }

      if (remoteMessage.data && !remoteMessage.notification) {
        setScenarioTriggered('App opened via data-only message');
        setFeatureTestResults(prev => ({
          ...prev,
          realTimeDataOnly: true,
        }));
        const dataTitle = remoteMessage.data.title || 'Data-only Message';
        const dataBody = remoteMessage.data.body || 'You have new data content to view.';
        setNotificationTitle(dataTitle);
        setNotificationContent(dataBody);
      }
    });

    return () => {
      unsubscribe();
      handleNotificationOpenedApp();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Welcome to the Firebase Messaging App</Text>
      </View>

      <View style={[styles.notification, { backgroundColor: notificationColor }]}>
        <Text style={styles.notificationTitle}>{notificationTitle}</Text>
        <Text style={styles.notificationContent}>{notificationContent}</Text>
        <Text style={styles.notificationContent}>
          Scenario Triggered: {scenarioTriggered}
        </Text>
      </View>

      <View style={styles.separator} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        <Text style={styles.sectionContent}>
          - Real-time notifications{featureTestResults.realTimeNotification && " ✅"}
          {'\n'}
          - Real-time data-only notifications{featureTestResults.realTimeDataOnly && " ✅"}
          {'\n'}
          - Customizable alerts based on message title{featureTestResults.customizableAlerts && " ✅"}
          {'\n'}
          - Subscribed to "news" topic{featureTestResults.topicSubscription && " ✅"}
          {'\n'}
          - In-App Message Displayed{inAppMessageShown && " ✅"}
          {'\n'}
        </Text>
      </View>

      <View style={styles.separator} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Introduction</Text>
        <Text style={styles.sectionContent}>
          This app demonstrates Firebase Messaging and In-App Messaging.
        </Text>
      </View>

      <View style={styles.separator} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Getting Started</Text>
        <Text style={styles.sectionContent}>
          To test in-app messaging, set up a message in Firebase Console with a trigger, like app open.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131e2f',
  },
  header: {
    backgroundColor: '#0a0f14',
    padding: 20,
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  notification: {
    padding: 20,
    margin: 10,
    borderRadius: 10,
  },
  notificationTitle: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  notificationContent: {
    fontSize: 14,
    color: 'white',
  },
  separator: {
    height: 1,
    backgroundColor: '#c8c8c8',
    marginVertical: 10,
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  sectionContent: {
    fontSize: 14,
    color: 'white',
  },
});

export default App;
