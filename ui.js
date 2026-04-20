document.addEventListener("DOMContentLoaded", function () {

    const boton = document.createElement("a");

    boton.className = "btn-primary btn-back";
    boton.innerHTML = "← Volver al inicio";
    boton.style.textDecoration = "none";

    if (window.location.pathname.includes("/calculadora-ganadera/")) {
        boton.href = "/calculadora-ganadera/";
    } else {
        boton.href = "../index.html";
    }

    const contenedor = document.createElement("div");
    contenedor.style.marginTop = "20px";

    contenedor.appendChild(boton);

    document.querySelector("main").appendChild(contenedor);

});