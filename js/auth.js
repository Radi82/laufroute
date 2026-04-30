export function initAuth() {
    supabaseClient.auth.onAuthStateChange(() => {
        checkUser();
    });
}

export async function checkUser() {

    const { data } = await supabaseClient.auth.getUser();

    document.getElementById("userInfo").innerText =
        data.user ? "👤 " + data.user.email : "Not logged in";
}

export async function login() {
    await supabaseClient.auth.signInWithOAuth({
        provider: "google"
    });
}

export async function logout() {
    await supabaseClient.auth.signOut();
}