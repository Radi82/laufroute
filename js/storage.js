let runHistory = [];

export async function saveRunToDB(run) {

    const user = await supabaseClient.auth.getUser();
    if (!user.data.user) return;

    await supabaseClient
        .from("runs")
        .insert([{
            user_id: user.data.user.id,
            distance: run.distance,
            duration: run.duration,
            points: run.points
        }]);
}

export async function loadRunHistory() {

    const user = await supabaseClient.auth.getUser();
    if (!user.data.user) return;

    const { data } = await supabaseClient
        .from("runs")
        .select("*")
        .order("created_at", { ascending: false });

    runHistory = data || [];

    render();
}

function render() {

    const el = document.getElementById("historyList");
    el.innerHTML = "";

    runHistory.forEach(r => {

        const div = document.createElement("div");

        div.innerHTML = `
            📅 ${new Date(r.created_at).toLocaleString()}<br>
            🏃 ${r.distance.toFixed(2)} km<br>
            ⏱ ${Math.floor(r.duration / 60)} min
        `;

        div.onclick = () => {
            import("./run.js").then(m => {
                const { map } = window;
                L.polyline(r.points, { color: "red" }).addTo(map);
            });
        };

        el.appendChild(div);
    });
}