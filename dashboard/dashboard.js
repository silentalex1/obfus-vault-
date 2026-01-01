const discordBtn = document.getElementById('discord-btn');

const CLIENT_ID = "1456100190300930154";
const REDIRECT_URI = encodeURIComponent("https://obfusvault.xyz/dashboard/main-page");
const SCOPES = "identify";
const DISCORD_AUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${SCOPES}`;

discordBtn.addEventListener('click', () => {
    window.location.href = DISCORD_AUTH_URL;
});
