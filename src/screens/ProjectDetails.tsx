import React from "react";
import { View, Text } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ProjectsStackParamList } from "../Root/ProjectsStack";

type Props = NativeStackScreenProps<ProjectsStackParamList, "Project">;

export default function ProjectDetails({ route }: Props) {
  const { projetoId, nome } = route.params; // agora tipado certinho
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>{nome}</Text>
      <Text style={{ opacity: 0.7, marginTop: 6 }}>ID: {projetoId}</Text>
    </View>
  );
}
