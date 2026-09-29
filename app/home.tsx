import { StyleSheet, Text, View } from 'react-native';

import { useAuthState, ZingHomeView } from '../modules/zing-sdk';

export default function HomeTab() {
  const authState = useAuthState();

  if (authState?.status !== 'loggedIn') {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.message}>Log in on the Settings tab to see the Zing home screen</Text>
      </View>
    );
  }

  return <ZingHomeView style={styles.fill} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  placeholder: { flex: 1, justifyContent: 'center', padding: 24 },
  message: { fontSize: 24, textAlign: 'center' }
});
