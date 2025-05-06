import React, { useState, useRef, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, ScrollView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Audio } from 'expo-av';
import Animated, { useSharedValue, useAnimatedProps, withTiming, withRepeat, withSequence, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, LinearGradient, Stop, Line, Text as SvgText, Path, ClipPath, Pattern } from 'react-native-svg';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import * as FileSystem from 'expo-file-system';

// Configuration audio sera définie dans le composant

// Configuration du thème personnalisé
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0078D7',
    accent: '#FF4081',
    background: '#121212',
    text: '#FFFFFF',
  },
};

// Création des composants animés avec Reanimated
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function App() {
  // État pour gérer les différentes phases de l'application
  const [loading, setLoading] = useState(false);
  const [audioText, setAudioText] = useState('');
  const [sound, setSound] = useState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');
  const [userQuery, setUserQuery] = useState('Bonjour Jarvis, comment vas-tu ?');
  
  // Configuration audio pour l'application
  useEffect(() => {
    async function setupAudio() {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        console.log('Configuration audio réussie');
      } catch (err) {
        console.error('Erreur de configuration audio:', err);
      }
    }
    
    setupAudio();
  }, []);
  
  // Valeurs d'animation
  const radius = useSharedValue(50);
  const opacity = useSharedValue(0.7);
  const pulsatingRadius = useSharedValue(50);
  const jarvisOpacity = useSharedValue(1); // Pour contrôler l'opacité du texte JARVIS
  
  // Variables d'animation pour les vagues
  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);
  const wave3 = useSharedValue(0);
  
  // Variables pour l'égaliseur audio - 8 triangles autour du cercle
  const audioTriangles = new Array(8).fill(0).map(() => useSharedValue(8 + Math.random() * 10));
  
  // Props animés pour le cercle principal
  const circleProps = useAnimatedProps(() => {
    return {
      r: radius.value,
      opacity: opacity.value,
      // Ajout d'une légère déformation basée sur les ondes
      cx: 150 + Math.sin(wave1.value) * 3,
      cy: 150 + Math.cos(wave2.value) * 2,
    };
  });
  
  // Props animés pour le cercle pulsant
  const pulsatingCircleProps = useAnimatedProps(() => {
    return {
      r: pulsatingRadius.value + Math.sin(wave3.value) * 5, // Rayon qui ondule
      opacity: Math.max(0, 1 - pulsatingRadius.value / 100),
      // Déformation du cercle basée sur les ondes
      cx: 150 + Math.cos(wave2.value) * 5,
      cy: 150 + Math.sin(wave1.value) * 5,
    };
  });
  
  // Props animés pour l'opacité du texte JARVIS
  const jarvisTextProps = useAnimatedProps(() => {
    return {
      opacity: jarvisOpacity.value,
    };
  });
  
  // Props animés pour le cercle extérieur ondulant
  const outerCircleProps = useAnimatedProps(() => {
    return {
      r: 130 + Math.sin(wave1.value * 2) * 8,
      strokeWidth: 1 + Math.abs(Math.sin(wave2.value)) * 1.5,
      strokeOpacity: 0.3 + Math.abs(Math.sin(wave3.value)) * 0.3,
    };
  });
  
  // Props animés pour le second cercle extérieur ondulant
  const middleCircleProps = useAnimatedProps(() => {
    return {
      r: 120 + Math.cos(wave2.value * 1.5) * 7,
      strokeDasharray: `${5 + Math.sin(wave1.value) * 3},${3 + Math.cos(wave3.value) * 2}`,
      strokeOpacity: 0.5 + Math.abs(Math.cos(wave1.value)) * 0.3,
    };
  });
  
  // Fonction pour animer le cercle en fonction du texte
  const animateWithText = (text) => {
    // Plus le texte est long, plus le cercle sera grand
    const baseSize = 50;
    const textFactor = Math.min(text.length / 100, 1.5);
    const newRadius = baseSize + (textFactor * 30);
    
    // Animation du rayon
    radius.value = withTiming(newRadius, { duration: 800 });
    
    // Animation de pulsation constante
    pulsatingRadius.value = withRepeat(
      withSequence(
        withTiming(newRadius, { duration: 1000 }),
        withTiming(newRadius + 20, { duration: 1000 })
      ),
      -1, // Répétition infinie
      true // Yoyo effect (aller-retour)
    );
  };
  
  // Nettoyer les ressources audio quand le composant est démonté
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);
  
  // Fonction pour jouer un son de test (solution de secours)
  const playTestSound = async () => {
    try {
      // Utiliser un texte de test
      const testText = "Ceci est un test de Jarvis";
      setAudioText(testText);
      animateWithText(testText);
      
      // Nous n'avons pas de fichier audio de test, alors simulons juste l'état
      setIsPlaying(true);
      
      // Simuler la fin de la lecture après 3 secondes
      setTimeout(() => {
        setIsPlaying(false);
      }, 3000);
      
    } catch (err) {
      console.error('Erreur avec le son de test:', err);
      setError('Impossible de jouer le son de test');
    }
  };
  
  // Fonction pour appeler le webhook et jouer l'audio
  const fetchAudio = async () => {
    setLoading(true);
    setError('');
    setAudioText('');
    
    // Libérer les ressources audio précédentes
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }
    
    try {
      const webhookUrl = 'https://n8n.srv779073.hstgr.cloud/webhook/9a540154-4a58-4eb0-b839-e3025134e311';
      
      console.log('Envoi d\'une requête POST à:', webhookUrl);
      
      // Requête POST au webhook (la plupart des webhooks n8n utilisent POST)
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userQuery }),
      });
      
      console.log('Statut de la réponse:', response.status);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      try {
        // D'abord essayer de traiter la réponse comme JSON
        const responseClone = response.clone(); // Cloner car on ne peut lire qu'une fois
        const contentType = response.headers.get('content-type');
        console.log('Type de contenu reçu:', contentType);
        
        if (contentType && contentType.includes('application/json')) {
          // Si la réponse est du JSON
          const jsonData = await response.json();
          console.log('Réponse JSON reçue:', JSON.stringify(jsonData));
          
          // Extraire le texte et l'utiliser pour l'animation
          const responseText = jsonData.text || jsonData.message || JSON.stringify(jsonData);
          setAudioText(responseText);
          animateWithText(responseText);
          
          // Simuler la lecture audio
          setIsPlaying(true);
          setTimeout(() => { setIsPlaying(false); }, 3000);
        } 
        else if (contentType && contentType.includes('audio/')) {
          // Si la réponse est un fichier audio
          console.log('Réponse audio détectée');
          
          try {
            // Récupérer le blob audio
            const blob = await response.blob();
            console.log('Taille du blob audio:', blob.size, 'octets');
            
            // Récupérer le texte de l'en-tête s'il existe
            const headerText = response.headers.get('x-response-text');
            const defaultText = headerText || "Audio reçu de Jarvis";
            setAudioText(defaultText);
            animateWithText(defaultText);
            
            // Créer un fichier temporaire pour l'audio
            const audioPath = `${FileSystem.cacheDirectory}audio-${Date.now()}.mp3`;
            
            // Dans React Native, nous ne pouvons pas utiliser blob.arrayBuffer()
            // Utiliser une approche directe avec FileSystem pour lire les données
            
            // Créer un FileReader pour lire le blob (méthode standard)
            const reader = new FileReader();
            const readPromise = new Promise((resolve, reject) => {
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob); // Lire comme base64
            });
            
            // Attendre la lecture complète
            const dataURL = await readPromise;
            
            // Extraire la partie base64 (après la virgule dans data:audio/mpeg;base64,...)
            const base64Data = dataURL.split(',')[1];
            console.log('Données Base64 reçues, longueur:', base64Data ? base64Data.length : 0);
            
            // Écrire les données en base64 dans un fichier temporaire
            await FileSystem.writeAsStringAsync(
              audioPath,
              base64Data,
              { encoding: FileSystem.EncodingType.Base64 }
            );
            
            console.log('Fichier audio sauvegardé à:', audioPath);
            
            try {
              console.log('Début de la création du son');
              // Lecture du son à partir du fichier temporaire
              const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: audioPath },
                { shouldPlay: false, volume: 1.0 } // D'abord ne pas lire pour éviter les problèmes
              );
              
              console.log('Sound créé avec succès');
              setSound(newSound);
              
              // Vérifier que le son est prêt avant de le jouer
              const status = await newSound.getStatusAsync();
              console.log('Statut initial du son:', JSON.stringify(status));
              
              if (status.isLoaded) {
                console.log('Début de la lecture audio');
                
                // Démarrer les animations d'ondulation
                jarvisOpacity.value = withTiming(0, { duration: 500 }); // Masquer JARVIS
                
                // Démarrer les animations d'ondes pendant la lecture
                wave1.value = 0;
                wave2.value = 0;
                wave3.value = 0;
                
                // Animation pendant la lecture audio
                jarvisOpacity.value = withTiming(0, { duration: 500 }); // Masquer JARVIS
                
                // Accélérer les animations d'ondes
                wave1.value = withRepeat(
                  withTiming(Math.PI * 20, { duration: 10000 }),
                  -1,
                  false
                );
                
                wave2.value = withRepeat(
                  withTiming(Math.PI * 15, { duration: 7000 }),
                  -1,
                  false
                );
                
                wave3.value = withRepeat(
                  withTiming(Math.PI * 25, { duration: 12000 }),
                  -1,
                  false
                );
                
                // Animation des triangles de l'égaliseur audio
                audioTriangles.forEach((triangle, index) => {
                  // Chaque triangle a sa propre hauteur qui varie avec le temps
                  // Pour simuler un égaliseur audio réactif
                  const randomHeight = 30 + Math.random() * 45; // Hauteur beaucoup plus grande (entre 30 et 75)
                  const randomSpeed = 120 + Math.random() * 180; // Vitesse plus rapide (entre 120ms et 300ms)
                  
                  triangle.value = withRepeat(
                    withSequence(
                      withTiming(randomHeight, { duration: randomSpeed }),
                      withTiming(10 + Math.random() * 15, { duration: randomSpeed })
                    ),
                    -1,
                    false
                  );
                });
                
                await newSound.playAsync();
                setIsPlaying(true);
                
                // Définir le gestionnaire d'événements de fin de lecture
                newSound.setOnPlaybackStatusUpdate((playStatus) => {
                  console.log('Mise à jour du statut audio:', playStatus.didJustFinish ? 'terminé' : 'en cours');
                  
                  if (playStatus.didJustFinish) {
                    console.log('Lecture audio terminée naturellement');
                    setIsPlaying(false);
                    
                    // Arrêter les animations d'ondulation et restaurer JARVIS
                    wave1.value = withTiming(0, { duration: 1000 });
                    wave2.value = withTiming(0, { duration: 1000 });
                    wave3.value = withTiming(0, { duration: 1000 });
                    jarvisOpacity.value = withTiming(1, { duration: 1000 }); // Réafficher JARVIS
                  }
                });
              } else {
                console.log('Le son n\'a pas pu être chargé correctement');
                setIsPlaying(false);
              }
            } catch (playErr) {
              console.error('Erreur lors de la lecture audio:', playErr);
              setIsPlaying(false);
            }
          } catch (audioErr) {
            // En cas d'erreur, afficher l'erreur et simuler quand même l'animation
            console.error('Erreur lors du traitement audio:', audioErr);
            setIsPlaying(true);
            setTimeout(() => { setIsPlaying(false); }, 5000);
          }
        }
        else {
          // Pour tout autre type de réponse, essayer de récupérer du texte
          const textResponse = await responseClone.text();
          console.log('Réponse texte reçue, longueur:', textResponse.length);
          
          if (textResponse && textResponse.length > 0) {
            // Limiter la longueur du texte affiché
            const displayText = textResponse.length > 500 
              ? textResponse.substring(0, 500) + '...' 
              : textResponse;
            
            setAudioText(displayText);
            animateWithText(displayText);
          } else {
            // Texte par défaut
            setAudioText("Réponse reçue de Jarvis");
            animateWithText("Réponse reçue de Jarvis");
          }
          
          // Simuler la lecture audio
          setIsPlaying(true);
          setTimeout(() => { setIsPlaying(false); }, 3000);
        }
      } catch (parseErr) {
        console.error('Erreur lors du traitement de la réponse:', parseErr);
        
        // Message d'erreur mais continuer quand même l'animation
        const fallbackText = "Message reçu de Jarvis (format non reconnu)";
        setAudioText(fallbackText);
        animateWithText(fallbackText);
        
        // Simuler la lecture audio malgré l'erreur de parsing
        setIsPlaying(true);
        setTimeout(() => { setIsPlaying(false); }, 3000);
      }
      
    } catch (err) {
      console.error('Erreur lors de la requête:', err);
      setError(`Erreur: ${err.message || 'Une erreur s\'est produite'}`);
      
      // Utiliser le son de test en cas d'échec
      await playTestSound();
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <PaperProvider theme={theme}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View style={styles.container}>
              <StatusBar style="light" />
              
              {/* Interface Jarvis améliorée */}
              <View style={styles.sphereContainer}>
                <Svg height="300" width="300" style={styles.svgContainer}>
                  {/* Fond sombre avec gradient */}
                  <Defs>
                    <RadialGradient
                      id="backgroundGradient"
                      cx="150"
                      cy="150"
                      r="150"
                      gradientUnits="userSpaceOnUse"
                    >
                      <Stop offset="0" stopColor="#003366" stopOpacity="0.2" />
                      <Stop offset="1" stopColor="#000033" stopOpacity="0.9" />
                    </RadialGradient>
                  </Defs>
                  
                  {/* Fond */}
                  <Circle
                    cx="150"
                    cy="150"
                    r="150"
                    fill="url(#backgroundGradient)"
                  />
                  
                  {/* Les anneaux extérieurs ont été supprimés */}
                  
                  {/* Effets complexes pour l'animation JARVIS */}
                  <Defs>
                    {/* Gradient principal pour l'effet bulle de savon */}
                    <RadialGradient
                      id="coreGradient"
                      cx="120"
                      cy="120"
                      r="80"
                      gradientUnits="userSpaceOnUse"
                    >
                      <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.15" />
                      <Stop offset="0.5" stopColor="#64FFDA" stopOpacity="0.1" />
                      <Stop offset="0.7" stopColor="#18FFFF" stopOpacity="0.15" />
                      <Stop offset="0.9" stopColor="#00B0FF" stopOpacity="0.2" />
                      <Stop offset="1" stopColor="#0277BD" stopOpacity="0.3" />
                    </RadialGradient>
                    
                    {/* Gradient pour le halo externe effet bulle de savon */}
                    <RadialGradient
                      id="outerGlow"
                      cx="170"
                      cy="130"
                      r="100"
                      gradientUnits="userSpaceOnUse"
                    >
                      <Stop offset="0.4" stopColor="transparent" stopOpacity="0" />
                      <Stop offset="0.8" stopColor="#B2EBF2" stopOpacity="0.05" />
                      <Stop offset="0.9" stopColor="#4DD0E1" stopOpacity="0.1" />
                      <Stop offset="1" stopColor="#00B8D4" stopOpacity="0.2" />
                    </RadialGradient>
                    
                    {/* Gradient pour l'anneau scanner */}
                    <LinearGradient
                      id="scannerGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <Stop offset="0%" stopColor="#64FFDA" stopOpacity="0.7" />
                      <Stop offset="50%" stopColor="#18FFFF" stopOpacity="0.8" />
                      <Stop offset="100%" stopColor="#00E5FF" stopOpacity="0.7" />
                    </LinearGradient>
                    
                    {/* Pattern pour la grille interne */}
                    <Pattern
                      id="techGrid"
                      patternUnits="userSpaceOnUse"
                      width="20"
                      height="20"
                      patternTransform="rotate(45)"
                    >
                      <Path
                        d="M 0 10 L 20 10 M 10 0 L 10 20"
                        stroke="rgba(0, 255, 255, 0.15)"
                        strokeWidth="0.5"
                      />
                      <Circle cx="10" cy="10" r="0.8" fill="rgba(0, 229, 255, 0.4)" />
                    </Pattern>
                    
                    {/* Pattern hexagonal pour le design tech */}
                    <Pattern
                      id="hexTech"
                      patternUnits="userSpaceOnUse"
                      width="30"
                      height="25"
                    >
                      <Path
                        d="M15,0 L30,7.5 L30,17.5 L15,25 L0,17.5 L0,7.5 Z"
                        fill="none"
                        stroke="rgba(0, 229, 255, 0.2)"
                        strokeWidth="0.5"
                      />
                      <Circle cx="15" cy="12.5" r="1" fill="rgba(0, 229, 255, 0.3)" />
                      <Path
                        d="M15,5 L25,10 L25,15 L15,20 L5,15 L5,10 Z"
                        stroke="rgba(0, 229, 255, 0.15)"
                        strokeWidth="0.3"
                      />
                    </Pattern>
                    
                    {/* Gradient jaune électrique intense pour les triangles de l'égaliseur */}
                     <LinearGradient
                       id="yellowElectricGradient"
                       x1="0%"
                       y1="0%"
                       x2="0%"
                       y2="100%"
                     >
                       <Stop offset="0%" stopColor="#FFFF00" stopOpacity="1" />
                       <Stop offset="40%" stopColor="#FFE000" stopOpacity="0.95" />
                       <Stop offset="70%" stopColor="#FFCC00" stopOpacity="0.9" />
                       <Stop offset="100%" stopColor="#FF9500" stopOpacity="0.8" />
                     </LinearGradient>
                     
                     {/* Radial pour effet de halo lumineux jaune */}
                     <RadialGradient
                       id="yellowGlow"
                       cx="50%"
                       cy="50%"
                       r="50%"
                       fx="50%"
                       fy="50%"
                     >
                       <Stop offset="0%" stopColor="#FFFF00" stopOpacity="0.9" />
                       <Stop offset="70%" stopColor="#FFCC00" stopOpacity="0.4" />
                       <Stop offset="100%" stopColor="#FF9500" stopOpacity="0" />
                     </RadialGradient>
                    
                    {/* Les filtres SVG ne sont pas bien supportés, on les a retirés */}
                    
                    {/* Mask pour l'effet iris */}
                    <ClipPath id="irisMask">
                      <Circle cx="150" cy="150" r="60" />
                    </ClipPath>
                    
                    {/* Mask pour les animations */}
                    <ClipPath id="animationMask">
                      <Circle cx="150" cy="150" r="80" />
                    </ClipPath>
                  </Defs>
                  
                  {/* Halo lumineux extérieur */}
                  <AnimatedCircle
                    cx="150"
                    cy="150"
                    r="80"
                    fill="url(#outerGlow)"
                    animatedProps={useAnimatedProps(() => ({
                      opacity: 0.5 + Math.sin(wave1.value) * 0.3,
                    }))}
                  />
                  
                  {/* Anneaux extérieurs plus arrondis et moins rectilignes */}
                  <AnimatedCircle
                    cx="150"
                    cy="150"
                    r="75"
                    fill="transparent"
                    stroke="#00E5FF"
                    strokeWidth="0.8"
                    strokeDasharray="0.1,25"
                    strokeOpacity="0.3"
                    animatedProps={useAnimatedProps(() => ({
                      cx: 150 + Math.sin(wave1.value) * 10,
                      cy: 150 + Math.cos(wave2.value) * 15,
                      r: 75 + Math.sin(wave3.value) * 8,
                      strokeDashoffset: wave1.value * 10,
                      strokeOpacity: 0.3 + Math.abs(Math.sin(wave2.value)) * 0.2,
                    }))}
                  />

                  <AnimatedCircle
                    cx="150"
                    cy="150"
                    r="110"
                    fill="transparent"
                    stroke="#00E5FF"
                    strokeWidth="0.6"
                    strokeDasharray="0.1,15"
                    strokeOpacity="0.25"
                    animatedProps={useAnimatedProps(() => ({
                      cx: 150 - Math.sin(wave2.value) * 8,
                      cy: 150 - Math.cos(wave3.value) * 12,
                      r: 110 + Math.sin(wave1.value) * 10,
                      strokeDashoffset: -wave2.value * 8,
                      strokeOpacity: 0.25 + Math.abs(Math.sin(wave3.value)) * 0.15,
                    }))}
                  />

                  <AnimatedCircle
                    cx="150"
                    cy="150"
                    r="140"
                    fill="transparent"
                    stroke="#00E5FF"
                    strokeWidth="0.5"
                    strokeDasharray="0.1,20"
                    strokeOpacity="0.2"
                    animatedProps={useAnimatedProps(() => ({
                      cx: 150 + Math.cos(wave3.value) * 5,
                      cy: 150 + Math.sin(wave1.value) * 6,
                      r: 140 + Math.cos(wave2.value) * 12,
                      strokeDashoffset: wave3.value * 6,
                      strokeOpacity: 0.2 + Math.abs(Math.cos(wave1.value)) * 0.1,
                    }))}
                  />
                  
                  {/* Égaliseur audio: triangles jaunes électriques qui réagissent au son */}
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
                    // Calcul de la position du triangle autour du cercle - équidistants sur 360 degrés
                    const angleRad = (index * Math.PI / 4); // 8 triangles équidistants (2π/8 = π/4)
                    
                    // Centre identique aux cercles principaux
                    const centerX = 150;
                    const centerY = 150;
                    const radius = 80; // Position ajustée à environ 0,2 cm du centre
                    
                    // La base du triangle doit être exactement sur le cercle extérieur
                    // Utiliser un angle plus large pour que les triangles soient plus visibles
                    const arcWidth = 0.09; // Largeur de l'arc ajustée pour une base plus fine
                    // Points de base exactement sur le cercle
                    const baseX1 = centerX + radius * Math.cos(angleRad - arcWidth);
                    const baseY1 = centerY + radius * Math.sin(angleRad - arcWidth);
                    const baseX2 = centerX + radius * Math.cos(angleRad + arcWidth);
                    const baseY2 = centerY + radius * Math.sin(angleRad + arcWidth);
                    
                    return (
                      <AnimatedPath
                        key={`triangle-${index}`}
                        fill="url(#yellowElectricGradient)"
                        stroke="#FFFF80"
                        strokeWidth="1.5"
                        filter="drop-shadow(0 0 2px #FFFF00)"
                        animatedProps={useAnimatedProps(() => {
                          // Utiliser la valeur d'animation pour ce triangle spécifique
                          // Avec une amplitude encore plus grande pour atteindre le bord du cercle extérieur depuis le centre
                          const height = audioTriangles[index].value * 2.0; // Amplitude fortement augmentée pour s'étendre du cercle central au cercle extérieur
                          
                          // Calculer la position de la pointe pour qu'elle s'étende vers l'extérieur
                          // La pointe peut dépasser jusqu'au cercle extérieur (140px)
                          // On limite l'extension à 140px maximum pour ne pas déborder du cercle
                          const extensionMax = 140;
                          const tipDistance = Math.min(radius + height, extensionMax);
                          const tipX = centerX + tipDistance * Math.cos(angleRad);
                          const tipY = centerY + tipDistance * Math.sin(angleRad);
                          
                          // Effet zigzag léger pour un aspect électrique
                          const jitterAmount = 1.5; // Amplitude raisonnable du zigzag
                          
                          // Petites variations pour effet électrique
                          const jitterX1 = baseX1 + (Math.sin(wave2.value + index) * jitterAmount);
                          const jitterY1 = baseY1 + (Math.cos(wave3.value + index) * jitterAmount);
                          const jitterX2 = baseX2 + (Math.sin(wave1.value + index) * jitterAmount);
                          const jitterY2 = baseY2 + (Math.cos(wave2.value + index) * jitterAmount);
                          
                          // Intensité lumineuse variable pour effet électrique
                          const glowIntensity = 0.7 + Math.abs(Math.sin(wave1.value + index * 0.5)) * 0.3;
                          
                          // Chemin du triangle avec pointe extérieure
                          return {
                            d: `M ${jitterX1} ${jitterY1} L ${jitterX2} ${jitterY2} L ${tipX} ${tipY} Z`,
                            strokeWidth: 1.5 + Math.abs(Math.sin(wave3.value + index * 0.3)) * 0.5,
                            opacity: isPlaying ? glowIntensity : 0
                          };
                        })}
                      />
                    );
                  })}
                  
                  {/* Cercle central principal */}
                  <AnimatedCircle
                    cx="150"
                    cy="150"
                    r="40"
                    stroke="#00E5FF"
                    strokeWidth="1"
                    fill="url(#coreGradient)"
                    strokeOpacity="0.8"
                    animatedProps={useAnimatedProps(() => ({
                      r: radius.value + Math.sin(wave3.value * 0.7) * 3,
                      strokeOpacity: 0.7 + Math.sin(wave1.value) * 0.2,
                    }))}
                  />

                  {/* Motif cercle à l'intérieur sans lignes verticales */}
                  <Circle
                    cx="150"
                    cy="150"
                    r="30"
                    stroke="#00E5FF"
                    strokeWidth="0.5"
                    fill="transparent"
                    strokeOpacity="0.6"
                  />

                  {/* Point central uniquement */}
                  <Circle cx="150" cy="150" r="1.5" fill="#00E5FF" opacity="0.8" />
                  
                  {/* Cercle intermédiaire */}
                  <AnimatedCircle
                    cx="150"
                    cy="150"
                    r="80"
                    stroke="#00E5FF"
                    strokeWidth="0.7"
                    fill="transparent"
                    strokeOpacity="0.5"
                    strokeDasharray="2,3"
                    animatedProps={useAnimatedProps(() => ({
                      strokeOpacity: 0.4 + Math.sin(wave2.value) * 0.2,
                      strokeDashoffset: wave1.value * 5,
                    }))}
                  />
                  
                  {/* Iris interne vibrant */}
                  <AnimatedCircle
                    cx="150"
                    cy="150"
                    fill="rgba(0, 229, 255, 0.15)"
                    stroke="#18FFFF"
                    strokeWidth="1"
                    animatedProps={useAnimatedProps(() => ({
                      r: 20 + Math.sin(wave1.value * 2) * 5,
                      opacity: 0.7 + Math.sin(wave2.value) * 0.3,
                      strokeDasharray: `${1 + Math.abs(Math.sin(wave3.value) * 3)},${1 + Math.abs(Math.cos(wave3.value) * 2)}`,
                    }))}
                  />
                  
                  {/* Point central pulsant */}
                  <AnimatedCircle
                    cx="150"
                    cy="150"
                    fill="#00E5FF"
                    animatedProps={useAnimatedProps(() => ({
                      r: 5 + Math.sin(wave2.value * 3) * 2,
                      opacity: 0.8 + Math.sin(wave3.value) * 0.2,
                    }))}
                  />
                  
                  {/* Reflets de lumière pour l'effet bulle de savon */}
                  <Circle cx="130" cy="130" r="3" fill="#FFFFFF" opacity="0.4" />
                  <Circle cx="135" cy="135" r="1.5" fill="#FFFFFF" opacity="0.3" />
                  <Circle cx="170" cy="130" r="2.5" fill="#B2EBF2" opacity="0.25" />
                  <Circle cx="160" cy="135" r="1.2" fill="#E0F7FA" opacity="0.2" />
                  
                  {/* Points lumineux éparpillés */}
                  <Circle cx="130" cy="140" r="0.8" fill="#80DEEA" opacity="0.7" />
                  <Circle cx="170" cy="130" r="0.6" fill="#40C4FF" opacity="0.6" />
                  <Circle cx="160" cy="170" r="0.7" fill="#00B0FF" opacity="0.7" />
                  <Circle cx="140" cy="175" r="0.5" fill="#18FFFF" opacity="0.8" />
                  <Circle cx="125" cy="150" r="0.7" fill="#84FFFF" opacity="0.7" />
                  <Circle cx="175" cy="150" r="0.6" fill="#00E5FF" opacity="0.6" />
                  <Circle cx="150" cy="120" r="0.7" fill="#40C4FF" opacity="0.8" />
                  <Circle cx="150" cy="180" r="0.6" fill="#80D8FF" opacity="0.6" />

                  {/* Lignes techniques qui se croisent */}
                  <AnimatedPath
                    d="M140,120 L160,180 M120,150 L180,150 M130,130 L170,170 M170,130 L130,170"
                    stroke="#00B8D4"
                    strokeWidth="0.5"
                    strokeOpacity="0.4"
                    animatedProps={useAnimatedProps(() => ({
                      strokeOpacity: 0.2 + Math.abs(Math.sin(wave2.value)) * 0.3,
                      strokeDasharray: `${1 + Math.sin(wave1.value) * 1},${5 + Math.cos(wave3.value) * 2}`,
                      strokeDashoffset: wave2.value * 3,
                    }))}
                  />
                  
                  {/* Les lignes de grille ont été supprimées */}
                  
                  {/* Les petits cercles décoratifs ont été supprimés */}
                  
                  {/* Texte JARVIS au centre - visible uniquement quand l'audio est terminé */}
                  <AnimatedSvgText
                    x="150"
                    y="155"
                    fontSize="24"
                    fontFamily="Helvetica"
                    fontWeight="bold"
                    fill="#00E5FF"
                    textAnchor="middle"
                    animatedProps={jarvisTextProps}
                  >
                    JARVIS
                  </AnimatedSvgText>
                </Svg>
              </View>
              
              {/* Espace entre le rond et la zone de texte */}
              <View style={{ height: 40 }} />
              
              {/* Champ de saisie pour le message */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={userQuery}
                  onChangeText={setUserQuery}
                  placeholder="Votre message pour Jarvis..."
                  placeholderTextColor="#888"
                  multiline
                  returnKeyType="done"
                  blurOnSubmit={true}
                />
              </View>
              
              {/* Espace supplémentaire augmenté */}
              <View style={{ height: 120 }} />
              
              {/* Texte associé à l'audio */}
              <View style={styles.textContainer}>
                {audioText ? (
                  <Text style={styles.responseText}>{audioText}</Text>
                ) : (
                  <Text style={styles.instructionText}>
                    {error || 'Appuyez sur le bouton pour activer Jarvis'}
                  </Text>
                )}
              </View>
              
              {/* Bouton d'action */}
              <TouchableOpacity 
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={() => {
                  Keyboard.dismiss();  // Fermer le clavier avant d'envoyer la requête
                  fetchAudio();
                }}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>
                    {isPlaying ? 'Jarvis en cours...' : 'Activer Jarvis'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 5,
  },
  textInput: {
    color: '#FFFFFF',
    fontSize: 16,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sphereContainer: {
    height: 300,
    width: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  svgContainer: {
    position: 'absolute',
  },
  textContainer: {
    marginTop: 0,
    marginBottom: 15,
    width: '100%',
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 60,
    justifyContent: 'center',
  },
  responseText: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
  },
  instructionText: {
    color: '#AAAAAA',
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0078D7',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 30,
    width: 200,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#555555',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
