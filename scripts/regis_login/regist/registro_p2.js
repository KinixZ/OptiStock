document.getElementById("logo").addEventListener("change", function(event) {
    const file = event.target.files[0];

    if (file) {
        // 1. Validar tipo de archivo (debe ser PNG)
        if (file.type !== "image/png") {
            alert("El archivo debe ser una imagen PNG.");
            event.target.value = ""; // Resetear input
            return;
        }

        // 2. Validar tamaño de la imagen (ejemplo: 2MB máximo)
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            alert("El archivo es demasiado grande. Elija una imagen de menos de 2MB.");
            event.target.value = ""; // Resetear input
            return;
        }

        // 3. Redimensionar la imagen antes de subirla
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = function(event) {
            const img = new Image();
            img.src = event.target.result;
            
            img.onload = function() {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                // Definir tamaño máximo (300x300 píxeles)
                const maxWidth = 300;
                const maxHeight = 300;

                let width = img.width;
                let height = img.height;

                // Mantener proporción
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }

                // Redimensionar imagen en el canvas
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Convertir a formato PNG y mostrar en un campo oculto
                canvas.toBlob(function(blob) {
                    const newFile = new File([blob], file.name, { type: "image/png" });
                    console.log("Imagen redimensionada:", newFile);

                    // Aquí puedes enviar la imagen redimensionada al servidor o actualizar el input file
                }, "image/png", 1.0);
            };
        };
    }
});