import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { initialize } from '../modules/zing-sdk';

initialize({
  configuration: {
    coachesAvailability: 'userGenderBased',
    genderAvailability: 'binary',
    healthBackgroundSync: true
  },
  theme: {
    colors: { brandPrimary: '#F2001F', brandSecondary: '#980052' },
    cornersRounding: { button: { type: 'value', value: 0 } }
  }
}).catch(console.error);

export default function RootLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />
        }}
      />
    </Tabs>
  );
}
