import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { TouchableOpacity, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "./screens/HomeScreen";
import BrowseScreen from "./screens/BrowseScreen";
import PropertyScreen from "./screens/PropertyScreen";
import LoginScreen from "./screens/LoginScreen";
import PaymentScreen from "./screens/PaymentScreen";
import SellScreen from "./screens/SellScreen";
import MessagesScreen from "./screens/MessagesScreen";
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
  const TAB_ICONS = {
    Accueil:  { active: "home",        inactive: "home-outline" },
    Parcourir:{ active: "search",      inactive: "search-outline" },
    Publier:  { active: "add-circle",  inactive: "add-circle-outline" },
    Compte:   { active: "person",      inactive: "person-outline" },
  };

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: "#0E7C66",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#eee",
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = TAB_ICONS[route.name] || {};
          return (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tabs.Screen
        name="Accueil"
        component={HomeScreen}
        options={{
          tabBarLabel: lang === "fr" ? "Accueil" : "Home",
          title: lang === "fr" ? "Accueil" : "Home",
          headerShown: false,
        }}
      />
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
      <Stack.Screen name="Property" component={PropertyScreen} options={{ title: "Annonce" }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: "Paiement" }} />
      <Stack.Screen name="Messages" component={MessagesScreen} options={{ title: "💬 Messages" }} />
    </Stack.Navigator>
  );
}

export default function App() {
  useEffect(() => { try { initOffline(); } catch {} }, []);
  return (
    <LangProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </LangProvider>
  );
}
