import React, { useState, useEffect, useRef, useMemo } from 'react';

import { View, Text, ScrollView, StyleSheet, StatusBar, Dimensions, Pressable, Modal, TextInput, Image, Platform } from 'react-native';

import { Canvas, RoundedRect, BlurMask, Circle, RadialGradient, vec, Rect } from '@shopify/react-native-skia';

import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolate, useDerivedValue, withTiming } from 'react-native-reanimated';

import * as Haptics from 'expo-haptics';

import * as SQLite from 'expo-sqlite';

import * as FileSystem from 'expo-file-system';

import * as Sharing from 'expo-sharing';

import * as ImagePicker from 'expo-image-picker';

import { Gyroscope } from 'expo-sensors';

import ViewShot from "react-native-view-shot";

// --- CONFIGURATION --- const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window'); const COLORS = { bg: '#000000', // True Eco Dark Mode cardBg: '#0F0F11', neonRed: '#FF2A6D', neonBlue: '#05D9E8', neonPurple: '#7700FF', neonGreen: '#00FF9D', neonOrange: '#FF9E00', neonPink: '#FF00CC', neonYellow: '#F2FF00', neonWhite: '#E0E0E0', textMain: '#FFFFFF', textMuted: '#888888' };



// --- DATABASE (Local-First) --- const db = SQLite.openDatabase('mindpalace.db'); const initDB = (refreshGrid) => { db.transaction(tx => { tx.executeSql( 'CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, body TEXT, emotionColor TEXT, intensity INTEGER, date TEXT, imageUri TEXT);', [], () => refreshGrid(), (_, err) => console.error(err) ); }); };



const exportData = async () => { db.transaction(tx => { tx.executeSql('SELECT * FROM entries', [], async (_, { rows: { _array } }) => { const json = JSON.stringify(_array, null, 2); const path = FileSystem.documentDirectory + 'mindpalace_backup.json'; await FileSystem.writeAsStringAsync(path, json); await Sharing.shareAsync(path); }); }); };



// --- VISUALS: PARALLAX BACKGROUND --- const AuroraBackground = () => { const gyroX = useSharedValue(0); const gyroY = useSharedValue(0);



useEffect(() => { const subscription = Gyroscope.addListener(({ x, y }) => { gyroX.value = withTiming(x * 50, { duration: 100 }); gyroY.value = withTiming(y * 50, { duration: 100 }); }); Gyroscope.setUpdateInterval(50); return () => subscription && subscription.remove(); }, []);



const style = useAnimatedStyle(() => ({ transform: [{ translateX: gyroX.value }, { translateY: gyroY.value }] }));



return ( <Canvas style={{ flex: 1 }}> <Animated.View style={[StyleSheet.absoluteFill, style]}> <Canvas style={{ flex: 1 }}> {/* Deep Ambient Orbs */} <RadialGradient c={vec(100, 100)} r={200} colors={[COLORS.neonPurple, 'transparent']} /> <RadialGradient c={vec(SCREEN_WIDTH, 600)} r={300} colors={[COLORS.neonBlue, 'transparent']} /> </Animated.View> ); };



// --- COMPONENT: GLOW CARD (With Loud Typography) --- const GlowCard = ({ width, height, emotionColor, title, body, date, imageUri, intensity = 50 }) => { const glowRadius = (intensity / 100) * 30; // Loud Typography Logic: Scale font based on intensity (50 is default) const titleSize = interpolate(intensity, [0, 100], [14, 28]); const finalHeight = imageUri ? height + 120 : height; const PAD = 30;



return ( <Pressable onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} style={{ width, height: finalHeight, marginBottom: 20, justifyContent: 'center', alignItems: 'center' }}> <View style={[StyleSheet.absoluteFill, { top: -PAD, left: -PAD }]}> <Canvas style={{ width: width + PAD * 2, height: finalHeight + PAD * 2 }}> <View style={[styles.cardInner, { width, height: finalHeight }]}> {imageUri && <Image source={{ uri: imageUri }} style={{ width: '100%', height: 120, borderRadius: 12, marginBottom: 12 }} resizeMode="cover" />} <View style={[styles.cardHeader, { borderLeftColor: emotionColor }]}> <Text style={[styles.cardTitle, { fontSize: titleSize, lineHeight: titleSize + 4 }]}>{title} {date} {body} ); };



