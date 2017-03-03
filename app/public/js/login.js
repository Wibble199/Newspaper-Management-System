$(document).ready(function() {
	$('#login-form').on("submit", function(e) {
		e.preventDefault();

		$.ajax({
			method: "POST",
			dataType: "json",
			url: "/login",
			data: $('#login-form').serialize(),
		}).done(function(data) {
			if (data.success)
				location.reload();
			else
				console.log(data.message);
		})
	});
});