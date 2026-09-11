
// PARTE QUE DE VIEW FILE
const fileInputNew = document.getElementById("newFile");
const fileInputOld = document.getElementById("oldFile");
const fileViewNew = document.querySelector(".view-new");
const fileViewOld = document.querySelector(".view-old");

fileInputNew.addEventListener("change", () => {

    const file = fileInputNew.files[0];

    if (!file) return;

    fileViewNew.textContent = file.name
});

fileInputOld.addEventListener("change", () => {

    const file = fileInputOld.files[0];

    if (!file) return;

    fileViewOld.textContent = file.name
});