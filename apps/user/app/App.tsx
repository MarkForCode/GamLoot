import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View
      accessibilityLabel="user-app-root"
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      testID="user-app-root"
    >
      <Text accessibilityLabel="user-app-title" testID="user-app-title">
        Game Trade - User App
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}