const MasonryGrid = ({ children }) => { const colWidth = (SCREEN_WIDTH - 48) / 2; const [col1, setCol1] = useState([]); const [col2, setCol2] = useState([]); useEffect(() => { const c1 = [], c2 = []; React.Children.forEach(children, (child, i) => { i % 2 === 0 ? c1.push(child) : c2.push(child); }); setCol1(c1); setCol2(c2); }, [children]); return ( <ScrollView contentContainerStyle={{ paddingTop: 80, paddingBottom: 150, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}> MIND PALACE OFFLINE / ENCRYPTED <View style={{ flexDirection: 'row', gap: 16 }}> <View style={{ width: colWidth }}>{col1} <View style={{ width: colWidth }}>{col2} ); };



// --- MODAL: NEW ENTRY (Thumb Zone Optimized) --- const NewEntryModal = ({ visible, onClose, onSave }) => { const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [mood, setMood] = useState(COLORS.neonBlue); const [image, setImage] = useState(null); const [intensity, setIntensity] = useState(50);



const pickImage = async () => { let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.5 }); if (!result.canceled) setImage(result.assets[0].uri); };



const takePhoto = async () => { let result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.5 }); if (!result.canceled) setImage(result.assets[0].uri); }



const handleSave = () => { if (!title) return; // Heartbeat Haptics Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 100);



onSave(title, body, mood, intensity, image);

setTitle(''); setBody(''); setImage(null); onClose();

};



return ( <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 20}}> NEW MEMORY <Text style={{color:'#666', fontWeight:'bold'}}>CLOSE



      {/* Inputs */}

      <TextInput style={styles.inputTitle} placeholder="TITLE..." placeholderTextColor="#555" value={title} onChangeText={setTitle} />

      <TextInput style={styles.inputBody} placeholder="What's on your mind?" placeholderTextColor="#555" multiline value={body} onChangeText={setBody} />

      

      {/* Photo Actions */}

      <View style={{flexDirection: 'row', gap: 10, marginBottom: 20}}>

        {image && <Image source={{ uri: image }} style={{ width: 60, height: 60, borderRadius: 8 }} />}

        <Pressable onPress={pickImage} style={styles.photoBtn}><Text style={styles.photoBtnText}>📷 LIBRARY</Text></Pressable>

        <Pressable onPress={takePhoto} style={styles.photoBtn}><Text style={styles.photoBtnText}>📸 RAW CAM</Text></Pressable>

      </View>

      {/* Moods */}

      <View style={{gap: 12, marginBottom: 25}}>

        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>

            {[COLORS.neonRed, COLORS.neonOrange, COLORS.neonYellow, COLORS.neonGreen].map(c => <Pressable key={c} onPress={() => setMood(c)} style={[styles.moodCircle, { backgroundColor: c, borderWidth: mood === c ? 2 : 0, borderColor: '#FFF' }]} />)}

        </View>

        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>

            {[COLORS.neonBlue, COLORS.neonPurple, COLORS.neonPink, COLORS.neonWhite].map(c => <Pressable key={c} onPress={() => setMood(c)} style={[styles.moodCircle, { backgroundColor: c, borderWidth: mood === c ? 2 : 0, borderColor: '#FFF' }]} />)}

        </View>

      </View>

      {/* Intensity Slider Simulation */}

      <Text style={{color:'#666', fontSize:10, marginBottom:5}}>INTENSITY: {Math.round(intensity)}%</Text>

      <View style={{height: 4, backgroundColor:'#333', borderRadius:2, marginBottom:30}}>

         <View style={{width: `${intensity}%`, height:'100%', backgroundColor: mood}} />

      </View>

      {/* To keep it simple, we simulate slider by tapping, real slider requires extra lib. 

          In V2 use @react-native-community/slider */}

      <Pressable onPress={handleSave} style={[styles.saveBtn, { shadowColor: mood }]}>

        <Text style={styles.saveBtnText}>SAVE MEMORY</Text>

      </Pressable>

    </View>

  </View>

