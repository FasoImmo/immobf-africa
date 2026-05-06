import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import BrowseScreen from "./screens/BrowseScreen";
import PropertyScreen from "./screens/PropertyScreen";
import LoginScreen from "./screens/LoginScreen";
import PaymentScreen from "./screens/PaymentScreen";
import { init as initOffline } from "./lib/offline";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function HomeTabs() {
  return (
    <Tabs.Navigator screenOptions={{ tabBarActiveTintColor: "#0E7C66" }}>
      <Tabs.Screen name="Parcourir" component={BrowseScreen} />
      <Tabs.Screen name="Compte" component={LoginScreen} />
    </Tabs.Navigator>
  );
}

export default function App() {
  useEffect(() => { try { initOffline(); } catch {} }, []);
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{
        headerStyle: { backgroundColor: "#0E7C66" },
        headerTintColor: "white",
      }}>
        <Stack.Screen name="ImmoBF" component={HomeTabs} />
        <Stack.Screen name="Property" component={PropertyScreen} options={{ title: "Annonce" }} />
        <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: "Paiement" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
