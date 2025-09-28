import { View, Text, Pressable } from "react-native";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, padding: 24, gap: 16, justifyContent: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>VIU Mobile</Text>
      <Text style={{ fontSize: 16, opacity: 0.8 }}>
        Starter limpo com Expo + TS. Sem Babel custom.
      </Text>
      <Pressable
        onPress={() => alert("Olá do mobile 👋")}
        style={{
          backgroundColor: "#111",
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
          Testar ação
        </Text>
      </Pressable>
    </View>
  );
}