</Modal>

); };



// --- COMPONENT: WEEKLY WRAPPED --- const WeeklyWrappedModal = ({ visible, onClose, entries }) => { const viewShotRef = useRef(); const stats = useMemo(() => { if (entries.length === 0) return null; const counts = {}; entries.forEach(e => counts[e.emotionColor] = (counts[e.emotionColor] || 0) + 1); const topColor = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b); const percentage = Math.round((counts[topColor] / entries.length) * 100);



let vibeName = "UNKNOWN";

if (topColor === COLORS.neonRed) vibeName = "INTENSE";

if (topColor === COLORS.neonBlue) vibeName = "DREAMY";

if (topColor === COLORS.neonGreen) vibeName = "GROWTH";

if (topColor === COLORS.neonPurple) vibeName = "MYSTIC";

if (topColor === COLORS.neonOrange) vibeName = "CREATIVE";

if (topColor === COLORS.neonPink) vibeName = "ROMANTIC";

if (topColor === COLORS.neonYellow) vibeName = "ELECTRIC";

if (topColor === COLORS.neonWhite) vibeName = "STOIC";

return { topColor, percentage, vibeName };

}, [entries]); const handleShare = async () => { try { const uri = await viewShotRef.current.capture(); await Sharing.shareAsync(uri); } catch (err) {} }; if (!stats) return null; return ( <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }}> <View style={[styles.wrappedCard, { shadowColor: stats.topColor }]}> <RadialGradient c={vec(150, 260)} r={120} colors={[stats.topColor, 'transparent']} /> MY VIBE THIS WEEK <Text style={[styles.statPercent, { color: stats.topColor }]}>{stats.percentage}% {stats.vibeName} MIND PALACE SHARE TO STORY <Text style={{color: '#666'}}>CLOSE ); };



// --- ORB NAVIGATION --- const MoodOrb = ({ onMainPress, onSettingsPress, onWrappedPress }) => { const expanded = useSharedValue(0); const toggle = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); expanded.value = withSpring(expanded.value === 0 ? 1 : 0); }; const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(expanded.value, [0, 1], [1, 0.9]) }] })); const Satellite = ({ angle, color, onPress }) => { const style = useAnimatedStyle(() => { const rad = (angle * Math.PI) / 180, d = 110; return { transform: [{ translateX: interpolate(expanded.value, [0, 1], [0, d * Math.cos(rad)]) }, { translateY: interpolate(expanded.value, [0, 1], [0, d * Math.sin(rad)]) }, { scale: expanded.value }], opacity: expanded.value }; }); return <Pressable onPress={onPress} style={{position: 'absolute'}}><Animated.View style={[styles.satellite, style, { borderColor: color, shadowColor: color }]}><View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: color}} /></Animated.View>; }; return ( <Animated.View style={[styles.orb, orbStyle]}><Canvas style={{ width: 80, height: 80 }}><RadialGradient c={vec(40, 40)} r={40} colors={[COLORS.neonBlue, COLORS.neonPurple]} positions={[0, 1]} /></Animated.View> ); };



export default function App() { const [entries, setEntries] = useState([]); const [modalVisible, setModalVisible] = useState(false); const [wrappedVisible, setWrappedVisible] = useState(false); const colWidth = (SCREEN_WIDTH - 48) / 2;



const refreshGrid = () => { db.transaction(tx => { tx.executeSql('SELECT * FROM entries ORDER BY id DESC', [], (_, { rows: { _array } }) => setEntries(_array)); }); }; useEffect(() => { initDB(refreshGrid); }, []);



const handleSaveEntry = (title, body, emotionColor, intensity, imageUri) => { const date = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); db.transaction(tx => { tx.executeSql('INSERT INTO entries (title, body, emotionColor, intensity, date, imageUri) VALUES (?, ?, ?, ?, ?, ?)', [title, body, emotionColor, intensity, date, imageUri], () => refreshGrid()); }); };



