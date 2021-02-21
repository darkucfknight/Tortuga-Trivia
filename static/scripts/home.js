let GOOGLE_TOKEN = null;
const PROVIDER = new firebase.auth.GoogleAuthProvider();

const SIGN_OUT_MODAL = new bootstrap.Modal(
    document.getElementById('sign-out-confirm-modal')
);

// || Click Events
document.addEventListener('click', function (event) {
    // Profile Icon
    if (
        event.target.matches('#sign-in-button') ||
        event.target.matches('#profile-icon')
    ) {
        handleProfileClick();
    }

    // Sign out modal confirm
    if (event.target.matches('#confirm-sign-out')) {
        googleSignout();
        SIGN_OUT_MODAL.hide();
    }
});

function handleProfileClick() {
    if (GOOGLE_TOKEN === null) {
        googleSignin().then(function (user) {
            document.getElementById('profile-icon').style.display = 'none';
            document.getElementById('sign-in-button').style.backgroundImage =
                'url(' + user.photoURL + ')';
        });
    } else {
        SIGN_OUT_MODAL.show();
    }
}

function googleSignin() {
    return firebase
        .auth()
        .signInWithPopup(PROVIDER)
        .then(function (result) {
            GOOGLE_TOKEN = result.credential.accessToken;
            return result.user;
        })
        .catch(function (error) {
            var errorCode = error.code;
            var errorMessage = error.message;
        });
}

function googleSignout() {
    return firebase
        .auth()
        .signOut()
        .then(
            function () {
                console.log('Signout Succesfull');
                GOOGLE_TOKEN = null;
                document.getElementById('profile-icon').style.display = 'flex';
                document.getElementById(
                    'sign-in-button'
                ).style.backgroundImage = 'none';
            },
            function (error) {
                console.log('Signout Failed');
            }
        );
}
