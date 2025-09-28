// src/screens/ProjectsScreen.tsx
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { listProjetos } from "../../api";
import { Projeto } from "../../types";
import { ProjectsStackParamList } from "../../Root/ProjectsStack"; // <-- importe o tipo do stack

type Props = NativeStackScreenProps<ProjectsStackParamList, "ProjectsList">;

export default function ProjectsScreen({ navigation }: Props) {
  const [data, setData] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await listProjetos();
      setData(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={data}
        keyExtractor={(it) => String(it.id)} // <-- sempre string
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading ? <Text style={{ opacity: 0.6 }}>Nenhum projeto.</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("Project", {
                projetoId: String(item.id), // <-- garante string
                nome: item.nome,
              })
            }
            style={{
              padding: 14,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 12,
              marginBottom: 10,
              backgroundColor: "#fff",
            }}
          >
            <Text style={{ fontWeight: "700" }}>{item.nome}</Text>
            <Text style={{ opacity: 0.6, marginTop: 4 }}>
              {item.created_at
                ? new Date(item.created_at).toLocaleString()
                : "—"}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