return ( {entries.length === 0 ? <Text style={{color: '#555', marginTop: 100, marginLeft: 20}}>Tap the Orb to create a memory... : entries.map(e => <GlowCard key={e.id} width={colWidth} height={200} {...e} />)} <NewEntryModal visible={modalVisible} onClose={() => setModalVisible(false)} onSave={handleSaveEntry} /> <WeeklyWrappedModal visible={wrappedVisible} onClose={() => setWrappedVisible(false)} entries={entries} /> <MoodOrb onMainPress={() => setModalVisible(true)} onSettingsPress={exportData} onWrappedPress={() => setWrappedVisible(true)} /> ); }



const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: COLORS.bg }, headerContainer: { marginBottom: 24 }, headerTitle: { color: 'white', fontSize: 28, fontWeight: '900', letterSpacing: 1.5 }, badgeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 }, badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.neonGreen, marginRight: 6 }, headerSubtitle: { color: COLORS.neonGreen, fontSize: 10, letterSpacing: 2, fontWeight: '700' }, cardInner: { backgroundColor: COLORS.cardBg, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }, cardHeader: { borderLeftWidth: 3, paddingLeft: 12, marginBottom: 12 }, cardTitle: { color: 'white', fontWeight: '800', textTransform: 'uppercase' }, cardDate: { color: COLORS.textMuted, fontSize: 10, marginTop: 4, fontWeight: '600' }, cardBody: { color: '#DDD', fontSize: 13, lineHeight: 20, opacity: 0.9 }, orbContainer: { position: 'absolute', bottom: 50, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', zIndex: 100 }, orb: { width: 80, height: 80, borderRadius: 40, shadowColor: COLORS.neonBlue, shadowRadius: 25, shadowOpacity: 0.5 }, satellite: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: '#000', borderWidth: 1, justifyContent: 'center', alignItems: 'center', shadowOffset: {width: 0, height: 0}, shadowRadius: 10, shadowOpacity: 0.5 }, modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end', paddingBottom: 50 }, // Thumb Zone modalContent: { width: '90%', alignSelf: 'center', backgroundColor: '#111', borderRadius: 30, padding: 25, borderWidth: 1, borderColor: '#333' }, modalTitle: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: 2 }, inputTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 10, marginBottom: 20 }, inputBody: { color: '#DDD', fontSize: 16, height: 80, textAlignVertical: 'top', marginBottom: 20 }, moodCircle: { width: 40, height: 40, borderRadius: 20 }, saveBtn: { backgroundColor: 'white', padding: 16, borderRadius: 100, alignItems: 'center', shadowRadius: 10, shadowOpacity: 0.8 }, saveBtnText: { fontWeight: '900', letterSpacing: 1 }, photoBtn: { backgroundColor: '#222', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#333', alignItems: 'center' }, photoBtnText: { color: 'white', fontSize: 10, fontWeight: 'bold' }, wrappedCard: { width: 300, height: 533, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', shadowRadius: 40, shadowOpacity: 0.6, elevation: 10 }, statCircle: { width: 200, height: 200, borderRadius: 100, borderWidth: 4, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginVertical: 40 }, statPercent: { fontSize: 60, fontWeight: '900', color: 'white' }, statName: { fontSize: 24, color: 'white', fontWeight: 'bold', letterSpacing: 4, marginTop: 10 }, wrappedTitle: { color: '#888', fontSize: 16, letterSpacing: 3, fontWeight: '600' }, wrappedWeek: { color: 'white', fontSize: 32, fontWeight: '900', fontStyle: 'italic' }, wrappedFooter: { color: '#444', fontSize: 10, letterSpacing: 2, position: 'absolute', bottom: 30 }, actionRow: { marginTop: 30, width: 300 }, shareBtn: { backgroundColor: 'white', paddingVertical: 16, borderRadius: 30, alignItems: 'center' }, btnText: { fontWeight: 'bold', letterSpacing: 1 }, closeTextBtn: { alignItems: 'center', marginTop: 15 } });




