// Google Login
function handleCredentialResponse(response) {
    console.log("Google ID Token: ", response.credential);
}

window.onload = function () {
    google.accounts.id.initialize({
        client_id: "YOUR_GOOGLE_CLIENT_ID",
        callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
        document.getElementById("google-login"),
        { theme: "outline", size: "large" }
    );
};

// Facebook Login
window.fbAsyncInit = function () {
    FB.init({
        appId: 'YOUR_FACEBOOK_APP_ID',
        cookie: true,
        xfbml: true,
        version: 'v12.0'
    });
};

document.getElementById("facebook-login").addEventListener("click", function () {
    FB.login(function (response) {
        if (response.authResponse) {
            console.log("Facebook Login Success", response);
        }
    }, { scope: 'public_profile,email' });
});
