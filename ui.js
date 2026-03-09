document.addEventListener("DOMContentLoaded", function () {

    const boton = document.createElement("a");

    boton.href = "../index.html";
    boton.className = "btn-primary";
    boton.innerHTML = "← Volver al inicio";

    boton.style.textDecoration = "none";

    const contenedor = document.createElement("div");
    contenedor.style.marginTop = "20px";

    contenedor.appendChild(boton);

    document.querySelector("main").appendChild(contenedor);

});