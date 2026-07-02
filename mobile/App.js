import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { TouchableOpacity, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import BrowseScreen from "./screens/BrowseScreen";
import PropertyScreen from "./screens/PropertyScreen";
import LoginScreen from "./screens/LoginScreen";
import PaymentScreen from "./screens/PaymentScreen";
import SellScreen from "./screens/SellScreen";
import { init as initOffline } from "./lib/offline";
import { LangProvider, useLang } from "./lib/lang";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <TouchableOpacity
      onPress={() => setLang(lang === "fr" ? "en" : "fr")}
      style={{ marginRight: 14, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}
    >
      <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }}>
        {lang === "fr" ? "EN" : "FR"}
      </Text>
    </TouchableOpacity>
  );
}

function HomeTabs() {
  const { lang } = useLang();
  return (
    <Tabs.Navigator screenOptions={{ tabBarActiveTintColor: "#0E7C66" }}>
      <Tabs.Screen
        name="Parcourir"
        component={BrowseScreen}
        options={{
          tabBarLabel: lang === "fr" ? "Parcourir" : "Browse",
          title: lang === "fr" ? "Parcourir" : "Browse",
        }}
      />
      <Tabs.Screen
        name="Publier"
        component={SellScreen}
        options={{
          tabBarLabel: lang === "fr" ? "Publier" : "Publish",
          title: lang === "fr" ? "Publier" : "Publish",
        }}
      />
      <Tabs.Screen
        name="Compte"
        component={LoginScreen}
        options={{
          tabBarLabel: lang === "fr" ? "Compte" : "Account",
          title: lang === "fr" ? "Compte" : "Account",
        }}
      />
    </Tabs.Navigator>
  );
}

function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#0E7C66" },
        headerTintColor: "white",
        headerRight: () => <LangToggle />,
      }}
    >
      <Stack.Screen name="ImmoBF Africa" component={HomeTabs} />
      <Stack.Screen name="Property" component={PropertyScreen} o