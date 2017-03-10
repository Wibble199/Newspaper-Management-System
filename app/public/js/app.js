$(function() {
	$('input[data-date-type]').datepicker({
		autoclose: true,
		format: "dd/mm/yyyy",
		todayHighlight: true
	});
});

function getSubscriptionFormVal() {
	var model = {
		delivery_days: 0
	};

	model.publication_id = $('[data-subscription-binding="publication_id"]').val();
	model.start_date = dateConverter_yyyymmdd($('[data-subscription-binding="start_date"]').val());
	model.end_date = $('#subscription-edit-start-date-null').is(':checked') ? null : dateConverter_yyyymmdd($('[data-subscription-binding="end_date"]').val());

	$('[data-subscription-binding="delivery_days"] input[type="checkbox"]:checked').each(function() {
		model.delivery_days += +$(this).val();
	});

	return model;
}

function dateConverter_yyyymmdd(ddmmyyyy) {
	var parts = ddmmyyyy.split("/");
	return parts[2] + "-" + parts[1] + "-" + parts[0];
}