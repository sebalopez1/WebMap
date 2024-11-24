const { exec, spawn } = require("child_process");

// Ejecuta el servidor en segundo plano
const server = spawn("node", ["server.js"], { stdio: "inherit" });

// Abre el navegador en la URL del servidor local
function openBrowser(url) {
    const startCommand =
        process.platform === "win32" ? "start" :
        process.platform === "darwin" ? "open" :
        "xdg-open"; // Para Linux

    exec(`${startCommand} ${url}`, (error) => {
        if (error) {
            console.error("Error al abrir el navegador:", error);
        }
    });
}

// Abre la URL en el navegador
openBrowser("http://localhost:3000/");

// Maneja el cierre de la aplicación para detener el servidor
process.on("SIGINT", () => {
    console.log("Cerrando servidor...");
    server.kill();
    process.exit();
});
