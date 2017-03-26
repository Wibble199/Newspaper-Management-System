$(document).ready(function() {
	$('#login-form').on("submit", function(e) {
		e.preventDefault(); // Stop default form action

		$('.login-container').loadingOverlay(true); // Show loading icon
		$.ajax({
			method: "POST",
			dataType: "json",
			url: "/login",
			data: $('#login-form').serialize(),

		}).done(function(data) {
			if (data.success)
				location.reload(); // Reload to make server serve app instead of login
			else {
				animateLogin(); // Shake form
				$('[name="password"]').val(""); // Clear PW box
				$('.alert') // Update alert message
					.removeClass('alert-success').addClass('alert-danger')
					.html('<span class="glyphicon glyphicon-exclamation-sign"></span> Incorrect login details');
				$('.login-container').loadingOverlay(false); // Hide loading icon
			}
		})
	});
});

// Shake the login container box
function animateLogin() {
	var login = $('.login-container').addClass("animate");
	setTimeout(function() { login.removeClass("animate"); }, 400); // .animate has animation that runs for 400ms, so after that time remove the class to allow it to be re-animated
}