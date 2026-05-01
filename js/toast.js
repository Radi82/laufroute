/************************************************************
 * 🔔 TOAST MODULE
 ************************************************************/

export function showToast(message, type = "success") {

    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";

        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2500);
}