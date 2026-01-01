if (window.opener && window.opener !== window) {
    window.opener.location.href = window.location.href;
    window.close();
}
